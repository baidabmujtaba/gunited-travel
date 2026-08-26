import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./admin.shared";
import { financialState } from "./ledger.server";

const round = (n: number) => Math.round(n * 100) / 100;
const CONFIRMED = ["payment_confirmed", "processing", "completed"];

const agencyInput = z.object({
  id: z.string().uuid().optional(),
  agency_name: z.string().trim().min(2).max(160),
  contact_name: z.string().trim().max(160).optional().default(""),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().default(""),
  whatsapp: z.string().trim().max(40).optional().default(""),
  city: z.string().trim().max(160).optional().default(""),
  license_number: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  credit_limit_usd: z.coerce.number().min(0).max(100_000_000).default(0),
  warning_percent: z.coerce.number().min(1).max(100).default(80),
  currency_code: z.string().trim().max(6).default("USD"),
  is_active: z.boolean().default(true),
  financial_hold: z.boolean().default(false),
});

export const listAgencies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        search: z.string().trim().max(120).optional().default(""),
        status: z.enum(["all", "active", "inactive"]).default("all"),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const sb = context.supabase;

    let q = sb.from("travel_agencies").select("*").is("deleted_at", null).order("agency_name");
    if (data.search) q = q.or(`agency_name.ilike.%${data.search}%,email.ilike.%${data.search}%`);
    if (data.status !== "all") q = q.eq("is_active", data.status === "active");

    const [{ data: agencies, error }, { data: ledger }, { data: orders }, { data: customers }] =
      await Promise.all([
        q,
        sb.from("agency_ledger").select("agency_id,debit,credit").eq("currency_code", "USD"),
        sb.from("service_orders").select("agency_id,status,amount_usd").is("deleted_at", null),
        sb.from("customers").select("agency_id"),
      ]);
    if (error) throw new Error(error.message);

    const agg = new Map<string, { due: number; paid: number }>();
    for (const l of ledger ?? []) {
      const cur = agg.get(l.agency_id) ?? { due: 0, paid: 0 };
      cur.due += Number(l.debit);
      cur.paid += Number(l.credit);
      agg.set(l.agency_id, cur);
    }

    return (agencies ?? []).map((a: any) => {
      const f = agg.get(a.id) ?? { due: 0, paid: 0 };
      const outstanding = round(f.due - f.paid);
      const limit = Number(a.credit_limit_usd) || 0;
      const mine = (orders ?? []).filter((o: any) => o.agency_id === a.id);
      return {
        ...a,
        customers: (customers ?? []).filter((c: any) => c.agency_id === a.id).length,
        orders: mine.length,
        salesUsd: round(
          mine.filter((o: any) => CONFIRMED.includes(o.status)).reduce((s: number, o: any) => s + Number(o.amount_usd), 0),
        ),
        totalDue: round(f.due),
        totalPaid: round(f.paid),
        outstanding,
        creditAvailable: round(Math.max(0, limit - outstanding)),
        state: financialState(outstanding, limit, Number(a.warning_percent), Boolean(a.financial_hold)),
      };
    });
  });

export const saveAgency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => agencyInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const sb = context.supabase;
    const { id, ...payload } = data;
    const row = { ...payload, email: payload.email || null };

    if (id) {
      const { error } = await sb.from("travel_agencies").update(row as any).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb
        .from("travel_agencies")
        .insert({ ...row, created_by: context.userId } as any);
      if (error) throw new Error(error.message);
    }

    await sb.from("audit_logs").insert({
      actor_id: context.userId,
      action: id ? "agency.update" : "agency.create",
      entity: "travel_agencies",
      entity_id: id ?? null,
      after_data: row as any,
    });
    return { ok: true };
  });

export const setAgencyActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), isActive: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("travel_agencies")
      .update({ is_active: data.isActive })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      action: data.isActive ? "agency.activate" : "agency.deactivate",
      entity: "travel_agencies",
      entity_id: data.id,
    });
    return { ok: true };
  });

export const archiveAgency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("travel_agencies")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      action: "agency.archive",
      entity: "travel_agencies",
      entity_id: data.id,
    });
    return { ok: true };
  });

function strongPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

/**
 * Creates a real login for an agency. The generated password is returned once so
 * staff can hand it over; the agency must change it at first sign-in.
 */
