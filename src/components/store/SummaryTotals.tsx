import { useQuery } from "@tanstack/react-query";
import { getCurrencies } from "@/lib/catalog.functions";
import { useI18n } from "@/lib/i18n";
import { summaryTotals } from "@/lib/summary-currencies";

const labels = {
  SDG: { ar: "جنيه سوداني", en: "Sudanese pound" },
  USD: { ar: "دولار أمريكي", en: "US dollar" },
  SAR: { ar: "ريال سعودي", en: "Saudi riyal" },
  AED: { ar: "درهم إماراتي", en: "UAE dirham" },
};

export function SummaryTotals({ totalUsd }: { totalUsd: number }) {
  const { lang, fmt } = useI18n();
  const rates = useQuery({
    queryKey: ["summary-currencies"],
    queryFn: () => getCurrencies(),
    staleTime: 60_000,
  });
  return (
    <div className="space-y-3 border-t border-border pt-3">
      <p className="text-sm font-bold">{lang === "ar" ? "السعر النهائي" : "Final total"}</p>
      <dl className="space-y-3">
        {summaryTotals(totalUsd, rates.data ?? []).map(({ code, total }) => (
          <div key={code} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <dt className="text-xs text-muted-foreground">{labels[code][lang]}</dt>
            <dd className="text-base font-bold text-forest" dir="auto">
              {total !== null ? fmt(total, code) : rates.isPending
                ? (lang === "ar" ? "جارٍ التحميل…" : "Loading…")
                : (lang === "ar" ? "سعر الصرف غير متاح" : "Exchange rate unavailable")}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}