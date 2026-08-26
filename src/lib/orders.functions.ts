import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { normalizeCurrency } from "./currency";
import { normalizeDocs } from "./offer-docs";
import { computePrice } from "./pricing";
import { getPublicClient } from "./public-client.server";

const createOrderInput = z.object({
  offerId: z.string().uuid(),
  currency: z.unknown().transform(normalizeCurrency),
  customerName: z.string().min(2).max(120),
  customerEmail: z.string().email(),
  whatsapp: z.string().min(7).max(24),
  transactionReference: z.string().min(2).max(80),
  paymentMethodId: z.string().uuid(),
  receiptPath: z.string().min(3).max(400),
  documents: z
    .array(
      z.object({
        key: z.string().max(60).default(""),
        label_en: z.string().max(160).default(""),
        label_ar: z.string().max(160).default(""),
        path: z.string().min(3).max(400),
        name: z.string().max(200).default(""),
      }),
    )
    .max(20)
    .default([]),
});

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createOrderInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: offer, error: offerErr } = await supabase
      .from("service_offers")
      .select(
        "id,base_price_usd,tax_percent,fee_amount_usd,discount_percent,commission_percent,title_en,title_ar,status,allowed_payment_methods,required_documents",
      )
      .eq("id", data.offerId)
      .maybeSingle();
    if (offerErr) throw new Error(offerErr.message);
    if (!offer || offer.status !== "active") throw new Error("OFFER_UNAVAILABLE");

    // Respect the payment methods the admin allowed for this offer.
    const allowed = Array.isArray(offer.allowed_payment_methods)
      ? (offer.allowed_payment_methods as string[])
      : [];
    if (allowed.length > 0 && !allowed.includes(data.paymentMethodId)) {
      throw new Error("PAYMENT_METHOD_NOT_ALLOWED");
    }

    // Every mandatory document from the offer checklist must be attached.
    const requiredDocs = normalizeDocs(offer.required_documents).filter((d) => d.required);
    const provided = new Set(data.documents.map((d) => d.key));
    const missing = requiredDocs.filter((d) => !provided.has(d.key));
    if (missing.length > 0) throw new Error("DOCUMENTS_MISSING");

    const { data: currency } = await supabase
      .from("currencies")
      .select("code,decimals")
      .eq("code", data.currency)
      .maybeSingle();
    const { data: rateRow } = await supabase
      .from("exchange_rates")
      .select("rate_per_usd")
      .eq("currency_code", data.currency)
      .maybeSingle();
    const rate = Number(rateRow?.rate_per_usd ?? 1);

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_agency,discount_tier,agency_id")
      .eq("id", userId)
      .maybeSingle();

    const audience = profile?.agency_id ? "agency" : "customer";

    // Agency and customer prices are separate rows; fall back to the base price.
    const { data: tierPrice } = await supabase
      .from("service_prices")
      .select("price_usd")
      .eq("offer_id", offer.id)
      .eq("audience", audience)
      .maybeSingle();

    const price = computePrice(
      {
        basePriceUsd: Number(tierPrice?.price_usd ?? offer.base_price_usd),
        taxPercent: offer.tax_percent,
        feeAmountUsd: offer.fee_amount_usd,
        discountPercent: offer.discount_percent,
        commissionPercent: offer.commission_percent,
        agencyDiscountPercent:
          profile?.is_agency && !tierPrice ? Number(profile.discount_tier) : 0,
      },
      data.currency,
      rate,
      currency?.decimals ?? 2,
    );


    const { data: order, error } = await supabase
      .from("service_orders")
      .insert({
        offer_id: offer.id,
        customer_id: userId,
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        whatsapp: data.whatsapp,
        currency_code: data.currency,
        frozen_rate: price.rate,
        amount_usd: price.totalUsd,
        amount_display: price.total,
        payment_method_id: data.paymentMethodId,
        transaction_reference: data.transactionReference,
        receipt_path: data.receiptPath,
        payment_notified_at: new Date().toISOString(),
        document_status: requiredDocs.length > 0 ? "documents_submitted" : "awaiting_documents",
        status: "submitted",
      })
      .select("id,tracking_id,amount_display,currency_code")
      .single();
    if (error) throw new Error(error.message);

    if (data.documents.length > 0) {
      const { error: docErr } = await supabase.from("order_documents").insert(
        data.documents.map((d) => ({
          order_id: order.id,
          doc_key: d.key,
          label_en: d.label_en,
          label_ar: d.label_ar,
          file_path: d.path,
          file_name: d.name,
          uploaded_by: userId,
        })),
      );
      if (docErr) throw new Error(docErr.message);
    }

    await supabase.from("order_status_history").insert({
      order_id: order.id,
      new_status: "submitted",
      note: `Payment notified · ref ${data.transactionReference} · ${data.documents.length} document(s) uploaded`,
      actor_id: userId,
      actor_name: data.customerName,
    });

    await supabase.from("notifications").insert([
      {
        audience: "staff",
        title_en: "New order received",
        title_ar: "طلب جديد",
        body_en: `${data.customerName} submitted order ${order.tracking_id} with a receipt.`,
        body_ar: `قام ${data.customerName} بإرسال الطلب ${order.tracking_id} مع الإيصال.`,
        link: `/track?ref=${order.tracking_id}`,
      },
      {
        user_id: userId,
        audience: "user",
        title_en: "Order submitted",
        title_ar: "تم إرسال طلبك",
        body_en: `We received order ${order.tracking_id}. Payment verification is pending.`,
        body_ar: `استلمنا طلبك ${order.tracking_id}. بانتظار التحقق من الدفع.`,
        link: `/track?ref=${order.tracking_id}`,
      },
    ]);

    await supabase.from("audit_logs").insert({
      actor_id: userId,
      actor_email: data.customerEmail,
      action: "order.create",
      entity: "service_orders",
      entity_id: order.id,
      after_data: { tracking_id: order.tracking_id, amount_usd: price.totalUsd },
    });

    return { trackingId: order.tracking_id as string, orderId: order.id as string };
  });