export const createAgencyLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ agencyId: z.string().uuid(), email: z.string().trim().email() })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("FORBIDDEN");

    const { data: agency } = await context.supabase
      .from("travel_agencies")
      .select("id,agency_name")
      .eq("id", data.agencyId)
      .maybeSingle();
    if (!agency) throw new Error("AGENCY_NOT_FOUND");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const password = strongPassword();

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: agency.agency_name },
    });
    if (error) throw new Error(error.message);
    const userId = created.user?.id;
    if (!userId) throw new Error("USER_NOT_CREATED");

    await supabaseAdmin
      .from("profiles")
      .update({
        agency_id: agency.id,
        is_agency: true,
        must_change_password: true,
        full_name: agency.agency_name,
        email: data.email,
      })
      .eq("id", userId);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "travel_agency" });
    await supabaseAdmin
      .from("travel_agencies")
      .update({ user_id: userId, email: data.email })
      .eq("id", agency.id);

    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      action: "agency.login.create",
      entity: "travel_agencies",
      entity_id: agency.id,
      after_data: { email: data.email },
    });

    return { ok: true, email: data.email, password };
  });

export const resetAgencyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ agencyId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("FORBIDDEN");

    const { data: agency } = await context.supabase
      .from("travel_agencies")
      .select("id,user_id,email")
      .eq("id", data.agencyId)
      .maybeSingle();
    if (!agency?.user_id) throw new Error("NO_LOGIN");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const password = strongPassword();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(agency.user_id, { password });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ must_change_password: true }).eq("id", agency.user_id);

    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      action: "agency.password.reset",
      entity: "travel_agencies",
      entity_id: agency.id,
    });
    return { ok: true, email: agency.email as string | null, password };
  });

/** Full detail payload for the agency profile page tabs. */
export const getAgencyDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const sb = context.supabase;

    const { data: agency, error } = await sb
      .from("travel_agencies")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!agency) throw new Error("AGENCY_NOT_FOUND");

    const [{ data: customers }, { data: orders }, { data: payments }, { data: ledger }, { data: logs }] =
      await Promise.all([
        sb
          .from("customers")
          .select("id,full_name,email,phone,city,created_at")
          .eq("agency_id", agency.id)
          .order("created_at", { ascending: false }),
        sb
          .from("service_orders")
          .select(
            "id,tracking_id,status,amount_usd,amount_display,currency_code,created_at,customer_name,offer_id",
          )
          .eq("agency_id", agency.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        sb
          .from("payments")
          .select("*")
          .eq("agency_id", agency.id)
          .order("created_at", { ascending: false }),
        sb.from("agency_ledger").select("*").eq("agency_id", agency.id).order("created_at"),
        sb
          .from("audit_logs")
          .select("id,action,actor_email,created_at,after_data")
          .eq("entity_id", agency.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

    const due = (ledger ?? []).reduce((s: number, l: any) => s + Number(l.debit), 0);
    const paid = (ledger ?? []).reduce((s: number, l: any) => s + Number(l.credit), 0);
    const outstanding = round(due - paid);
    const limit = Number(agency.credit_limit_usd) || 0;

    let running = 0;
    const statement = (ledger ?? []).map((l: any) => {
      running += Number(l.debit) - Number(l.credit);
      return { ...l, balance_after: round(running) };
    });

    const mine = orders ?? [];
    return {
      agency,
      finance: {
        totalDue: round(due),
        totalPaid: round(paid),
        outstanding,
        creditLimit: limit,
        creditAvailable: round(Math.max(0, limit - outstanding)),
        salesUsd: round(
          mine.filter((o: any) => CONFIRMED.includes(o.status)).reduce((s: number, o: any) => s + Number(o.amount_usd), 0),
        ),
        ordersCount: mine.length,
        lastPayment: (payments ?? [])[0] ?? null,
        state: financialState(outstanding, limit, Number(agency.warning_percent), Boolean(agency.financial_hold)),
      },
      customers: customers ?? [],
      orders: mine,
      payments: payments ?? [],
      statement,
      activity: logs ?? [],
    };
  });

/** Agency options for pickers (payments, filters). */
export const agencyOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data } = await context.supabase
      .from("travel_agencies")
      .select("id,agency_name,currency_code")
      .is("deleted_at", null)
      .order("agency_name");
    return data ?? [];
  });
