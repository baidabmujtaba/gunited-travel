import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KpiCard, StatusBadge } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  getAdminOverview,
  getReceiptUrl,
  listAdminOrders,
  saveOrderNotes,
  updateOrderStatus,
} from "@/lib/admin.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: SalesHub,
});

const STATUSES = [
  "submitted",
  "payment_pending",
  "payment_confirmed",
  "processing",
  "completed",
  "cancelled",
  "rejected",
] as const;

function SalesHub() {
  const { t, fmt, lang } = useI18n();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: () => getAdminOverview() });
  const orders = useQuery({
    queryKey: ["admin-orders", status, search],
    queryFn: () => listAdminOrders({ data: { status, search } }),
  });

  useEffect(() => {
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_orders" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
        void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const rows = orders.data ?? [];
  const o = overview.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-forest-deep">{t("admin.tab.sales")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin.subtitle")}</p>
      </div>

      {overview.isPending || !o ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label={t("admin.kpi.orders")} value={String(o.totalOrders)} />
          <KpiCard label={t("admin.kpi.review")} value={String(o.awaitingReview)} />
          <KpiCard label={t("admin.kpi.revenue")} value={fmt(o.revenueUsd, "USD")} />
          <KpiCard label={t("admin.kpi.pipeline")} value={fmt(o.pipelineUsd, "USD")} />
        </div>
      )}

      <div className="surface-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">{t("admin.orders.title")}</h2>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.orders.search")}
              className="w-56"
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("admin.orders.filter")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.orders.all")}</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`status.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {orders.isPending ? (
          <div className="mt-5 space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            {t("admin.orders.empty")}
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {rows.map((row: any) => (
              <li key={row.id} className="rounded-xl border border-border/70 bg-background p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-44 flex-1">
                    <p className="font-bold tracking-wide text-forest">{row.tracking_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")}
                    </p>
                  </div>
                  <div className="min-w-40">
                    <p className="text-xs text-muted-foreground">{t("admin.orders.customer")}</p>
                    <p className="text-sm font-medium">{row.customer_name}</p>
                  </div>
                  <div className="min-w-40">
                    <p className="text-xs text-muted-foreground">{t("admin.orders.service")}</p>
                    <p className="text-sm font-medium">
                      {(lang === "ar" ? row.offer_title_ar : row.offer_title_en) ?? "—"}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {fmt(Number(row.amount_display), row.currency_code)}
                  </p>
                  <StatusBadge status={row.status} />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpenId(openId === row.id ? null : row.id)}
                  >
                    {t("admin.orders.manage")}
                  </Button>
                </div>
                {openId === row.id ? <OrderPanel row={row} /> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function OrderPanel({ row }: { row: any }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [next, setNext] = useState<string>(row.status);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState(row.internal_notes ?? "");

  const statusMutation = useMutation({
    mutationFn: () =>
      updateOrderStatus({ data: { orderId: row.id, status: next as any, note: note || undefined } }),
    onSuccess: () => {
      toast.success(t("admin.orders.updated"));
      setNote("");
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const notesMutation = useMutation({
    mutationFn: () => saveOrderNotes({ data: { orderId: row.id, notes } }),
    onSuccess: () => toast.success(t("admin.orders.saved")),
    onError: () => toast.error(t("common.error")),
  });

  const receiptMutation = useMutation({
    mutationFn: () => getReceiptUrl({ data: { path: row.receipt_path } }),
    onSuccess: (res) => {
      if (res.url) window.open(res.url, "_blank", "noopener");
      else toast.error(t("common.error"));
    },
    onError: () => toast.error(t("common.error")),
  });

  return (
    <div className="mt-4 grid gap-5 border-t border-border/70 pt-4 md:grid-cols-2">
      <div className="space-y-3">
        <div className="text-sm">
          <p className="text-xs text-muted-foreground">{t("admin.people.contact")}</p>
          <p>{row.customer_email}</p>
          <a
            className="text-forest underline"
            href={`https://wa.me/${String(row.whatsapp).replace(/[^\d]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {row.whatsapp}
          </a>
        </div>
        <div className="text-sm">
          <p className="text-xs text-muted-foreground">{t("admin.orders.reference")}</p>
          <p className="font-medium">{row.transaction_reference ?? "—"}</p>
        </div>
        {row.receipt_path ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => receiptMutation.mutate()}
            disabled={receiptMutation.isPending}
          >
            {t("admin.orders.receipt")}
          </Button>
        ) : null}
        <div>
          <p className="mb-1 text-xs text-muted-foreground">{t("admin.orders.internal")}</p>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => notesMutation.mutate()}
            disabled={notesMutation.isPending}
          >
            {t("admin.orders.save")}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">{t("admin.orders.setstatus")}</p>
          <Select value={next} onValueChange={setNext}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`status.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">{t("admin.orders.note")}</p>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <Button
          onClick={() => statusMutation.mutate()}
          disabled={statusMutation.isPending || next === row.status}
        >
          {t("admin.orders.setstatus")}
        </Button>
      </div>
    </div>
  );
}
