import { createFileRoute } from "@tanstack/react-router";
import { CrmSection } from "@/components/admin/CrmSection";
import { DirectoryTable } from "@/components/admin/DirectoryTable";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/partners")({
  component: PartnersHub,
});

function PartnersHub() {
  const { t } = useI18n();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-forest-deep">{t("admin.tab.partners")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("crm.agencies.db")}</p>
      </div>

      <CrmSection kind="agency" />
      <DirectoryTable agency />
    </div>
  );
}
