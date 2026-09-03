import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./admin.shared";

const docSchema = z.object({
  key: z.string().min(1).max(60),
  label_en: z.string().min(1).max(120),
  label_ar: z.string().min(1).max(120),
  required: z.boolean().default(true),
});

const roomSchema = z.object({
  name_ar: z.string().min(1).max(120),
  name_en: z.string().min(1).max(120),
  occupancy: z.number().int().min(1).max(20).default(2),
  price: z.number().min(0).default(0),
  currency_code: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim().length >= 3 ? v.trim().toUpperCase() : "USD"),
      z.string().min(3).max(6),
    )
    .default("USD"),
  available_rooms: z.number().int().min(0).max(9999).default(0),
  description_ar: z.string().max(600).default(""),
  description_en: z.string().max(600).default(""),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(999).default(0),
});

const hotelSchema = z.object({
  city_ar: z.string().max(80).default(""),
  city_en: z.string().max(80).default(""),
  name_ar: z.string().min(1).max(160),
  name_en: z.string().min(1).max(160),
  stars: z.number().int().min(1).max(7).default(5),
  distance_haram_m: z.number().int().min(0).max(100000).nullable().default(null),
  distance_mosque_m: z.number().int().min(0).max(100000).nullable().default(null),
  room_type: z.string().max(120).nullable().default(null),
  image: z.string().max(400).nullable().default(null),
  description_ar: z.string().max(1200).default(""),
  description_en: z.string().max(1200).default(""),
  check_in: z.string().max(40).nullable().default(null),
  check_out: z.string().max(40).nullable().default(null),
  sort_order: z.number().int().min(0).max(999).default(0),
});

const serviceSchema = z.object({
  icon: z.string().max(60).nullable().default(null),
  name_ar: z.string().min(1).max(160),
  name_en: z.string().min(1).max(160),
  description_ar: z.string().max(600).default(""),
  description_en: z.string().max(600).default(""),
  is_included: z.boolean().default(true),
  extra_price_usd: z.number().min(0).default(0),
  is_optional: z.boolean().default(false),
  sort_order: z.number().int().min(0).max(999).default(0),
});

const faqSchema = z.object({
  question_ar: z.string().min(1).max(300),
  question_en: z.string().min(1).max(300),
  answer_ar: z.string().max(2000).default(""),
  answer_en: z.string().max(2000).default(""),
  sort_order: z.number().int().min(0).max(999).default(0),
});

const departureSchema = z.object({
  departure_date: z.string().min(8).max(20),
  return_date: z.string().max(20).nullable().default(null),
  seats_total: z.number().int().min(0).max(9999).default(0),
  seats_taken: z.number().int().min(0).max(9999).default(0),
  is_blocked: z.boolean().default(false),
  note: z.string().max(300).nullable().default(null),
});

const offerSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().max(80).optional(),
  title_ar: z.string().min(2).max(160),
  title_en: z.string().min(2).max(160),
  short_description_ar: z.string().max(400).default(""),
  short_description_en: z.string().max(400).default(""),
  description_ar: z.string().max(8000).default(""),
  description_en: z.string().max(8000).default(""),
  category: z.string().min(2).max(40).default("package"),
  category_id: z.string().uuid().nullable().default(null),
  badge_id: z.string().uuid().nullable().default(null),
  offer_type: z
    .enum([
      "umrah_package",
      "visa_only",
      "custom_package",
      "tourism_package",
      "flight_only",
      "hotel_only",
      "transport",
      "security_approval",
    ])
    .default("tourism_package"),
  /** Optional parent package: builds the mother -> children -> grandchildren tree. */
  parent_offer_id: z.string().uuid().nullable().default(null),
  /** Currency the admin typed the prices in; stored prices are always converted to USD. */
  input_currency: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim().length >= 3 ? v.trim().toUpperCase() : "USD"),
      z.string().min(3).max(6),
    )
    .default("USD"),
  // Two independent, manually entered prices — no automatic relation between them.
  // A mother package may have no price at all (price on request).
  customer_price_usd: z.number().min(0),
  agency_price_usd: z.number().min(0),
  original_price_usd: z.number().min(0).nullable().default(null),
  price_display_mode: z
    .enum(["starting_from", "fixed", "per_person", "per_room", "contact_us"])
    .default("starting_from"),
  display_currency: z.string().min(3).max(6).default("USD"),
  tax_percent: z.number().min(0).max(100).default(0),
  fee_amount_usd: z.number().min(0).default(0),
  discount_percent: z.number().min(0).max(100).default(0),
  total_days: z.number().int().min(0).max(365).nullable().default(null),
  makkah_nights: z.number().int().min(0).max(365).nullable().default(null),
  madinah_nights: z.number().int().min(0).max(365).nullable().default(null),
  other_nights: z.number().int().min(0).max(365).nullable().default(null),
  other_destination: z.string().max(120).nullable().default(null),
  duration_ar: z.string().max(80).default(""),
  duration_en: z.string().max(80).default(""),
  expiry_date: z.string().max(20).optional(),
  publish_at: z.string().max(40).nullable().default(null),
  status: z.enum(["draft", "active", "scheduled", "archived"]).default("active"),
  is_featured: z.boolean().default(false),
  featured_order: z.number().int().min(0).max(999).default(0),
  important_info_ar: z.string().max(4000).default(""),
  important_info_en: z.string().max(4000).default(""),
  terms_ar: z.string().max(8000).default(""),
  terms_en: z.string().max(8000).default(""),
  seo_title: z.string().max(160).nullable().default(null),
  seo_description: z.string().max(320).nullable().default(null),
  og_image: z.string().max(400).nullable().default(null),
  features: z.array(z.string().max(160)).max(40).default([]),
  images: z.array(z.string().max(400)).max(20).default([]),
  primary_image: z.string().max(400).optional(),
  allowed_payment_methods: z.array(z.string().uuid()).max(20).default([]),
  required_documents: z.array(docSchema).max(20).default([]),
  // Child collections are replaced wholesale on save.
  rooms: z.array(roomSchema).max(30).optional(),
  hotels: z.array(hotelSchema).max(20).optional(),
  services: z.array(serviceSchema).max(60).optional(),
  faqs: z.array(faqSchema).max(40).optional(),
  departures: z.array(departureSchema).max(60).optional(),
});

function slugify(value: string, fallback: string) {
  const s = value
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || fallback;
}

/* ------------------------------------------------------------------ */
/* Categories & badges                                                 */
/* ------------------------------------------------------------------ */

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().max(80).optional(),
  name_ar: z.string().min(1).max(120),
  name_en: z.string().min(1).max(120),
  description_ar: z.string().max(600).default(""),
  description_en: z.string().max(600).default(""),
  icon: z.string().max(60).nullable().default(null),
  image: z.string().max(400).nullable().default(null),
  display_order: z.number().int().min(0).max(999).default(0),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
});

export const listOfferCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("offer_categories")
      .select("*")
      .order("display_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveOfferCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => categorySchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const payload = {
      slug: slugify(data.slug || data.name_en, `cat-${Date.now()}`),
      name_ar: data.name_ar,
      name_en: data.name_en,
      description_ar: data.description_ar,
      description_en: data.description_en,
      icon: data.icon,
      image: data.image,
      display_order: data.display_order,
      is_active: data.is_active,
      is_featured: data.is_featured,
    } as never;
    const q = data.id
      ? context.supabase.from("offer_categories").update(payload).eq("id", data.id).select("id").single()
      : context.supabase.from("offer_categories").insert(payload).select("id").single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row as { id: string };
  });

export const deleteOfferCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("offer_categories")
      .update({ is_active: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const badgeSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().max(80).optional(),
  label_ar: z.string().min(1).max(80),
  label_en: z.string().min(1).max(80),
  color: z.string().max(20).default("#0f5132"),
  display_order: z.number().int().min(0).max(999).default(0),
  is_active: z.boolean().default(true),
});

