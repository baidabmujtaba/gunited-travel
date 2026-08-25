import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { getInvoicePdfUrl, listInvoices, resendInvoice } from "@/lib/finance.functions";

export function InvoiceArchive() {
  const { t, fmt, lang } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const list = useQuery({
    queryKey: ["admin-invoices", search],
    queryFn: () => listInvoices({ data: { search } }),
  });

  const resend = useMutation({
    mutationFn: (orderId: string) => resendInvoice({ data: { orderId } }),
    onSuccess: (res: any) => {
      if (res?.emailSent) toast.success(t("admin.fin.resent"));
      else toast.warning(t("admin.fin.resent.failed"));
      void qc.invalidateQueries({ queryKey: ["admin-invoices"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const openPdf = useMutation({
    mutationFn: (path: string) => getInvoicePdfUrl({ data: { path } }),
    onSuccess: (res) => {
      if (res.url) window.open(res.url, "_blank", "noopener");
      else toast.error(t("common.error"));
    },
    onError: () => toast.error(t("common.error")),
  });

  return (
    <div className="surface-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("admin.fin.tab.invoices")}</h2>
        <Input
          className="w-full sm:w-72"
          placeholder={t("admin.fin.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {list.isPending ? (
        <Skeleton className="mt-5 h-64 w-full" />
      ) : (list.data ?? []).length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">{t("admin.fin.noinvoices")}</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-start">{t("admin.fin.invoice")}</th>
                <th className="px-3 py-2 text-start">{t("admin.orders.customer")}</th>
                <th className="px-3 py-2 text-start">{t("dash.amount")}</th>
                <th className="px-3 py-2 text-start">{t("admin.fin.paid")}</th>
                <th className="px-3 py-2 text-start">{t("admin.fin.email.sent")}</th>
                <th className="px-3 py-2 text-start">{t("dash.date")}</th>
                <th className="px-3 py-2 text-end" />
              </tr>
            </thead>
            <tbody>
              {(list.data ?? []).map((inv: any) => (
                <tr key={inv.id} className="border-t border-border/60">
                  <td className="px-3 py-3 font-semibold text-forest">{inv.invoice_number}</td>
                  <td className="px-3 py-3">{inv.customer_name ?? inv.customer_email ?? "—"}</td>
                  <td className="px-3 py-3">{fmt(Number(inv.total_display), inv.currency_code)}</td>
                  <td className="px-3 py-3">{fmt(Number(inv.paid_usd), "USD")}</td>
                  <td className="px-3 py-3">
                    <Badge
                      className={
                        inv.email_sent_at
                          ? "bg-mint text-forest-deep"
                          : "bg-beige text-muted-foreground"
                      }
                    >
                      {inv.email_sent_at ? t("admin.fin.email.sent") : t("admin.fin.email.pending")}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {new Date(inv.created_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB")}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to="/invoice/$number" params={{ number: inv.invoice_number }}>
                          {t("admin.fin.print")}
                        </Link>
                      </Button>
                      {inv.pdf_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPdf.mutate(inv.pdf_url)}
                        >
                          {t("admin.fin.pdf")}
                        </Button>
                      ) : null}
                      {inv.order_id ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={resend.isPending}
                          onClick={() => resend.mutate(inv.order_id)}
                        >
                          {t("admin.fin.resend")}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
