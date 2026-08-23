import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { KpiCard } from "@/components/admin/AdminShell";
import { DirectoryTable } from "@/components/admin/DirectoryTable";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminOverview } from "@/lib/admin.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/partners")({
  component: PartnersHub,
});

function PartnersHub() {
  const { t } = useI18n();
  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: () => getAdminOverview() });
  const o = overview.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-forest-deep">{t("admin.tab.partners")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin.partners.hint")}</p>
      </div>

      {overview.isPending || !o ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard label={t("admin.kpi.partners")} value={String(o.partners)} />
          <KpiCard label={t("admin.kpi.offers")} value={`${o.activeOffers}/${o.totalOffers}`} />
          <KpiCard label={t("admin.kpi.revenue")} value={String(o.totalOrders)} />
        </div>
      )}

      <DirectoryTable agency />
    </div>
  );
}
