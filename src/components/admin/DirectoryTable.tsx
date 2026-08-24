import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listDirectory } from "@/lib/admin.functions";
import { useI18n } from "@/lib/i18n";

export function DirectoryTable({ agency }: { agency: boolean }) {
  const { t, fmt, lang } = useI18n();
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["admin-directory", agency, search],
    queryFn: () => listDirectory({ data: { agency, search } }),
  });

  const people = query.data ?? [];

  return (
    <div className="surface-card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">
          {t(agency ? "admin.partners.title" : "admin.customers.title")}
        </h2>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.people.search")}
          className="ms-auto w-60"
        />
      </div>

      {query.isPending ? (
        <div className="mt-5 space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : people.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">{t("admin.people.empty")}</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-start">{t("admin.people.name")}</th>
                <th className="px-3 py-2 text-start">{t("admin.people.contact")}</th>
                <th className="px-3 py-2 text-start">{t("admin.people.orders")}</th>
                <th className="px-3 py-2 text-start">{t("admin.people.spend")}</th>
                {agency ? (
                  <th className="px-3 py-2 text-start">{t("admin.people.tier")}</th>
                ) : null}
                <th className="px-3 py-2 text-start">{t("admin.people.status")}</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p: any) => (
                <tr key={p.id} className="border-t border-border/60">
                  <td className="px-3 py-3">
                    <p className="font-medium text-forest-deep">{p.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB")}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <p>{p.email ?? "—"}</p>
                    {p.whatsapp ? (
                      <a
                        className="text-xs text-forest underline"
                        href={`https://wa.me/${String(p.whatsapp).replace(/[^\d]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {p.whatsapp}
                      </a>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 font-semibold">{p.orderCount}</td>
                  <td className="px-3 py-3 font-semibold">{fmt(p.spendUsd, "USD")}</td>
                  {agency ? <td className="px-3 py-3">{Number(p.discount_tier)}%</td> : null}
                  <td className="px-3 py-3">
                    <Badge className={p.is_active ? "bg-mint text-forest-deep" : "bg-muted text-muted-foreground"}>
                      {t(p.is_active ? "admin.people.active" : "admin.people.inactive")}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