export const listOfferBadges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("offer_badges")
      .select("*")
      .order("display_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveOfferBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => badgeSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const payload = {
      slug: slugify(data.slug || data.label_en, `badge-${Date.now()}`),
      label_ar: data.label_ar,
      label_en: data.label_en,
      color: data.color,
      display_order: data.display_order,
      is_active: data.is_active,
    } as never;
    const q = data.id
      ? context.supabase.from("offer_badges").update(payload).eq("id", data.id).select("id").single()
      : context.supabase.from("offer_badges").insert(payload).select("id").single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row as { id: string };
  });

/* ------------------------------------------------------------------ */
/* Offers                                                              */
/* ------------------------------------------------------------------ */

/** Active currencies with their USD rate, for the offer builder's currency picker. */
export const listOfferCurrencies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const [{ data: currencies }, { data: rates }] = await Promise.all([
      context.supabase
        .from("currencies")
        .select("code,name_en,name_ar,symbol")
        .eq("is_active", true)
        .order("code"),
      context.supabase.from("exchange_rates").select("currency_code,rate_per_usd"),
    ]);
    const rateMap = new Map((rates ?? []).map((r) => [r.currency_code, Number(r.rate_per_usd)]));
    return (currencies ?? []).map((c) => ({ ...c, rate: rateMap.get(c.code) ?? (c.code === "USD" ? 1 : 0) }));
  });

/** Staff-only catalog manager listing (includes drafts and archived offers). */
export const listOffersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("service_offers")
      .select("*, offer_categories(id,name_ar,name_en), offer_badges(id,label_ar,label_en,color)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Full offer record plus every related collection, for the admin builder. */
export const getOfferBuilder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const sb = context.supabase;
    const [offer, rooms, hotels, services, faqs, departures] = await Promise.all([
      sb.from("service_offers").select("*").eq("id", data.id).maybeSingle(),
      sb.from("offer_room_types").select("*").eq("offer_id", data.id).order("sort_order"),
      sb.from("offer_hotels").select("*").eq("offer_id", data.id).order("sort_order"),
      sb.from("offer_services").select("*").eq("offer_id", data.id).order("sort_order"),
      sb.from("offer_faqs").select("*").eq("offer_id", data.id).order("sort_order"),
      sb.from("offer_departures").select("*").eq("offer_id", data.id).order("departure_date"),
    ]);
    if (offer.error) throw new Error(offer.error.message);
    return {
      offer: offer.data ?? null,
      rooms: rooms.data ?? [],
      hotels: hotels.data ?? [],
      services: services.data ?? [],
      faqs: faqs.data ?? [],
      departures: departures.data ?? [],
    };
  });

