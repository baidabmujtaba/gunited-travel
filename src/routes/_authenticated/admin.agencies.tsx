import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FinancialStateBadge, Section, TableWrap, useL } from "@/components/admin/Bilingual";
import { KpiCard } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import {
  archiveAgency,
  createAgencyLogin,
  listAgencies,
  resetAgencyPassword,
  saveAgency,
  setAgencyActive,
} from "@/lib/agencies.functions";

export const Route = createFileRoute("/_authenticated/admin/agencies")({
  component: AgenciesPage,
});

const emptyForm = {
  agency_name: "",
  contact_name: "",
  email: "",
  phone: "",
  whatsapp: "",
  city: "",
  license_number: "",
  notes: "",
  credit_limit_usd: 0,
  warning_percent: 80,
  currency_code: "USD",
  is_active: true,
  financial_hold: false,
};

function AgenciesPage() {
  const l = useL();
  const { fmt } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [credential, setCredential] = useState<{ email: string | null; password: string } | null>(
    null,
  );

  const list = useServerFn(listAgencies);
  const save = useServerFn(saveAgency);
  const toggle = useServerFn(setAgencyActive);
  const archive = useServerFn(archiveAgency);
  const makeLogin = useServerFn(createAgencyLogin);
  const resetPw = useServerFn(resetAgencyPassword);

  const { data, isPending } = useQuery({
    queryKey: ["admin-agencies", search, status],
    queryFn: () => list({ data: { search, status } }),
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin-agencies"] });

  const saveMut = useMutation({
    mutationFn: (payload: any) => save({ data: payload }),
    onSuccess: () => {
      toast.success(l("تم الحفظ", "Saved"));
      setOpen(false);
      setEditing(null);
      setForm({ ...emptyForm });
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const loginMut = useMutation({
    mutationFn: (payload: { agencyId: string; email: string }) => makeLogin({ data: payload }),
    onSuccess: (r: any) => {
      setCredential({ email: r.email, password: r.password });
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetMut = useMutation({
    mutationFn: (agencyId: string) => resetPw({ data: { agencyId } }),
    onSuccess: (r: any) => setCredential({ email: r.email, password: r.password }),
    onError: (e: any) => toast.error(e.message),
  });

  const rows = data ?? [];
  const totals = rows.reduce(
    (acc: any, r: any) => ({
      outstanding: acc.outstanding + Number(r.outstanding),
      sales: acc.sales + Number(r.salesUsd),
      customers: acc.customers + Number(r.customers),
    }),
    { outstanding: 0, sales: 0, customers: 0 },
  );

  const openEdit = (row: any) => {
    setEditing(row);
    setForm({
      agency_name: row.agency_name ?? "",
      contact_name: row.contact_name ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      whatsapp: row.whatsapp ?? "",
      city: row.city ?? "",
      license_number: row.license_number ?? "",
      notes: row.notes ?? "",
      credit_limit_usd: Number(row.credit_limit_usd ?? 0),
      warning_percent: Number(row.warning_percent ?? 80),
      currency_code: row.currency_code ?? "USD",
      is_active: Boolean(row.is_active),
      financial_hold: Boolean(row.financial_hold),
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={l("عدد الوكالات", "Agencies")} value={String(rows.length)} />
        <KpiCard
          label={l("وكالات نشطة", "Active")}
          value={String(rows.filter((r: any) => r.is_active).length)}
        />
        <KpiCard label={l("عملاء الوكالات", "Agency customers")} value={String(totals.customers)} />
        <KpiCard
          label={l("إجمالي المستحق", "Total outstanding")}
          value={fmt(totals.outstanding, "USD")}
          hint={l("مبيعات", "Sales") + ": " + fmt(totals.sales, "USD")}
        />
      </div>

      <Section
        title={l("إدارة الوكالات", "Agency management")}
        subtitle={l(
          "كل وكالة كيان مستقل: عملاؤها وطلباتها ومدفوعاتها معزولة تماماً.",
          "Each agency is an isolated tenant: its customers, orders and payments are private.",
        )}
        actions={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) {
                setEditing(null);
                setForm({ ...emptyForm });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-forest text-cream hover:bg-forest-deep">
                {l("وكالة جديدة", "New agency")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editing ? l("تعديل الوكالة", "Edit agency") : l("وكالة جديدة", "New agency")}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["agency_name", l("اسم الوكالة", "Agency name")],
                    ["contact_name", l("جهة الاتصال", "Contact person")],
                    ["email", l("الإيميل", "Email")],
                    ["phone", l("الهاتف", "Phone")],
                    ["whatsapp", l("واتساب", "WhatsApp")],
                    ["city", l("المدينة", "City")],
                    ["license_number", l("رقم الترخيص", "License number")],
                    ["currency_code", l("العملة", "Currency")],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label>{label}</Label>
                    <Input
                      value={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label>{l("حد الائتمان (USD)", "Credit limit (USD)")}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.credit_limit_usd}
                    onChange={(e) =>
                      setForm({ ...form, credit_limit_usd: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{l("نسبة التحذير %", "Warning threshold %")}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={form.warning_percent}
                    onChange={(e) =>
                      setForm({ ...form, warning_percent: Number(e.target.value) || 80 })
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
                  <Label>{l("نشطة", "Active")}</Label>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
                  <Label>{l("إيقاف مالي", "Financial hold")}</Label>
                  <Switch
                    checked={form.financial_hold}
                    onCheckedChange={(v) => setForm({ ...form, financial_hold: v })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={saveMut.isPending || form.agency_name.trim().length < 2}
                  onClick={() => saveMut.mutate({ ...form, id: editing?.id })}
                  className="bg-forest text-cream hover:bg-forest-deep"
                >
                  {l("حفظ", "Save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <Input
            className="max-w-xs"
            placeholder={l("ابحث بالاسم أو الإيميل…", "Search name or email…")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {(["all", "active", "inactive"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "default" : "outline"}
              onClick={() => setStatus(s)}
            >
              {s === "all" ? l("الكل", "All") : s === "active" ? l("نشطة", "Active") : l("موقوفة", "Inactive")}
            </Button>
          ))}
        </div>

        {isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {l("لا توجد وكالات بعد.", "No agencies yet.")}
          </p>
        ) : (
          <TableWrap>
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-start text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">{l("الوكالة", "Agency")}</th>
                  <th className="px-3 py-2 text-start">{l("العملاء", "Customers")}</th>
                  <th className="px-3 py-2 text-start">{l("الطلبات", "Orders")}</th>
                  <th className="px-3 py-2 text-start">{l("المبيعات", "Sales")}</th>
                  <th className="px-3 py-2 text-start">{l("المستحق", "Outstanding")}</th>
                  <th className="px-3 py-2 text-start">{l("الحد المتاح", "Available")}</th>
                  <th className="px-3 py-2 text-start">{l("الحالة", "State")}</th>
                  <th className="px-3 py-2 text-end">{l("إجراءات", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="px-3 py-3">
                      <Link
                        to="/admin/agency/$id"
                        params={{ id: r.id }}
                        className="font-semibold text-forest-deep hover:underline"
                      >
                        {r.agency_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{r.email ?? r.phone ?? "—"}</p>
                    </td>
                    <td className="px-3 py-3">{r.customers}</td>
                    <td className="px-3 py-3">{r.orders}</td>
                    <td className="px-3 py-3">{fmt(Number(r.salesUsd), "USD")}</td>
                    <td className="px-3 py-3 font-semibold">{fmt(Number(r.outstanding), "USD")}</td>
                    <td className="px-3 py-3">{fmt(Number(r.creditAvailable), "USD")}</td>
                    <td className="px-3 py-3">
                      <FinancialStateBadge state={r.state} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                          {l("تعديل", "Edit")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void toggle({ data: { id: r.id, isActive: !r.is_active } }).then(() => {
                              refresh();
                              toast.success(l("تم التحديث", "Updated"));
                            })
                          }
                        >
                          {r.is_active ? l("إيقاف", "Deactivate") : l("تنشيط", "Activate")}
                        </Button>
                        {r.user_id ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={resetMut.isPending}
                            onClick={() => resetMut.mutate(r.id)}
                          >
                            {l("كلمة مرور جديدة", "Reset password")}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!r.email || loginMut.isPending}
                            onClick={() => loginMut.mutate({ agencyId: r.id, email: r.email })}
                          >
                            {l("إنشاء حساب دخول", "Create login")}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                          onClick={() => {
                            if (!window.confirm(l("أرشفة الوكالة؟", "Archive agency?"))) return;
                            void archive({ data: { id: r.id } }).then(() => {
                              refresh();
                              toast.success(l("تمت الأرشفة", "Archived"));
                            });
                          }}
                        >
                          {l("أرشفة", "Archive")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Section>

      <Dialog open={Boolean(credential)} onOpenChange={() => setCredential(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{l("بيانات الدخول", "Login credentials")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {l(
              "انسخ كلمة المرور الآن — لن تظهر مرة أخرى. الوكالة ستُطالب بتغييرها عند أول دخول.",
              "Copy this password now — it will not be shown again. The agency must change it at first sign-in.",
            )}
          </p>
          <div className="rounded-lg bg-beige p-4 font-mono text-sm">
            <p>{credential?.email}</p>
            <p className="font-bold">{credential?.password}</p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                void navigator.clipboard.writeText(credential?.password ?? "");
                toast.success(l("تم النسخ", "Copied"));
              }}
            >
              {l("نسخ", "Copy")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
