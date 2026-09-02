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

const offerSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().max(80).optional(),
  title_ar: z.string().min(2).max(160),
  title_en: z.string().min(2).max(160),
  description_ar: z.string().max(4000).default(""),
  description_en: z.string().max(4000).default(""),
  category: z.string().min(2).max(40).default("package"),
  // Two independent, manually entered prices — no automatic relation between them.
  customer_price_usd: z.number().positive(),
  agency_price_usd: z.number().positive(),
  tax_percent: z.number().min(0).max(100).default(0),
  fee_amount_usd: z.number().min(0).default(0),
  discount_percent: z.number().min(0).max(100).default(0),
  duration_ar: z.string().max(80).default(""),
  duration_en: z.string().max(80).default(""),
  expiry_date: z.string().max(20).optional(),
  status: z.enum(["draft", "active", "archived"]).default("active"),
  features: z.array(z.string().max(160)).max(20).default([]),
  images: z.array(z.string().max(400)).max(10).default([]),
  primary_image: z.string().max(400).optional(),
  allowed_payment_methods: z.array(z.string().uuid()).max(20).default([]),
  required_documents: z.array(docSchema).max(20).default([]),
});

function slugify(value: string, fallback: string) {
  const s = value
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || fallback;
}

/** Staff-only catalog manager listing (includes drafts and archived offers). */
export const listOffersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("service_offers")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
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

    const payload = {
      slug,
      title_ar: data.title_ar,
      title_en: data.title_en,
      description_ar: data.description_ar,
      description_en: data.description_en,
      category: data.category,
      // base_price_usd is kept in sync with the customer price for legacy readers.
      base_price_usd: data.customer_price_usd,
      customer_price_usd: data.customer_price_usd,
      agency_price_usd: data.agency_price_usd,
      tax_percent: data.tax_percent,
      fee_amount_usd: data.fee_amount_usd,
      discount_percent: data.discount_percent,
      duration_ar: data.duration_ar || null,
      duration_en: data.duration_en || null,
      expiry_date: data.expiry_date ? data.expiry_date : null,
      status: data.status,
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

    await sb.from("audit_logs").insert({
      actor_id: context.userId,
      action: data.id ? "offer.update" : "offer.create",
      entity: "service_offers",
      entity_id: (row as { id: string }).id,
      after_data: { title_en: data.title_en, status: data.status },
    });

    return row as { id: string; slug: string };
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
