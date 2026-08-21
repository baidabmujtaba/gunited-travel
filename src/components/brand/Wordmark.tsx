import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Official brand lockup. English wordmark in LTR, the exact Arabic
 * transliteration جيونايتد ترافيل in RTL. Never translated differently.
 */
export function Wordmark({
  className,
  showBoth = false,
}: {
  className?: string;
  showBoth?: boolean;
}) {
  const { lang } = useI18n();
  const primary = lang === "ar" ? "جيونايتد ترافيل" : "Gunited Travel";
  const secondary = lang === "ar" ? "Gunited Travel" : "جيونايتد ترافيل";

  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className="font-display text-lg font-bold tracking-tight text-forest-deep sm:text-xl">
        {primary}
      </span>
      {showBoth ? (
        <span className="text-xs font-medium text-muted-foreground">{secondary}</span>
      ) : null}
    </span>
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-xl brand-gradient text-primary-foreground shadow-soft",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
        <path d="M21 15.5 13.5 12V5.8a1.5 1.5 0 0 0-3 0V12L3 15.5v2l7.5-2.2V19l-2.2 1.6v1.2l3.7-1 3.7 1v-1.2L13.5 19v-3.7l7.5 2.2z" />
      </svg>
    </span>
  );
}
