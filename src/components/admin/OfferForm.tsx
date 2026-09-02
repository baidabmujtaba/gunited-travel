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
import {
  getOfferBuilder,
  listOfferBadges,
  listOfferCurrencies,
  listOffersAdmin,
  listOfferCategories,
  saveOffer,
} from "@/lib/offers.functions";
import { listPaymentMethodsAdmin } from "@/lib/finance.functions";
import {
  BilingualSelect,
  DeparturesList,
  FaqsList,
  HotelsList,
  OFFER_TYPES,
  PRICE_MODES,
  RoomsList,
  SectionCard,
  ServicesList,
  emptyDeparture,
  emptyFaq,
  emptyHotel,
  emptyRoom,
  emptyService,
  newKey,
  type DepartureDraft,
  type FaqDraft,
  type HotelDraft,
  type RoomDraft,
  type ServiceDraft,
} from "./OfferBuilderSections";

const CATEGORIES = ["package", "visa", "flight", "tour", "insurance", "security_approval"] as const;
const IMG_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMG = 5 * 1024 * 1024;

const num = (v: string, fallback: number | null = null) =>
  v.trim() === "" || Number.isNaN(Number(v)) ? fallback : Number(v);

export type OfferDraft = {
  id?: string;
  slug?: string;
  title_ar: string;
  title_en: string;
  short_description_ar: string;
  short_description_en: string;
  description_ar: string;
  description_en: string;
  category: string;
  category_id: string;
  parent_offer_id: string;
  input_currency: string;
  badge_id: string;
  offer_type: string;
  customer_price_usd: string;
  agency_price_usd: string;
  original_price_usd: string;
  price_display_mode: string;
  tax_percent: string;
  fee_amount_usd: string;
  discount_percent: string;
  total_days: string;
  makkah_nights: string;
  madinah_nights: string;
  other_nights: string;
  other_destination: string;
  duration_ar: string;
  duration_en: string;
  expiry_date: string;
  publish_at: string;
  status: "draft" | "active" | "scheduled" | "archived";
  is_featured: boolean;
  featured_order: string;
  important_info_ar: string;
  important_info_en: string;
  terms_ar: string;
  terms_en: string;
  seo_title: string;
  seo_description: string;
  features: string[];
  images: string[];
  allowed_payment_methods: string[];
  required_documents: { key: string; label_ar: string; label_en: string; required: boolean }[];
};

