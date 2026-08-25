import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Wordmark } from "@/components/brand/Wordmark";
import { useI18n } from "@/lib/i18n";
import { getInvoice } from "@/lib/finance.functions";

export const Route = createFileRoute("/_authenticated/invoice/$number")({
  component: InvoicePage,
  head: () => ({
    meta: [
      { title: "Invoice · Gunited Travel" },
      {
        name: "description",
        content: "Printable Gunited Travel invoice with the full price breakdown and payment details.",
      },
      { property: "og:title", content: "Invoice · Gunited Travel" },
      {
        property: "og:description",
        content: "Printable Gunited Travel invoice with the full price breakdown and payment details.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function InvoicePage() {
  const { number } = Route.useParams();
  const { t, fmt, lang } = useI18n();
  const query = useQuery({
    queryKey: ["invoice", number],
    queryFn: () => getInvoice({ data: { number } }),
  });

  if (query.isPending) return <Skeleton className="mx-auto mt-10 h-[60vh] w-full max-w-3xl" />;

  const inv: any = query.data?.invoice;
  if (!inv) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">
        {t("invoice.notfound")}
      </div>
    );
  }
  const order: any = query.data?.order;
  const method: any = query.data?.method;
  const title = order?.offer
    ? lang === "ar"
      ? order.offer.title_ar
      : order.offer.title_en
    : t("invoice.title");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 print:py-0">
      <div className="mb-4 flex justify-end print:hidden">
        <Button
          className="bg-forest text-white hover:bg-forest-deep"
          onClick={() => window.print()}
        >
          {t("admin.fin.print")}
        </Button>
      </div>

      <article className="rounded-2xl border border-border/60 bg-card p-8 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-6">
          <Wordmark />
          <div className="text-end">
            <h1 className="text-xl font-bold text-forest-deep">{t("invoice.title")}</h1>
            <p className="font-mono text-sm text-forest">{inv.invoice_number}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("invoice.issued")}:{" "}
              {new Date(inv.created_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB")}
            </p>
          </div>
        </header>

        <section className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("invoice.billto")}
            </h2>
            <p className="mt-2 font-semibold text-forest-deep">{inv.customer_name ?? "—"}</p>
            <p className="text-sm text-muted-foreground">{inv.customer_email ?? "—"}</p>
            {order?.whatsapp ? (
              <p className="text-sm text-muted-foreground">{order.whatsapp}</p>
            ) : null}
          </div>
          <div className="sm:text-end">
            {order?.tracking_id ? (
              <p className="text-sm">
                <span className="text-muted-foreground">{t("invoice.order")}: </span>
                <span className="font-mono">{order.tracking_id}</span>
              </p>
            ) : null}
            {method ? (
              <p className="text-sm">
                <span className="text-muted-foreground">{t("invoice.method")}: </span>
                {lang === "ar" ? method.name_ar : method.name_en}
              </p>
            ) : null}
          </div>
        </section>

        <table className="w-full border-t border-border/60 text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-3 text-start">{t("invoice.desc")}</th>
              <th className="py-3 text-end">{t("dash.amount")}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border/50">
              <td className="py-3">{title}</td>
              <td className="py-3 text-end">
                {fmt(Number(inv.subtotal_usd) * Number(inv.frozen_rate), inv.currency_code)}
              </td>
            </tr>
            {Number(inv.tax_usd) > 0 ? (
              <tr className="border-t border-border/50">
                <td className="py-3">{t("invoice.tax")}</td>
                <td className="py-3 text-end">
                  {fmt(Number(inv.tax_usd) * Number(inv.frozen_rate), inv.currency_code)}
                </td>
              </tr>
            ) : null}
            {Number(inv.discount_usd) > 0 ? (
              <tr className="border-t border-border/50">
                <td className="py-3">{t("offer.discount")}</td>
                <td className="py-3 text-end">
                  −{fmt(Number(inv.discount_usd) * Number(inv.frozen_rate), inv.currency_code)}
                </td>
              </tr>
            ) : null}
            <tr className="border-t-2 border-forest/30">
              <td className="py-4 font-bold text-forest-deep">{t("invoice.total")}</td>
              <td className="py-4 text-end text-lg font-bold text-forest-deep">
                {fmt(Number(inv.total_display), inv.currency_code)}
              </td>
            </tr>
            {inv.currency_code !== "USD" ? (
              <tr>
                <td className="pb-3 text-xs text-muted-foreground">{t("invoice.usd")}</td>
                <td className="pb-3 text-end text-xs text-muted-foreground">
                  {fmt(Number(inv.total_usd), "USD")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <footer className="mt-6 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          {t("invoice.thanks")}
        </footer>
      </article>
    </div>
  );
}
