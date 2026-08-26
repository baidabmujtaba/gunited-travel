import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KpiCard, StatusBadge } from "@/components/admin/AdminShell";
import { Section, TableWrap, useL } from "@/components/admin/Bilingual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { agencyOptions } from "@/lib/agencies.functions";
import { getReportsData } from "@/lib/reports.functions";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: ReportsPage,
});

type Tab = "sales" | "orders" | "balances" | "payments";

function Bars({ data, valueKey, labelKey }: { data: any[]; valueKey: string; labelKey: string }) {
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey])));
  return (
    <div className="space-y-2">
      {data.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : null}
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3 text-xs">
          <span className="w-28 shrink-0 truncate text-muted-foreground">{String(d[labelKey])}</span>
          <div className="h-3 flex-1 rounded-full bg-beige">
            <div
              className="h-3 rounded-full bg-forest"
              style={{ width: `${(Number(d[valueKey]) / max) * 100}%` }}
            />
          </div>
          <span className="w-24 shrink-0 text-end font-semibold">
            {Number(d[valueKey]).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function download(name: string, rows: (string | number)[][]) {
  const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportsPage() {
  const l = useL();
  const { fmt } = useI18n();
  const [tab, setTab] = useState<Tab>("sales");
  const [filters, setFilters] = useState({ from: "", to: "", agencyId: "" });

  const reports = useServerFn(getReportsData);
  const options = useServerFn(agencyOptions);
  const { data: agencies } = useQuery({ queryKey: ["agency-options"], queryFn: () => options() });
  const { data, isPending } = useQuery({
    queryKey: ["admin-reports", filters],
    queryFn: () =>
      reports({
        data: {
          from: filters.from,
          to: filters.to,
          agencyId: filters.agencyId || null,
          currency: "USD",
        },
      }),
  });

  const TABS: [Tab, string][] = [
    ["sales", l("المبيعات", "Sales")],
    ["orders", l("الطلبات", "Orders")],
    ["balances", l("الأرصدة", "Balances")],
    ["payments", l("المدفوعات", "Payments")],
  ];

  return (
    <div className="space-y-6">
      <Section
        title={l("مركز التقارير", "Reports centre")}
        subtitle={l(
          "كل الأرقام محسوبة على الخادم من البيانات الحقيقية، مع تصدير CSV.",
          "Every figure is aggregated server-side from live data, with CSV export.",
        )}
        actions={
          <>
            <Input
              type="date"
              className="w-40"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
            <Input
              type="date"
              className="w-40"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={filters.agencyId}
              onChange={(e) => setFilters({ ...filters, agencyId: e.target.value })}
            >
              <option value="">{l("كل الوكالات", "All agencies")}</option>
              {(agencies ?? []).map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.agency_name}
                </option>
              ))}
            </select>
          </>
        }
      >
        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label={l("المبيعات", "Sales")} value={fmt(data?.kpis.salesUsd ?? 0, "USD")} />
          <KpiCard label={l("المحصّل", "Collected")} value={fmt(data?.kpis.paidUsd ?? 0, "USD")} />
          <KpiCard
            label={l("المستحق", "Outstanding")}
            value={fmt(data?.kpis.outstandingUsd ?? 0, "USD")}
          />
          <KpiCard
            label={l("الطلبات", "Orders")}
            value={String(data?.kpis.orders ?? 0)}
            hint={`${data?.kpis.ordersCompleted ?? 0} ${l("مكتمل", "completed")}`}
          />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={tab === key ? "default" : "outline"}
              onClick={() => setTab(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        {isPending || !data ? (
          <Skeleton className="h-64 w-full" />
        ) : tab === "sales" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-forest-deep">
                {l("المبيعات الشهرية (USD)", "Monthly sales (USD)")}
              </h3>
              <Bars data={data.charts.monthlySales} labelKey="month" valueKey="usd" />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-forest-deep">
                {l("أكثر الخدمات مبيعاً", "Top services")}
              </h3>
              <Bars
                data={data.charts.topServices.map((s: any) => ({
                  label: s.title?.en ?? "—",
                  usd: s.usd,
                }))}
                labelKey="label"
                valueKey="usd"
              />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-forest-deep">
                {l("أعلى الوكالات", "Top agencies")}
              </h3>
              <Bars
                data={data.charts.topAgencies.map((a: any) => ({ label: a.name, usd: a.usd }))}
                labelKey="label"
                valueKey="usd"
              />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-forest-deep">
                {l("عملاء جدد", "New customers")}
              </h3>
              <Bars data={data.charts.newCustomers} labelKey="date" valueKey="count" />
            </div>
            <div className="lg:col-span-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  download("sales.csv", [
                    ["month", "usd"],
                    ...data.charts.monthlySales.map((m: any) => [m.month, m.usd]),
                  ])
                }
              >
                {l("تصدير المبيعات", "Export sales")}
              </Button>
            </div>
          </div>
        ) : tab === "orders" ? (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  download("orders.csv", [
                    ["tracking", "status", "agency", "amount_usd", "created_at"],
                    ...data.orders.map((o: any) => [
                      o.tracking_id ?? o.id,
                      o.status,
                      (o.agency_name ?? "").replace(/,/g, " "),
                      o.amount_usd,
                      o.created_at,
                    ]),
                  ])
                }
              >
                {l("تصدير الطلبات", "Export orders")}
              </Button>
            </div>
            <TableWrap>
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-start">{l("الطلب", "Order")}</th>
                    <th className="px-3 py-2 text-start">{l("العميل", "Customer")}</th>
                    <th className="px-3 py-2 text-start">{l("الوكالة", "Agency")}</th>
                    <th className="px-3 py-2 text-start">{l("المبلغ", "Amount")}</th>
                    <th className="px-3 py-2 text-start">{l("الحالة", "Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.slice(0, 100).map((o: any) => (
                    <tr key={o.id} className="border-t border-border/60">
                      <td className="px-3 py-2 font-mono text-xs">{o.tracking_id}</td>
                      <td className="px-3 py-2">{o.customer_name}</td>
                      <td className="px-3 py-2">{o.agency_name}</td>
                      <td className="px-3 py-2">{fmt(Number(o.amount_usd), "USD")}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </>
        ) : tab === "balances" ? (
          <TableWrap>
            <table className="w-full min-w-[600px] text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">{l("الوكالة", "Agency")}</th>
                  <th className="px-3 py-2 text-start">{l("مديونية", "Due")}</th>
                  <th className="px-3 py-2 text-start">{l("مسدد", "Paid")}</th>
                  <th className="px-3 py-2 text-start">{l("المستحق", "Outstanding")}</th>
                  <th className="px-3 py-2 text-start">{l("حد الائتمان", "Limit")}</th>
                </tr>
              </thead>
              <tbody>
                {data.agencyBalances.map((a: any) => (
                  <tr key={a.id} className="border-t border-border/60">
                    <td className="px-3 py-2">{a.name}</td>
                    <td className="px-3 py-2">{fmt(a.due, "USD")}</td>
                    <td className="px-3 py-2">{fmt(a.paid, "USD")}</td>
                    <td className="px-3 py-2 font-semibold">{fmt(a.outstanding, "USD")}</td>
                    <td className="px-3 py-2">{fmt(a.creditLimit, "USD")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <>
            <div className="mb-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  download("payments.csv", [
                    ["agency", "amount_usd", "method", "type", "date"],
                    ...data.payments.map((p: any) => [
                      (p.agency_name ?? "").replace(/,/g, " "),
                      p.amount_usd,
                      p.payment_method,
                      p.payment_type,
                      p.payment_date,
                    ]),
                  ])
                }
              >
                {l("تصدير المدفوعات", "Export payments")}
              </Button>
            </div>
            <TableWrap>
              <table className="w-full min-w-[600px] text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-start">{l("الوكالة", "Agency")}</th>
                    <th className="px-3 py-2 text-start">{l("المبلغ", "Amount")}</th>
                    <th className="px-3 py-2 text-start">{l("الطريقة", "Method")}</th>
                    <th className="px-3 py-2 text-start">{l("النوع", "Type")}</th>
                    <th className="px-3 py-2 text-start">{l("التاريخ", "Date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p: any) => (
                    <tr key={p.id} className="border-t border-border/60">
                      <td className="px-3 py-2">{p.agency_name}</td>
                      <td className="px-3 py-2">{fmt(Number(p.amount_usd), "USD")}</td>
                      <td className="px-3 py-2">{p.payment_method}</td>
                      <td className="px-3 py-2">{p.payment_type}</td>
                      <td className="px-3 py-2">{p.payment_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </>
        )}
      </Section>
    </div>
  );
}