/** Create or update an offer. Active offers appear in the storefront catalog immediately. */
export const saveOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => offerSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const sb = context.supabase;

    // Slugs are unique, so suffix a counter until a free one is found.
    const base = slugify(data.slug || data.title_en, `offer-${Date.now()}`);
    let slug = base;
    for (let i = 2; i < 100; i++) {
      let q = sb.from("service_offers").select("id").eq("slug", slug).limit(1);
      if (data.id) q = q.neq("id", data.id);
      const { data: clash, error: clashError } = await q;
      if (clashError) throw new Error(clashError.message);
      if (!clash?.length) break;
      slug = `${base}-${i}`;
    }

    if (data.parent_offer_id && data.id && data.parent_offer_id === data.id) {
      throw new Error("An offer cannot be its own parent.");
    }

    // Prices are typed in the admin's chosen currency; USD is the accounting anchor.
    let rate = 1;
    if (data.input_currency !== "USD") {
      const { data: rateRow } = await sb
        .from("exchange_rates")
        .select("rate_per_usd")
        .eq("currency_code", data.input_currency)
        .maybeSingle();
      const value = Number((rateRow as { rate_per_usd?: number } | null)?.rate_per_usd ?? 0);
      if (!(value > 0)) {
        throw new Error(`No exchange rate configured for ${data.input_currency}.`);
      }
      rate = value;
    }
    const toUsd = (v: number) => Math.round((v / rate) * 100) / 100;
    const customerUsd = toUsd(data.customer_price_usd);
    const agencyUsd = toUsd(data.agency_price_usd);
    const originalUsd = data.original_price_usd == null ? null : toUsd(data.original_price_usd);

    const payload = {
      slug,
      parent_offer_id: data.parent_offer_id,
      input_currency: data.input_currency,
      input_price: data.customer_price_usd,
      input_agency_price: data.agency_price_usd,
      input_original_price: data.original_price_usd,
      input_rate_per_usd: rate,
      title_ar: data.title_ar,
      title_en: data.title_en,
      short_description_ar: data.short_description_ar,
      short_description_en: data.short_description_en,
      description_ar: data.description_ar,
      description_en: data.description_en,
      category: data.category,
      category_id: data.category_id,
      badge_id: data.badge_id,
      offer_type: data.offer_type,
      // base_price_usd is kept in sync with the customer price for legacy readers.
      base_price_usd: customerUsd,
      customer_price_usd: customerUsd,
      agency_price_usd: agencyUsd,
      original_price_usd: originalUsd,
      price_display_mode: data.price_display_mode,
      display_currency: data.display_currency,
      tax_percent: data.tax_percent,
      fee_amount_usd: data.fee_amount_usd,
      discount_percent: data.discount_percent,
      total_days: data.total_days,
      makkah_nights: data.makkah_nights,
      madinah_nights: data.madinah_nights,
      other_nights: data.other_nights,
      other_destination: data.other_destination,
      duration_ar: data.duration_ar || null,
      duration_en: data.duration_en || null,
      expiry_date: data.expiry_date ? data.expiry_date : null,
      publish_at: data.publish_at ? data.publish_at : null,
      status: data.status,
      is_featured: data.is_featured,
      featured_order: data.featured_order,
      important_info_ar: data.important_info_ar,
      important_info_en: data.important_info_en,
      terms_ar: data.terms_ar,
      terms_en: data.terms_en,
      seo_title: data.seo_title,
      seo_description: data.seo_description,
      og_image: data.og_image,
      features: data.features,
      images: data.images,
      primary_image: data.primary_image || data.images[0] || null,
      allowed_payment_methods: data.allowed_payment_methods,
      required_documents: data.required_documents,
      created_by: context.userId,
    } as never;

    const query = data.id
      ? sb.from("service_offers").update(payload).eq("id", data.id).select("id,slug").single()
      : sb.from("service_offers").insert(payload).select("id,slug").single();

    const { data: row, error } = await query;
    if (error) throw new Error(error.message);
    const offerId = (row as { id: string }).id;

    // Child collections: replace wholesale, but only the ones the caller sent.
    const anySb = sb as unknown as {
      from: (t: string) => any;
    };
    const replace = async (
      table: string,
      rows: Record<string, unknown>[] | undefined,
    ) => {
      if (!rows) return;
      const { error: delError } = await anySb.from(table).delete().eq("offer_id", offerId);
      if (delError) throw new Error(delError.message);
      if (rows.length === 0) return;
      const { error: insError } = await anySb
        .from(table)
        .insert(rows.map((r) => ({ ...r, offer_id: offerId })));
      if (insError) throw new Error(insError.message);
    };

    await replace("offer_room_types", data.rooms);
    await replace("offer_hotels", data.hotels);
    await replace("offer_services", data.services);
    await replace("offer_faqs", data.faqs);
    await replace(
      "offer_departures",
      data.departures?.map((d) => ({ ...d, return_date: d.return_date || null })),
    );

    await sb.from("audit_logs").insert({
      actor_id: context.userId,
      action: data.id ? "offer.update" : "offer.create",
      entity: "service_offers",
      entity_id: offerId,
      after_data: { title_en: data.title_en, status: data.status },
    });

    return row as { id: string; slug: string };
  });

/** Quick status/featured toggles from the offers list. */
export const setOfferFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["draft", "active", "scheduled", "archived"]).optional(),
        is_featured: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const patch: Record<string, unknown> = {};
    if (data.status) patch["status"] = data.status;
    if (typeof data.is_featured === "boolean") patch["is_featured"] = data.is_featured;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("service_offers")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Duplicate an offer (and all of its child rows) as a fresh draft. */
