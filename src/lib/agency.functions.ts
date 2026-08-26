import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { financialState } from "./ledger.server";

const round = (n: number) => Math.round(n * 100) / 100;
const CONFIRMED = ["payment_confirmed", "processing", "completed"];

/** Resolves the caller's agency from their profile. The client never sends an agency id. */
async function myAgency(context: { supabase: any; userId: string }) {
  const { data: profile } = await context.supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", context.userId)
    .maybeSingle();
  if (!profile?.agency_id) throw new Error("NO_AGENCY");
  const { data: agency } = await context.supabase
    .from("travel_agencies")
    .select("*")
    .eq("id", profile.agency_id)
    .maybeSingle();
  if (!agency) throw new Error("NO_AGENCY");
  return agency;
}

export const getAgencyOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const agency = await myAgency(context);

    const [{ data: customers }, { data: orders }, { data: ledger }, { data: payments }] =
      await Promise.all([
        sb.from("customers").select("id").eq("agency_id", agency.id),
        sb
          .from("service_orders")
          .select("id,tracking_id,status,amount_usd,amount_display,currency_code,created_at,customer_name")
          .eq("agency_id", agency.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(200),
        sb.from("agency_ledger").select("debit,credit").eq("agency_id", agency.id).eq("currency_code", "USD"),
        sb
          .from("payments")
          .select("id,payment_number,amount,currency_code,payment_date,payment_method,status")
          .eq("agency_id", agency.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

    const due = (ledger ?? []).reduce((s: number, l: any) => s + Number(l.debit), 0);
    const paid = (ledger ?? []).reduce((s: number, l: any) => s + Number(l.credit), 0);
    const outstanding = round(due - paid);
    const limit = Number(agency.credit_limit_usd) || 0;
    const all = orders ?? [];

    return {
      agency: {
        id: agency.id,
        name: agency.agency_name,
        currency: agency.currency_code,
        isActive: agency.is_active,
      },
      kpis: {
        customers: (customers ?? []).length,
        orders: all.length,
        ordersNew: all.filter((o: any) => o.status === "submitted").length,
        ordersProcessing: all.filter((o: any) => ["payment_confirmed", "processing"].includes(o.status))
          .length,
        ordersCompleted: all.filter((o: any) => o.status === "completed").length,
        salesUsd: round(
          all.filter((o: any) => CONFIRMED.includes(o.status)).reduce((s: number, o: any) => s + Number(o.amount_usd), 0),
        ),
        totalDue: round(due),
        totalPaid: round(paid),
        outstanding,
        creditLimit: limit,
        creditAvailable: round(Math.max(0, limit - outstanding)),
      },
      state: financialState(
        outstanding,
        limit,
        Number(agency.warning_percent),
        Boolean(agency.financial_hold),
      ),
      recentOrders: all.slice(0, 8),
      recentPayments: payments ?? [],
    };
  });

export const listAgencyCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ search: z.string().trim().max(120).optional().default("") }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const agency = await myAgency(context);
    let q = context.supabase
      .from("customers")
      .select("id,full_name,email,phone,whatsapp,city,created_at")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: false });
    if (data.search) q = q.ilike("full_name", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createAgencyCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        full_name: z.string().trim().min(2).max(160),
        email: z.string().trim().email().optional().or(z.literal("")),
        phone: z.string().trim().max(40).optional().default(""),
        whatsapp: z.string().trim().max(40).optional().default(""),
        city: z.string().trim().max(120).optional().default(""),
        notes: z.string().trim().max(2000).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const agency = await myAgency(context);
    const { error } = await context.supabase.from("customers").insert({
      ...data,
      email: data.email || null,
      agency_id: agency.id,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      action: "customer.create",
      entity: "customers",
      after_data: { agency_id: agency.id, full_name: data.full_name },
    });
    return { ok: true };
  });

export const listAgencyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        search: z.string().trim().max(120).optional().default(""),
        status: z.string().max(30).optional().default(""),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(5).max(100).default(25),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const agency = await myAgency(context);
    const from = (data.page - 1) * data.pageSize;
    let q = context.supabase
      .from("service_orders")
      .select(
        "id,tracking_id,status,currency_code,amount_display,amount_usd,created_at,customer_name,customer_email,offer_id",
        { count: "exact" },
      )
      .eq("agency_id", agency.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(from, from + data.pageSize - 1);
    if (data.status) q = q.eq("status", data.status as any);
    if (data.search)
      q = q.or(`tracking_id.ilike.%${data.search}%,customer_name.ilike.%${data.search}%`);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

export const listMyAgencyPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agency = await myAgency(context);
    const { data, error } = await context.supabase
      .from("payments")
      .select("*")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
