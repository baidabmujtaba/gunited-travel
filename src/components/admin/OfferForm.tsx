import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { saveOffer } from "@/lib/offers.functions";
import { listPaymentMethodsAdmin } from "@/lib/finance.functions";

const CATEGORIES = ["package", "visa", "flight", "tour", "insurance"] as const;
const IMG_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMG = 5 * 1024 * 1024;

export type OfferDraft = {
  id?: string;
  slug?: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  category: string;
  base_price_usd: string;
  tax_percent: string;
  fee_amount_usd: string;
  discount_percent: string;
  duration_ar: string;
  duration_en: string;
  expiry_date: string;
  status: "draft" | "active" | "archived";
  features: string[];
  images: string[];
  allowed_payment_methods: string[];
  required_documents: { key: string; label_ar: string; label_en: string; required: boolean }[];
};

export const emptyOffer: OfferDraft = {
  title_ar: "",
  title_en: "",
  description_ar: "",
  description_en: "",
  category: "package",
  base_price_usd: "",
  tax_percent: "0",
  fee_amount_usd: "0",
  discount_percent: "0",
  duration_ar: "",
  duration_en: "",
  expiry_date: "",
  status: "active",
  features: [],
  images: [],
  allowed_payment_methods: [],
  required_documents: [],
};

