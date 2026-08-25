import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { getCurrencies } from "@/lib/catalog.functions";
import { saveExchangeRate } from "@/lib/finance.functions";

/** Manual rate editor. Saved values flow to the whole store instantly (realtime). */
export function ExchangeRatePanel() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const currencies = useQuery({ queryKey: ["currencies"], queryFn: () => getCurrencies() });

  useEffect(() => {
    if (!currencies.data) return;
    setDrafts(
      Object.fromEntries(currencies.data.map((c) => [c.code, String(c.rate ?? 1)])) as Record<
        string,
        string
      >,
    );
  }, [currencies.data]);

  const save = useMutation({
    mutationFn: (vars: { currency: string; rate: number }) => saveExchangeRate({ data: vars }),
    onSuccess: () => {
      toast.success(t("admin.fin.rate.saved"));
      void qc.invalidateQueries({ queryKey: ["currencies"] });
      void qc.invalidateQueries({ queryKey: ["catalog"] });
      void qc.invalidateQueries({ queryKey: ["admin-finance"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  return (
    <div className="surface-card p-5">
      <h2 className="text-lg font-semibold">{t("admin.fin.rate.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("admin.fin.rate.note")}</p>

      {currencies.isPending ? (
        <Skeleton className="mt-5 h-40 w-full" />
      ) : (
        <ul className="mt-5 space-y-3">
          {(currencies.data ?? []).map((c) => (
            <li
              key={c.code}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-4"
            >
              <div>
                <p className="font-semibold text-forest-deep">
                  {c.code} · {lang === "ar" ? c.name_ar : c.name_en}
                </p>
                <p className="text-xs text-muted-foreground">1 USD = {c.rate} {c.code}</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  className="w-36"
                  type="number"
                  step="0.0001"
                  min="0"
                  disabled={c.code === "USD"}
                  value={drafts[c.code] ?? ""}
                  onChange={(e) => setDrafts({ ...drafts, [c.code]: e.target.value })}
                />
                <Button
                  className="bg-forest text-white hover:bg-forest-deep"
                  disabled={
                    c.code === "USD" || save.isPending || !Number(drafts[c.code] ?? 0)
                  }
                  onClick={() =>
                    save.mutate({ currency: c.code, rate: Number(drafts[c.code] ?? 0) })
                  }
                >
                  {t("admin.fin.rate.save")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
