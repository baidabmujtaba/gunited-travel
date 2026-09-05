import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  deleteOrderDocument,
  getOrderDocumentUrl,
  listOrderDocumentHistory,
  listOrderDocuments,
  replaceOrderDocument,
} from "@/lib/order-docs.functions";
import { toast } from "sonner";
import { StatusBadge } from "@/components/admin/AdminShell";
import { BadgeDollarSign, Clock, ShoppingBag, TrendingUp } from "lucide-react";
import {
  DashboardSkeleton,
  PageHeader,
  StatGrid,
  StatTile,
  StatusBreakdownCard,
  TrendCard,
} from "@/components/admin/DashboardKit";
import { OpsAlerts } from "@/components/admin/OpsAlerts";

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
  archiveOrder,
  getAdminOverview,
  getReceiptUrl,
  listAdminOrders,
  saveOrderNotes,
  updateOrderStatus,
} from "@/lib/admin.functions";
import { useI18n } from "@/lib/i18n";
import { getOrderNotificationHistory } from "@/lib/email-monitor.functions";

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

  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => getAdminOverview(),
    staleTime: 60_000,
  });
  const orders = useQuery({
    queryKey: ["admin-orders", status, search],
    queryFn: () => listAdminOrders({ data: { status, search } }),
    staleTime: 30_000,
    // Keep the previous page visible while filters change instead of flashing skeletons.
    placeholderData: (prev) => prev,
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
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={t("admin.tab.sales")} subtitle={t("admin.subtitle")} />

      {overview.isPending || !o ? (
        <DashboardSkeleton />
      ) : (
        <>
          <StatGrid>
            <StatTile
              label={t("admin.kpi.orders")}
              value={String(o.totalOrders)}
              icon={ShoppingBag}
              tone="forest"
            />
            <StatTile
              label={t("admin.kpi.review")}
              value={String(o.awaitingReview)}
              icon={Clock}
              tone={o.awaitingReview > 0 ? "gold" : "sage"}
            />
            <StatTile
              label={t("admin.kpi.revenue")}
              value={fmt(o.revenueUsd, "USD")}
              icon={BadgeDollarSign}
              tone="mint"
            />
            <StatTile
              label={t("admin.kpi.pipeline")}
              value={fmt(o.pipelineUsd, "USD")}
              icon={TrendingUp}
              tone="gold"
            />
          </StatGrid>

          <div className="grid gap-4 lg:grid-cols-2">
            <TrendCard
              title={lang === "ar" ? "الإيرادات الشهرية" : "Monthly revenue"}
              subtitle={lang === "ar" ? "آخر 6 أشهر (دولار)" : "Last 6 months (USD)"}
              data={o.monthlyRevenue}
              empty={lang === "ar" ? "لا توجد إيرادات بعد." : "No revenue yet."}
            />
            <StatusBreakdownCard
              title={lang === "ar" ? "توزيع الطلبات" : "Orders by status"}
              subtitle={lang === "ar" ? "حالة خط العمل الحالي" : "Current pipeline state"}
              byStatus={o.byStatus}
              empty={lang === "ar" ? "لا توجد طلبات بعد." : "No orders yet."}
            />
          </div>
        </>
      )}

      <OpsAlerts />


      <div className="surface-card p-4 sm:p-5">
        <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
          <h2 className="truncate text-base font-bold text-forest-deep sm:text-lg">
            {t("admin.orders.title")}
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:ms-auto sm:flex sm:flex-wrap sm:items-center">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.orders.search")}
              className="w-full sm:w-56"
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-48">
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
                  <div className="min-w-52 flex-1">
                    <p className="text-xs text-muted-foreground">{t("admin.orders.service")}</p>
                    <p className="text-sm font-medium">
                      {(lang === "ar" ? row.offer_path_ar : row.offer_path_en)?.length
                        ? (lang === "ar" ? row.offer_path_ar : row.offer_path_en).join(" › ")
                        : ((lang === "ar" ? row.offer_title_ar : row.offer_title_en) ?? "—")}
                    </p>
                    <RequestSummary row={row} />
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

