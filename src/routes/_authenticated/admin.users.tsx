import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KpiCard } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { ASSIGNABLE_ROLES, listPlatformUsers, setUserActive, setUserRole } from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Users & Roles — Gunited Travel ERP" },
      {
        name: "description",
        content:
          "Directory of every Gunited Travel account with role management for admins and booking agents.",
      },
      { property: "og:title", content: "Users & Roles — Gunited Travel ERP" },
      { property: "og:description", content: "Manage platform users, roles and access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminUsersPage,
  errorComponent: ({ error }) => (
    <p className="surface-card p-6 text-sm text-destructive">{error.message}</p>
  ),
  notFoundComponent: () => <p className="surface-card p-6 text-sm">404</p>,
});

const STAFF_ROLES = ["super_admin", "admin", "booking_agent", "accountant"];

function AdminUsersPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const users = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => listPlatformUsers({ data: { search } }),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin-users"] });
  const fail = (e: unknown) =>
    toast.error(t("common.error"), { description: String((e as Error)?.message ?? e) });

  const roleMutation = useMutation({
    mutationFn: (v: { userId: string; role: string }) =>
      setUserRole({ data: { userId: v.userId, role: v.role as (typeof ASSIGNABLE_ROLES)[number] } }),
    onSuccess: () => {
      toast.success(t("admin.users.roleSaved"));
      invalidate();
    },
    onError: fail,
  });

  const activeMutation = useMutation({
    mutationFn: (v: { userId: string; isActive: boolean }) => setUserActive({ data: v }),
    onSuccess: () => {
      toast.success(t("admin.users.statusSaved"));
      invalidate();
    },
    onError: fail,
  });

  const rows = users.data?.users ?? [];
  const canManage = users.data?.canManage ?? false;
  const staffCount = rows.filter((u: any) => u.roles.some((r: string) => STAFF_ROLES.includes(r))).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-forest-deep">{t("admin.users.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("admin.users.subtitle")}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("admin.users.total")} value={String(rows.length)} />
        <KpiCard label={t("admin.users.staff")} value={String(staffCount)} />
        <KpiCard label={t("admin.users.clients")} value={String(rows.length - staffCount)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.users.search")}
          className="max-w-sm bg-white"
        />
        {!canManage ? (
          <Badge className="bg-beige text-forest-deep">{t("admin.users.readonly")}</Badge>
        ) : null}
      </div>

      <section className="surface-card overflow-x-auto">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">{t("admin.users.empty")}</p>
        ) : (
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="bg-beige/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3 text-start">{t("admin.users.name")}</th>
                <th className="p-3 text-start">{t("admin.users.email")}</th>
                <th className="p-3 text-start">{t("admin.users.contact")}</th>
                <th className="p-3 text-start">{t("admin.users.joined")}</th>
                <th className="p-3 text-start">{t("admin.users.role")}</th>
                <th className="p-3 text-start">{t("admin.users.status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((u: any) => {
                const isSelf = u.id === users.data?.currentUserId;
                const currentRole = u.roles[0] ?? "";
                return (
                  <tr key={u.id}>
                    <td className="p-3 font-semibold text-forest-deep">
                      {u.full_name || "—"}
                      {isSelf ? (
                        <Badge className="ms-2 bg-mint text-forest-deep">{t("admin.users.you")}</Badge>
                      ) : null}
                    </td>
                    <td className="p-3 text-muted-foreground">{u.email || "—"}</td>
                    <td className="p-3 text-muted-foreground">{u.whatsapp || u.phone || "—"}</td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString(lang === "ar" ? "ar" : "en")}
                    </td>
                    <td className="p-3">
                      {canManage && !isSelf ? (
                        <Select
                          value={currentRole}
                          onValueChange={(role) => roleMutation.mutate({ userId: u.id, role })}
                        >
                          <SelectTrigger className="w-[11rem] bg-white">
                            <SelectValue placeholder={t("role.none")} />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSIGNABLE_ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {t(`role.${r}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className="bg-forest text-cream">
                          {currentRole ? t(`role.${currentRole}`) : t("role.none")}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={u.is_active ? "bg-mint text-forest-deep" : "bg-muted text-muted-foreground"}
                        >
                          {u.is_active ? t("admin.users.active") : t("admin.users.inactive")}
                        </Badge>
                        {canManage && !isSelf ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              activeMutation.mutate({ userId: u.id, isActive: !u.is_active })
                            }
                          >
                            {u.is_active ? t("admin.users.suspend") : t("admin.users.activate")}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
