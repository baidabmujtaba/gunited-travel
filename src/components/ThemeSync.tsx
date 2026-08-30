import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { applyTheme, normalizeTheme, THEME_SETTINGS_KEY } from "@/lib/theme";

/** Loads the admin-configured brand colors and applies them to the document. */
export function ThemeSync() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", THEME_SETTINGS_KEY)
        .maybeSingle();
      if (cancelled || !data?.value) return;
      applyTheme(normalizeTheme(data.value));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
