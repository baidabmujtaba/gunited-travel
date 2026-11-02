import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import brandLogo from "@/assets/brand-logo.png";

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
    <img
      src={brandLogo}
      alt=""
      aria-hidden="true"
      className={cn("h-9 w-auto shrink-0 object-contain", className)}
      loading="eager"
      decoding="async"
    />
  );
}
