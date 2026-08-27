/**
 * Invoice pipeline: archive row -> PDF -> storage -> Resend email.
 * Server-only. Called when an order reaches "completed", and on demand by staff.
 */
import { buildInvoicePdf } from "./invoice-pdf.server";
import { bytesToBase64, invoiceEmailHtml, sendEmail } from "./email.server";

type Sb = any;

const money = (n: number, currency: string) =>
  `${currency} ${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export type InvoiceResult = {
  invoiceId: string;
  invoiceNumber: string;
  created: boolean;
  emailSent: boolean;
  emailError?: string | undefined;
};

/**
 * Idempotent: one invoice per order. Re-running only refreshes the PDF/email.
 */
export async function issueInvoiceForOrder(
  sb: Sb,
  actorId: string | null,
  orderId: string,
  options: { force?: boolean } = {},
): Promise<InvoiceResult | null> {
  const { data: order, error: orderErr } = await sb
    .from("service_orders")
    .select(
      "id,tracking_id,offer_id,customer_id,customer_name,customer_email,currency_code,frozen_rate,amount_usd,amount_display,applied_price_usd,price_context,payment_method_id,status",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr) throw new Error(orderErr.message);
  if (!order) throw new Error("ORDER_NOT_FOUND");

  const [{ data: existing }, { data: offer }, { data: method }] = await Promise.all([
    sb.from("invoices").select("id,invoice_number,email_sent_at").eq("order_id", orderId).maybeSingle(),
    order.offer_id
      ? sb
          .from("service_offers")
          .select("title_en,title_ar,tax_percent,fee_amount_usd,discount_percent,base_price_usd")
          .eq("id", order.offer_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    order.payment_method_id
      ? sb
          .from("payment_method_configs")
          .select("name_en,name_ar")
          .eq("id", order.payment_method_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (existing && !options.force) {
    return {
      invoiceId: existing.id,
      invoiceNumber: existing.invoice_number,
      created: false,
      emailSent: Boolean(existing.email_sent_at),
    };
  }

  const currency = order.currency_code || "USD";
  const rate = Number(order.frozen_rate) || 1;
  const totalUsd = Number(order.amount_usd) || 0;
  const totalDisplay = Number(order.amount_display) || totalUsd * rate;
  const taxPercent = Number(offer?.tax_percent) || 0;
  const feesUsd = Number(offer?.fee_amount_usd) || 0;
  // The historical price applied at order time wins over the offer's current price.
  const appliedPriceUsd = Number((order as { applied_price_usd?: number | null }).applied_price_usd);
  const netUsd = Number.isFinite(appliedPriceUsd) && appliedPriceUsd > 0
    ? appliedPriceUsd
    : Math.max(0, totalUsd - feesUsd - (totalUsd * taxPercent) / (100 + taxPercent));
  const taxUsd = Math.max(0, totalUsd - feesUsd - netUsd);

  let invoiceId = existing?.id ?? null;
  let invoiceNumber = existing?.invoice_number ?? "";
  let created = false;

  if (!invoiceId) {
    const { data: inserted, error: insErr } = await sb
      .from("invoices")
      .insert({
        order_id: order.id,
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        currency_code: currency,
        frozen_rate: rate,
        subtotal_usd: netUsd,
        tax_usd: taxUsd,
        discount_usd: 0,
        total_usd: totalUsd,
        total_display: totalDisplay,
        paid_usd: totalUsd,
        status: "paid",
        payment_method_id: order.payment_method_id,
        issued_by: actorId,
      } as any)
      .select("id,invoice_number")
      .single();
    if (insErr) throw new Error(insErr.message);
    invoiceId = inserted.id;
    invoiceNumber = inserted.invoice_number;
    created = true;
  }

  const rows = [
    { label: offer?.title_en || "Travel service", amount: money(netUsd, "USD") },
    ...(taxUsd > 0 ? [{ label: "Tax", amount: money(taxUsd, "USD") }] : []),
    ...(feesUsd > 0 ? [{ label: "Service fees", amount: money(feesUsd, "USD") }] : []),
  ];

  const pdf = await buildInvoicePdf({
    invoiceNumber,
    issuedAt: new Date().toISOString().slice(0, 10),
    trackingId: order.tracking_id,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    currency,
    lines: rows,
    totalUsd: money(totalUsd, "USD"),
    totalDisplay: money(totalDisplay, currency),
    paymentMethod: method?.name_en ?? null,
  });

  const path = `${new Date().getUTCFullYear()}/${invoiceNumber}.pdf`;
  const { error: upErr } = await sb.storage
    .from("invoices")
    .upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (upErr) console.error("invoice_pdf_upload_failed", upErr.message);

  const email = await sendEmail({
    to: order.customer_email,
    subject: `فاتورة ${invoiceNumber} · Gunited Travel`,
    html: invoiceEmailHtml({
      invoiceNumber,
      customerName: order.customer_name,
      trackingId: order.tracking_id,
      totalDisplay: money(totalDisplay, currency),
      totalUsd: money(totalUsd, "USD"),
      rows: [
        { label: offer?.title_ar || "خدمة سفر", amount: money(netUsd, "USD") },
        ...(taxUsd > 0 ? [{ label: "الضريبة", amount: money(taxUsd, "USD") }] : []),
        ...(feesUsd > 0 ? [{ label: "رسوم الخدمة", amount: money(feesUsd, "USD") }] : []),
      ],
    }),
    attachment: { filename: `${invoiceNumber}.pdf`, content: bytesToBase64(pdf) },
  });

  await sb
    .from("invoices")
    .update({
      pdf_url: upErr ? null : path,
      email_sent_at: email.sent ? new Date().toISOString() : null,
      email_error: email.error ?? null,
    })
    .eq("id", invoiceId);

  if (order.customer_id) {
    await sb.from("notifications").insert({
      user_id: order.customer_id,
      audience: "user",
      title_en: "Invoice ready",
      title_ar: "فاتورتك جاهزة",
      body_en: `Invoice ${invoiceNumber} has been issued for order ${order.tracking_id}.`,
      body_ar: `تم إصدار الفاتورة ${invoiceNumber} للطلب ${order.tracking_id}.`,
      link: `/invoice/${invoiceNumber}`,
    });
  }

  return {
    invoiceId: invoiceId!,
    invoiceNumber,
    created,
    emailSent: email.sent,
    emailError: email.error,
  };
}
