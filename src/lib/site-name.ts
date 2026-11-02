import { queryOptions, useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const SITE_NAME_DEFAULTS = {
  name_en: "Gunited Travel",
  name_ar: "جيونايتد ترافيل",
} as const;

export type SiteNames = { name_en: string; name_ar: string };

/**
 * Public site names from the `company` settings row (readable by everyone).
 * When the admin renames the site in settings, every surface using this
 * query picks up the new name.
 */
export const siteNameQueryOptions = queryOptions({
  queryKey: ["site-name"],
  staleTime: 5 * 60 * 1000,
  queryFn: async (): Promise<SiteNames> => {
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
  },
});

export function useSiteName() {
  const { data } = useQuery(siteNameQueryOptions);
  const names = data ?? SITE_NAME_DEFAULTS;
  return {
    ...names,
    /** Name for the given interface language. */
    forLang: (lang: string) => (lang === "ar" ? names.name_ar : names.name_en),
    /** Bilingual lockup used in footers and email headers. */
    combined: `${names.name_ar} · ${names.name_en}`,
  };
}
