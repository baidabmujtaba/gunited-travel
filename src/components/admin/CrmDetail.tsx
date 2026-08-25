import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCrmRecord } from "@/lib/crm.functions";
import { useI18n } from "@/lib/i18n";

type Kind = "customer" | "agency";

export function CrmDetail({ kind, id }: { kind: Kind; id: string }) {
  const { t, fmt, lang } = useI18n();
  const isAgency = kind === "agency";
  const query = useQuery({
    queryKey: ["crm-record", kind, id],
    queryFn: () => getCrmRecord({ data: { kind, id } }),
  });

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  const record = query.data?.record as any;
  const orders = (query.data?.orders ?? []) as any[];

  if (!record) {
    return (
      <div className="surface-card p-8 text-center text-sm text-muted-foreground">
        {t("crm.notfound")}
      </div>
    );
  }

  const locale = lang === "ar" ? "ar-EG" : "en-GB";
  const confirmed = orders.filter((o) =>
    ["payment_confirmed", "processing", "completed"].includes(o.status),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="sm" variant="outline">
          <Link to={isAgency ? "/admin/partners" : "/admin/customers"}>{t("crm.back")}</Link>
        </Button>
        <h1 className="text-2xl font-bold text-forest-deep">
          {isAgency ? record.agency_name : record.full_name}
        </h1>
      </div>

      <div className="surface-card grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {isAgency ? (
          <>
            <Row label={t("crm.field.license")} value={record.license_number} />
            <Row label={t("crm.field.contact")} value={record.contact_name} />
          </>
        ) : (
          <Row label={t("crm.field.nationality")} value={record.nationality} />
        )}
        <Row label={t("crm.field.email")} value={record.email} />
        <Row label={t("crm.field.phone")} value={record.phone} />
        <Row label={t("crm.field.whatsapp")} value={record.whatsapp} />
        <Row label={t("crm.field.city")} value={record.city} />
        <Row
          label={t("crm.added")}
          value={new Date(record.created_at).toLocaleDateString(locale)}
        />
        {record.notes ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <Row label={t("crm.field.notes")} value={record.notes} />
          </div>
        ) : null}
      </div>

      <div className="surface-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-forest-deep">{t("crm.orders.history")}</h2>
          <div className="ms-auto flex gap-2 text-sm">
            <Badge className="bg-mint text-forest-deep">
              {t("crm.kpi.orders")}: {orders.length}
            </Badge>
            <Badge className="bg-gold/80 text-forest-deep">
              {t("crm.kpi.total")}:{" "}
              {fmt(
                confirmed.reduce((s, o) => s + Number(o.amount_usd), 0),
                "USD",
              )}
            </Badge>
          </div>
        </div>

        {orders.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">{t("crm.orders.none")}</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 text-start">#</th>
                  <th className="px-3 py-2 text-start">{t("admin.people.status")}</th>
                  <th className="px-3 py-2 text-start">{t("crm.kpi.total")}</th>
                  <th className="px-3 py-2 text-start">{t("crm.added")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-border/60">
                    <td className="px-3 py-3 font-medium text-forest-deep">{o.tracking_id}</td>
                    <td className="px-3 py-3">{t(`status.${o.status}`)}</td>
                    <td className="px-3 py-3 font-semibold">
                      {fmt(Number(o.amount_display), o.currency_code)}
                    </td>
                    <td className="px-3 py-3">
                      {new Date(o.created_at).toLocaleDateString(locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-forest-deep">{value || "—"}</p>
    </div>
  );
}
