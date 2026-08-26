import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./admin.shared";
import { normalizeCurrency } from "./currency";
import { agencyBalance, notifyBalanceState, postEntry } from "./ledger.server";

export const PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "deposit",
  "e_transfer",
  "other",
] as const;

const methodEnum = z.enum(PAYMENT_METHODS);

const basePayment = {
  agencyId: z.string().uuid(),
  amount: z.coerce.number().positive().max(100_000_000),
  currency: z.unknown().transform(normalizeCurrency),
  paymentDate: z.string().min(8).max(10),
  paymentMethod: methodEnum,
  transactionReference: z.string().trim().max(120).optional().default(""),
  description: z.string().trim().max(500).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  receiptPath: z.string().trim().max(400).optional().default(""),
};

const internalInput = z.object({ ...basePayment, orderId: z.string().uuid().optional().nullable() });

const externalInput = z.object({
  ...basePayment,
  payerName: z.string().trim().max(160).optional().default(""),
  sendingInstitution: z.string().trim().max(160).optional().default(""),
  transactionReference: z.string().trim().min(2).max(120),
});

async function loadAgency(sb: any, agencyId: string) {
  const { data, error } = await sb
    .from("travel_agencies")
    .select("id,agency_name,credit_limit_usd,warning_percent,financial_hold,currency_code")
    .eq("id", agencyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("AGENCY_NOT_FOUND");
  return data;
}

async function rateFor(sb: any, currency: string) {
  if (currency === "USD") return 1;
  const { data } = await sb
    .from("exchange_rates")
    .select("rate_per_usd")
    .eq("currency_code", currency)
    .maybeSingle();
  return Number(data?.rate_per_usd ?? 1) || 1;
}

/** Shared writer for internal and external payments. Never trusts client balances. */
async function writePayment(
  context: { supabase: any; userId: string },
  input: z.infer<typeof internalInput> & {
    payerName?: string;
    sendingInstitution?: string;
  },
  type: "internal" | "external",
) {
  const sb = context.supabase;
  const agency = await loadAgency(sb, input.agencyId);
  const currency = input.currency;
  const rate = await rateFor(sb, currency);
  const amountUsd = Math.round((input.amount / rate) * 100) / 100;

  const before = await agencyBalance(sb, agency.id, "USD");

  const { data: payment, error } = await sb
    .from("payments")
    .insert({
      agency_id: agency.id,
      order_id: input.orderId ?? null,
      amount: input.amount,
      currency_code: currency,
      frozen_rate: rate,
      amount_usd: amountUsd,
      payment_date: input.paymentDate,
      payment_method: input.paymentMethod,
      payment_type: type,
      payer_name: input.payerName || null,
      sending_institution: input.sendingInstitution || null,
      transaction_reference: input.transactionReference || null,
      receipt_path: input.receiptPath || null,
      description: input.description || null,
      notes: input.notes || null,
      recorded_by: context.userId,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("DUPLICATE_REFERENCE");
    throw new Error(error.message);
  }

  await postEntry(sb, context.userId, {
    agency_id: agency.id,
    entry_type: "payment",
    credit: amountUsd,
    currency_code: "USD",
    exchange_rate: rate,
    description: input.description || `Payment ${payment.payment_number}`,
    reference: payment.payment_number,
    payment_method: input.paymentMethod,
    payment_id: payment.id,
    order_id: input.orderId ?? null,
  });

  const after = await agencyBalance(sb, agency.id, "USD");

  const { data: members } = await sb.from("profiles").select("id").eq("agency_id", agency.id);
  await sb.from("notifications").insert([
    {
      audience: "staff",
      title_en: type === "external" ? "External payment recorded" : "Payment recorded",
      title_ar: type === "external" ? "تم تسجيل دفعة خارجية" : "تم تسجيل دفعة",
      body_en: `${agency.agency_name}: ${input.amount} ${currency} (${payment.payment_number}).`,
      body_ar: `${agency.agency_name}: ${input.amount} ${currency} (${payment.payment_number}).`,
      link: "/admin/payments",
    },
    ...(members ?? []).map((m: { id: string }) => ({
      user_id: m.id,
      audience: "user",
      title_en: "Payment recorded on your account",
      title_ar: "تم تسجيل دفعة في حسابك",
      body_en: `${input.amount} ${currency} received. Outstanding is now ${after.outstanding} USD.`,
      body_ar: `تم استلام ${input.amount} ${currency}. المستحق الآن ${after.outstanding} دولار.`,
      link: "/agency/payments",
    })),
  ]);

  await notifyBalanceState(sb, agency as any, after.outstanding);

  await sb.from("audit_logs").insert({
    actor_id: context.userId,
    action: type === "external" ? "payment.external.create" : "payment.create",
    entity: "payments",
    entity_id: payment.id,
    before_data: { outstanding: before.outstanding },
    after_data: {
      outstanding: after.outstanding,
      amount_usd: amountUsd,
      payment_number: payment.payment_number,
    },
  });

  return {
    ok: true,
    paymentId: payment.id as string,
    paymentNumber: payment.payment_number as string,
    receiptNumber: payment.receipt_number as string,
    balanceBefore: before.outstanding,
    balanceAfter: after.outstanding,
  };
}

export const recordPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => internalInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    return writePayment(context, data, "internal");
  });

export const recordExternalPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => externalInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    return writePayment(context, { ...data, orderId: null }, "external");
  });

/** Duplicate check surfaced before saving so the UI can warn. */
export const checkDuplicateReference = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ agencyId: z.string().uuid(), reference: z.string().trim().min(1).max(120) })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { data: rows } = await context.supabase
      .from("payments")
      .select("id,payment_number,amount,currency_code,payment_date")
      .eq("agency_id", data.agencyId)
      .ilike("transaction_reference", data.reference)
      .limit(3);
    return { duplicates: rows ?? [] };
  });