export const duplicateOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const sb = context.supabase;
    const { data: src, error } = await sb
      .from("service_offers")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const clone = { ...(src as Record<string, unknown>) };
    delete clone["id"];
    delete clone["created_at"];
    delete clone["updated_at"];
    delete clone["offer_categories"];
    delete clone["offer_badges"];
    clone["slug"] = `${String(clone["slug"] ?? "offer")}-copy-${Date.now().toString(36)}`;
    clone["title_ar"] = `${String(clone["title_ar"] ?? "")} (نسخة)`;
    clone["title_en"] = `${String(clone["title_en"] ?? "")} (copy)`;
    clone["status"] = "draft";
    clone["is_featured"] = false;
    clone["view_count"] = 0;
    clone["click_count"] = 0;
    clone["booking_count"] = 0;
    const { data: row, error: insError } = await sb
      .from("service_offers")
      .insert(clone as never)
      .select("id")
      .single();
    if (insError) throw new Error(insError.message);
    const newId = (row as { id: string }).id;

    for (const table of [
      "offer_room_types",
      "offer_hotels",
      "offer_services",
      "offer_faqs",
      "offer_departures",
    ]) {
      const anySb = sb as unknown as { from: (t: string) => any };
      const { data: children } = await anySb.from(table).select("*").eq("offer_id", data.id);
      const rows = ((children ?? []) as Record<string, unknown>[]).map((c) => {
        const copy: Record<string, unknown> = { ...c, offer_id: newId };
        delete copy["id"];
        delete copy["created_at"];
        delete copy["updated_at"];
        return copy;
      });
      if (rows.length) await anySb.from(table).insert(rows);
    }
    return { id: newId };
  });

/** Soft-delete keeps history intact while removing the offer from the catalog. */
export const archiveOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("service_offers")
      .update({ status: "archived", deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      action: "offer.archive",
      entity: "service_offers",
      entity_id: data.id,
    });
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Package tree (mother -> children -> grandchildren)                  */
/* ------------------------------------------------------------------ */

type AnySb = { from: (t: string) => any };

async function rateFor(sb: AnySb, currency: string): Promise<number> {
  if (currency === "USD") return 1;
  const { data } = await sb
    .from("exchange_rates")
    .select("rate_per_usd")
    .eq("currency_code", currency)
    .maybeSingle();
  const value = Number((data as { rate_per_usd?: number } | null)?.rate_per_usd ?? 0);
  if (!(value > 0)) throw new Error(`No exchange rate configured for ${currency}.`);
  return value;
}

const currencyField = z.preprocess(
  (v) => (typeof v === "string" && v.trim().length >= 3 ? v.trim().toUpperCase() : "USD"),
  z.string().min(3).max(6),
);

export type OfferTreeNode = {
  id: string;
  slug: string | null;
  title_ar: string;
  title_en: string;
  parent_offer_id: string | null;
  status: string;
  input_currency: string;
  input_price: number | null;
  customer_price_usd: number;
  is_featured: boolean;
};

/** Flat list of every non-deleted offer with its parent link, for tree screens. */
export const listOfferTree = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("service_offers")
      .select(
        "id,slug,title_ar,title_en,parent_offer_id,status,input_currency,input_price,customer_price_usd,is_featured",
      )
      .is("deleted_at", null)
      .order("title_ar");
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as OfferTreeNode[];
  });

const optionalText = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : v),
  z.string().max(2000).optional(),
);

/** Optional extras (details, room type, hotel) shared by create + update. */
const nodeExtras = {
  description_ar: optionalText,
  description_en: optionalText,
  room_type: optionalText,
  hotel_name: optionalText,
  hotel_city: optionalText,
};

