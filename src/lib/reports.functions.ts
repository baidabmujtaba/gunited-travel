import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./admin.shared";

const round = (n: number) => Math.round(n * 100) / 100;
const CONFIRMED = ["payment_confirmed", "processing", "completed"];

const rangeInput = z.object({
  from: z.string().max(10).optional().default(""),
  to: z.string().max(10).optional().default(""),
  agencyId: z.string().uuid().optional().nullable(),
  currency: z.string().max(6).default("USD"),
});

function inRange(iso: string, from: string, to: string) {
  const ts = new Date(iso).getTime();
  if (from && ts < new Date(`${from}T00:00:00Z`).getTime()) return false;
  if (to && ts > new Date(`${to}T23:59:59Z`).getTime()) return false;
  return true;
}

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

/** One aggregated payload powering the whole reports centre and the admin charts. */
export const getReportsData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeInput.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const sb = context.supabase;

    const [
      { data: orders },
      { data: payments },
      { data: agencies },
      { data: customers },
      { data: offers },
      { data: ledger },
    ] = await Promise.all([
      sb
        .from("service_orders")
        .select(
          "id,tracking_id,status,amount_usd,created_at,agency_id,offer_id,customer_email,customer_name",
        )
        .order("created_at", { ascending: false })
        .limit(5000),
      sb
        .from("payments")
        .select("id,agency_id,amount_usd,currency_code,payment_type,payment_method,payment_date,status,created_at")
        .limit(5000),
      sb.from("travel_agencies").select("id,agency_name,is_active,credit_limit_usd,warning_percent,financial_hold").is("deleted_at", null),
      sb.from("customers").select("id,agency_id,created_at"),
      sb.from("service_offers").select("id,title_en,title_ar").is("deleted_at", null),
      sb.from("agency_ledger").select("agency_id,debit,credit,currency_code"),
    ]);

    const agencyName = new Map((agencies ?? []).map((a: any) => [a.id, a.agency_name]));
    const offerTitle = new Map((offers ?? []).map((o: any) => [o.id, { en: o.title_en, ar: o.title_ar }]));

    const scopedOrders = (orders ?? []).filter(
      (o: any) =>
        inRange(o.created_at, data.from, data.to) && (!data.agencyId || o.agency_id === data.agencyId),
    );
    const scopedPayments = (payments ?? []).filter(
      (p: any) =>
        p.status === "recorded" &&
        inRange(p.created_at, data.from, data.to) &&
        (!data.agencyId || p.agency_id === data.agencyId),
    );

    const sold = scopedOrders.filter((o: any) => CONFIRMED.includes(o.status));

    const daily = new Map<string, number>();
    for (const o of sold) daily.set(dayKey(o.created_at), (daily.get(dayKey(o.created_at)) ?? 0) + Number(o.amount_usd));

    const monthly = new Map<string, number>();
    for (const o of sold) {
      const k = o.created_at.slice(0, 7);
      monthly.set(k, (monthly.get(k) ?? 0) + Number(o.amount_usd));
    }

    const byStatus = new Map<string, number>();
    for (const o of scopedOrders) byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1);

    const byService = new Map<string, { count: number; usd: number }>();
    for (const o of sold) {
      const k = o.offer_id ?? "other";
      const cur = byService.get(k) ?? { count: 0, usd: 0 };
      cur.count += 1;
      cur.usd += Number(o.amount_usd);
      byService.set(k, cur);
    }

    const byAgency = new Map<string, { orders: number; usd: number; paid: number }>();
    for (const o of scopedOrders) {
      if (!o.agency_id) continue;
      const cur = byAgency.get(o.agency_id) ?? { orders: 0, usd: 0, paid: 0 };
      cur.orders += 1;
      if (CONFIRMED.includes(o.status)) cur.usd += Number(o.amount_usd);
      byAgency.set(o.agency_id, cur);
    }
    for (const p of scopedPayments) {
      if (!p.agency_id) continue;
      const cur = byAgency.get(p.agency_id) ?? { orders: 0, usd: 0, paid: 0 };
      cur.paid += Number(p.amount_usd);
      byAgency.set(p.agency_id, cur);
    }

    const ledgerByAgency = new Map<string, { due: number; paid: number }>();
    for (const l of (ledger ?? []).filter((l: any) => l.currency_code === data.currency)) {
      const cur = ledgerByAgency.get(l.agency_id) ?? { due: 0, paid: 0 };
      cur.due += Number(l.debit);
      cur.paid += Number(l.credit);
      ledgerByAgency.set(l.agency_id, cur);
    }

    const newCustomers = new Map<string, number>();
    for (const c of customers ?? []) {
      if (!inRange(c.created_at, data.from, data.to)) continue;
      const k = c.created_at.slice(0, 10);
      newCustomers.set(k, (newCustomers.get(k) ?? 0) + 1);
    }

    return {
      kpis: {
        agencies: (agencies ?? []).length,
        activeAgencies: (agencies ?? []).filter((a: any) => a.is_active).length,
        inactiveAgencies: (agencies ?? []).filter((a: any) => !a.is_active).length,
        customers: (customers ?? []).length,
        services: (offers ?? []).length,
        orders: scopedOrders.length,
        ordersNew: scopedOrders.filter((o: any) => o.status === "submitted").length,
        ordersReview: scopedOrders.filter((o: any) => o.status === "payment_pending").length,
        ordersProcessing: scopedOrders.filter((o: any) => o.status === "processing").length,
        ordersCompleted: scopedOrders.filter((o: any) => o.status === "completed").length,
        ordersCancelled: scopedOrders.filter((o: any) =>
          ["cancelled", "rejected"].includes(o.status),
        ).length,
        salesUsd: round(sold.reduce((s: number, o: any) => s + Number(o.amount_usd), 0)),
        paidUsd: round(scopedPayments.reduce((s: number, p: any) => s + Number(p.amount_usd), 0)),
        dueUsd: round([...ledgerByAgency.values()].reduce((s, v) => s + v.due, 0)),
        outstandingUsd: round([...ledgerByAgency.values()].reduce((s, v) => s + v.due - v.paid, 0)),
      },
      charts: {
        dailySales: [...daily.entries()].sort().map(([date, usd]) => ({ date, usd: round(usd) })),
        monthlySales: [...monthly.entries()].sort().map(([month, usd]) => ({ month, usd: round(usd) })),
        ordersByStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })),
        newCustomers: [...newCustomers.entries()].sort().map(([date, count]) => ({ date, count })),
        topServices: [...byService.entries()]
          .map(([id, v]) => ({ id, title: offerTitle.get(id) ?? null, ...v, usd: round(v.usd) }))
          .sort((a, b) => b.usd - a.usd)
          .slice(0, 8),
        topAgencies: [...byAgency.entries()]
          .map(([id, v]) => ({
            id,
            name: agencyName.get(id) ?? "—",
            ...v,
            usd: round(v.usd),
            paid: round(v.paid),
          }))
          .sort((a, b) => b.usd - a.usd)
          .slice(0, 8),
      },
      agencyBalances: (agencies ?? []).map((a: any) => {
        const agg = ledgerByAgency.get(a.id) ?? { due: 0, paid: 0 };
        return {
          id: a.id,
          name: a.agency_name,
          due: round(agg.due),
          paid: round(agg.paid),
          outstanding: round(agg.due - agg.paid),
          creditLimit: Number(a.credit_limit_usd) || 0,
        };
      }),
      payments: scopedPayments.map((p: any) => ({
        ...p,
        agency_name: agencyName.get(p.agency_id) ?? "—",
      })),
      orders: scopedOrders.slice(0, 500).map((o: any) => ({
        ...o,
        agency_name: o.agency_id ? (agencyName.get(o.agency_id) ?? "—") : "—",
        offer: offerTitle.get(o.offer_id) ?? null,
      })),
      currency: data.currency,
    };
  });
