/**
 * Public storefront + booking server functions for the dynamic offers/packages
 * system. Public reads use the publishable-key client (narrow anon SELECT
 * policies); the booking write runs as the signed-in user.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { normalizeCurrency } from "./currency";
import { normalizeDocs, type RequiredDocument } from "./offer-docs";
import { computePrice, type PriceBreakdown } from "./pricing";
import { computePackageQuote, type PackageQuote, type QuoteCoupon } from "./package-pricing";
import { getPublicClient } from "./public-client.server";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type PackageBadge = {
  label_ar: string;
  label_en: string;
  color: string;
};

export type PackageCategory = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  is_featured: boolean;
  display_order: number;
};

export type PackageSummary = {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  short_description_ar: string;
  short_description_en: string;
  category: string;
  category_id: string | null;
  offer_type: string;
  duration_ar: string | null;
  duration_en: string | null;
  total_days: number | null;
  makkah_nights: number | null;
  madinah_nights: number | null;
  other_nights: number | null;
  other_destination: string | null;
  price_display_mode: string;
  original_price_usd: number | null;
  is_featured: boolean;
  featured_order: number;
  primary_image: string | null;
  badge: PackageBadge | null;
  stars: number | null;
  inclusions: { name_ar: string; name_en: string }[];
  view_count: number;
  booking_count: number;
  created_at: string;
  price: PriceBreakdown;
};

export type PackageHotel = {
  id: string;
  city_ar: string;
  city_en: string;
  name_ar: string;
  name_en: string;
  stars: number;
  distance_haram_m: number | null;
  distance_mosque_m: number | null;
  room_type: string | null;
  image: string | null;
  description_ar: string;
  description_en: string;
  check_in: string | null;
  check_out: string | null;
};

export type PackageRoom = {
  id: string;
  name_ar: string;
  name_en: string;
  occupancy: number;
  priceUsd: number;
  price: number;
  available_rooms: number;
  description_ar: string;
  description_en: string;
};

export type PackageService = {
  id: string;
  icon: string | null;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  is_included: boolean;
  is_optional: boolean;
  extra_price_usd: number;
  extra_price: number;
};

export type PackageDeparture = {
  id: string;
  departure_date: string;
  return_date: string | null;
  seats_total: number;
  seats_taken: number;
  seats_left: number;
  note: string | null;
};

export type PackageFaq = {
  id: string;
  question_ar: string;
  question_en: string;
  answer_ar: string;
  answer_en: string;
};

export type PackageDetail = PackageSummary & {
  description_ar: string;
  description_en: string;
  important_info_ar: string;
  important_info_en: string;
  terms_ar: string;
  terms_en: string;
  features: string[];
  images: string[];
  expiry_date: string | null;
  allowed_payment_methods: string[];
  required_documents: RequiredDocument[];
  seo_title: string | null;
  seo_description: string | null;
  hotels: PackageHotel[];
  rooms: PackageRoom[];
  services: PackageService[];
  departures: PackageDeparture[];
  faqs: PackageFaq[];
};

export type CurrencyInfo = {
  code: string;
  name_en: string;
  name_ar: string;
  symbol: string;
  decimals: number;
  rate: number;
};

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

const OFFER_COLUMNS =
  "id,slug,title_ar,title_en,short_description_ar,short_description_en,description_ar,description_en," +
  "category,category_id,badge_id,offer_type,customer_price_usd,base_price_usd,original_price_usd," +
  "price_display_mode,tax_percent,fee_amount_usd,discount_percent,commission_percent," +
  "duration_ar,duration_en,total_days,makkah_nights,madinah_nights,other_nights,other_destination," +
  "is_featured,featured_order,primary_image,images,features,expiry_date,publish_at,status," +
  "important_info_ar,important_info_en,terms_ar,terms_en,seo_title,seo_description," +
  "allowed_payment_methods,required_documents,view_count,booking_count,created_at";

const EXCLUDED_CATEGORIES = ["security_approval"];

async function loadCurrencies(): Promise<CurrencyInfo[]> {
  const sb = getPublicClient();
  const [{ data: currencies }, { data: rates }] = await Promise.all([
    sb.from("currencies").select("code,name_en,name_ar,symbol,decimals").eq("is_active", true),
    sb.from("exchange_rates").select("currency_code,rate_per_usd"),
  ]);
  const rateMap = new Map((rates ?? []).map((r) => [r.currency_code, Number(r.rate_per_usd)]));
  return (currencies ?? []).map((c) => ({ ...c, rate: rateMap.get(c.code) ?? 1 }));
}

function pickCurrency(currencies: CurrencyInfo[], code: string) {
  return (
    currencies.find((c) => c.code === code) ??
    currencies.find((c) => c.code === "USD") ?? {
      code: "USD",
      name_en: "US Dollar",
      name_ar: "دولار أمريكي",
      symbol: "$",
      decimals: 2,
      rate: 1,
    }
  );
}

async function signPaths(paths: string[]): Promise<Map<string, string>> {
  const storagePaths = paths.filter((p) => p && !/^(https?:|\/|data:)/.test(p));
  if (storagePaths.length === 0) return new Map();
  const sb = getPublicClient();
  const { data } = await sb.storage.from("offer-images").createSignedUrls(storagePaths, 60 * 60);
  return new Map(
    (data ?? [])
      .filter((d) => d.path && d.signedUrl)
      .map((d) => [d.path as string, d.signedUrl as string]),
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OfferRow = any;

function mapSummary(
  r: OfferRow,
  cur: { code: string; rate: number; decimals: number },
  extras: {
    badge?: PackageBadge | null;
    stars?: number | null;
    inclusions?: { name_ar: string; name_en: string }[];
    signed?: Map<string, string>;
  } = {},
): PackageSummary {
  const priceUsd = Number(r.customer_price_usd ?? r.base_price_usd ?? 0);
  const primary = r.primary_image ?? null;
  return {
    id: r.id,
    slug: r.slug ?? r.id,
    title_ar: r.title_ar,
    title_en: r.title_en,
    short_description_ar: r.short_description_ar || (r.description_ar ?? "").slice(0, 200),
    short_description_en: r.short_description_en || (r.description_en ?? "").slice(0, 200),
    category: r.category,
    category_id: r.category_id ?? null,
    offer_type: r.offer_type ?? "tourism_package",
    duration_ar: r.duration_ar || null,
    duration_en: r.duration_en || null,
    total_days: r.total_days ?? null,
    makkah_nights: r.makkah_nights ?? null,
    madinah_nights: r.madinah_nights ?? null,
    other_nights: r.other_nights ?? null,
    other_destination: r.other_destination ?? null,
    price_display_mode: r.price_display_mode ?? "starting_from",
    original_price_usd:
      r.original_price_usd === null || r.original_price_usd === undefined
        ? null
        : Number(r.original_price_usd),
    is_featured: Boolean(r.is_featured),
    featured_order: Number(r.featured_order ?? 0),
    primary_image: primary ? (extras.signed?.get(primary) ?? primary) : null,
    badge: extras.badge ?? null,
    stars: extras.stars ?? null,
    inclusions: extras.inclusions ?? [],
    view_count: Number(r.view_count ?? 0),
    booking_count: Number(r.booking_count ?? 0),
    created_at: r.created_at,
    price: computePrice(
      {
        basePriceUsd: priceUsd,
        taxPercent: r.tax_percent,
        feeAmountUsd: r.fee_amount_usd,
        discountPercent: r.discount_percent,
        commissionPercent: r.commission_percent,
      },
      cur.code,
      cur.rate,
      cur.decimals,
    ),
  };
}

function publishedFilter(r: OfferRow) {
  const today = new Date().toISOString().slice(0, 10);
  if (r.expiry_date && r.expiry_date < today) return false;
  if (r.publish_at && new Date(r.publish_at).getTime() > Date.now()) return false;
  return !EXCLUDED_CATEGORIES.includes(r.category);
}

/** Loads badges, top hotel rating and included services for a set of offers. */
async function loadCardExtras(rows: OfferRow[]) {
  const sb = getPublicClient();
  const ids = rows.map((r) => r.id);
  const badgeIds = Array.from(new Set(rows.map((r) => r.badge_id).filter(Boolean))) as string[];
  const [{ data: badges }, { data: hotels }, { data: services }] = await Promise.all([
    badgeIds.length
      ? sb.from("offer_badges").select("id,label_ar,label_en,color").in("id", badgeIds)
      : Promise.resolve({ data: [] as any[] }),
    ids.length
      ? sb.from("offer_hotels").select("offer_id,stars").in("offer_id", ids)
      : Promise.resolve({ data: [] as any[] }),
    ids.length
      ? sb
          .from("offer_services")
          .select("offer_id,name_ar,name_en,is_included,sort_order")
          .in("offer_id", ids)
          .eq("is_included", true)
          .order("sort_order")
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const badgeMap = new Map(
    (badges ?? []).map((b: any) => [
      b.id,
      { label_ar: b.label_ar, label_en: b.label_en, color: b.color } as PackageBadge,
    ]),
  );
  const starMap = new Map<string, number>();
  for (const h of hotels ?? []) {
    const cur = starMap.get(h.offer_id) ?? 0;
    starMap.set(h.offer_id, Math.max(cur, Number(h.stars ?? 0)));
  }
  const inclusionMap = new Map<string, { name_ar: string; name_en: string }[]>();
  for (const s of services ?? []) {
    const list = inclusionMap.get(s.offer_id) ?? [];
    if (list.length < 4) list.push({ name_ar: s.name_ar, name_en: s.name_en });
    inclusionMap.set(s.offer_id, list);
  }
  const signed = await signPaths(rows.map((r) => r.primary_image).filter(Boolean) as string[]);

  return { badgeMap, starMap, inclusionMap, signed };
}

/* ------------------------------------------------------------------ */
/* Public reads                                                        */
/* ------------------------------------------------------------------ */

export const listPackageCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<PackageCategory[]> => {
    const sb = getPublicClient();
    const { data } = await sb
      .from("offer_categories")
      .select("id,slug,name_ar,name_en,is_featured,display_order")
      .eq("is_active", true)
      .order("display_order");
    return (data ?? []) as PackageCategory[];
  },
);

const listInput = z.object({
  currency: z.unknown().transform(normalizeCurrency).default("USD"),
  categoryId: z.string().uuid().nullable().optional(),
  search: z.string().max(120).optional(),
  minPriceUsd: z.number().min(0).nullable().optional(),
  maxPriceUsd: z.number().min(0).nullable().optional(),
  minDays: z.number().int().min(0).nullable().optional(),
  maxDays: z.number().int().min(0).nullable().optional(),
  minStars: z.number().int().min(0).max(7).nullable().optional(),
  featuredOnly: z.boolean().optional(),
  sort: z
    .enum(["featured", "popular", "price_asc", "price_desc", "newest"])
    .default("featured")
    .optional(),
  limit: z.number().int().min(1).max(60).optional(),
});

type ListInput = z.infer<typeof listInput>;

async function queryPackages(data: ListInput): Promise<{
  offers: PackageSummary[];
  currencies: CurrencyInfo[];
  categories: PackageCategory[];
}> {
  const sb = getPublicClient();
  const currencies = await loadCurrencies();
  const cur = pickCurrency(currencies, data.currency);

  const { data: rows, error } = await sb
    .from("service_offers")
    .select(OFFER_COLUMNS)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const { data: categories } = await sb
    .from("offer_categories")
    .select("id,slug,name_ar,name_en,is_featured,display_order")
    .eq("is_active", true)
    .order("display_order");

  let published = ((rows ?? []) as OfferRow[]).filter(publishedFilter);
  if (data.categoryId) published = published.filter((r) => r.category_id === data.categoryId);
  if (data.featuredOnly) published = published.filter((r) => r.is_featured);
  if (data.search) {
    const q = data.search.trim().toLowerCase();
    published = published.filter((r) =>
      [
        r.title_ar,
        r.title_en,
        r.short_description_ar,
        r.short_description_en,
        r.description_ar,
        r.description_en,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  if (data.minDays != null) published = published.filter((r) => (r.total_days ?? 0) >= data.minDays!);
  if (data.maxDays != null) published = published.filter((r) => (r.total_days ?? 999) <= data.maxDays!);

  const extras = await loadCardExtras(published);
  let offers = published.map((r) =>
    mapSummary(r, cur, {
      badge: r.badge_id ? (extras.badgeMap.get(r.badge_id) ?? null) : null,
      stars: extras.starMap.get(r.id) ?? null,
      inclusions: extras.inclusionMap.get(r.id) ?? [],
      signed: extras.signed,
    }),
  );

  if (data.minPriceUsd != null) offers = offers.filter((o) => o.price.totalUsd >= data.minPriceUsd!);
  if (data.maxPriceUsd != null) offers = offers.filter((o) => o.price.totalUsd <= data.maxPriceUsd!);
  if (data.minStars != null) offers = offers.filter((o) => (o.stars ?? 0) >= data.minStars!);

  const sort = data.sort ?? "featured";
  offers.sort((a, b) => {
    if (sort === "price_asc") return a.price.totalUsd - b.price.totalUsd;
    if (sort === "price_desc") return b.price.totalUsd - a.price.totalUsd;
    if (sort === "popular") return b.booking_count + b.view_count - (a.booking_count + a.view_count);
    if (sort === "newest") return b.created_at.localeCompare(a.created_at);
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    return a.featured_order - b.featured_order || b.created_at.localeCompare(a.created_at);
  });

  if (data.limit) offers = offers.slice(0, data.limit);
  return { offers, currencies, categories: (categories ?? []) as PackageCategory[] };
}

export const listPackages = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => listInput.parse(d ?? {}))
  .handler(async ({ data }) => queryPackages(data));

export const getFeaturedPackages = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        currency: z.unknown().transform(normalizeCurrency).default("USD"),
        limit: z.number().int().min(1).max(24).default(6),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const result = await queryPackages({
      currency: data.currency,
      sort: "featured",
      limit: data.limit,
    } as ListInput);
    // Featured first; fall back to the newest offers so the section is never empty.
    const featured = result.offers.filter((o) => o.is_featured);
    return {
      offers: (featured.length > 0 ? featured : result.offers).slice(0, data.limit),
      currencies: result.currencies,
      categories: result.categories,
    };
  });


export const getPackage = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        slug: z.string().min(1).max(120),
        currency: z.unknown().transform(normalizeCurrency).default("USD"),
      })
      .parse(d),
  )
  .handler(
    async ({ data }): Promise<{ offer: PackageDetail | null; currencies: CurrencyInfo[] }> => {
      const sb = getPublicClient();
      const currencies = await loadCurrencies();
      const cur = pickCurrency(currencies, data.currency);

      const { data: row } = await sb
        .from("service_offers")
        .select(OFFER_COLUMNS)
        .eq("slug", data.slug)
        .eq("status", "active")
        .is("deleted_at", null)
        .maybeSingle();
      const offerRow = row as OfferRow | null;
      if (!offerRow || !publishedFilter(offerRow)) return { offer: null, currencies };

      const [
        { data: hotels },
        { data: rooms },
        { data: services },
        { data: departures },
        { data: faqs },
        { data: badge },
      ] = await Promise.all([
        sb.from("offer_hotels").select("*").eq("offer_id", offerRow.id).order("sort_order"),
        sb
          .from("offer_room_types")
          .select("*")
          .eq("offer_id", offerRow.id)
          .eq("is_active", true)
          .order("sort_order"),
        sb.from("offer_services").select("*").eq("offer_id", offerRow.id).order("sort_order"),
        sb
          .from("offer_departures")
          .select("*")
          .eq("offer_id", offerRow.id)
          .eq("is_blocked", false)
          .gte("departure_date", new Date().toISOString().slice(0, 10))
          .order("departure_date"),
        sb.from("offer_faqs").select("*").eq("offer_id", offerRow.id).order("sort_order"),
        offerRow.badge_id
          ? sb
              .from("offer_badges")
              .select("label_ar,label_en,color")
              .eq("id", offerRow.badge_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const rateFor = (code: string) =>
        currencies.find((c) => c.code === normalizeCurrency(code))?.rate ?? 1;

      const galleryPaths = [
        ...(offerRow.primary_image ? [offerRow.primary_image] : []),
        ...(Array.isArray(offerRow.images) ? (offerRow.images as string[]) : []),
        ...((hotels ?? []).map((h: any) => h.image).filter(Boolean) as string[]),
      ];
      const signed = await signPaths(galleryPaths);
      const sign = (p: string | null) => (p ? (signed.get(p) ?? p) : null);

      const stars = (hotels ?? []).reduce((m: number, h: any) => Math.max(m, Number(h.stars ?? 0)), 0);
      const summary = mapSummary(offerRow, cur, {
        badge: (badge as PackageBadge | null) ?? null,
        stars: stars || null,
        inclusions: (services ?? [])
          .filter((s: any) => s.is_included)
          .slice(0, 4)
          .map((s: any) => ({ name_ar: s.name_ar, name_en: s.name_en })),
        signed,
      });

      const offer: PackageDetail = {
        ...summary,
        description_ar: offerRow.description_ar ?? "",
        description_en: offerRow.description_en ?? "",
        important_info_ar: offerRow.important_info_ar ?? "",
        important_info_en: offerRow.important_info_en ?? "",
        terms_ar: offerRow.terms_ar ?? "",
        terms_en: offerRow.terms_en ?? "",
        features: Array.isArray(offerRow.features) ? (offerRow.features as string[]) : [],
        images: (Array.isArray(offerRow.images) ? (offerRow.images as string[]) : []).map(
          (p) => sign(p) ?? p,
        ),
        expiry_date: offerRow.expiry_date ?? null,
        allowed_payment_methods: Array.isArray(offerRow.allowed_payment_methods)
          ? (offerRow.allowed_payment_methods as string[])
          : [],
        required_documents: normalizeDocs(offerRow.required_documents),
        seo_title: offerRow.seo_title ?? null,
        seo_description: offerRow.seo_description ?? null,
        hotels: (hotels ?? []).map((h: any) => ({
          id: h.id,
          city_ar: h.city_ar ?? "",
          city_en: h.city_en ?? "",
          name_ar: h.name_ar,
          name_en: h.name_en,
          stars: Number(h.stars ?? 0),
          distance_haram_m: h.distance_haram_m ?? null,
          distance_mosque_m: h.distance_mosque_m ?? null,
          room_type: h.room_type ?? null,
          image: sign(h.image ?? null),
          description_ar: h.description_ar ?? "",
          description_en: h.description_en ?? "",
          check_in: h.check_in ?? null,
          check_out: h.check_out ?? null,
        })),
        rooms: (rooms ?? []).map((r: any) => {
          const priceUsd = Number(r.price ?? 0) / (rateFor(r.currency_code ?? "USD") || 1);
          return {
            id: r.id,
            name_ar: r.name_ar,
            name_en: r.name_en,
            occupancy: Number(r.occupancy ?? 1),
            priceUsd: Math.round(priceUsd * 100) / 100,
            price: Math.round(priceUsd * cur.rate * 100) / 100,
            available_rooms: Number(r.available_rooms ?? 0),
            description_ar: r.description_ar ?? "",
            description_en: r.description_en ?? "",
          };
        }),
        services: (services ?? []).map((s: any) => ({
          id: s.id,
          icon: s.icon ?? null,
          name_ar: s.name_ar,
          name_en: s.name_en,
          description_ar: s.description_ar ?? "",
          description_en: s.description_en ?? "",
          is_included: Boolean(s.is_included),
          is_optional: Boolean(s.is_optional),
          extra_price_usd: Number(s.extra_price_usd ?? 0),
          extra_price: Math.round(Number(s.extra_price_usd ?? 0) * cur.rate * 100) / 100,
        })),
        departures: (departures ?? []).map((d: any) => ({
          id: d.id,
          departure_date: d.departure_date,
          return_date: d.return_date ?? null,
          seats_total: Number(d.seats_total ?? 0),
          seats_taken: Number(d.seats_taken ?? 0),
          seats_left: Math.max(0, Number(d.seats_total ?? 0) - Number(d.seats_taken ?? 0)),
          note: d.note ?? null,
        })),
        faqs: (faqs ?? []).map((f: any) => ({
          id: f.id,
          question_ar: f.question_ar,
          question_en: f.question_en,
          answer_ar: f.answer_ar ?? "",
          answer_en: f.answer_en ?? "",
        })),
      };

      return { offer, currencies };
    },
  );

/** Fire-and-forget analytics ping from the storefront. */
export const trackPackageEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ offerId: z.string().uuid(), event: z.enum(["view", "click", "booking"]) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sb = getPublicClient();
    await sb.rpc("track_offer_event", { _offer_id: data.offerId, _event: data.event });
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Quote engine                                                        */
/* ------------------------------------------------------------------ */

const selectionSchema = z.object({
  offerId: z.string().uuid(),
  currency: z.unknown().transform(normalizeCurrency).default("USD"),
  adults: z.number().int().min(1).max(40).default(1),
  children: z.number().int().min(0).max(40).default(0),
  infants: z.number().int().min(0).max(20).default(0),
  rooms: z
    .array(z.object({ roomTypeId: z.string().uuid(), qty: z.number().int().min(0).max(50) }))
    .max(30)
    .default([]),
  serviceIds: z.array(z.string().uuid()).max(40).default([]),
  couponCode: z.string().max(40).nullable().optional(),
});

type Selection = z.infer<typeof selectionSchema>;

async function resolveCoupon(
  sb: any,
  code: string | null | undefined,
  offerId: string,
  categoryId: string | null,
  subtotalUsd: number,
): Promise<{ coupon: QuoteCoupon; error: string | null; id: string | null }> {
  const clean = (code ?? "").trim().toUpperCase();
  if (!clean) return { coupon: null, error: null, id: null };
  const { data } = await sb
    .from("offer_coupons")
    .select("*")
    .eq("code", clean)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return { coupon: null, error: "COUPON_INVALID", id: null };
  const today = new Date().toISOString().slice(0, 10);
  if (data.starts_at && data.starts_at > today) return { coupon: null, error: "COUPON_INVALID", id: null };
  if (data.ends_at && data.ends_at < today) return { coupon: null, error: "COUPON_EXPIRED", id: null };
  if (data.usage_limit && Number(data.usage_count ?? 0) >= Number(data.usage_limit))
    return { coupon: null, error: "COUPON_USED_UP", id: null };
  if (Number(data.min_order_usd ?? 0) > subtotalUsd)
    return { coupon: null, error: "COUPON_MIN_ORDER", id: null };
  const offerIds: string[] = Array.isArray(data.offer_ids) ? data.offer_ids : [];
  const categoryIds: string[] = Array.isArray(data.category_ids) ? data.category_ids : [];
  if (offerIds.length > 0 && !offerIds.includes(offerId))
    return { coupon: null, error: "COUPON_NOT_APPLICABLE", id: null };
  if (categoryIds.length > 0 && (!categoryId || !categoryIds.includes(categoryId)))
    return { coupon: null, error: "COUPON_NOT_APPLICABLE", id: null };
  return {
    coupon: {
      code: clean,
      discount_type: data.discount_type === "fixed" ? "fixed" : "percent",
      discount_value: Number(data.discount_value ?? 0),
    },
    error: null,
    id: data.id as string,
  };
}

/**
 * Authoritative price calculation. `sb` may be the public client (browsing) or
 * the caller's authenticated client (booking) — both read the same rows.
 */
async function buildQuote(
  sb: any,
  admin: any,
  data: Selection,
  agencyPrice: boolean,
): Promise<{
  quote: PackageQuote;
  couponError: string | null;
  couponId: string | null;
  offer: any;
  roomRows: any[];
  serviceRows: any[];
}> {
  const currencies = await loadCurrencies();
  const cur = pickCurrency(currencies, data.currency);
  const rateFor = (code: string) =>
    currencies.find((c) => c.code === normalizeCurrency(code))?.rate ?? 1;

  const { data: offer, error } = await sb
    .from("service_offers")
    .select(
      "id,category_id,status,customer_price_usd,agency_price_usd,base_price_usd,tax_percent,fee_amount_usd,discount_percent,commission_percent,title_ar,title_en,allowed_payment_methods,required_documents",
    )
    .eq("id", data.offerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!offer || offer.status !== "active") throw new Error("OFFER_UNAVAILABLE");

  const basePriceUsd = agencyPrice
    ? Number(offer.agency_price_usd ?? offer.customer_price_usd ?? offer.base_price_usd)
    : Number(offer.customer_price_usd ?? offer.base_price_usd);

  const roomIds = data.rooms.filter((r) => r.qty > 0).map((r) => r.roomTypeId);
  const serviceIds = data.serviceIds;
  const [{ data: roomRows }, { data: serviceRows }] = await Promise.all([
    roomIds.length
      ? sb.from("offer_room_types").select("*").eq("offer_id", offer.id).in("id", roomIds)
      : Promise.resolve({ data: [] as any[] }),
    serviceIds.length
      ? sb.from("offer_services").select("*").eq("offer_id", offer.id).in("id", serviceIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const rooms = (roomRows ?? []).map((r: any) => {
    const qty = data.rooms.find((s) => s.roomTypeId === r.id)?.qty ?? 0;
    if (qty > Number(r.available_rooms ?? 0)) throw new Error("ROOM_SOLD_OUT");
    return { priceUsd: Number(r.price ?? 0) / (rateFor(r.currency_code ?? "USD") || 1), qty };
  });

  const payingPax = Math.max(1, data.adults + data.children);
  const extras = (serviceRows ?? [])
    .filter((s: any) => !s.is_included)
    .map((s: any) => ({ priceUsd: Number(s.extra_price_usd ?? 0), qty: payingPax }));

  const preliminary = computePackageQuote(
    {
      basePriceUsd,
      adults: data.adults,
      children: data.children,
      infants: data.infants,
      rooms,
      extras,
      taxPercent: offer.tax_percent,
      feeAmountUsd: offer.fee_amount_usd,
      discountPercent: offer.discount_percent,
      coupon: null,
    },
    cur.code,
    cur.rate,
    cur.decimals,
  );

  const { coupon, error: couponError, id: couponId } = await resolveCoupon(
    admin,
    data.couponCode,
    offer.id,
    offer.category_id ?? null,
    preliminary.subtotalUsd,
  );

  const quote = coupon
    ? computePackageQuote(
        {
          basePriceUsd,
          adults: data.adults,
          children: data.children,
          infants: data.infants,
          rooms,
          extras,
          taxPercent: offer.tax_percent,
          feeAmountUsd: offer.fee_amount_usd,
          discountPercent: offer.discount_percent,
          coupon,
        },
        cur.code,
        cur.rate,
        cur.decimals,
      )
    : preliminary;

  return { quote, couponError, couponId, offer, roomRows: roomRows ?? [], serviceRows: serviceRows ?? [] };
}

export const quotePackage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => selectionSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = getPublicClient();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { quote, couponError } = await buildQuote(sb, supabaseAdmin, data, false);
    return { quote, couponError };
  });

/* ------------------------------------------------------------------ */
/* Booking                                                             */
/* ------------------------------------------------------------------ */

const bookingInput = selectionSchema.extend({
  departureId: z.string().uuid().nullable().optional(),
  travelDate: z.string().max(20).nullable().optional(),
  customerName: z.string().min(2).max(120),
  customerEmail: z.string().email(),
  whatsapp: z.string().min(7).max(24),
  nationality: z.string().max(80).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  paymentMethodId: z.string().uuid(),
  transactionReference: z.string().min(2).max(80),
  receiptPath: z.string().min(3).max(400),
  documents: z
    .array(
      z.object({
        key: z.string().max(60).default(""),
        label_en: z.string().max(160).default(""),
        label_ar: z.string().max(160).default(""),
        path: z.string().min(3).max(400),
        name: z.string().max(200).default(""),
      }),
    )
    .max(20)
    .default([]),
});

export const createPackageBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bookingInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("id", userId)
      .maybeSingle();
    const priceContext: "agency" | "customer" = profile?.agency_id ? "agency" : "customer";

    const { quote, couponError, couponId, offer, roomRows, serviceRows } = await buildQuote(
      supabase,
      supabaseAdmin,
      data,
      priceContext === "agency",
    );
    if (couponError) throw new Error(couponError);

    // Payment method must be one the admin allowed on this offer.
    const allowed = Array.isArray(offer.allowed_payment_methods)
      ? (offer.allowed_payment_methods as string[])
      : [];
    if (allowed.length > 0 && !allowed.includes(data.paymentMethodId))
      throw new Error("PAYMENT_METHOD_NOT_ALLOWED");

    const requiredDocs = normalizeDocs(offer.required_documents).filter((d) => d.required);
    const provided = new Set(data.documents.map((d) => d.key));
    if (requiredDocs.some((d) => !provided.has(d.key))) throw new Error("DOCUMENTS_MISSING");

    // Departure seat check.
    let departure: any = null;
    if (data.departureId) {
      const { data: dep } = await supabase
        .from("offer_departures")
        .select("*")
        .eq("id", data.departureId)
        .eq("offer_id", offer.id)
        .maybeSingle();
      if (!dep || dep.is_blocked) throw new Error("DEPARTURE_UNAVAILABLE");
      const seatsLeft = Number(dep.seats_total ?? 0) - Number(dep.seats_taken ?? 0);
      if (Number(dep.seats_total ?? 0) > 0 && seatsLeft < quote.totalPax)
        throw new Error("NOT_ENOUGH_SEATS");
      departure = dep;
    }

    // Price snapshot: frozen at booking time so later offer edits never alter it.
    const snapshot = {
      quote,
      travelDate: departure?.departure_date ?? data.travelDate ?? null,
      returnDate: departure?.return_date ?? null,
      passengers: { adults: data.adults, children: data.children, infants: data.infants },
      rooms: roomRows.map((r: any) => ({
        id: r.id,
        name_ar: r.name_ar,
        name_en: r.name_en,
        qty: data.rooms.find((s) => s.roomTypeId === r.id)?.qty ?? 0,
        occupancy: r.occupancy,
      })),
      extras: serviceRows
        .filter((s: any) => !s.is_included)
        .map((s: any) => ({ id: s.id, name_ar: s.name_ar, name_en: s.name_en })),
      coupon: quote.couponCode,
      nationality: data.nationality ?? null,
      notes: data.notes ?? null,
      priceContext,
    };

    const noteLines = [
      `Package booking · ${offer.title_en}`,
      `Travellers: ${data.adults} adult(s), ${data.children} child(ren), ${data.infants} infant(s)`,
      snapshot.travelDate ? `Travel date: ${snapshot.travelDate}` : null,
      snapshot.rooms.length
        ? `Rooms: ${snapshot.rooms.map((r) => `${r.qty}× ${r.name_en}`).join(", ")}`
        : null,
      snapshot.extras.length ? `Extras: ${snapshot.extras.map((e) => e.name_en).join(", ")}` : null,
      quote.couponCode ? `Coupon: ${quote.couponCode}` : null,
      data.notes ? `Notes: ${data.notes}` : null,
      `SNAPSHOT ${JSON.stringify(snapshot)}`,
    ].filter(Boolean);

    const { data: order, error } = await supabase
      .from("service_orders")
      .insert({
        offer_id: offer.id,
        customer_id: userId,
        agency_id: profile?.agency_id ?? null,
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        whatsapp: data.whatsapp,
        currency_code: quote.currency,
        frozen_rate: quote.rate,
        amount_usd: quote.totalUsd,
        amount_display: quote.total,
        // Accounting anchor: net price of this booking, before tax and fees.
        applied_price_usd: Math.max(0, quote.subtotalUsd - quote.discountUsd - quote.couponUsd),
        price_context: priceContext,
        payment_method_id: data.paymentMethodId,
        transaction_reference: data.transactionReference,
        receipt_path: data.receiptPath,
        payment_notified_at: new Date().toISOString(),
        document_status: requiredDocs.length > 0 ? "documents_submitted" : "awaiting_documents",
        internal_notes: noteLines.join("\n"),
        status: "submitted",
      })
      .select("id,tracking_id")
      .single();
    if (error) throw new Error(error.message);

    if (data.documents.length > 0) {
      const { error: docErr } = await supabase.from("order_documents").insert(
        data.documents.map((d) => ({
          order_id: order.id,
          doc_key: d.key,
          label_en: d.label_en,
          label_ar: d.label_ar,
          file_path: d.path,
          file_name: d.name,
          uploaded_by: userId,
        })),
      );
      if (docErr) throw new Error(docErr.message);
    }

    await supabase.from("order_status_history").insert({
      order_id: order.id,
      new_status: "submitted",
      note: `Package booking · ${quote.totalPax} traveller(s) · total ${quote.totalUsd} USD · ref ${data.transactionReference}`,
      actor_id: userId,
      actor_name: data.customerName,
    });

    await supabase.from("notifications").insert([
      {
        audience: "staff",
        title_en: "New package booking",
        title_ar: "حجز باقة جديد",
        body_en: `${data.customerName} booked ${offer.title_en} (${order.tracking_id}) — ${quote.totalUsd} USD.`,
        body_ar: `قام ${data.customerName} بحجز ${offer.title_ar} (${order.tracking_id}) بمبلغ ${quote.totalUsd} دولار.`,
        link: `/track?ref=${order.tracking_id}`,
      },
      {
        user_id: userId,
        audience: "user",
        title_en: "Booking received",
        title_ar: "تم استلام حجزك",
        body_en: `We received booking ${order.tracking_id}. Payment verification is pending.`,
        body_ar: `استلمنا حجزك ${order.tracking_id}. بانتظار التحقق من الدفع.`,
        link: `/booking/${order.tracking_id}`,
      },
    ]);

    await supabase.from("audit_logs").insert({
      actor_id: userId,
      actor_email: data.customerEmail,
      action: "package.booking.create",
      entity: "service_orders",
      entity_id: order.id,
      after_data: { tracking_id: order.tracking_id, snapshot },
    });

    // Inventory + analytics + coupon usage (service-role: these tables are staff-only).
    if (departure) {
      await supabaseAdmin
        .from("offer_departures")
        .update({ seats_taken: Number(departure.seats_taken ?? 0) + quote.totalPax })
        .eq("id", departure.id);
    }
    for (const r of roomRows) {
      const qty = data.rooms.find((s) => s.roomTypeId === r.id)?.qty ?? 0;
      if (qty > 0) {
        await supabaseAdmin
          .from("offer_room_types")
          .update({ available_rooms: Math.max(0, Number(r.available_rooms ?? 0) - qty) })
          .eq("id", r.id);
      }
    }
    if (couponId) {
      const { data: c } = await supabaseAdmin
        .from("offer_coupons")
        .select("usage_count")
        .eq("id", couponId)
        .maybeSingle();
      await supabaseAdmin
        .from("offer_coupons")
        .update({ usage_count: Number(c?.usage_count ?? 0) + 1 })
        .eq("id", couponId);
    }
    await supabaseAdmin.rpc("track_offer_event", { _offer_id: offer.id, _event: "booking" });

    return {
      trackingId: order.tracking_id as string,
      orderId: order.id as string,
      totalUsd: quote.totalUsd,
      total: quote.total,
      currency: quote.currency,
    };
  });

/** Confirmation page read — scoped to the signed-in customer's own booking. */
export const getMyBooking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tracking: z.string().min(4).max(60) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: order } = await context.supabase
      .from("service_orders")
      .select(
        "id,tracking_id,status,document_status,currency_code,amount_display,amount_usd,applied_price_usd,created_at,customer_name,customer_email,whatsapp,internal_notes,offer_id,payment_method_id",
      )
      .eq("tracking_id", data.tracking)
      .eq("customer_id", context.userId)
      .maybeSingle();
    if (!order) return null;

    const [{ data: offer }, { data: method }, { data: invoice }] = await Promise.all([
      order.offer_id
        ? context.supabase
            .from("service_offers")
            .select("title_ar,title_en,slug,total_days,makkah_nights,madinah_nights")
            .eq("id", order.offer_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      order.payment_method_id
        ? context.supabase
            .from("payment_method_configs")
            .select("name_ar,name_en")
            .eq("id", order.payment_method_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      context.supabase
        .from("invoices")
        .select("invoice_number,total_display,currency_code,status")
        .eq("order_id", order.id)
        .maybeSingle(),
    ]);

    // The snapshot line stores the exact priced booking as submitted.
    let snapshot: any = null;
    const marker = (order.internal_notes ?? "").indexOf("SNAPSHOT ");
    if (marker >= 0) {
      try {
        snapshot = JSON.parse((order.internal_notes ?? "").slice(marker + 9));
      } catch {
        snapshot = null;
      }
    }

    return { order, offer: offer ?? null, method: method ?? null, invoice: invoice ?? null, snapshot };
  });
