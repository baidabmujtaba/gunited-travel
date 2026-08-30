import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { saveThemeSettings } from "@/lib/settings.functions";
import {
  applyTheme,
  DEFAULT_THEME,
  normalizeTheme,
  THEME_KEYS,
  type BrandTheme,
} from "@/lib/theme";

export function ThemeSection({
  theme,
  readOnly,
}: {
  theme: BrandTheme | undefined;
  readOnly: boolean;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<BrandTheme>(theme ?? DEFAULT_THEME);

  useEffect(() => {
    if (theme) setDraft(normalizeTheme(theme));
  }, [theme]);

  // Live preview: applying the draft immediately shows how the palette feels.
  useEffect(() => {
    applyTheme(draft);
  }, [draft]);

  const save = useMutation({
    mutationFn: () => saveThemeSettings({ data: draft }),
    onSuccess: () => {
      toast.success(t("admin.theme.saved"));
      void qc.invalidateQueries({ queryKey: ["platform-settings"] });
    },
    onError: (e: unknown) =>
      toast.error(t("common.error"), { description: String((e as Error)?.message ?? e) }),
  });

  return (
    <section className="surface-card space-y-4 p-5">
      <div>
        <h2 className="text-lg font-bold text-forest-deep">{t("admin.theme.title")}</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("admin.theme.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {THEME_KEYS.map((key) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs font-semibold text-forest-deep">
              {t(`admin.theme.color.${key}`)}
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={draft[key]}
                disabled={readOnly}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                aria-label={t(`admin.theme.color.${key}`)}
                className="size-10 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
              />
              <Input
                value={draft[key]}
                disabled={readOnly}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setDraft((d) => ({ ...d, [key]: v }));
                }}
                className="bg-white font-mono text-xs uppercase"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border p-4">
        <p className="text-xs font-semibold text-muted-foreground">{t("admin.theme.preview")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button type="button">{t("admin.theme.title")}</Button>
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            {t("admin.theme.preview")}
          </span>
          <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-forest-deep">
            Gunited Travel
          </span>
          <span className="rounded-xl bg-beige px-4 py-2 text-sm text-forest-deep">
            جيونايتد ترافيل
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          disabled={readOnly || save.isPending || !/^#[0-9a-fA-F]{6}$/.test(draft.forest)}
          onClick={() => save.mutate()}
        >
          {t("common.save")}
        </Button>
        <Button variant="outline" disabled={readOnly} onClick={() => setDraft(DEFAULT_THEME)}>
          {t("admin.theme.reset")}
        </Button>
      </div>
    </section>
  );
}
