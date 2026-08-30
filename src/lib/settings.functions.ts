import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./admin.shared";
import { DEFAULT_THEME, normalizeTheme, THEME_SETTINGS_KEY, type BrandTheme } from "./theme";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const themeSchema = z.object({
  forest: hex,
  forest_deep: hex,
  sage: hex,
  mint: hex,
  beige: hex,
  beige_card: hex,
  cream: hex,
  gold: hex,
});

const siteSchema = z.object({
  name_en: z.string().min(2).max(160),
  name_ar: z.string().min(2).max(160),
  email: z.string().max(160).optional().default(""),
  phone: z.string().max(60).optional().default(""),
  whatsapp: z.string().max(60).optional().default(""),
  address_en: z.string().max(400).optional().default(""),
  address_ar: z.string().max(400).optional().default(""),
  tax_number: z.string().max(80).optional().default(""),
  registration_number: z.string().max(80).optional().default(""),
});

const invoiceSchema = z.object({
  prefix: z.string().min(1).max(20),
  start_number: z.coerce.number().int().min(1).max(9_999_999),
  tax_percent: z.coerce.number().min(0).max(100),
  payment_terms_en: z.string().max(800).optional().default(""),
  payment_terms_ar: z.string().max(800).optional().default(""),
});

const amadeusSchema = z.object({
  client_id: z.string().max(200).optional().default(""),
  client_secret: z.string().max(200).optional().default(""),
  environment: z.enum(["test", "production"]).default("test"),
});

export type SiteSettings = z.infer<typeof siteSchema>;
export type InvoiceSettings = z.infer<typeof invoiceSchema>;

const SITE_DEFAULTS: SiteSettings = {
  name_en: "Gunited Travel",
  name_ar: "جيونايتد ترافيل",
  email: "",
  phone: "",
  whatsapp: "",
  address_en: "",
  address_ar: "",
  tax_number: "",
  registration_number: "",
};

const INVOICE_DEFAULTS: InvoiceSettings = {
  prefix: "GT-INV",
  start_number: 1,
  tax_percent: 0,
  payment_terms_en: "",
  payment_terms_ar: "",
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("FORBIDDEN");
}

export const getPlatformSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const sb = context.supabase;
    const [{ data: rows }, { data: isAdmin }] = await Promise.all([
      sb.from("settings").select("key,value").in("key", ["company", "invoicing", THEME_SETTINGS_KEY]),
      sb.rpc("is_admin", { _user_id: context.userId }),
    ]);

    const map = new Map<string, any>((rows ?? []).map((r: any) => [r.key, r.value ?? {}]));
    const site = { ...SITE_DEFAULTS, ...(map.get("company") ?? {}) } as SiteSettings;
    const invoicing = { ...INVOICE_DEFAULTS, ...(map.get("invoicing") ?? {}) } as InvoiceSettings;

    let amadeus = { client_id: "", environment: "test" as "test" | "production", hasSecret: false };
    if (isAdmin) {
      const { data: cred } = await sb
        .from("integration_credentials")
        .select("client_id,client_secret,environment")
        .eq("key", "amadeus")
        .maybeSingle();
      if (cred) {
        amadeus = {
          client_id: cred.client_id ?? "",
          environment: (cred.environment as "test" | "production") ?? "test",
          hasSecret: Boolean(cred.client_secret),
        };
      }
    }

    const theme: BrandTheme = normalizeTheme(map.get(THEME_SETTINGS_KEY) ?? DEFAULT_THEME);

    return { site, invoicing, amadeus, theme, canManage: Boolean(isAdmin) };
  });

export const saveSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => siteSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("settings")
      .upsert({ key: "company", value: data as any, updated_at: new Date().toISOString() } as any);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      action: "settings.site.update",
      entity: "settings",
      entity_id: "company",
      after_data: data as any,
    });
    return { ok: true };
  });

export const saveInvoiceSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => invoiceSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("settings")
      .upsert({ key: "invoicing", value: data as any, updated_at: new Date().toISOString() } as any);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      action: "settings.invoicing.update",
      entity: "settings",
      entity_id: "invoicing",
      after_data: data as any,
    });
    return { ok: true };
  });

/** Amadeus credentials live in an admin-only table, never in the public settings row. */
export const saveAmadeusSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => amadeusSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const sb = context.supabase;
    const { data: existing } = await sb
      .from("integration_credentials")
      .select("client_secret")
      .eq("key", "amadeus")
      .maybeSingle();

    const secret = data.client_secret.trim()
      ? data.client_secret.trim()
      : (existing?.client_secret ?? null);

    const { error } = await sb.from("integration_credentials").upsert({
      key: "amadeus",
      client_id: data.client_id.trim() || null,
      client_secret: secret,
      environment: data.environment,
      updated_by: context.userId,
    } as any);
    if (error) throw new Error(error.message);

    await sb.from("audit_logs").insert({
      actor_id: context.userId,
      action: "settings.amadeus.update",
      entity: "integration_credentials",
      entity_id: "amadeus",
      after_data: { environment: data.environment, client_id_set: Boolean(data.client_id.trim()) } as any,
    });
    return { ok: true };
  });

export const saveThemeSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => themeSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("settings").upsert({
      key: THEME_SETTINGS_KEY,
      value: data as any,
      updated_at: new Date().toISOString(),
    } as any);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      action: "settings.theme.update",
      entity: "settings",
      entity_id: THEME_SETTINGS_KEY,
      after_data: data as any,
    });
    return { ok: true };
  });
