import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KpiCard } from "@/components/admin/AdminShell";
import { FinancialStateBadge, Section, TableWrap, useL } from "@/components/admin/Bilingual";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { getAgencyOverview, listMyAgencyPayments } from "@/lib/agency.functions";

export const Route = createFileRoute("/_authenticated/agency/balance")({
  component: AgencyBalance,
});

function AgencyBalance() {
  const l = useL();
  const { fmt } = useI18n();
  const overview = useServerFn(getAgencyOverview);
  const payments = useServerFn(listMyAgencyPayments);

  const { data, isPending } = useQuery({ queryKey: ["agency-overview"], queryFn: () => overview() });
  const { data: pays } = useQuery({ queryKey: ["agency-payments"], queryFn: () => payments() });

  if (isPending || !data) return <Skeleton className="h-96 w-full" />;

  const used = data.kpis.creditLimit
    ? Math.min(100, (data.kpis.outstanding / data.kpis.creditLimit) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={l("إجمالي المديونية", "Total charges")} value={fmt(data.kpis.totalDue, "USD")} />
        <KpiCard label={l("إجمالي المسدد", "Total paid")} value={fmt(data.kpis.totalPaid, "USD")} />
        <KpiCard label={l("المستحق", "Outstanding")} value={fmt(data.kpis.outstanding, "USD")} />
        <KpiCard
          label={l("حد الائتمان", "Credit limit")}
          value={fmt(data.kpis.creditLimit, "USD")}
          hint={`${l("المتاح", "Available")}: ${fmt(data.kpis.creditAvailable, "USD")}`}
        />
      </div>

      <Section
        title={l("حالة الائتمان", "Credit status")}
        actions={
          <>
            <FinancialStateBadge state={data.state} />
            <Button asChild size="sm" variant="outline">
              <Link to="/agency/statement">{l("كشف الحساب", "Statement")}</Link>
            </Button>
          </>
        }
      >
        <div className="h-3 w-full rounded-full bg-beige">
          <div
            className={`h-3 rounded-full ${used >= 100 ? "bg-destructive" : used >= 80 ? "bg-gold" : "bg-forest"}`}
            style={{ width: `${used}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {l(
            `مستخدم ${used.toFixed(0)}% من حد الائتمان.`,
            `${used.toFixed(0)}% of your credit limit is used.`,
          )}
        </p>
      </Section>

      <Section title={l("دفعاتي", "My payments")}>
        <TableWrap>
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start">{l("الرقم", "Number")}</th>
                <th className="px-3 py-2 text-start">{l("المبلغ", "Amount")}</th>
                <th className="px-3 py-2 text-start">{l("بالدولار", "USD")}</th>
                <th className="px-3 py-2 text-start">{l("الطريقة", "Method")}</th>
                <th className="px-3 py-2 text-start">{l("المرجع", "Reference")}</th>
                <th className="px-3 py-2 text-start">{l("الحالة", "Status")}</th>
                <th className="px-3 py-2 text-start">{l("التاريخ", "Date")}</th>
              </tr>
            </thead>
            <tbody>
              {(pays ?? []).map((p: any) => (
                <tr key={p.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-mono text-xs">{p.payment_number ?? "—"}</td>
                  <td className="px-3 py-2">{fmt(Number(p.amount), p.currency_code)}</td>
                  <td className="px-3 py-2">{fmt(Number(p.amount_usd), "USD")}</td>
                  <td className="px-3 py-2">{p.payment_method}</td>
                  <td className="px-3 py-2">{p.transaction_reference ?? "—"}</td>
                  <td className="px-3 py-2">{p.status}</td>
                  <td className="px-3 py-2">{p.payment_date}</td>
                </tr>
              ))}
              {(pays ?? []).length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={7}>
                    {l("لا توجد دفعات مسجلة.", "No payments recorded yet.")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </TableWrap>
      </Section>
    </div>
  );
}
