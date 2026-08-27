import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { getEmailAutomationStatus } from "@/lib/email-monitor.functions";

export const Route = createFileRoute("/_authenticated/admin/email-notifications")({
  head: () => ({
    meta: [
      { title: "Email Notifications — Gunited Travel ERP" },
      {
        name: "description",
        content:
          "Monitor Gunited Travel automatic order-status notifications: delivered, pending and failed emails with retry details.",
      },
      { property: "og:title", content: "Email Notifications — Gunited Travel ERP" },
      {
        property: "og:description",
        content: "Automatic order-status email delivery monitoring for Gunited Travel staff.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EmailNotificationsPage,
  errorComponent: ({ error }) => (
    <p className="surface-card p-6 text-sm text-destructive">{error.message}</p>
  ),
  notFoundComponent: () => <p className="surface-card p-6 text-sm">404</p>,
});

function StatusChip({ status }: { status: string }) {
  const tone =
    status === "sent"
      ? "bg-mint text-forest-deep"
      : status === "pending"
        ? "bg-beige text-forest-deep"
        : "bg-destructive/15 text-destructive";
  return <Badge className={tone}>{status}</Badge>;
}

function EmailNotificationsPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const q = useQuery({
    queryKey: ["email-automation"],
    queryFn: () => getEmailAutomationStatus(),
    refetchInterval: 30_000,
  });

  const data = q.data;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-forest-deep">
          {ar ? "إشعارات البريد التلقائية" : "Automatic email notifications"}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {ar
            ? "تُرسل الإشعارات تلقائيًا من الخادم عند كل تغيير حقيقي لحالة الطلب. لا يوجد إرسال يدوي."
            : "Emails are sent automatically by the backend on every real order status change. No manual sending."}
        </p>
      </header>

      {q.isLoading ? (
        <p className="surface-card p-6 text-sm text-muted-foreground">
          {ar ? "جارٍ التحميل…" : "Loading…"}
        </p>
      ) : q.isError ? (
        <p className="surface-card p-6 text-sm text-destructive">
          {(q.error as Error).message}
        </p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: ar ? "مرسلة" : "Sent", value: data?.counts["sent"] ?? 0 },
              { label: ar ? "قيد الانتظار" : "Pending", value: data?.pendingQueue ?? 0 },
              { label: ar ? "فاشلة" : "Failed", value: data?.counts["failed"] ?? 0 },
              { label: ar ? "بدون بريد" : "No address", value: data?.counts["not_sent"] ?? 0 },
            ].map((c) => (
              <div key={c.label} className="surface-card p-5">
                <p className="text-xs font-semibold text-muted-foreground">{c.label}</p>
                <p className="mt-1 text-2xl font-bold text-forest-deep">{c.value}</p>
              </div>
            ))}
          </section>

          <section className="surface-card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-beige/60 text-xs text-forest-deep">
                <tr>
                  <th className="px-4 py-3 text-start">{ar ? "المستلم" : "Recipient"}</th>
                  <th className="px-4 py-3 text-start">{ar ? "القالب" : "Template"}</th>
                  <th className="px-4 py-3 text-start">{ar ? "الانتقال" : "Transition"}</th>
                  <th className="px-4 py-3 text-start">{ar ? "الحالة" : "Status"}</th>
                  <th className="px-4 py-3 text-start">{ar ? "المحاولات" : "Retries"}</th>
                  <th className="px-4 py-3 text-start">{ar ? "التاريخ" : "Date"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.logs ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                      {ar ? "لا توجد إشعارات بعد." : "No notifications yet."}
                    </td>
                  </tr>
                ) : (
                  (data?.logs ?? []).map((l: any) => (
                    <tr key={l.id}>
                      <td className="px-4 py-3">{l.recipient ?? "—"}</td>
                      <td className="px-4 py-3">{l.notification_type}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {(l.previous_status ?? "—") + " → " + l.new_status}
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip status={l.status} />
                        {l.error ? (
                          <span className="ms-2 text-xs text-destructive">{l.error}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{l.retry_count}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(l.sent_at ?? l.created_at).toLocaleString(ar ? "ar-EG" : "en-GB")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