export const reversePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ paymentId: z.string().uuid(), reason: z.string().trim().min(3).max(500) })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const sb = context.supabase;

    const { data: payment, error } = await sb
      .from("payments")
      .select("*")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    if (payment.status === "reversed") throw new Error("ALREADY_REVERSED");
    if (!payment.agency_id) throw new Error("AGENCY_NOT_FOUND");

    const { data: entry } = await sb
      .from("agency_ledger")
      .select("id")
      .eq("payment_id", payment.id)
      .eq("entry_type", "payment")
      .maybeSingle();

    await postEntry(sb, context.userId, {
      agency_id: payment.agency_id,
      entry_type: "reversal",
      debit: Number(payment.amount_usd),
      currency_code: "USD",
      description: `Reversal of ${payment.payment_number} — ${data.reason}`,
      reference: payment.payment_number,
      payment_id: payment.id,
      reverses_entry_id: entry?.id ?? null,
    });

    await sb
      .from("payments")
      .update({ status: "reversed", reversed_by: context.userId, notes: data.reason })
      .eq("id", payment.id);

    const after = await agencyBalance(sb, payment.agency_id, "USD");

    await sb.from("audit_logs").insert({
      actor_id: context.userId,
      action: "payment.reverse",
      entity: "payments",
      entity_id: payment.id,
      after_data: { reason: data.reason, outstanding: after.outstanding },
    });

    return { ok: true, outstanding: after.outstanding };
  });

export const financialAdjustment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        agencyId: z.string().uuid(),
        amount: z.coerce.number().positive().max(100_000_000),
        direction: z.enum(["debit", "credit"]),
        adjustmentType: z.enum(["opening", "adjustment", "settlement"]).default("adjustment"),
        reason: z.string().trim().min(3).max(500),
        notes: z.string().trim().max(2000).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const sb = context.supabase;
    const agency = await loadAgency(sb, data.agencyId);

    await postEntry(sb, context.userId, {
      agency_id: agency.id,
      entry_type: data.adjustmentType,
      debit: data.direction === "debit" ? data.amount : 0,
      credit: data.direction === "credit" ? data.amount : 0,
      currency_code: "USD",
      description: `${data.reason}${data.notes ? ` — ${data.notes}` : ""}`,
      reference: data.adjustmentType.toUpperCase(),
    });

    const after = await agencyBalance(sb, agency.id, "USD");

    await sb.from("audit_logs").insert({
      actor_id: context.userId,
      action: `ledger.${data.adjustmentType}`,
      entity: "agency_ledger",
      entity_id: agency.id,
      after_data: { ...data, outstanding: after.outstanding },
    });

    return { ok: true, outstanding: after.outstanding };
  });

const listInput = z.object({
  search: z.string().trim().max(120).optional().default(""),
  agencyId: z.string().uuid().optional().nullable(),
  type: z.enum(["all", "internal", "external"]).default("all"),
  method: z.string().max(40).optional().default(""),
  currency: z.string().max(6).optional().default(""),
  status: z.enum(["all", "recorded", "reversed"]).default("all"),
  from: z.string().max(10).optional().default(""),
  to: z.string().max(10).optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
});

export const listPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listInput.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const sb = context.supabase;
    const from = (data.page - 1) * data.pageSize;

    let q = sb
      .from("payments")
      .select("*, travel_agencies(agency_name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + data.pageSize - 1);

    if (data.agencyId) q = q.eq("agency_id", data.agencyId);
    if (data.type !== "all") q = q.eq("payment_type", data.type);
    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.method) q = q.eq("payment_method", data.method);
    if (data.currency) q = q.eq("currency_code", data.currency);
    if (data.from) q = q.gte("payment_date", data.from);
    if (data.to) q = q.lte("payment_date", data.to);
    if (data.search) {
      q = q.or(
        `payment_number.ilike.%${data.search}%,transaction_reference.ilike.%${data.search}%,receipt_number.ilike.%${data.search}%,payer_name.ilike.%${data.search}%`,
      );
    }

    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);

    return {
      rows: (rows ?? []).map((r: any) => ({ ...r, agency_name: r.travel_agencies?.agency_name ?? null })),
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    };
  });

/** Full receipt payload, including the balance before/after that payment. */
export const getPaymentReceipt = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ paymentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: payment, error } = await sb
      .from("payments")
      .select("*, travel_agencies(agency_name,email,phone)")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");

    // Balance after = ledger sum up to and including this payment's entry.
    const { data: entries } = await sb
      .from("agency_ledger")
      .select("debit,credit,created_at,payment_id")
      .eq("agency_id", payment.agency_id)
      .eq("currency_code", "USD")
      .order("created_at", { ascending: true });

    let running = 0;
    let balanceBefore = 0;
    let balanceAfter = 0;
    for (const e of entries ?? []) {
      const isThis = e.payment_id === payment.id;
      if (isThis) balanceBefore = Math.round(running * 100) / 100;
      running += Number(e.debit) - Number(e.credit);
      if (isThis) balanceAfter = Math.round(running * 100) / 100;
    }

    const { data: actor } = payment.recorded_by
      ? await sb.from("profiles").select("full_name,email").eq("id", payment.recorded_by).maybeSingle()
      : { data: null };

    return {
      payment: { ...payment, agency_name: payment.travel_agencies?.agency_name ?? null },
      balanceBefore,
      balanceAfter,
      recordedByName: actor?.full_name || actor?.email || null,
    };
  });

export const getPaymentReceiptUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string().min(3).max(400) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { data: signed, error } = await context.supabase.storage
      .from("receipts")
      .createSignedUrl(data.path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed?.signedUrl ?? null };
  });
