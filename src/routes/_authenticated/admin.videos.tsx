import { createFileRoute } from "@tanstack/react-router";
import { HomepageVideosPanel } from "@/components/admin/HomepageVideosPanel";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/videos")({
  head: () => ({
    meta: [
      { title: "Homepage Videos — Gunited Travel ERP" },
      {
        name: "description",
        content:
          "Upload homepage videos, reorder the slideshow by dragging, and toggle each clip active or inactive.",
      },
      { property: "og:title", content: "Homepage Videos — Gunited Travel ERP" },
      {
        property: "og:description",
        content: "Manage the Gunited Travel homepage video slideshow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminVideosPage,
  errorComponent: ({ error }) => (
    <p className="surface-card p-6 text-sm text-destructive">{error.message}</p>
  ),
  notFoundComponent: () => <p className="surface-card p-6 text-sm">404</p>,
});

function AdminVideosPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-forest-deep">{t("videos.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("videos.subtitle")}</p>
      </header>
      <HomepageVideosPanel />
    </div>
  );
}
