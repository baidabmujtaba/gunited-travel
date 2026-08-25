import { createFileRoute } from "@tanstack/react-router";
import { CrmSection } from "@/components/admin/CrmSection";
import { DirectoryTable } from "@/components/admin/DirectoryTable";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  component: CustomersHub,
});

function CustomersHub() {
  const { t } = useI18n();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-forest-deep">{t("admin.tab.customers")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("crm.customers.db")}</p>
      </div>

      <CrmSection kind="customer" />
      <DirectoryTable agency={false} />
    </div>
  );
}
