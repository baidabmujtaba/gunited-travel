import { createFileRoute, Link, Navigate, Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { useRoles } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "ERP Hub — Gunited Travel | مركز الإدارة" },
      {
        name: "description",
        content: "Gunited Travel staff hub for sales, customers, partners and finance operations.",
      },
      { property: "og:title", content: "ERP Hub — Gunited Travel" },
      { property: "og:description", content: "Internal operations hub for the Gunited Travel team." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { t } = useI18n();
  const { roles, isStaff, isAgency } = useRoles();

  if (roles.length === 0) {
    return (
      <AdminShell>
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminShell>
    );
  }

  if (!isStaff) {
    if (isAgency) return <Navigate to="/agency" replace />;
    // Non-staff never see the ERP navigation, only a plain notice.
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream p-6">
        <div className="surface-card max-w-md p-10 text-center">
          <p className="text-sm text-muted-foreground">{t("admin.forbidden")}</p>
          <Button asChild className="mt-5">
            <Link to="/">{t("admin.backstore")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
