import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./admin.shared";
import { financialState } from "./ledger.server";

const round = (n: number) => Math.round(n * 100) / 100;

const statementInput = z.object({
  agencyId: z.string().uuid(),
  currency: z.string().max(6).default("USD"),
  from: z.string().max(10).optional().default(""),
  to: z.string().max(10).optional().default(""),
  entryType: z.string().max(20).optional().default(""),
});

/** Builds a running-balance statement. Staff see any agency; agency users only their own (RLS). */
async function buildStatement(sb: any, data: z.infer<typeof statementInput>) {
  const { data: agency } = await sb
    .from("travel_agencies")
    .select("id,agency_name,credit_limit_usd,warning_percent,financial_hold,currency_code")
    .eq("id", data.agencyId)
    .maybeSingle();
  if (!agency) throw new Error("AGENCY_NOT_FOUND");

  const { data: all, error } = await sb
    .from("agency_ledger")
    .select("*")
    .eq("agency_id", data.agencyId)
    .eq("currency_code", data.currency)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = all ?? [];
  let running = 0;
  const withBalance = rows.map((r: any) => {
    running += Number(r.debit) - Number(r.credit);
    return { ...r, balance_after: round(running) };
  });

  const fromTs = data.from ? new Date(`${data.from}T00:00:00Z`).getTime() : null;
  const toTs = data.to ? new Date(`${data.to}T23:59:59Z`).getTime() : null;

  const opening = withBalance
    .filter((r: any) => (fromTs ? new Date(r.created_at).getTime() < fromTs : false))
    .reduce((s: number, r: any) => s + Number(r.debit) - Number(r.credit), 0);

  const entries = withBalance.filter((r: any) => {
    const ts = new Date(r.created_at).getTime();
    if (fromTs && ts < fromTs) return false;
    if (toTs && ts > toTs) return false;
    if (data.entryType && r.entry_type !== data.entryType) return false;
    return true;
  });

  const totalDue = rows.reduce((s: number, r: any) => s + Number(r.debit), 0);
  const totalPaid = rows.reduce((s: number, r: any) => s + Number(r.credit), 0);
  const outstanding = round(totalDue - totalPaid);

  return {
    agency,
    currency: data.currency,
    openingBalance: round(opening),
    entries,
    closingBalance: round(running),
    totals: { totalDue: round(totalDue), totalPaid: round(totalPaid), outstanding },
    state: financialState(
      outstanding,
      Number(agency.credit_limit_usd),
      Number(agency.warning_percent),
      Boolean(agency.financial_hold),
    ),
  };
}

export const getAgencyStatement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => statementInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    return buildStatement(context.supabase, data);
  });

/** Agency-side statement: the agency id comes from the session, never the client. */
export const getMyStatement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        currency: z.string().max(6).default("USD"),
        from: z.string().max(10).optional().default(""),
        to: z.string().max(10).optional().default(""),
        entryType: z.string().max(20).optional().default(""),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("agency_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.agency_id) throw new Error("NO_AGENCY");
    return buildStatement(context.supabase, { ...data, agencyId: profile.agency_id });
  });

export const listAgencyBalances = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        search: z.string().trim().max(120).optional().default(""),
        currency: z.string().max(6).default("USD"),
        onlyOutstanding: z.boolean().default(false),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const sb = context.supabase;

    let aq = sb
      .from("travel_agencies")
      .select("id,agency_name,email,phone,credit_limit_usd,warning_percent,is_active,financial_hold")
      .is("deleted_at", null)
      .order("agency_name");
    if (data.search) aq = aq.ilike("agency_name", `%${data.search}%`);

    const [{ data: agencies, error }, { data: ledger }] = await Promise.all([
      aq,
      sb.from("agency_ledger").select("agency_id,debit,credit,created_at").eq("currency_code", data.currency),
    ]);
    if (error) throw new Error(error.message);

    const byAgency = new Map<string, { due: number; paid: number; last: string | null }>();
    for (const l of ledger ?? []) {
      const cur = byAgency.get(l.agency_id) ?? { due: 0, paid: 0, last: null };
      cur.due += Number(l.debit);
      cur.paid += Number(l.credit);
      if (!cur.last || l.created_at > cur.last) cur.last = l.created_at;
      byAgency.set(l.agency_id, cur);
    }

    const rows = (agencies ?? []).map((a: any) => {
      const agg = byAgency.get(a.id) ?? { due: 0, paid: 0, last: null };
      const outstanding = round(agg.due - agg.paid);
      const limit = Number(a.credit_limit_usd) || 0;
      return {
        ...a,
        currency: data.currency,
        totalDue: round(agg.due),
        totalPaid: round(agg.paid),
        outstanding,
        creditLimit: limit,
        creditAvailable: round(Math.max(0, limit - outstanding)),
        lastMovementAt: agg.last,
        state: financialState(outstanding, limit, Number(a.warning_percent), Boolean(a.financial_hold)),
      };
    });

    const filtered = data.onlyOutstanding ? rows.filter((r) => r.outstanding > 0) : rows;

    return {
      rows: filtered,
      totals: {
        due: round(filtered.reduce((s, r) => s + r.totalDue, 0)),
        paid: round(filtered.reduce((s, r) => s + r.totalPaid, 0)),
        outstanding: round(filtered.reduce((s, r) => s + r.outstanding, 0)),
      },
    };
  });
