import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KpiCard } from "@/components/admin/AdminShell";
import { Section, TableWrap, useL } from "@/components/admin/Bilingual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  linkUserToAgency,
  listAgencyLinks,
  unlinkUserFromAgency,
} from "@/lib/agency-link.functions";

export const Route = createFileRoute("/_authenticated/admin/links")({
  head: () => ({
    meta: [
      { title: "Agency Account Links — Gunited Travel ERP" },
      {
        name: "description",
        content:
          "Link user accounts to travel agency profiles, with role checks and one-agency-per-user enforcement.",
      },
      { property: "og:title", content: "Agency Account Links — Gunited Travel ERP" },
      {
        property: "og:description",
        content: "Attach accounts to agency profiles and manage agency portal access.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLinksPage,
  errorComponent: ({ error }) => (
    <p className="surface-card p-6 text-sm text-destructive">{error.message}</p>
  ),
  notFoundComponent: () => <p className="surface-card p-6 text-sm">404</p>,
});

const STAFF_ROLES = ["super_admin", "admin", "accountant"];

function AdminLinksPage() {
  const l = useL();
  const queryClient = useQueryClient();
  const list = useServerFn(listAgencyLinks);
  const link = useServerFn(linkUserToAgency);
  const unlink = useServerFn(unlinkUserFromAgency);

  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [role, setRole] = useState<Record<string, "travel_agency" | "booking_agent">>({});

  const { data, isPending } = useQuery({ queryKey: ["agency-links"], queryFn: () => list() });

  const messages: Record<string, string> = {
    USER_ALREADY_LINKED: l("هذا المستخدم مرتبط بوكالة أخرى بالفعل.", "This user is already linked to another agency."),
    AGENCY_ALREADY_LINKED: l("هذه الوكالة مرتبطة بحساب آخر.", "This agency is already linked to another account."),
    STAFF_CANNOT_BE_AGENCY: l("لا يمكن ربط حساب إداري بوكالة.", "Staff accounts cannot be linked to an agency."),
    FORBIDDEN: l("تحتاج صلاحية مشرف.", "Admin permission required."),
  };

  const mLink = useMutation({
    mutationFn: (vars: { agencyId: string; userId: string; role: "travel_agency" | "booking_agent" }) =>
      link({ data: vars }),
    onSuccess: () => {
      toast.success(l("تم الربط", "Linked"));
      void queryClient.invalidateQueries({ queryKey: ["agency-links"] });
    },
    onError: (e: Error) => toast.error(messages[e.message] ?? e.message),
  });

  const mUnlink = useMutation({
    mutationFn: (userId: string) => unlink({ data: { userId } }),
    onSuccess: () => {
      toast.success(l("تم فصل الربط", "Unlinked"));
      void queryClient.invalidateQueries({ queryKey: ["agency-links"] });
    },
    onError: (e: Error) => toast.error(messages[e.message] ?? e.message),
  });

  const linkable = useMemo(
    () =>
      (data?.users ?? []).filter(
        (u) => !u.agencyId && !u.roles.some((r) => STAFF_ROLES.includes(r)),
      ),
    [data],
  );

  const agencies = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (data?.agencies ?? []).filter((a) =>
      !s
        ? true
        : [a.name, a.email, a.city, a.linkedUser?.email].filter(Boolean).some((v) =>
            String(v).toLowerCase().includes(s),
          ),
    );
  }, [data, search]);

  if (isPending || !data) return <Skeleton className="h-96 w-full" />;

  const linkedCount = data.agencies.filter((a) => a.linkedUser).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label={l("الوكالات", "Agencies")} value={String(data.agencies.length)} />
        <KpiCard
          label={l("وكالات مرتبطة بحساب", "Agencies with an account")}
          value={String(linkedCount)}
          hint={`${data.agencies.length - linkedCount} ${l("بدون حساب", "without account")}`}
        />
        <KpiCard label={l("حسابات قابلة للربط", "Linkable accounts")} value={String(linkable.length)} />
      </div>

      <Section
        title={l("ربط الحسابات بالوكالات", "Link accounts to agencies")}
        subtitle={l(
          "لا يمكن ربط المستخدم بأكثر من وكالة واحدة، ولا يمكن ربط الحسابات الإدارية.",
          "A user can belong to one agency only; staff accounts cannot be linked.",
        )}
        actions={
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={l("بحث…", "Search…")}
            className="w-56"
          />
        }
      >
        <TableWrap>
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start">{l("الوكالة", "Agency")}</th>
                <th className="px-3 py-2 text-start">{l("الحساب المرتبط", "Linked account")}</th>
                <th className="px-3 py-2 text-start">{l("الربط", "Link")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {agencies.map((a) => (
                <tr key={a.id} className="align-top">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-forest-deep">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.email ?? "—"}</p>
                  </td>
                  <td className="px-3 py-3">
                    {a.linkedUser ? (
                      <div className="space-y-1">
                        <p>{a.linkedUser.email ?? a.linkedUser.id}</p>
                        <div className="flex flex-wrap gap-1">
                          {(a.linkedUser.roles ?? []).map((r) => (
                            <Badge key={r} variant="secondary">
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">{l("غير مرتبطة", "Not linked")}</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {a.linkedUser ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={mUnlink.isPending}
                        onClick={() => mUnlink.mutate(a.linkedUser!.id)}
                      >
                        {l("فصل الربط", "Unlink")}
                      </Button>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={picked[a.id] ?? ""}
                          onValueChange={(v) => setPicked((p) => ({ ...p, [a.id]: v }))}
                        >
                          <SelectTrigger className="w-56">
                            <SelectValue placeholder={l("اختر حساباً", "Choose account")} />
                          </SelectTrigger>
                          <SelectContent>
                            {linkable.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.email ?? u.fullName ?? u.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={role[a.id] ?? "travel_agency"}
                          onValueChange={(v) =>
                            setRole((p) => ({ ...p, [a.id]: v as "travel_agency" | "booking_agent" }))
                          }
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="travel_agency">{l("وكالة سفر", "Travel agency")}</SelectItem>
                            <SelectItem value="booking_agent">{l("وكيل حجوزات", "Booking agent")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          disabled={!picked[a.id] || mLink.isPending}
                          onClick={() =>
                            mLink.mutate({
                              agencyId: a.id,
                              userId: picked[a.id]!,
                              role: role[a.id] ?? "travel_agency",
                            })
                          }
                        >
                          {l("ربط", "Link")}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Section>
    </div>
  );
}
