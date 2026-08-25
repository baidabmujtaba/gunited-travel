import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { KpiCard } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExchangeRatePanel } from "@/components/admin/ExchangeRatePanel";
import { PaymentMethodsPanel } from "@/components/admin/PaymentMethodsPanel";
import { InvoiceArchive } from "@/components/admin/InvoiceArchive";
import { getFinanceBoard } from "@/lib/admin.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/finance")({
  component: FinanceHub,
});

function FinanceHub() {
  const { t, fmt, lang } = useI18n();
  const query = useQuery({ queryKey: ["admin-finance"], queryFn: () => getFinanceBoard() });
  const d = query.data;

  if (query.isPending || !d) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const maxMonth = Math.max(1, ...d.monthly.map(([, v]: [string, number]) => v));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-forest-deep">{t("admin.tab.finance")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("offer.rate.note")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t("admin.fin.collected")} value={fmt(d.collectedUsd, "USD")} />
        <KpiCard label={t("admin.fin.outstanding")} value={fmt(d.outstandingUsd, "USD")} />
        <KpiCard label={t("admin.fin.invoices")} value={String(d.invoices.length)} />
        <KpiCard label={t("admin.fin.methods")} value={String(d.methods.length)} />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">{t("admin.fin.tab.overview")}</TabsTrigger>
          <TabsTrigger value="invoices">{t("admin.fin.tab.invoices")}</TabsTrigger>
          <TabsTrigger value="methods">{t("admin.fin.tab.methods")}</TabsTrigger>
          <TabsTrigger value="rates">{t("admin.fin.tab.rates")}</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <InvoiceArchive />
        </TabsContent>
        <TabsContent value="methods">
          <PaymentMethodsPanel />
        </TabsContent>
        <TabsContent value="rates">
          <ExchangeRatePanel />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="surface-card p-5">
          <h2 className="text-lg font-semibold">{t("admin.fin.monthly")}</h2>
          {d.monthly.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">{t("admin.people.empty")}</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {d.monthly.map(([month, value]: [string, number]) => (
                <li key={month} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-muted-foreground">{month}</span>
                  <div className="h-2.5 flex-1 rounded-full bg-beige">
                    <div
                      className="h-2.5 rounded-full bg-forest"
                      style={{ width: `${Math.round((value / maxMonth) * 100)}%` }}
                    />
                  </div>
                  <span className="w-24 text-end text-xs font-semibold">{fmt(value, "USD")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface-card p-5">
          <h2 className="text-lg font-semibold">{t("admin.fin.bycurrency")}</h2>
          <ul className="mt-5 space-y-2 text-sm">
            {Object.entries(d.byCurrency).map(([code, value]) => (
              <li key={code} className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="font-medium">{code}</span>
                <span className="font-semibold">{fmt(Number(value), "USD")}</span>
              </li>
            ))}
            {Object.keys(d.byCurrency).length === 0 ? (
              <li className="text-muted-foreground">{t("admin.people.empty")}</li>
            ) : null}
          </ul>

          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("admin.fin.rates")}
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {d.rates.map((r: any) => (
              <li key={r.currency_code} className="flex items-center justify-between">
                <span>{r.currency_code}</span>
                <span className="font-semibold">{Number(r.rate_per_usd).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="surface-card p-5">
        <h2 className="text-lg font-semibold">{t("admin.fin.invoices")}</h2>
        {d.invoices.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("admin.fin.noinvoices")}
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 text-start">{t("admin.fin.invoice")}</th>
                  <th className="px-3 py-2 text-start">{t("admin.orders.customer")}</th>
                  <th className="px-3 py-2 text-start">{t("dash.amount")}</th>
                  <th className="px-3 py-2 text-start">{t("admin.fin.paid")}</th>
                  <th className="px-3 py-2 text-start">{t("dash.status")}</th>
                  <th className="px-3 py-2 text-start">{t("dash.date")}</th>
                </tr>
              </thead>
              <tbody>
                {d.invoices.map((inv: any) => (
                  <tr key={inv.id} className="border-t border-border/60">
                    <td className="px-3 py-3 font-semibold text-forest">{inv.invoice_number}</td>
                    <td className="px-3 py-3">{inv.customer_name ?? inv.customer_email ?? "—"}</td>
                    <td className="px-3 py-3">
                      {fmt(Number(inv.total_display), inv.currency_code)}
                    </td>
                    <td className="px-3 py-3">{fmt(Number(inv.paid_usd), "USD")}</td>
                    <td className="px-3 py-3">
                      <Badge className="bg-mint text-forest-deep">{inv.status}</Badge>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {new Date(inv.created_at).toLocaleDateString(
                        lang === "ar" ? "ar-EG" : "en-GB",
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