/** Upsert the single quick room type / hotel row attached to a tree node. */
async function applyNodeExtras(
  sb: AnySb,
  offerId: string,
  data: {
    room_type?: string | undefined;
    hotel_name?: string | undefined;
    hotel_city?: string | undefined;
    price?: number | null | undefined;
    currency?: string | undefined;
  },
) {
  if (data.room_type) {
    const { data: existing } = await sb
      .from("offer_room_types")
      .select("id")
      .eq("offer_id", offerId)
      .order("sort_order")
      .limit(1);
    const payload = {
      offer_id: offerId,
      name_ar: data.room_type,
      name_en: data.room_type,
      price: data.price ?? 0,
      currency_code: data.currency ?? "USD",
    };
    if (existing?.length) {
      await sb.from("offer_room_types").update(payload).eq("id", existing[0].id);
    } else {
      await sb.from("offer_room_types").insert(payload);
    }
  }

  if (data.hotel_name) {
    const { data: existing } = await sb
      .from("offer_hotels")
      .select("id")
      .eq("offer_id", offerId)
      .order("sort_order")
      .limit(1);
    const payload = {
      offer_id: offerId,
      name_ar: data.hotel_name,
      name_en: data.hotel_name,
      city_ar: data.hotel_city ?? "",
      city_en: data.hotel_city ?? "",
    };
    if (existing?.length) {
      await sb.from("offer_hotels").update(payload).eq("id", existing[0].id);
    } else {
      await sb.from("offer_hotels").insert(payload);
    }
  }
}

/**
 * Quick-create a sub-package (child or grandchild) under a parent offer.
 * Everything except the Arabic name is optional — a package may have no price
 * at all, in which case it is shown as "price on request".
 */
export const createChildOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        parent_offer_id: z.string().uuid(),
        title_ar: z.string().min(1).max(200),
        title_en: z.string().max(200).optional(),
        currency: currencyField,
        price: z.number().min(0).nullable().default(null),
        agency_price: z.number().min(0).nullable().default(null),
        status: z.enum(["draft", "active"]).default("active"),
        ...nodeExtras,
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const sb = context.supabase as unknown as AnySb;

    const { data: parent } = await sb
      .from("service_offers")
      .select("id,category,category_id,offer_type,display_currency")
      .eq("id", data.parent_offer_id)
      .maybeSingle();
    if (!parent) throw new Error("Parent package not found.");

    const titleEn = data.title_en?.trim() || data.title_ar;
    const hasPrice = data.price != null && data.price > 0;
    const rate = hasPrice ? await rateFor(sb, data.currency) : 1;
    const toUsd = (v: number) => Math.round((v / rate) * 100) / 100;
    const priceUsd = hasPrice ? toUsd(data.price as number) : 0;
    const agencyUsd =
      data.agency_price == null ? priceUsd : hasPrice ? toUsd(data.agency_price) : 0;

    const base = slugify(titleEn, `package-${Date.now()}`);
    let slug = base;
    for (let i = 2; i < 100; i++) {
      const { data: clash } = await sb.from("service_offers").select("id").eq("slug", slug).limit(1);
      if (!clash?.length) break;
      slug = `${base}-${i}`;
    }

    const p = parent as Record<string, unknown>;
    const { data: row, error } = await sb
      .from("service_offers")
      .insert({
        slug,
        parent_offer_id: data.parent_offer_id,
        title_ar: data.title_ar,
        title_en: titleEn,
        description_ar: data.description_ar ?? "",
        description_en: data.description_en ?? "",
        category: String(p["category"] ?? "package"),
        category_id: p["category_id"] ?? null,
        offer_type: String(p["offer_type"] ?? "tourism_package"),
        display_currency: data.currency,
        input_currency: data.currency,
        input_price: hasPrice ? data.price : null,
        input_agency_price: data.agency_price ?? (hasPrice ? data.price : null),
        input_rate_per_usd: rate,
        base_price_usd: priceUsd,
        customer_price_usd: priceUsd,
        agency_price_usd: agencyUsd,
        price_display_mode: hasPrice ? "starting_from" : "contact_us",
        status: data.status,
      })
      .select("id,slug")
      .single();
    if (error) throw new Error(error.message);

    const created = row as { id: string; slug: string };
    await applyNodeExtras(sb, created.id, {
      room_type: data.room_type,
      hotel_name: data.hotel_name,
      hotel_city: data.hotel_city,
      price: hasPrice ? data.price : 0,
      currency: data.currency,
    });

    await sb.from("audit_logs").insert({
      actor_id: context.userId,
      action: "offer.create_child",
      entity: "service_offers",
      entity_id: created.id,
      after_data: { parent_offer_id: data.parent_offer_id, title_en: titleEn },
    });
    return created;
  });