/** Full breakdown of the customer's request inside the manage panel. */
function RequestDetailBlock({ row }: { row: any }) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const d = row.request_details;
  const path: string[] = (ar ? row.offer_path_ar : row.offer_path_en) ?? [];
  const lines: { label: string; value: string }[] = [];
  if (path.length) lines.push({ label: ar ? "الباقة" : "Package", value: path.join(" › ") });
  if (d?.travellers?.total) {
    lines.push({
      label: ar ? "المسافرون" : "Travellers",
      value: ar
        ? `${d.travellers.adults} بالغ · ${d.travellers.children} طفل · ${d.travellers.infants} رضيع`
        : `${d.travellers.adults} adult(s) · ${d.travellers.children} child(ren) · ${d.travellers.infants} infant(s)`,
    });
  }
  if (d?.rooms?.length) {
    lines.push({
      label: ar ? "الغرف" : "Rooms",
      value: d.rooms
        .map((r: any) => `${r.qty}× ${ar ? r.name_ar || r.name_en : r.name_en || r.name_ar}`)
        .join(", "),
    });
  }
  if (d?.travel_date) lines.push({ label: ar ? "تاريخ السفر" : "Travel date", value: d.travel_date });
  if (d?.return_date) lines.push({ label: ar ? "تاريخ العودة" : "Return date", value: d.return_date });
  if (d?.nationality) lines.push({ label: ar ? "الجنسية" : "Nationality", value: d.nationality });
  if (d?.destination) lines.push({ label: ar ? "الوجهة" : "Destination", value: d.destination });
  if (d?.extras?.length) {
    lines.push({
      label: ar ? "خدمات إضافية" : "Extra services",
      value: d.extras
        .map((e: any) => (ar ? e.name_ar || e.name_en : e.name_en || e.name_ar))
        .join(", "),
    });
  }
  if (d?.coupon) lines.push({ label: ar ? "كوبون" : "Coupon", value: d.coupon });
  if (d?.customer_notes) {
    lines.push({ label: ar ? "ملاحظات العميل" : "Customer notes", value: d.customer_notes });
  }
  if (lines.length === 0) return null;
  return (
    <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">
        {ar ? "تفاصيل الطلب" : "Request details"}
      </p>
      <dl className="space-y-1 text-sm">
        {lines.map((l) => (
          <div key={l.label} className="flex flex-wrap gap-x-2">
            <dt className="text-xs text-muted-foreground">{l.label}:</dt>
            <dd className="font-medium">{l.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Compact chips describing exactly what the customer requested. */
function RequestSummary({ row }: { row: any }) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const d = row.request_details;
  if (!d) return null;
  const chips: string[] = [];
  if (d.travellers?.total) {
    chips.push(ar ? `${d.travellers.total} مسافر` : `${d.travellers.total} traveller(s)`);
  }
  for (const r of d.rooms ?? []) {
    chips.push(`${r.qty}× ${ar ? r.name_ar || r.name_en : r.name_en || r.name_ar}`);
  }
  if (d.travel_date) chips.push(ar ? `المغادرة ${d.travel_date}` : `Departure ${d.travel_date}`);
  if (d.nationality) chips.push(ar ? `الجنسية ${d.nationality}` : `Nationality ${d.nationality}`);
  if (d.destination) chips.push(ar ? `الوجهة ${d.destination}` : `Destination ${d.destination}`);
  for (const e of d.extras ?? []) {
    chips.push(`+ ${ar ? e.name_ar || e.name_en : e.name_en || e.name_ar}`);
  }
  if (d.coupon) chips.push(ar ? `كوبون ${d.coupon}` : `Coupon ${d.coupon}`);
  if (chips.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {chips.map((c) => (
        <span
          key={c}
          className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
        >
          {c}
        </span>
      ))}
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

  const archiveMutation = useMutation({
    mutationFn: () => archiveOrder({ data: { orderId: row.id, reason: note || undefined } }),
    onSuccess: () => {
      toast.success(t("admin.orders.archived"));
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
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
        <RequestDetailBlock row={row} />
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
        <OrderDocuments orderId={row.id} />
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

        {["completed", "cancelled", "rejected"].includes(row.status) ? (
          <div className="rounded-lg border border-border/70 bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">{t("admin.orders.archive.hint")}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 text-destructive"
              disabled={archiveMutation.isPending}
              onClick={() => {
                if (window.confirm(t("admin.orders.archive.confirm"))) archiveMutation.mutate();
              }}
            >
              {t("admin.orders.archive")}
            </Button>
          </div>
        ) : null}

        <OrderNotificationHistory orderId={row.id} />
      </div>
    </div>
  );
}

/** Read-only trail of the automatic emails the backend sent for this order. */
function OrderNotificationHistory({ orderId }: { orderId: string }) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const q = useQuery({
    queryKey: ["order-notifications", orderId],
    queryFn: () => getOrderNotificationHistory({ data: { orderId } }),
  });

  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
      <p className="text-xs font-semibold text-forest-deep">
        {ar ? "سجل الإشعارات التلقائية" : "Automatic notification history"}
      </p>
      {q.isLoading ? (
        <p className="mt-1 text-xs text-muted-foreground">{ar ? "جارٍ التحميل…" : "Loading…"}</p>
      ) : (q.data ?? []).length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {ar ? "لا توجد إشعارات لهذا الطلب." : "No notifications for this order."}
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-xs">
          {(q.data ?? []).map((l: any) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{l.recipient ?? "—"}</span>
              <span className="text-muted-foreground">
                {(l.previous_status ?? "—") + " → " + l.new_status}
              </span>
              <span
                className={
                  l.status === "sent"
                    ? "text-forest"
                    : l.status === "pending"
                      ? "text-muted-foreground"
                      : "text-destructive"
                }
              >
                {l.status}
                {l.retry_count ? ` (${l.retry_count})` : ""}
              </span>
              <span className="text-muted-foreground">
                {new Date(l.sent_at ?? l.created_at).toLocaleString(ar ? "ar-EG" : "en-GB")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


/** Documents the customer uploaded for this order, opened via short-lived links. */
function OrderDocuments({ orderId }: { orderId: string }) {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const docs = useQuery({
    queryKey: ["order-docs", orderId],
    queryFn: () => listOrderDocuments({ data: { orderId } }),
  });
  const history = useQuery({
    queryKey: ["order-docs-history", orderId],
    queryFn: () => listOrderDocumentHistory({ data: { orderId } }),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["order-docs", orderId] });
    void queryClient.invalidateQueries({ queryKey: ["order-docs-history", orderId] });
  };

  const remove = useMutation({
    mutationFn: (documentId: string) => deleteOrderDocument({ data: { documentId } }),
    onSuccess: () => {
      toast.success(t("order.docs.deleted"));
      refresh();
    },
    onError: () => toast.error(t("common.error")),
  });

  const replace = useMutation({
    mutationFn: async ({ documentId, file }: { documentId: string; file: File }) => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) throw new Error("NO_SESSION");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${uid}/${Date.now()}-replacement.${ext}`;
      const { error } = await supabase.storage
        .from("order-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error(error.message);
      return replaceOrderDocument({ data: { documentId, path, name: file.name } });
    },
    onSuccess: () => {
      toast.success(t("order.docs.replaced"));
      refresh();
    },
    onError: () => toast.error(t("common.error")),
    onSettled: () => setBusyId(null),
  });
  const open = useMutation({
    mutationFn: (path: string) => getOrderDocumentUrl({ data: { path } }),
    onSuccess: (res) => {
      if (res.url) window.open(res.url, "_blank", "noopener");
      else toast.error(t("common.error"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const download = useMutation({
    mutationFn: (doc: { path: string; name: string }) =>
      getOrderDocumentUrl({ data: { path: doc.path, download: doc.name || true } }),
    onSuccess: (res) => {
      if (!res.url) {
        toast.error(t("common.error"));
        return;
      }
      const a = document.createElement("a");
      a.href = res.url;
      a.rel = "noopener";
      a.click();
    },
    onError: () => toast.error(t("common.error")),
  });

  const rows = docs.data ?? [];

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t("order.docs")}</p>
        {rows.length > 1 ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={download.isPending}
            onClick={() => {
              rows.forEach((d, i) => {
                window.setTimeout(
                  () =>
                    download.mutate({
                      path: d.file_path,
                      name: d.file_name ?? `${d.doc_key || "document"}`,
                    }),
                  i * 400,
                );
              });
            }}
          >
            {t("order.docs.downloadAll")}
          </Button>
        ) : null}
      </div>
      {rows.length > 0 ? (
        <ul className="space-y-1.5">
          {rows.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="truncate">{lang === "ar" ? d.label_ar : d.label_en}</span>
              <span className="flex shrink-0 flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => open.mutate(d.file_path)}>
                  {t("order.docs.view")}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={download.isPending}
                  onClick={() =>
                    download.mutate({
                      path: d.file_path,
                      name: d.file_name ?? `${d.doc_key || "document"}`,
                    })
                  }
                >
                  {t("order.docs.download")}
                </Button>
                <label>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      setBusyId(d.id);
                      replace.mutate({ documentId: d.id, file });
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    disabled={replace.isPending && busyId === d.id}
                  >
                    <span className="cursor-pointer">{t("order.docs.replace")}</span>
                  </Button>
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(t("order.docs.deleteConfirm"))) remove.mutate(d.id);
                  }}
                >
                  {t("order.docs.delete")}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("order.docs.empty")}</p>
      )}

      {history.data && history.data.length > 0 ? (
        <div className="mt-3 rounded-lg border border-border/70 bg-muted/40 p-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            {t("order.docs.history")}
          </p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {history.data.map((h: any) => (
              <li key={h.id}>
                <span className="font-medium text-foreground">
                  {h.action === "order_document.delete"
                    ? t("order.docs.delete")
                    : t("order.docs.replace")}
                </span>{" "}
                · {String(h.before_data?.file_name ?? h.before_data?.doc_key ?? "—")}
                {h.after_data?.file_name ? ` → ${String(h.after_data.file_name)}` : ""} ·{" "}
                {h.actor_email ?? "—"} ·{" "}
                {new Date(h.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
