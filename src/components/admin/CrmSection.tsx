import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { KpiCard } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { createCrmRecord, getCrmSummary, listCrmRecords } from "@/lib/crm.functions";
import { useI18n } from "@/lib/i18n";

type Kind = "customer" | "agency";

const EMPTY = {
  full_name: "",
  agency_name: "",
  license_number: "",
  contact_name: "",
  email: "",
  phone: "",
  whatsapp: "",
  nationality: "",
  city: "",
  notes: "",
};

export function CrmSection({ kind }: { kind: Kind }) {
  const { t, fmt, lang } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const isAgency = kind === "agency";

  const summary = useQuery({
    queryKey: ["crm-summary", kind],
    queryFn: () => getCrmSummary({ data: { kind } }),
  });
  const list = useQuery({
    queryKey: ["crm-list", kind, search],
    queryFn: () => listCrmRecords({ data: { kind, search } }),
  });

  const create = useMutation({
    mutationFn: () => createCrmRecord({ data: { kind, ...form } }),
    onSuccess: () => {
      toast.success(t("crm.saved"));
      setForm({ ...EMPTY });
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["crm-list", kind] });
      void qc.invalidateQueries({ queryKey: ["crm-summary", kind] });
    },
    onError: () => toast.error(t("crm.error")),
  });

  const s = summary.data;
  const rows = list.data ?? [];
  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-8">
      {summary.isPending || !s ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={t(isAgency ? "crm.kpi.agencies" : "crm.kpi.customers")}
            value={String(s.records)}
          />
          <KpiCard label={t("crm.kpi.orders")} value={String(s.totalOrders)} />
          <KpiCard label={t("crm.kpi.review")} value={String(s.awaitingReview)} />
          <KpiCard label={t("crm.kpi.total")} value={fmt(s.totalUsd, "USD")} />
        </div>
      )}

      <div className="surface-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-forest-deep">
            {t(isAgency ? "crm.agencies.db" : "crm.customers.db")}
          </h2>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("crm.search")}
            className="ms-auto w-full sm:w-64"
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-forest text-cream hover:bg-forest-deep">
                {t(isAgency ? "crm.add.agency" : "crm.add.customer")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{t(isAgency ? "crm.add.agency" : "crm.add.customer")}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                {isAgency ? (
                  <>
                    <Field label={t("crm.field.agency")} required>
                      <Input value={form.agency_name} onChange={set("agency_name")} />
                    </Field>
                    <Field label={t("crm.field.license")}>
                      <Input value={form.license_number} onChange={set("license_number")} />
                    </Field>
                    <Field label={t("crm.field.contact")}>
                      <Input value={form.contact_name} onChange={set("contact_name")} />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label={t("crm.field.name")} required>
                      <Input value={form.full_name} onChange={set("full_name")} />
                    </Field>
                    <Field label={t("crm.field.nationality")}>
                      <Input value={form.nationality} onChange={set("nationality")} />
                    </Field>
                  </>
                )}
                <Field label={t("crm.field.email")}>
                  <Input type="email" value={form.email} onChange={set("email")} />
                </Field>
                <Field label={t("crm.field.phone")}>
                  <Input value={form.phone} onChange={set("phone")} />
                </Field>
                <Field label={t("crm.field.whatsapp")}>
                  <Input value={form.whatsapp} onChange={set("whatsapp")} />
                </Field>
                <Field label={t("crm.field.city")}>
                  <Input value={form.city} onChange={set("city")} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label={t("crm.field.notes")}>
                    <Textarea rows={3} value={form.notes} onChange={set("notes")} />
                  </Field>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  {t("crm.cancel")}
                </Button>
                <Button
                  className="bg-forest text-cream hover:bg-forest-deep"
                  disabled={
                    create.isPending || !(isAgency ? form.agency_name.trim() : form.full_name.trim())
                  }
                  onClick={() => create.mutate()}
                >
                  {t("crm.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {list.isPending ? (
          <div className="mt-5 space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">{t("crm.empty")}</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 text-start">
                    {t(isAgency ? "crm.field.agency" : "crm.field.name")}
                  </th>
                  <th className="px-3 py-2 text-start">
                    {t(isAgency ? "crm.field.license" : "crm.field.nationality")}
                  </th>
                  <th className="px-3 py-2 text-start">{t("crm.field.email")}</th>
                  <th className="px-3 py-2 text-start">{t("crm.field.phone")}</th>
                  <th className="px-3 py-2 text-start">{t("crm.kpi.orders")}</th>
                  <th className="px-3 py-2 text-start">{t("crm.kpi.total")}</th>
                  <th className="px-3 py-2 text-end" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="px-3 py-3">
                      <p className="font-medium text-forest-deep">
                        {isAgency ? r.agency_name : r.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isAgency && r.contact_name ? r.contact_name : null}
                        {!isAgency && r.city ? r.city : null}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      {(isAgency ? r.license_number : r.nationality) || "—"}
                    </td>
                    <td className="px-3 py-3">{r.email || "—"}</td>
                    <td className="px-3 py-3">{r.phone || r.whatsapp || "—"}</td>
                    <td className="px-3 py-3 font-semibold">{r.orderCount}</td>
                    <td className="px-3 py-3 font-semibold">{fmt(r.totalUsd, "USD")}</td>
                    <td className="px-3 py-3 text-end">
                      <Button asChild size="sm" variant="outline">
                        <Link
                          to={isAgency ? "/admin/agency/$id" : "/admin/customer/$id"}
                          params={{ id: r.id }}
                        >
                          {t("crm.view")}
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              {new Date().toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </Label>
      {children}
    </div>
  );
}
