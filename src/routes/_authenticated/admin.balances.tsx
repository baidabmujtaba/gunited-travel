import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KpiCard } from "@/components/admin/AdminShell";
import { FinancialStateBadge, Section, TableWrap, useL } from "@/components/admin/Bilingual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { getAgencyStatement, listAgencyBalances } from "@/lib/statements.functions";

export const Route = createFileRoute("/_authenticated/admin/balances")({
  component: BalancesPage,
});

const ENTRY_LABELS: Record<string, [string, string]> = {
  opening: ["رصيد افتتاحي", "Opening"],
  charge: ["مديونية طلب", "Order charge"],
  payment: ["دفعة", "Payment"],
  adjustment: ["تسوية", "Adjustment"],
  reversal: ["حركة عكسية", "Reversal"],
  settlement: ["إغلاق", "Settlement"],
};

function BalancesPage() {
  const l = useL();
  const { fmt, lang } = useI18n();
  const [search, setSearch] = useState("");
  const [onlyOutstanding, setOnlyOutstanding] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [range, setRange] = useState({ from: "", to: "" });

  const balances = useServerFn(listAgencyBalances);
  const statement = useServerFn(getAgencyStatement);

  const { data, isPending } = useQuery({
    queryKey: ["admin-balances", search, onlyOutstanding],
    queryFn: () => balances({ data: { search, onlyOutstanding, currency: "USD" } }),
  });

  const { data: stmt, isPending: stmtPending } = useQuery({
    queryKey: ["admin-statement", selected, range],
    queryFn: () =>
      statement({ data: { agencyId: selected!, currency: "USD", from: range.from, to: range.to } }),
    enabled: Boolean(selected),
  });

  const rows = data?.rows ?? [];

  const exportCsv = () => {
    if (!stmt) return;
    const header = ["date", "type", "description", "reference", "debit", "credit", "balance"];
    const lines = stmt.entries.map((e: any) =>
      [
        new Date(e.created_at).toISOString().slice(0, 10),
        e.entry_type,
        (e.description ?? "").replace(/[",\n]/g, " "),
        e.reference ?? "",
        e.debit,
        e.credit,
        e.balance_after,
      ].join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `statement-${stmt.agency.agency_name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label={l("إجمالي المديونية", "Total due")} value={fmt(data?.totals.due ?? 0, "USD")} />
        <KpiCard label={l("إجمالي المسدد", "Total paid")} value={fmt(data?.totals.paid ?? 0, "USD")} />
        <KpiCard
          label={l("صافي المستحق", "Net outstanding")}
          value={fmt(data?.totals.outstanding ?? 0, "USD")}
        />
      </div>

      <Section
        title={l("أرصدة الوكالات", "Agency balances")}
        subtitle={l(
          "الرصيد محسوب من دفتر الحركات دائماً، وليس حقلاً محفوظاً.",
          "Every balance is derived from the ledger, never a stored column.",
        )}
        actions={
          <Button
            size="sm"
            variant={onlyOutstanding ? "default" : "outline"}
            onClick={() => setOnlyOutstanding(!onlyOutstanding)}
          >
            {l("المستحق فقط", "Outstanding only")}
          </Button>
        }
      >
        <Input
          className="mb-4 max-w-xs"
          placeholder={l("ابحث عن وكالة…", "Search agency…")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isPending ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <TableWrap>
            <table className="w-full min-w-[820px] text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">{l("الوكالة", "Agency")}</th>
                  <th className="px-3 py-2 text-start">{l("مديونية", "Due")}</th>
                  <th className="px-3 py-2 text-start">{l("مسدد", "Paid")}</th>
                  <th className="px-3 py-2 text-start">{l("المستحق", "Outstanding")}</th>
                  <th className="px-3 py-2 text-start">{l("حد الائتمان", "Credit limit")}</th>
                  <th className="px-3 py-2 text-start">{l("الحالة", "State")}</th>
                  <th className="px-3 py-2 text-end">{l("كشف الحساب", "Statement")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="px-3 py-3 font-semibold text-forest-deep">{r.agency_name}</td>
                    <td className="px-3 py-3">{fmt(r.totalDue, "USD")}</td>
                    <td className="px-3 py-3">{fmt(r.totalPaid, "USD")}</td>
                    <td className="px-3 py-3 font-bold">{fmt(r.outstanding, "USD")}</td>
                    <td className="px-3 py-3">{fmt(r.creditLimit, "USD")}</td>
                    <td className="px-3 py-3">
                      <FinancialStateBadge state={r.state} />
                    </td>
                    <td className="px-3 py-3 text-end">
                      <Button size="sm" variant="outline" onClick={() => setSelected(r.id)}>
                        {l("عرض", "Open")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Section>

      {selected ? (
        <Section
          title={l("كشف حساب", "Account statement")}
          subtitle={stmt?.agency.agency_name}
          actions={
            <>
              <Input
                type="date"
                className="w-40"
                value={range.from}
                onChange={(e) => setRange({ ...range, from: e.target.value })}
              />
              <Input
                type="date"
                className="w-40"
                value={range.to}
                onChange={(e) => setRange({ ...range, to: e.target.value })}
              />
              <Button size="sm" variant="outline" onClick={exportCsv}>
                CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                {l("طباعة", "Print")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelected(null)}>
                {l("إغلاق", "Close")}
              </Button>
            </>
          }
        >
          {stmtPending || !stmt ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <>
              <div className="mb-4 grid gap-3 sm:grid-cols-4">
                <KpiCard
                  label={l("رصيد افتتاحي", "Opening balance")}
                  value={fmt(stmt.openingBalance, "USD")}
                />
                <KpiCard label={l("مديونية", "Charges")} value={fmt(stmt.totals.totalDue, "USD")} />
                <KpiCard label={l("مسدد", "Payments")} value={fmt(stmt.totals.totalPaid, "USD")} />
                <KpiCard
                  label={l("رصيد ختامي", "Closing balance")}
                  value={fmt(stmt.closingBalance, "USD")}
                />
              </div>
              <TableWrap>
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-start">{l("التاريخ", "Date")}</th>
                      <th className="px-3 py-2 text-start">{l("الحركة", "Entry")}</th>
                      <th className="px-3 py-2 text-start">{l("الوصف", "Description")}</th>
                      <th className="px-3 py-2 text-start">{l("مدين", "Debit")}</th>
                      <th className="px-3 py-2 text-start">{l("دائن", "Credit")}</th>
                      <th className="px-3 py-2 text-start">{l("الرصيد", "Balance")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stmt.entries.map((e: any) => (
                      <tr key={e.id} className="border-t border-border/60">
                        <td className="px-3 py-2">{new Date(e.created_at).toLocaleDateString()}</td>
                        <td className="px-3 py-2">
                          {ENTRY_LABELS[e.entry_type]?.[lang === "ar" ? 0 : 1] ?? e.entry_type}
                        </td>
                        <td className="px-3 py-2">{e.description ?? "—"}</td>
                        <td className="px-3 py-2">{Number(e.debit) ? fmt(Number(e.debit), "USD") : "—"}</td>
                        <td className="px-3 py-2">
                          {Number(e.credit) ? fmt(Number(e.credit), "USD") : "—"}
                        </td>
                        <td className="px-3 py-2 font-semibold">{fmt(e.balance_after, "USD")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </>
          )}
        </Section>
      ) : null}
    </div>
  );
}
