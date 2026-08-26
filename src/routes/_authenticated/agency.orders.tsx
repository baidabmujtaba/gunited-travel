import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { StatusBadge } from "@/components/admin/AdminShell";
import { Section, TableWrap, useL } from "@/components/admin/Bilingual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { listAgencyOrders } from "@/lib/agency.functions";

export const Route = createFileRoute("/_authenticated/agency/orders")({
  component: AgencyOrders,
});

const STATUSES = [
  "submitted",
  "payment_pending",
  "payment_confirmed",
  "processing",
  "completed",
  "cancelled",
  "rejected",
];

function AgencyOrders() {
  const l = useL();
  const { fmt, t } = useI18n();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const list = useServerFn(listAgencyOrders);
  const { data, isPending } = useQuery({
    queryKey: ["agency-orders", search, status, page],
    queryFn: () => list({ data: { search, status, page, pageSize: 25 } }),
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <Section
      title={l("طلباتي", "My orders")}
      subtitle={l("كل الطلبات المسجلة باسم وكالتك.", "Every order placed under your agency.")}
      actions={
        <>
          <Input
            className="w-44"
            placeholder={l("بحث…", "Search…")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{l("كل الحالات", "All statuses")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
        </>
      }
    >
      {isPending ? (
        <Skeleton className="h-56 w-full" />
      ) : (
        <>
          <TableWrap>
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">{l("الطلب", "Order")}</th>
                  <th className="px-3 py-2 text-start">{l("العميل", "Customer")}</th>
                  <th className="px-3 py-2 text-start">{l("المبلغ", "Amount")}</th>
                  <th className="px-3 py-2 text-start">{l("الحالة", "Status")}</th>
                  <th className="px-3 py-2 text-start">{l("التاريخ", "Date")}</th>
                  <th className="px-3 py-2 text-end">{l("تتبع", "Track")}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.rows ?? []).map((o: any) => (
                  <tr key={o.id} className="border-t border-border/60">
                    <td className="px-3 py-2 font-mono text-xs">{o.tracking_id}</td>
                    <td className="px-3 py-2">{o.customer_name}</td>
                    <td className="px-3 py-2">{fmt(Number(o.amount_display), o.currency_code)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-3 py-2">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-end">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/track" search={{ ref: o.tracking_id }}>
                          {l("عرض", "Open")}
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {(data?.rows ?? []).length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                      {l("لا توجد طلبات.", "No orders found.")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </TableWrap>
          <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              {l("السابق", "Previous")}
            </Button>
            <span>
              {page} / {pages} · {total}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              {l("التالي", "Next")}
            </Button>
          </div>
        </>
      )}
    </Section>
  );
}
