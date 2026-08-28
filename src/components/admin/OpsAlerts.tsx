import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CheckCircle2, Info } from "lucide-react";
import { getOpsAlerts } from "@/lib/insights.functions";
import { useI18n } from "@/lib/i18n";

const TONE = {
  critical: "border-l-4 border-l-destructive bg-destructive/5",
  warning: "border-l-4 border-l-gold bg-gold/10",
  info: "border-l-4 border-l-sage bg-sage/10",
} as const;

/**
 * Cross-module operations inbox. It correlates orders, invoices, agency credit,
 * offers, email delivery and agency links into a single actionable list.
 */
export function OpsAlerts() {
  const { t, lang } = useI18n();
  const alerts = useQuery({
    queryKey: ["ops-alerts"],
    queryFn: () => getOpsAlerts(),
    staleTime: 60_000,
  });

  const rows = alerts.data ?? [];

  return (
    <section className="surface-card p-4 sm:p-5">
      <header className="flex flex-wrap items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-gold" aria-hidden />
        <h2 className="text-sm font-bold text-forest-deep sm:text-base">{t("ops.title")}</h2>
        {rows.length > 0 ? (
          <span className="rounded-full bg-forest px-2 py-0.5 text-xs font-semibold text-cream">
            {rows.length}
          </span>
        ) : null}
        <p className="w-full text-xs text-muted-foreground">{t("ops.subtitle")}</p>
      </header>

      {alerts.isLoading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-beige/70" />
          ))}
        </div>
      ) : alerts.isError ? (
        <p className="mt-4 text-xs text-destructive">{t("common.error")}</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-sage" aria-hidden />
          {t("ops.empty")}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((a) => (
            <li key={a.id} className={`rounded-xl p-3 ${TONE[a.severity]}`}>
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-forest-deep">
                    {lang === "ar" ? a.title_ar : a.title_en}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {lang === "ar" ? a.body_ar : a.body_en}
                  </p>
                </div>
                <Link
                  to={a.link}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-forest px-3 py-1.5 text-xs font-semibold text-cream"
                >
                  {t("ops.open")}
                  <ArrowRight className="h-3 w-3 rtl:rotate-180" aria-hidden />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {rows.length === 0 && !alerts.isLoading && !alerts.isError ? (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Info className="h-3 w-3" aria-hidden />
          {t("ops.hint")}
        </p>
      ) : null}
    </section>
  );
}
