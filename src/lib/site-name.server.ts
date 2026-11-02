/**
 * Server-side site name lookup from the public `company` settings row.
 * Used by email templates, invoice PDFs and notification subjects so an
 * admin renaming the site updates every outbound message too.
 */

export const SITE_NAME_DEFAULTS = {
  name_en: "Gunited Travel",
  name_ar: "جيونايتد ترافيل",
} as const;

export type SiteNames = { name_en: string; name_ar: string };

export async function getSiteNames(supabase: any): Promise<SiteNames> {
  try {
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "company")
      .maybeSingle();
    const v = (data?.value ?? {}) as { name_en?: string; name_ar?: string };
    return {
      name_en: v.name_en?.trim() || SITE_NAME_DEFAULTS.name_en,
      name_ar: v.name_ar?.trim() || SITE_NAME_DEFAULTS.name_ar,
    };
  } catch {
    return { ...SITE_NAME_DEFAULTS };
  }
}

export function combinedSiteName(names: SiteNames) {
  return `${names.name_ar} · ${names.name_en}`;
}