export function OfferForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: OfferDraft;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<OfferDraft>(initial);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => setDraft(initial), [initial]);

  const methods = useQuery({ queryKey: ["admin-methods"], queryFn: () => listPaymentMethodsAdmin() });

  // Private bucket: preview uploaded artwork through short-lived signed URLs.
  useEffect(() => {
    const paths = draft.images.filter((p) => !/^(https?:|\/|data:)/.test(p));
    if (paths.length === 0) return;
    void supabase.storage
      .from("offer-images")
      .createSignedUrls(paths, 3600)
      .then(({ data }) => {
        if (!data) return;
        setPreviews((prev) => ({
          ...prev,
          ...Object.fromEntries(
            data.flatMap((d): [string, string][] =>
              d.path && d.signedUrl ? [[d.path, d.signedUrl]] : [],
            ),
          ),
        }));
      });
  }, [draft.images]);

  const save = useMutation({
    mutationFn: () =>
      saveOffer({
        data: {
          ...(draft.id ? { id: draft.id } : {}),
          title_ar: draft.title_ar.trim(),
          title_en: draft.title_en.trim(),
          description_ar: draft.description_ar,
          description_en: draft.description_en,
          category: draft.category,
          base_price_usd: Number(draft.base_price_usd || 0),
          tax_percent: Number(draft.tax_percent || 0),
          fee_amount_usd: Number(draft.fee_amount_usd || 0),
          discount_percent: Number(draft.discount_percent || 0),
          duration_ar: draft.duration_ar,
          duration_en: draft.duration_en,
          ...(draft.expiry_date ? { expiry_date: draft.expiry_date } : {}),
          status: draft.status,
          features: draft.features.filter((f) => f.trim().length > 0),
          images: draft.images,
          allowed_payment_methods: draft.allowed_payment_methods,
          required_documents: draft.required_documents
            .filter((d) => d.label_ar.trim() || d.label_en.trim())
            .map((d, i) => ({
              key: d.key || `doc-${i + 1}`,
              label_ar: d.label_ar.trim() || d.label_en.trim(),
              label_en: d.label_en.trim() || d.label_ar.trim(),
              required: d.required,
            })),
        },
      }),
    onSuccess: () => {
      toast.success(t("admin.offers.saved"));
      void qc.invalidateQueries({ queryKey: ["admin-offers"] });
      void qc.invalidateQueries({ queryKey: ["catalog"] });
      onSaved();
    },
    onError: (e) => toast.error(t("common.error"), { description: String(e.message ?? e) }),
  });

  async function uploadImages(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const paths: string[] = [];
      for (const file of Array.from(files)) {
        if (!IMG_TYPES.includes(file.type)) {
          toast.error(t("checkout.filetype"));
          continue;
        }
        if (file.size > MAX_IMG) {
          toast.error(t("checkout.filesize"));
          continue;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `offers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage
          .from("offer-images")
          .upload(path, file, { contentType: file.type });
        if (error) {
          toast.error(error.message);
          continue;
        }
        paths.push(path);
      }
      if (paths.length) setDraft((d) => ({ ...d, images: [...d.images, ...paths] }));
    } finally {
      setUploading(false);
    }
  }

  const set = <K extends keyof OfferDraft>(k: K, v: OfferDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.title_ar.trim() || !draft.title_en.trim() || !Number(draft.base_price_usd)) {
          toast.error(t("checkout.required"));
          return;
        }
        save.mutate();
      }}
    >
      <section className="surface-card space-y-4 p-6">
        <h2 className="text-lg font-bold">{t("admin.offers.basics")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label={t("admin.offers.title_ar")}>
            <Input value={draft.title_ar} onChange={(e) => set("title_ar", e.target.value)} required />
          </Row>
          <Row label={t("admin.offers.title_en")}>
            <Input value={draft.title_en} onChange={(e) => set("title_en", e.target.value)} required />
          </Row>
        </div>
        <Row label={t("admin.offers.desc_ar")}>
          <Textarea
            rows={3}
            value={draft.description_ar}
            onChange={(e) => set("description_ar", e.target.value)}
          />
        </Row>
        <Row label={t("admin.offers.desc_en")}>
          <Textarea
            rows={3}
            value={draft.description_en}
            onChange={(e) => set("description_en", e.target.value)}
          />
        </Row>
        <div className="grid gap-4 sm:grid-cols-3">
          <Row label={t("admin.offers.category")}>
            <Select value={draft.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`category.${c}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label={t("admin.offers.price")}>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={draft.base_price_usd}
              onChange={(e) => set("base_price_usd", e.target.value)}
              required
            />
          </Row>
          <Row label={t("admin.offers.status")}>
            <Select
              value={draft.status}
              onValueChange={(v) => set("status", v as OfferDraft["status"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t("admin.offers.status.active")}</SelectItem>
                <SelectItem value="draft">{t("admin.offers.status.draft")}</SelectItem>
                <SelectItem value="archived">{t("admin.offers.status.archived")}</SelectItem>
              </SelectContent>
            </Select>
          </Row>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Row label={t("admin.offers.tax")}>
            <Input
              type="number"
              min="0"
              value={draft.tax_percent}
              onChange={(e) => set("tax_percent", e.target.value)}
            />
          </Row>
          <Row label={t("admin.offers.fee")}>
            <Input
              type="number"
              min="0"
              value={draft.fee_amount_usd}
              onChange={(e) => set("fee_amount_usd", e.target.value)}
            />
          </Row>
          <Row label={t("admin.offers.discount")}>
            <Input
              type="number"
              min="0"
              value={draft.discount_percent}
              onChange={(e) => set("discount_percent", e.target.value)}
            />
          </Row>
          <Row label={t("admin.offers.expiry")}>
            <Input
              type="date"
              value={draft.expiry_date}
              onChange={(e) => set("expiry_date", e.target.value)}
            />
          </Row>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label={t("admin.offers.duration_ar")}>
            <Input value={draft.duration_ar} onChange={(e) => set("duration_ar", e.target.value)} />
          </Row>
          <Row label={t("admin.offers.duration_en")}>
            <Input value={draft.duration_en} onChange={(e) => set("duration_en", e.target.value)} />
          </Row>
        </div>
      </section>

      <section className="surface-card space-y-4 p-6">
        <h2 className="text-lg font-bold">{t("admin.offers.images")}</h2>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-sage/70 bg-secondary/40 p-4 text-sm hover:bg-secondary">
          {uploading ? (
            <Loader2 className="size-4 animate-spin text-sage" />
          ) : (
            <Upload className="size-4 text-sage" />
          )}
          <span>{t("admin.offers.images.add")}</span>
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => void uploadImages(e.target.files)}
          />
        </label>
        {draft.images.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {draft.images.map((path, i) => (
              <li key={path} className="relative overflow-hidden rounded-xl border border-border">
                <img
                  src={previews[path] ?? path}
                  alt={draft.title_en || "offer"}
                  className="h-28 w-full object-cover"
                />
                {i === 0 ? (
                  <span className="absolute start-1 top-1 rounded bg-forest px-1.5 py-0.5 text-[10px] text-cream">
                    {t("admin.offers.images.primary")}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="absolute end-1 top-1 rounded-full bg-background/90 p-1"
                  onClick={() =>
                    set(
                      "images",
                      draft.images.filter((p) => p !== path),
                    )
                  }
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="surface-card space-y-4 p-6">
        <h2 className="text-lg font-bold">{t("admin.offers.methods")}</h2>
        <p className="text-sm text-muted-foreground">{t("admin.offers.methods.note")}</p>
        <ul className="space-y-2">
          {(methods.data ?? []).map((m: any) => {
            const checked = draft.allowed_payment_methods.includes(m.id);
            return (
              <li key={m.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                <Checkbox
                  id={`pm-${m.id}`}
                  checked={checked}
                  onCheckedChange={(v) =>
                    set(
                      "allowed_payment_methods",
                      v
                        ? [...draft.allowed_payment_methods, m.id]
                        : draft.allowed_payment_methods.filter((x) => x !== m.id),
                    )
                  }
                />
                <Label htmlFor={`pm-${m.id}`} className="cursor-pointer">
                  {lang === "ar" ? m.name_ar : m.name_en}
                </Label>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="surface-card space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{t("admin.offers.docs")}</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              set("required_documents", [
                ...draft.required_documents,
                {
                  key: `doc-${draft.required_documents.length + 1}-${Math.random()
                    .toString(36)
                    .slice(2, 6)}`,
                  label_ar: "",
                  label_en: "",
                  required: true,
                },
              ])
            }
          >
            <Plus className="size-4" /> {t("admin.offers.docs.add")}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{t("admin.offers.docs.note")}</p>
        {draft.required_documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admin.offers.docs.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {draft.required_documents.map((doc, idx) => (
              <li
                key={doc.key}
                className="grid gap-3 rounded-xl border border-border/60 p-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center"
              >
                <Input
                  placeholder={t("admin.offers.docs.label_ar")}
                  value={doc.label_ar}
                  onChange={(e) => {
                    const next = [...draft.required_documents];
                    next[idx] = { ...doc, label_ar: e.target.value };
                    set("required_documents", next);
                  }}
                />
                <Input
                  placeholder={t("admin.offers.docs.label_en")}
                  value={doc.label_en}
                  onChange={(e) => {
                    const next = [...draft.required_documents];
                    next[idx] = { ...doc, label_en: e.target.value };
                    set("required_documents", next);
                  }}
                />
                <div className="flex items-center gap-2">
                  <Switch
                    checked={doc.required}
                    onCheckedChange={(v) => {
                      const next = [...draft.required_documents];
                      next[idx] = { ...doc, required: v };
                      set("required_documents", next);
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {t("admin.offers.docs.required")}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() =>
                    set(
                      "required_documents",
                      draft.required_documents.filter((d) => d.key !== doc.key),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          size="lg"
          className="bg-forest text-white hover:bg-forest-deep"
          disabled={save.isPending || uploading}
        >
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("admin.offers.save")}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" size="lg" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