export const emptyOffer: OfferDraft = {
  title_ar: "",
  title_en: "",
  short_description_ar: "",
  short_description_en: "",
  description_ar: "",
  description_en: "",
  category: "package",
  category_id: "",
  parent_offer_id: "",
  input_currency: "USD",
  badge_id: "",
  offer_type: "tourism_package",
  customer_price_usd: "",
  agency_price_usd: "",
  original_price_usd: "",
  price_display_mode: "starting_from",
  tax_percent: "0",
  fee_amount_usd: "0",
  discount_percent: "0",
  total_days: "",
  makkah_nights: "",
  madinah_nights: "",
  other_nights: "",
  other_destination: "",
  duration_ar: "",
  duration_en: "",
  expiry_date: "",
  publish_at: "",
  status: "active",
  is_featured: false,
  featured_order: "0",
  important_info_ar: "",
  important_info_en: "",
  terms_ar: "",
  terms_en: "",
  seo_title: "",
  seo_description: "",
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
  const [rooms, setRooms] = useState<RoomDraft[]>([]);
  const [hotels, setHotels] = useState<HotelDraft[]>([]);
  const [services, setServices] = useState<ServiceDraft[]>([]);
  const [faqs, setFaqs] = useState<FaqDraft[]>([]);
  const [departures, setDepartures] = useState<DepartureDraft[]>([]);
  const ar = lang === "ar";

  useEffect(() => setDraft(initial), [initial]);

  const methods = useQuery({ queryKey: ["admin-methods"], queryFn: () => listPaymentMethodsAdmin() });
  const categories = useQuery({
    queryKey: ["offer-categories"],
    queryFn: () => listOfferCategories(),
  });
  const badges = useQuery({ queryKey: ["offer-badges"], queryFn: () => listOfferBadges() });

  // Child collections live in their own tables, so hydrate them for existing offers.
  const builder = useQuery({
    queryKey: ["offer-builder", initial.id],
    queryFn: () => getOfferBuilder({ data: { id: initial.id! } }),
    enabled: Boolean(initial.id),
  });

  useEffect(() => {
    if (!builder.data) {
      setRooms([]);
      setHotels([]);
      setServices([]);
      setFaqs([]);
      setDepartures([]);
      return;
    }
    const s = (v: unknown) => (v == null ? "" : String(v));
    setRooms(
      (builder.data.rooms as Record<string, unknown>[]).map((r) => ({
        key: newKey(),
        name_ar: s(r["name_ar"]),
        name_en: s(r["name_en"]),
        occupancy: s(r["occupancy"]),
        price: s(r["price"]),
        currency_code: s(r["currency_code"]) || "USD",
        available_rooms: s(r["available_rooms"]),
        description_ar: s(r["description_ar"]),
        description_en: s(r["description_en"]),
        is_active: r["is_active"] !== false,
      })),
    );
    setHotels(
      (builder.data.hotels as Record<string, unknown>[]).map((h) => ({
        key: newKey(),
        city_ar: s(h["city_ar"]),
        city_en: s(h["city_en"]),
        name_ar: s(h["name_ar"]),
        name_en: s(h["name_en"]),
        stars: s(h["stars"]),
        distance_haram_m: s(h["distance_haram_m"]),
        distance_mosque_m: s(h["distance_mosque_m"]),
        room_type: s(h["room_type"]),
        description_ar: s(h["description_ar"]),
        description_en: s(h["description_en"]),
        check_in: s(h["check_in"]),
        check_out: s(h["check_out"]),
      })),
    );
    setServices(
      (builder.data.services as Record<string, unknown>[]).map((x) => ({
        key: newKey(),
        icon: s(x["icon"]),
        name_ar: s(x["name_ar"]),
        name_en: s(x["name_en"]),
        description_ar: s(x["description_ar"]),
        description_en: s(x["description_en"]),
        is_included: x["is_included"] !== false,
        is_optional: x["is_optional"] === true,
        extra_price_usd: s(x["extra_price_usd"]),
      })),
    );
    setFaqs(
      (builder.data.faqs as Record<string, unknown>[]).map((f) => ({
        key: newKey(),
        question_ar: s(f["question_ar"]),
        question_en: s(f["question_en"]),
        answer_ar: s(f["answer_ar"]),
        answer_en: s(f["answer_en"]),
      })),
    );
    setDepartures(
      (builder.data.departures as Record<string, unknown>[]).map((d) => ({
        key: newKey(),
        departure_date: s(d["departure_date"]),
        return_date: s(d["return_date"]),
        seats_total: s(d["seats_total"]),
        seats_taken: s(d["seats_taken"]),
        is_blocked: d["is_blocked"] === true,
        note: s(d["note"]),
      })),
    );
  }, [builder.data]);

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
          short_description_ar: draft.short_description_ar,
          short_description_en: draft.short_description_en,
          description_ar: draft.description_ar,
          description_en: draft.description_en,
          category: draft.category,
          category_id: draft.category_id || null,
          parent_offer_id: draft.parent_offer_id || null,
          input_currency: draft.input_currency || "USD",
          badge_id: draft.badge_id || null,
          offer_type: draft.offer_type as never,
          customer_price_usd: Number(draft.customer_price_usd || 0),
          agency_price_usd: Number(draft.agency_price_usd || 0),
          original_price_usd: num(draft.original_price_usd),
          price_display_mode: draft.price_display_mode as never,
          tax_percent: Number(draft.tax_percent || 0),
          fee_amount_usd: Number(draft.fee_amount_usd || 0),
          discount_percent: Number(draft.discount_percent || 0),
          total_days: num(draft.total_days),
          makkah_nights: num(draft.makkah_nights),
          madinah_nights: num(draft.madinah_nights),
          other_nights: num(draft.other_nights),
          other_destination: draft.other_destination.trim() || null,
          duration_ar: draft.duration_ar,
          duration_en: draft.duration_en,
          ...(draft.expiry_date ? { expiry_date: draft.expiry_date } : {}),
          publish_at: draft.publish_at ? new Date(draft.publish_at).toISOString() : null,
          status: draft.status,
          is_featured: draft.is_featured,
          featured_order: Number(draft.featured_order || 0),
          important_info_ar: draft.important_info_ar,
          important_info_en: draft.important_info_en,
          terms_ar: draft.terms_ar,
          terms_en: draft.terms_en,
          seo_title: draft.seo_title.trim() || null,
          seo_description: draft.seo_description.trim() || null,
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
          rooms: rooms
            .filter((r) => r.name_ar.trim() || r.name_en.trim())
            .map((r, i) => ({
              name_ar: r.name_ar.trim() || r.name_en.trim(),
              name_en: r.name_en.trim() || r.name_ar.trim(),
              occupancy: num(r.occupancy, 2) ?? 2,
              price: num(r.price, 0) ?? 0,
              currency_code: r.currency_code || "USD",
              available_rooms: num(r.available_rooms, 0) ?? 0,
              description_ar: r.description_ar,
              description_en: r.description_en,
              is_active: r.is_active,
              sort_order: i,
            })),
          hotels: hotels
            .filter((h) => h.name_ar.trim() || h.name_en.trim())
            .map((h, i) => ({
              city_ar: h.city_ar,
              city_en: h.city_en,
              name_ar: h.name_ar.trim() || h.name_en.trim(),
              name_en: h.name_en.trim() || h.name_ar.trim(),
              stars: num(h.stars, 5) ?? 5,
              distance_haram_m: num(h.distance_haram_m),
              distance_mosque_m: num(h.distance_mosque_m),
              room_type: h.room_type.trim() || null,
              image: null,
              description_ar: h.description_ar,
              description_en: h.description_en,
              check_in: h.check_in.trim() || null,
              check_out: h.check_out.trim() || null,
              sort_order: i,
            })),
          services: services
            .filter((s) => s.name_ar.trim() || s.name_en.trim())
            .map((s, i) => ({
              icon: s.icon.trim() || null,
              name_ar: s.name_ar.trim() || s.name_en.trim(),
              name_en: s.name_en.trim() || s.name_ar.trim(),
              description_ar: s.description_ar,
              description_en: s.description_en,
              is_included: s.is_included,
              extra_price_usd: num(s.extra_price_usd, 0) ?? 0,
              is_optional: s.is_optional,
              sort_order: i,
            })),
          faqs: faqs
            .filter((f) => f.question_ar.trim() || f.question_en.trim())
            .map((f, i) => ({
              question_ar: f.question_ar.trim() || f.question_en.trim(),
              question_en: f.question_en.trim() || f.question_ar.trim(),
              answer_ar: f.answer_ar,
              answer_en: f.answer_en,
              sort_order: i,
            })),
          departures: departures
            .filter((d) => d.departure_date)
            .map((d) => ({
              departure_date: d.departure_date,
              return_date: d.return_date || null,
              seats_total: num(d.seats_total, 0) ?? 0,
              seats_taken: num(d.seats_taken, 0) ?? 0,
              is_blocked: d.is_blocked,
              note: d.note.trim() || null,
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
        if (!draft.title_ar.trim() || !draft.title_en.trim()) {
          toast.error(t("checkout.required"));
          return;
        }
        // Both prices are mandatory and independent: no automatic derivation.
        if (!(Number(draft.customer_price_usd) > 0) || !(Number(draft.agency_price_usd) > 0)) {
          toast.error(t("admin.offers.prices.required"));
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
          <Row label={t("admin.offers.price.customer")}>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={draft.customer_price_usd}
              onChange={(e) => set("customer_price_usd", e.target.value)}
              required
            />
          </Row>
          <Row label={t("admin.offers.price.agency")}>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={draft.agency_price_usd}
              onChange={(e) => set("agency_price_usd", e.target.value)}
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
                <SelectItem value="scheduled">{ar ? "مجدول" : "Scheduled"}</SelectItem>

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

      <SectionCard
        title={ar ? "التصنيف والعرض" : "Classification & display"}
        hint={
          ar
            ? "اختر التصنيف والشارة ونمط عرض السعر، وحدد إن كان العرض مميزًا في الصفحة الرئيسية."
            : "Pick the category, badge and price display mode, and mark the offer as featured on the homepage."
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label={ar ? "الوصف المختصر (عربي)" : "Short description (Arabic)"}>
            <Input
              maxLength={200}
              value={draft.short_description_ar}
              onChange={(e) => set("short_description_ar", e.target.value)}
            />
          </Row>
          <Row label={ar ? "الوصف المختصر (إنجليزي)" : "Short description (English)"}>
            <Input
              maxLength={200}
              value={draft.short_description_en}
              onChange={(e) => set("short_description_en", e.target.value)}
            />
          </Row>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Row label={ar ? "تصنيف العروض" : "Offer category"}>
            <Select
              value={draft.category_id || "none"}
              onValueChange={(v) => set("category_id", v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{ar ? "بدون تصنيف" : "No category"}</SelectItem>
                {(categories.data ?? []).map((c: Record<string, unknown>) => (
                  <SelectItem key={String(c["id"])} value={String(c["id"])}>
                    {ar ? String(c["name_ar"]) : String(c["name_en"])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label={ar ? "الشارة" : "Badge"}>
            <Select
              value={draft.badge_id || "none"}
              onValueChange={(v) => set("badge_id", v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{ar ? "بدون شارة" : "No badge"}</SelectItem>
                {(badges.data ?? []).map((b: Record<string, unknown>) => (
                  <SelectItem key={String(b["id"])} value={String(b["id"])}>
                    {ar ? String(b["label_ar"]) : String(b["label_en"])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label={ar ? "نوع العرض" : "Offer type"}>
            <BilingualSelect
              value={draft.offer_type}
              onChange={(v) => set("offer_type", v)}
              options={OFFER_TYPES}
              ar={ar}
            />
          </Row>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Row label={ar ? "نمط عرض السعر" : "Price display"}>
            <BilingualSelect
              value={draft.price_display_mode}
              onChange={(v) => set("price_display_mode", v)}
              options={PRICE_MODES}
              ar={ar}
            />
          </Row>
          <Row label={ar ? "السعر قبل الخصم (دولار)" : "Original price (USD)"}>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={draft.original_price_usd}
              onChange={(e) => set("original_price_usd", e.target.value)}
            />
          </Row>
          <Row label={ar ? "تاريخ النشر المجدول" : "Scheduled publish date"}>
            <Input
              type="datetime-local"
              value={draft.publish_at}
              onChange={(e) => set("publish_at", e.target.value)}
            />
          </Row>
          <Row label={ar ? "ترتيب العرض المميز" : "Featured order"}>
            <Input
              type="number"
              min="0"
              value={draft.featured_order}
              onChange={(e) => set("featured_order", e.target.value)}
            />
          </Row>
        </div>
        <label className="flex items-center gap-3">
          <Switch checked={draft.is_featured} onCheckedChange={(v) => set("is_featured", v)} />
          <span className="text-sm">
            {ar ? "عرض مميز في الصفحة الرئيسية" : "Feature on the homepage"}
          </span>
        </label>
      </SectionCard>

      <SectionCard
        title={ar ? "تفاصيل البرنامج" : "Program details"}
        hint={
          ar
            ? "عدد الأيام وليالي مكة والمدينة تُستخدم في بطاقة العرض وصفحة التفاصيل."
            : "Days and Makkah/Madinah nights power the offer card and the details page."
        }
      >
        <div className="grid gap-4 sm:grid-cols-5">
          <Row label={ar ? "إجمالي الأيام" : "Total days"}>
            <Input
              type="number"
              min="0"
              value={draft.total_days}
              onChange={(e) => set("total_days", e.target.value)}
            />
          </Row>
          <Row label={ar ? "ليالي مكة" : "Makkah nights"}>
            <Input
              type="number"
              min="0"
              value={draft.makkah_nights}
              onChange={(e) => set("makkah_nights", e.target.value)}
            />
          </Row>
          <Row label={ar ? "ليالي المدينة" : "Madinah nights"}>
            <Input
              type="number"
              min="0"
              value={draft.madinah_nights}
              onChange={(e) => set("madinah_nights", e.target.value)}
            />
          </Row>
          <Row label={ar ? "ليالٍ أخرى" : "Other nights"}>
            <Input
              type="number"
              min="0"
              value={draft.other_nights}
              onChange={(e) => set("other_nights", e.target.value)}
            />
          </Row>
          <Row label={ar ? "الوجهة الأخرى" : "Other destination"}>
            <Input
              value={draft.other_destination}
              onChange={(e) => set("other_destination", e.target.value)}
            />
          </Row>
        </div>
      </SectionCard>


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

      <SectionCard
        title={ar ? "أنواع الغرف والأسعار" : "Room types & pricing"}
        hint={
          ar
            ? "أضف سعرًا لكل نوع غرفة (ثنائية، ثلاثية، رباعية…) مع عدد الغرف المتاحة."
            : "Add a price per room type (double, triple, quad…) with available inventory."
        }
        onAdd={() => setRooms((r) => [...r, emptyRoom()])}
        addLabel={ar ? "إضافة غرفة" : "Add room"}
      >
        <RoomsList items={rooms} onChange={setRooms} ar={ar} />
      </SectionCard>

      <SectionCard
        title={ar ? "الفنادق" : "Hotels"}
        hint={
          ar
            ? "الفنادق المستخدمة في البرنامج مع التصنيف والمسافة من الحرم."
            : "Hotels used in the program with star rating and distance from the Haram."
        }
        onAdd={() => setHotels((h) => [...h, emptyHotel()])}
        addLabel={ar ? "إضافة فندق" : "Add hotel"}
      >
        <HotelsList items={hotels} onChange={setHotels} ar={ar} />
      </SectionCard>

      <SectionCard
        title={ar ? "الخدمات المشمولة وغير المشمولة" : "Included & excluded services"}
        onAdd={() => setServices((s) => [...s, emptyService(true)])}
        addLabel={ar ? "إضافة خدمة" : "Add service"}
      >
        <ServicesList items={services} onChange={setServices} ar={ar} />
      </SectionCard>

      <SectionCard
        title={ar ? "تواريخ المغادرة والمقاعد" : "Departure dates & seats"}
        onAdd={() => setDepartures((d) => [...d, emptyDeparture()])}
        addLabel={ar ? "إضافة تاريخ" : "Add date"}
      >
        <DeparturesList items={departures} onChange={setDepartures} ar={ar} />
      </SectionCard>

      <SectionCard
        title={ar ? "الأسئلة الشائعة" : "FAQs"}
        onAdd={() => setFaqs((f) => [...f, emptyFaq()])}
        addLabel={ar ? "إضافة سؤال" : "Add question"}
      >
        <FaqsList items={faqs} onChange={setFaqs} ar={ar} />
      </SectionCard>

      <SectionCard
        title={ar ? "معلومات مهمة والشروط" : "Important information & terms"}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label={ar ? "معلومات مهمة (عربي)" : "Important info (Arabic)"}>
            <Textarea
              rows={4}
              value={draft.important_info_ar}
              onChange={(e) => set("important_info_ar", e.target.value)}
            />
          </Row>
          <Row label={ar ? "معلومات مهمة (إنجليزي)" : "Important info (English)"}>
            <Textarea
              rows={4}
              value={draft.important_info_en}
              onChange={(e) => set("important_info_en", e.target.value)}
            />
          </Row>
          <Row label={ar ? "الشروط والأحكام (عربي)" : "Terms (Arabic)"}>
            <Textarea
              rows={4}
              value={draft.terms_ar}
              onChange={(e) => set("terms_ar", e.target.value)}
            />
          </Row>
          <Row label={ar ? "الشروط والأحكام (إنجليزي)" : "Terms (English)"}>
            <Textarea
              rows={4}
              value={draft.terms_en}
              onChange={(e) => set("terms_en", e.target.value)}
            />
          </Row>
        </div>
      </SectionCard>

      <SectionCard title={ar ? "تحسين محركات البحث" : "SEO"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label={ar ? "عنوان SEO" : "SEO title"}>
            <Input
              maxLength={150}
              value={draft.seo_title}
              onChange={(e) => set("seo_title", e.target.value)}
            />
          </Row>
          <Row label={ar ? "وصف SEO" : "SEO description"}>
            <Input
              maxLength={300}
              value={draft.seo_description}
              onChange={(e) => set("seo_description", e.target.value)}
            />
          </Row>
        </div>
      </SectionCard>

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
