import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeDollarSign, ShoppingBag, Users, Wallet } from "lucide-react";
import { StatusBadge } from "@/components/admin/AdminShell";
import { FinancialStateBadge, Section, TableWrap, useL } from "@/components/admin/Bilingual";
import {
  DashboardSkeleton,
  PageHeader,
  StatGrid,
  StatTile,
  StatusBreakdownCard,
  TrendCard,
} from "@/components/admin/DashboardKit";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { getAgencyOverview } from "@/lib/agency.functions";

export const Route = createFileRoute("/_authenticated/agency/")({
  component: AgencyHome,
});

function AgencyHome() {
  const l = useL();
  const { fmt } = useI18n();
  const overview = useServerFn(getAgencyOverview);
  const { data, isPending, isError } = useQuery({
    queryKey: ["agency-overview"],
    queryFn: () => overview(),
    staleTime: 60_000,
  });

  if (isPending) return <DashboardSkeleton />;
  // Never leave an endless skeleton when the request fails.
  if (isError || !data)
    return (
      <div className="surface-card mx-auto max-w-lg p-10 text-center text-sm text-muted-foreground">
        {l(
          "تعذر تحميل بيانات الوكالة. يرجى تحديث الصفحة أو التواصل مع الإدارة إذا استمرت المشكلة.",
          "Could not load your agency data. Refresh the page, or contact an administrator if this continues.",
        )}
      </div>
    );

  const usage = data.kpis.creditLimit
    ? (data.kpis.outstanding / data.kpis.creditLimit) * 100
    : undefined;

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={data.agency.name}
        subtitle={l(
          "بوابة الوكالة — بياناتك معزولة تماماً عن الوكالات الأخرى.",
          "Agency portal — your data is fully isolated from other agencies.",
        )}
        badge={<FinancialStateBadge state={data.state} />}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/catalog">{l("اطلب خدمة", "Order a service")}</Link>
          </Button>
        }
      />

      <StatGrid>
        <StatTile
          label={l("عملائي", "My customers")}
          value={String(data.kpis.customers)}
          icon={Users}
          tone="sage"
        />
        <StatTile
          label={l("الطلبات", "Orders")}
          value={String(data.kpis.orders)}
          hint={`${data.kpis.ordersCompleted} ${l("مكتمل", "completed")} · ${data.kpis.ordersNew} ${l("جديد", "new")}`}
          icon={ShoppingBag}
          tone="forest"
        />
        <StatTile
          label={l("مبيعاتي", "My sales")}
          value={fmt(data.kpis.salesUsd, "USD")}
          icon={BadgeDollarSign}
          tone="mint"
        />
        <StatTile
          label={l("المستحق عليّ", "Outstanding")}
          value={fmt(data.kpis.outstanding, "USD")}
          hint={`${l("المتاح", "Available")}: ${fmt(data.kpis.creditAvailable, "USD")}`}
          icon={Wallet}
          tone={usage !== undefined && usage >= 90 ? "destructive" : "gold"}
          {...(usage !== undefined ? { progress: usage } : {})}
        />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <TrendCard
          title={l("مبيعاتي الشهرية", "Monthly sales")}
          subtitle={l("آخر 6 أشهر (دولار)", "Last 6 months (USD)")}
          data={data.monthlySales}
          empty={l("لا توجد مبيعات بعد.", "No sales yet.")}
        />
        <StatusBreakdownCard
          title={l("توزيع الطلبات", "Orders by status")}
          subtitle={l("الحالة الحالية لطلباتك", "Current state of your orders")}
          byStatus={data.byStatus}
          empty={l("لا توجد طلبات بعد.", "No orders yet.")}
        />
      </div>

      <Section title={l("أحدث الطلبات", "Latest orders")}>
        <TableWrap>
          <table className="w-full min-w-[620px] text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start">{l("الطلب", "Order")}</th>
                <th className="px-3 py-2 text-start">{l("العميل", "Customer")}</th>
                <th className="px-3 py-2 text-start">{l("المبلغ", "Amount")}</th>
                <th className="px-3 py-2 text-start">{l("الحالة", "Status")}</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((o: any) => (
                <tr key={o.id} className="border-t border-border/60 transition-colors hover:bg-beige/50">
                  <td className="px-3 py-2 font-mono text-xs">{o.tracking_id}</td>
                  <td className="px-3 py-2">{o.customer_name}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {fmt(Number(o.amount_display), o.currency_code)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Section>

      <Section title={l("أحدث الدفعات", "Latest payments")}>
        <TableWrap>
          <table className="w-full min-w-[620px] text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start">{l("الرقم", "Number")}</th>
                <th className="px-3 py-2 text-start">{l("المبلغ", "Amount")}</th>
                <th className="px-3 py-2 text-start">{l("الطريقة", "Method")}</th>
                <th className="px-3 py-2 text-start">{l("التاريخ", "Date")}</th>
              </tr>
            </thead>
            <tbody>
              {data.recentPayments.map((p: any) => (
                <tr key={p.id} className="border-t border-border/60 transition-colors hover:bg-beige/50">
                  <td className="px-3 py-2 font-mono text-xs">{p.payment_number ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{fmt(Number(p.amount), p.currency_code)}</td>
                  <td className="px-3 py-2">{p.payment_method}</td>
                  <td className="px-3 py-2">{p.payment_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Section>
    </div>
  );
}
