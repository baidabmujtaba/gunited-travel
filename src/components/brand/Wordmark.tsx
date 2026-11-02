import { useI18n } from "@/lib/i18n";
import { useSiteName } from "@/lib/site-name";
import { cn } from "@/lib/utils";
import brandLogo from "@/assets/brand-logo.png";

/**
 * Official brand lockup. Names come from the company settings row, so an
 * admin renaming the site updates every surface automatically.
 */
export function Wordmark({
  className,
  showBoth = false,
}: {
  className?: string;
  showBoth?: boolean;
}) {
  const { lang } = useI18n();
  const site = useSiteName();
  const primary = lang === "ar" ? site.name_ar : site.name_en;
  const secondary = lang === "ar" ? site.name_en : site.name_ar;

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