/**
 * Inline edit of a tree node. Every field is optional; sending `price: null`
 * clears the price and switches the package to "price on request".
 */
export const updateOfferNode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title_ar: z.string().max(200).optional(),
        title_en: z.string().max(200).optional(),
        currency: currencyField.optional(),
        price: z.number().min(0).nullable().optional(),
        parent_offer_id: z.string().uuid().nullable().optional(),
        status: z.enum(["draft", "active", "scheduled", "archived"]).optional(),
        ...nodeExtras,
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const sb = context.supabase as unknown as AnySb;
    if (data.parent_offer_id && data.parent_offer_id === data.id) {
      throw new Error("An offer cannot be its own parent.");
    }

    const patch: Record<string, unknown> = {};
    if (data.title_ar) patch["title_ar"] = data.title_ar;
    if (data.title_en) patch["title_en"] = data.title_en;
    if (data.status) patch["status"] = data.status;
    if (data.parent_offer_id !== undefined) patch["parent_offer_id"] = data.parent_offer_id;
    if (data.description_ar !== undefined) patch["description_ar"] = data.description_ar;
    if (data.description_en !== undefined) patch["description_en"] = data.description_en;

    let effectivePrice: number | null = null;
    let effectiveCurrency = data.currency ?? "USD";

    if (data.price !== undefined || data.currency) {
      const { data: current } = await sb
        .from("service_offers")
        .select("input_currency,input_price,customer_price_usd")
        .eq("id", data.id)
        .maybeSingle();
      const cur = (current ?? {}) as Record<string, unknown>;
      const currency = data.currency ?? String(cur["input_currency"] ?? "USD");
      const raw =
        data.price !== undefined
          ? data.price
          : Number(cur["input_price"] ?? cur["customer_price_usd"] ?? 0) || null;
      effectiveCurrency = currency;
      effectivePrice = raw != null && raw > 0 ? raw : null;

      const rate = effectivePrice == null ? 1 : await rateFor(sb, currency);
      const usd = effectivePrice == null ? 0 : Math.round((effectivePrice / rate) * 100) / 100;
      patch["input_currency"] = currency;
      patch["display_currency"] = currency;
      patch["input_price"] = effectivePrice;
      patch["input_rate_per_usd"] = rate;
      patch["base_price_usd"] = usd;
      patch["customer_price_usd"] = usd;
      patch["price_display_mode"] = effectivePrice == null ? "contact_us" : "starting_from";
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await sb.from("service_offers").update(patch).eq("id", data.id);
      if (error) throw new Error(error.message);
    }

    await applyNodeExtras(sb, data.id, {
      room_type: data.room_type,
      hotel_name: data.hotel_name,
      hotel_city: data.hotel_city,
      price: effectivePrice ?? 0,
      currency: effectiveCurrency,
    });

    return { ok: true };
  });

/** Archive a node and every descendant beneath it. */
export const deleteOfferBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const sb = context.supabase as unknown as AnySb;
    const ids: string[] = [data.id];
    let frontier = [data.id];
    for (let depth = 0; depth < 6 && frontier.length; depth++) {
      const { data: kids } = await sb
        .from("service_offers")
        .select("id")
        .in("parent_offer_id", frontier)
        .is("deleted_at", null);
      frontier = ((kids ?? []) as { id: string }[]).map((k) => k.id).filter((id) => !ids.includes(id));
      ids.push(...frontier);
    }
    const { error } = await sb
      .from("service_offers")
      .update({ status: "archived", deleted_at: new Date().toISOString() })
      .in("id", ids);
    if (error) throw new Error(error.message);
    await sb.from("audit_logs").insert({
      actor_id: context.userId,
      action: "offer.archive_branch",
      entity: "service_offers",
      entity_id: data.id,
      after_data: { archived: ids.length },
    });
    return { ok: true, archived: ids.length };
  });
