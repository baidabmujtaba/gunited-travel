import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./admin.shared";
import { normalizeCurrency } from "./currency";

const methodSchema = z.object({
  id: z.string().uuid().optional(),
  name_en: z.string().min(2).max(120),
  name_ar: z.string().min(2).max(120),
  account_holder: z.string().max(160).optional().default(""),
  account_number: z.string().max(120).optional().default(""),
  iban: z.string().max(120).optional().default(""),
  branch: z.string().max(160).optional().default(""),
  instructions_en: z.string().max(1000).optional().default(""),
  instructions_ar: z.string().max(1000).optional().default(""),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  is_active: z.boolean().default(true),
});

export const listPaymentMethodsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("payment_method_configs")
      .select("*")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const savePaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => methodSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { id, ...payload } = data;
    const sb = context.supabase;
    if (id) {
      const { error } = await sb.from("payment_method_configs").update(payload as any).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb.from("payment_method_configs").insert(payload as any);
      if (error) throw new Error(error.message);
    }
    await sb.from("audit_logs").insert({
      actor_id: context.userId,
      action: id ? "payment_method.update" : "payment_method.create",
      entity: "payment_method_configs",
      entity_id: id ?? null,
      after_data: payload as any,
    });
    return { ok: true };
  });

export const deletePaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("payment_method_configs")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      action: "payment_method.delete",
      entity: "payment_method_configs",
      entity_id: data.id,
    });
    return { ok: true };
  });

/** Manual exchange-rate edit — the single source of truth for every store price. */
export const saveExchangeRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        currency: z.unknown().transform(normalizeCurrency),
        rate: z.coerce.number().positive().max(10_000_000),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const sb = context.supabase;
    const { data: existing } = await sb
      .from("exchange_rates")
      .select("id,rate_per_usd")
      .eq("currency_code", data.currency)
      .maybeSingle();

    if (existing) {
      const { error } = await sb
        .from("exchange_rates")
        .update({ rate_per_usd: data.rate, updated_by: context.userId })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb
        .from("exchange_rates")
        .insert({ currency_code: data.currency, rate_per_usd: data.rate, updated_by: context.userId } as any);
      if (error) throw new Error(error.message);
    }

    await sb.from("audit_logs").insert({
      actor_id: context.userId,
      action: "exchange_rate.update",
      entity: "exchange_rates",
      entity_id: data.currency,
      before_data: existing ? { rate_per_usd: existing.rate_per_usd } : null,
      after_data: { rate_per_usd: data.rate },
    });
    return { ok: true };
  });

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ search: z.string().max(80).optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { data: rows, error } = await context.supabase
      .from("invoices")
      .select(
        "id,invoice_number,order_id,customer_name,customer_email,currency_code,total_usd,total_display,paid_usd,status,email_sent_at,email_error,pdf_url,created_at",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    const s = data.search?.trim().toLowerCase();
    if (!s) return rows ?? [];
    return (rows ?? []).filter((r: any) =>
      [r.invoice_number, r.customer_name, r.customer_email]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(s)),
    );
  });

/** Full invoice for the printable page. Staff see all, customers see their own (RLS). */
export const getInvoice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ number: z.string().min(4).max(40) }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: invoice, error } = await sb
      .from("invoices")
      .select("*")
      .eq("invoice_number", data.number)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invoice) return { invoice: null, order: null, method: null };

    const [{ data: order }, { data: method }] = await Promise.all([
      invoice.order_id
        ? sb
            .from("service_orders")
            .select("tracking_id,whatsapp,created_at,offer_id,status")
            .eq("id", invoice.order_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      invoice.payment_method_id
        ? sb
            .from("payment_method_configs")
            .select("name_en,name_ar")
            .eq("id", invoice.payment_method_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    let offer: any = null;
    if (order?.offer_id) {
      const { data: o } = await sb
        .from("service_offers")
        .select("title_en,title_ar")
        .eq("id", order.offer_id)
        .maybeSingle();
      offer = o;
    }

    return { invoice, order: order ? { ...order, offer } : null, method };
  });

/** Regenerate the PDF and re-send the invoice email. */
export const resendInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { issueInvoiceForOrder } = await import("./invoices.server");
    const result = await issueInvoiceForOrder(context.supabase, context.userId, data.orderId, {
      force: true,
    });
    return result ?? { emailSent: false };
  });

export const getInvoicePdfUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string().min(3).max(400) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { data: signed, error } = await context.supabase.storage
      .from("invoices")
      .createSignedUrl(data.path, 300);
    if (error) throw new Error(error.message);
    return { url: signed?.signedUrl ?? null };
  });
