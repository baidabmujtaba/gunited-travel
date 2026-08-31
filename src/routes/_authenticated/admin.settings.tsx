import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ThemeSection } from "@/components/admin/ThemeSection";
import { useI18n } from "@/lib/i18n";
import { getResetPreview, resetOperationalData } from "@/lib/reset.functions";
import {
  getPlatformSettings,
  saveAmadeusSettings,
  saveInvoiceSettings,
  saveSiteSettings,
} from "@/lib/settings.functions";


export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Gunited Travel ERP" },
      {
        name: "description",
        content:
          "Configure Gunited Travel site details, invoice numbering and tax defaults, and the Amadeus flight API connection.",
      },
      { property: "og:title", content: "Settings — Gunited Travel ERP" },
      { property: "og:description", content: "Site, invoicing and Amadeus API configuration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminSettingsPage,
  errorComponent: ({ error }) => (
    <p className="surface-card p-6 text-sm text-destructive">{error.message}</p>
  ),
  notFoundComponent: () => <p className="surface-card p-6 text-sm">404</p>,
});

type Fields = Record<string, string>;

function Field({
  label,
  value,
  onChange,
  disabled,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  type?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-forest-deep">{label}</Label>
      <Input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white"
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function AdminSettingsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["platform-settings"], queryFn: () => getPlatformSettings() });

  const [site, setSite] = useState<Fields>({});
  const [invoicing, setInvoicing] = useState<Fields>({});
  const [amadeus, setAmadeus] = useState<Fields>({ client_id: "", client_secret: "", environment: "test" });

  useEffect(() => {
    if (!settings.data) return;
    setSite(
      Object.fromEntries(
        Object.entries(settings.data.site).map(([k, v]) => [k, String(v ?? "")]),
      ) as Fields,
    );
    setInvoicing(
      Object.fromEntries(
        Object.entries(settings.data.invoicing).map(([k, v]) => [k, String(v ?? "")]),
      ) as Fields,
    );
    setAmadeus({
      client_id: settings.data.amadeus.client_id ?? "",
      client_secret: "",
      environment: settings.data.amadeus.environment ?? "test",
    });
  }, [settings.data]);

  const readOnly = !(settings.data?.canManage ?? false);
  const done = () => {
    toast.success(t("admin.settings.saved"));
    void qc.invalidateQueries({ queryKey: ["platform-settings"] });
  };
  const fail = (e: unknown) =>
    toast.error(t("common.error"), { description: String((e as Error)?.message ?? e) });

  const siteMutation = useMutation({
    mutationFn: () => saveSiteSettings({ data: site as any }),
    onSuccess: done,
    onError: fail,
  });
  const invoiceMutation = useMutation({
    mutationFn: () => saveInvoiceSettings({ data: invoicing as any }),
    onSuccess: done,
    onError: fail,
  });
  const amadeusMutation = useMutation({
    mutationFn: () => saveAmadeusSettings({ data: amadeus as any }),
    onSuccess: done,
    onError: fail,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest-deep">{t("admin.settings.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("admin.settings.subtitle")}</p>
        </div>
        {readOnly ? <Badge className="bg-beige text-forest-deep">{t("admin.settings.readonly")}</Badge> : null}
      </header>

      <section className="surface-card space-y-4 p-5">
        <h2 className="text-lg font-bold text-forest-deep">{t("admin.settings.site")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("admin.settings.name_ar")} value={site["name_ar"] ?? ""} disabled={readOnly} onChange={(v) => setSite({ ...site, name_ar: v })} />
          <Field label={t("admin.settings.name_en")} value={site["name_en"] ?? ""} disabled={readOnly} onChange={(v) => setSite({ ...site, name_en: v })} />
          <Field label={t("admin.settings.email")} value={site["email"] ?? ""} disabled={readOnly} onChange={(v) => setSite({ ...site, email: v })} />
          <Field label={t("admin.settings.phone")} value={site["phone"] ?? ""} disabled={readOnly} onChange={(v) => setSite({ ...site, phone: v })} />
          <Field label={t("admin.settings.whatsapp")} value={site["whatsapp"] ?? ""} disabled={readOnly} onChange={(v) => setSite({ ...site, whatsapp: v })} />
          <Field label={t("admin.settings.tax_number")} value={site["tax_number"] ?? ""} disabled={readOnly} onChange={(v) => setSite({ ...site, tax_number: v })} />
          <Field label={t("admin.settings.registration_number")} value={site["registration_number"] ?? ""} disabled={readOnly} onChange={(v) => setSite({ ...site, registration_number: v })} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-forest-deep">{t("admin.settings.address_ar")}</Label>
            <Textarea value={site["address_ar"] ?? ""} disabled={readOnly} onChange={(e) => setSite({ ...site, address_ar: e.target.value })} className="bg-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-forest-deep">{t("admin.settings.address_en")}</Label>
            <Textarea value={site["address_en"] ?? ""} disabled={readOnly} onChange={(e) => setSite({ ...site, address_en: e.target.value })} className="bg-white" />
          </div>
        </div>
        <Button
          disabled={readOnly || siteMutation.isPending}
          onClick={() => siteMutation.mutate()}
          className="bg-forest text-white hover:bg-forest-deep"
        >
          {t("common.save")}
        </Button>
      </section>

      <section className="surface-card space-y-4 p-5">
        <h2 className="text-lg font-bold text-forest-deep">{t("admin.settings.invoicing")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label={t("admin.settings.prefix")} value={invoicing["prefix"] ?? ""} disabled={readOnly} onChange={(v) => setInvoicing({ ...invoicing, prefix: v })} />
          <Field label={t("admin.settings.start_number")} type="number" value={invoicing["start_number"] ?? ""} disabled={readOnly} onChange={(v) => setInvoicing({ ...invoicing, start_number: v })} />
          <Field label={t("admin.settings.tax_percent")} type="number" value={invoicing["tax_percent"] ?? ""} disabled={readOnly} onChange={(v) => setInvoicing({ ...invoicing, tax_percent: v })} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-forest-deep">{t("admin.settings.terms_ar")}</Label>
            <Textarea value={invoicing["payment_terms_ar"] ?? ""} disabled={readOnly} onChange={(e) => setInvoicing({ ...invoicing, payment_terms_ar: e.target.value })} className="bg-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-forest-deep">{t("admin.settings.terms_en")}</Label>
            <Textarea value={invoicing["payment_terms_en"] ?? ""} disabled={readOnly} onChange={(e) => setInvoicing({ ...invoicing, payment_terms_en: e.target.value })} className="bg-white" />
          </div>
        </div>
        <Button
          disabled={readOnly || invoiceMutation.isPending}
          onClick={() => invoiceMutation.mutate()}
          className="bg-forest text-white hover:bg-forest-deep"
        >
          {t("common.save")}
        </Button>
      </section>

      <section className="surface-card space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold text-forest-deep">{t("admin.settings.amadeus")}</h2>
          {settings.data?.amadeus.hasSecret ? (
            <Badge className="bg-mint text-forest-deep">{t("admin.settings.secret_saved")}</Badge>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label={t("admin.settings.client_id")} value={amadeus["client_id"] ?? ""} disabled={readOnly} onChange={(v) => setAmadeus({ ...amadeus, client_id: v })} />
          <Field
            label={t("admin.settings.client_secret")}
            type="password"
            value={amadeus["client_secret"] ?? ""}
            disabled={readOnly}
            onChange={(v) => setAmadeus({ ...amadeus, client_secret: v })}
            hint={t("admin.settings.secret_hint")}
          />
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-forest-deep">{t("admin.settings.env")}</Label>
            <Select
              value={amadeus["environment"] ?? "test"}
              disabled={readOnly}
              onValueChange={(v) => setAmadeus({ ...amadeus, environment: v })}
            >
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="test">{t("admin.settings.env.test")}</SelectItem>
                <SelectItem value="production">{t("admin.settings.env.production")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          disabled={readOnly || amadeusMutation.isPending}
          onClick={() => amadeusMutation.mutate()}
          className="bg-forest text-white hover:bg-forest-deep"
        >
          {t("common.save")}
        </Button>
      </section>

      <ThemeSection theme={settings.data?.theme} readOnly={readOnly} />

      <ResetSection />
    </div>
  );
}

function ResetSection() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState("");
  const [purgeFiles, setPurgeFiles] = useState(true);

  const preview = useQuery({
    queryKey: ["reset-preview"],
    queryFn: () => getResetPreview(),
    retry: false,
  });

  const reset = useMutation({
    mutationFn: () => resetOperationalData({ data: { confirm, purgeFiles } }),
    onSuccess: () => {
      toast.success(t("admin.reset.done"));
      setConfirm("");
      void qc.invalidateQueries();
    },
    onError: (e: unknown) =>
      toast.error(t("common.error"), { description: String((e as Error)?.message ?? e) }),
  });

  if (preview.isError) return null;

  const stats: Array<[string, number | undefined]> = [
    ["admin.reset.orders", preview.data?.orders],
    ["admin.reset.invoices", preview.data?.invoices],
    ["admin.reset.payments", preview.data?.payments],
    ["admin.reset.ledger", preview.data?.ledger],
    ["admin.reset.documents", preview.data?.documents],
  ];

  return (
    <section className="surface-card space-y-4 border-destructive/40 p-5">
      <div>
        <h2 className="text-lg font-bold text-destructive">{t("admin.reset.title")}</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("admin.reset.subtitle")}</p>
        <p className="mt-1 text-xs font-semibold text-destructive">{t("admin.reset.warning")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map(([key, value]) => (
          <div key={key} className="rounded-xl bg-beige/60 p-3">
            <p className="text-xs text-muted-foreground">{t(key)}</p>
            <p className="text-lg font-bold text-forest-deep">{value ?? "—"}</p>
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-forest-deep">
        <input
          type="checkbox"
          checked={purgeFiles}
          onChange={(e) => setPurgeFiles(e.target.checked)}
          className="size-4 accent-[hsl(var(--destructive))]"
        />
        {t("admin.reset.files")}
      </label>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-destructive">
            {t("admin.reset.confirm_label")}
          </Label>
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="RESET"
            className="w-48 bg-white"
          />
        </div>
        <Button
          variant="destructive"
          disabled={confirm.trim().toUpperCase() !== "RESET" || reset.isPending}
          onClick={() => reset.mutate()}
        >
          {t("admin.reset.button")}
        </Button>
      </div>
    </section>
  );
}