export const trackOrder = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ ref: z.string().min(4).max(60) }).parse(d))
  .handler(async ({ data }) => {
    const sb = getPublicClient();
    const ref = data.ref.trim();
    const { data: order } = await sb
      .from("service_orders")
      .select(
        "id,tracking_id,status,document_status,currency_code,amount_display,created_at,customer_name,offer_id",
      )
      .or(`tracking_id.eq.${ref},transaction_reference.eq.${ref}`)
      .maybeSingle();
    if (!order) return { order: null, history: [], offerTitle: null, invoice: null };

    const [{ data: history }, { data: offer }, { data: invoice }] = await Promise.all([
      sb
        .from("order_status_history")
        .select("id,previous_status,new_status,note,created_at,actor_name")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true }),
      order.offer_id
        ? sb.from("service_offers").select("title_en,title_ar").eq("id", order.offer_id).maybeSingle()
        : Promise.resolve({ data: null }),
      sb
        .from("invoices")
        .select("invoice_number,total_display,currency_code")
        .eq("order_id", order.id)
        .maybeSingle(),
    ]);

    return {
      order,
      history: history ?? [],
      offerTitle: offer ? { en: offer.title_en, ar: offer.title_ar } : null,
      invoice: invoice ?? null,
    };
  });

export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("service_orders")
      .select("id,tracking_id,status,currency_code,amount_display,created_at,offer_id")
      .eq("customer_id", context.userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    const orders = data ?? [];
    if (orders.length === 0) return [];

    // Attach the issued invoice (if any) so the dashboard can link to it directly.
    const { data: invoices } = await context.supabase
      .from("invoices")
      .select("order_id,invoice_number,total_display,currency_code,status")
      .in(
        "order_id",
        orders.map((o: { id: string }) => o.id),
      )
      .is("deleted_at", null);

    const byOrder = new Map((invoices ?? []).map((inv: any) => [inv.order_id, inv]));

    return orders.map((o: any) => ({
      ...o,
      invoice: byOrder.get(o.id) ?? null,
    }));
  });
