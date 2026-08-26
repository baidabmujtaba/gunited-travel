import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KpiCard } from "@/components/admin/AdminShell";
import { Section, TableWrap, useL } from "@/components/admin/Bilingual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { getMyStatement } from "@/lib/statements.functions";

export const Route = createFileRoute("/_authenticated/agency/statement")({
  component: AgencyStatement,
});

const ENTRY_LABELS: Record<string, [string, string]> = {
  opening: ["رصيد افتتاحي", "Opening"],
  charge: ["مديونية طلب", "Order charge"],
  payment: ["دفعة", "Payment"],
  adjustment: ["تسوية", "Adjustment"],
  reversal: ["حركة عكسية", "Reversal"],
  settlement: ["إغلاق", "Settlement"],
};

function AgencyStatement() {
  const l = useL();
  const { fmt, lang } = useI18n();
  const [range, setRange] = useState({ from: "", to: "" });

  const statement = useServerFn(getMyStatement);
  const { data, isPending } = useQuery({
    queryKey: ["agency-statement", range],
    queryFn: () => statement({ data: { currency: "USD", from: range.from, to: range.to } }),
  });

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["date", "type", "description", "reference", "debit", "credit", "balance"].join(","),
      ...data.entries.map((e: any) =>
        [
          new Date(e.created_at).toISOString().slice(0, 10),
          e.entry_type,
          (e.description ?? "").replace(/[",\n]/g, " "),
          e.reference ?? "",
          e.debit,
          e.credit,
          e.balance_after,
        ].join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([rows], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-statement.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Section
      title={l("كشف الحساب", "Account statement")}
      subtitle={data?.agency.agency_name}
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
        </>
      }
    >
      {isPending || !data ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            <KpiCard label={l("رصيد افتتاحي", "Opening")} value={fmt(data.openingBalance, "USD")} />
            <KpiCard label={l("مديونية", "Charges")} value={fmt(data.totals.totalDue, "USD")} />
            <KpiCard label={l("مسدد", "Payments")} value={fmt(data.totals.totalPaid, "USD")} />
            <KpiCard label={l("رصيد ختامي", "Closing")} value={fmt(data.closingBalance, "USD")} />
          </div>
          <TableWrap>
            <table className="w-full min-w-[780px] text-sm">
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
                {data.entries.map((e: any) => (
                  <tr key={e.id} className="border-t border-border/60">
                    <td className="px-3 py-2">{new Date(e.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2">
                      {ENTRY_LABELS[e.entry_type]?.[lang === "ar" ? 0 : 1] ?? e.entry_type}
                    </td>
                    <td className="px-3 py-2">{e.description ?? "—"}</td>
                    <td className="px-3 py-2">{Number(e.debit) ? fmt(Number(e.debit), "USD") : "—"}</td>
                    <td className="px-3 py-2">{Number(e.credit) ? fmt(Number(e.credit), "USD") : "—"}</td>
                    <td className="px-3 py-2 font-semibold">{fmt(e.balance_after, "USD")}</td>
                  </tr>
                ))}
                {data.entries.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                      {l("لا توجد حركات في هذه الفترة.", "No movements in this period.")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </TableWrap>
        </>
      )}
    </Section>
  );
}
