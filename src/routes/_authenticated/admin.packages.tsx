import { createFileRoute, Link } from "@tanstack/react-router";
import { OfferTreePanel } from "@/components/admin/OfferTreePanel";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/packages")({
  head: () => ({
    meta: [
      { title: "Package Tree — Gunited Travel ERP" },
      {
        name: "description",
        content:
          "Link mother packages to child and grandchild packages, edit names, prices and currencies, and remove branches.",
      },
      { property: "og:title", content: "Package Tree — Gunited Travel ERP" },
      {
        property: "og:description",
        content: "Manage the Gunited Travel package hierarchy with prices and currencies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPackageTreePage,
  errorComponent: ({ error }) => (
    <p className="surface-card p-6 text-sm text-destructive">{error.message}</p>
  ),
  notFoundComponent: () => <p className="surface-card p-6 text-sm">404</p>,
});

function AdminPackageTreePage() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest-deep">{t("tree.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("tree.subtitle")}</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin/offers">{t("admin.offers.title")}</Link>
        </Button>
      </header>

      <section className="surface-card p-4 sm:p-6">
        <OfferTreePanel />
      </section>
    </div>
  );
}
