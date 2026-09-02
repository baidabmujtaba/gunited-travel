import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { OfferForm, emptyOffer, type OfferDraft } from "@/components/admin/OfferForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { archiveOffer, listOffersAdmin } from "@/lib/offers.functions";
import { normalizeDocs } from "@/lib/offer-docs";

export const Route = createFileRoute("/_authenticated/admin/offers")({
  head: () => ({
    meta: [
      { title: "Offers & Services — Gunited Travel ERP" },
      {
        name: "description",
        content:
          "Create and manage Gunited Travel offers: pricing, gallery, allowed payment methods and required customer documents.",
      },
      { property: "og:title", content: "Offers & Services — Gunited Travel ERP" },
      {
        property: "og:description",
        content: "Publish travel offers with pricing, documents and payment rules.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminOffersPage,
  errorComponent: ({ error }) => (
    <p className="surface-card p-6 text-sm text-destructive">{error.message}</p>
  ),
  notFoundComponent: () => <p className="surface-card p-6 text-sm">404</p>,
});

function toDraft(row: Record<string, unknown>): OfferDraft {
  const s = (k: string) => (row[k] == null ? "" : String(row[k]));
  return {
    id: String(row["id"]),
    slug: s("slug"),
    title_ar: s("title_ar"),
    title_en: s("title_en"),
    short_description_ar: s("short_description_ar"),
    short_description_en: s("short_description_en"),
    description_ar: s("description_ar"),
    description_en: s("description_en"),
    category: s("category") || "package",
    category_id: s("category_id"),
    badge_id: s("badge_id"),
    offer_type: s("offer_type") || "tourism_package",
    customer_price_usd: String(row["customer_price_usd"] ?? row["base_price_usd"] ?? ""),
    agency_price_usd: s("agency_price_usd"),
    original_price_usd: s("original_price_usd"),
    price_display_mode: s("price_display_mode") || "starting_from",
    tax_percent: String(row["tax_percent"] ?? 0),
    fee_amount_usd: String(row["fee_amount_usd"] ?? 0),
    discount_percent: String(row["discount_percent"] ?? 0),
    total_days: s("total_days"),
    makkah_nights: s("makkah_nights"),
    madinah_nights: s("madinah_nights"),
    other_nights: s("other_nights"),
    other_destination: s("other_destination"),
    duration_ar: s("duration_ar"),
    duration_en: s("duration_en"),
    expiry_date: s("expiry_date"),
    publish_at: s("publish_at").slice(0, 16),
    status: ((row["status"] as OfferDraft["status"]) ?? "active"),
    is_featured: row["is_featured"] === true,
    featured_order: String(row["featured_order"] ?? 0),
    important_info_ar: s("important_info_ar"),
    important_info_en: s("important_info_en"),
    terms_ar: s("terms_ar"),
    terms_en: s("terms_en"),
    seo_title: s("seo_title"),
    seo_description: s("seo_description"),
    features: Array.isArray(row["features"]) ? (row["features"] as string[]) : [],
    images: Array.isArray(row["images"]) ? (row["images"] as string[]) : [],
    allowed_payment_methods: Array.isArray(row["allowed_payment_methods"])
      ? (row["allowed_payment_methods"] as string[])
      : [],
    required_documents: normalizeDocs(row["required_documents"]),
  };
}


function AdminOffersPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<OfferDraft | null>(null);

  const offers = useQuery({ queryKey: ["admin-offers"], queryFn: () => listOffersAdmin() });

  const archive = useMutation({
    mutationFn: (id: string) => archiveOffer({ data: { id } }),
    onSuccess: () => {
      toast.success(t("admin.offers.archived"));
      void qc.invalidateQueries({ queryKey: ["admin-offers"] });
      void qc.invalidateQueries({ queryKey: ["catalog"] });
    },
    onError: (e) => toast.error(t("common.error"), { description: String(e.message ?? e) }),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest-deep">{t("admin.offers.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("admin.offers.subtitle")}
          </p>
        </div>
        <Button
          className="bg-forest text-white hover:bg-forest-deep"
          onClick={() => setEditing({ ...emptyOffer })}
        >
          <Plus className="size-4" /> {t("admin.offers.new")}
        </Button>
      </header>

      {editing ? (
        <OfferForm
          initial={editing}
          onSaved={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      ) : null}

      <section className="surface-card overflow-hidden">
        {offers.data && offers.data.length > 0 ? (
          <ul className="divide-y divide-border/60">
            {offers.data.map((row: Record<string, unknown>) => (
              <li key={String(row["id"])} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-[14rem] flex-1">
                  <p className="font-semibold text-forest-deep">
                    {lang === "ar" ? String(row["title_ar"]) : String(row["title_en"])}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`category.${String(row["category"])}`)} ·{" "}
                    {t("admin.offers.price.customer")}: $
                    {Number(row["customer_price_usd"] ?? row["base_price_usd"] ?? 0).toFixed(2)} ·{" "}
                    {t("admin.offers.price.agency")}:{" "}
                    {row["agency_price_usd"] == null
                      ? "—"
                      : `$${Number(row["agency_price_usd"]).toFixed(2)}`}{" "}
                    · {normalizeDocs(row["required_documents"]).length} {t("checkout.docs")}
                  </p>
                </div>
                <Badge className={row["status"] === "active" ? "bg-forest text-cream" : "bg-secondary"}>
                  {t(`admin.offers.status.${String(row["status"])}`)}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => setEditing(toDraft(row))}>
                  <Pencil className="size-4" /> {t("admin.offers.edit")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => archive.mutate(String(row["id"]))}
                >
                  <Trash2 className="size-4" /> {t("admin.offers.archive")}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-sm text-muted-foreground">{t("admin.offers.empty")}</p>
        )}
      </section>
    </div>
  );
}
