import { Link } from "@tanstack/react-router";
import { ArrowRight, Landmark, PlaneTakeoff, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * Static entry card for security-clearance requests. The buttons only route;
 * every request form (fields, documents, payment methods) is built dynamically
 * from the admin-managed offer template behind each slug.
 */
export function SecurityClearanceCard() {
  const { t } = useI18n();
  const [showBorders, setShowBorders] = useState(false);

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-6">
      <div className="surface-card overflow-hidden">
        <div className="brand-gradient flex items-center gap-3 px-6 py-5 text-primary-foreground">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-foreground/15">
            <ShieldCheck className="size-6" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-primary-foreground sm:text-2xl">
              {t("security.title")}
            </h2>
            <p className="mt-1 text-sm text-primary-foreground/80">{t("security.subtitle")}</p>
          </div>
        </div>

        <div className="p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to="/checkout/$slug"
              params={{ slug: "security-approval-flight" }}
              className="group flex items-center gap-3 rounded-2xl border-2 border-forest/15 bg-cream p-5 transition-colors hover:border-gold hover:bg-mint/40"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-forest text-cream">
                <PlaneTakeoff className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-bold text-forest-deep">
                  {t("security.flight")}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t("security.flight.hint")}
                </span>
              </span>
              <ArrowRight className="ms-auto size-4 shrink-0 text-gold rtl:rotate-180" aria-hidden />
            </Link>

            <button
              type="button"
              onClick={() => setShowBorders((v) => !v)}
              aria-expanded={showBorders}
              className={`group flex items-center gap-3 rounded-2xl border-2 p-5 text-start transition-colors ${
                showBorders
                  ? "border-gold bg-mint/40"
                  : "border-forest/15 bg-cream hover:border-gold hover:bg-mint/40"
              }`}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-forest text-cream">
                <Landmark className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-bold text-forest-deep">
                  {t("security.border")}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t("security.border.hint")}
                </span>
              </span>
              <ArrowRight className="ms-auto size-4 shrink-0 text-gold rtl:rotate-180" aria-hidden />
            </button>
          </div>

          {showBorders ? (
            <div className="mt-4 rounded-2xl border border-dashed border-gold/60 bg-beige/60 p-4">
              <p className="mb-3 text-xs font-semibold text-forest-deep">
                {t("security.border.choose")}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { slug: "security-approval-border-argeen", label: t("security.border.argeen") },
                  { slug: "security-approval-border-halfa", label: t("security.border.halfa") },
                ].map((b) => (
                  <Link
                    key={b.slug}
                    to="/checkout/$slug"
                    params={{ slug: b.slug }}
                    className="flex items-center justify-between gap-2 rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-cream transition-opacity hover:opacity-90"
                  >
                    {b.label}
                    <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
