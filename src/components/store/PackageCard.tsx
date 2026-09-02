import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Star, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PackageSummary } from "@/lib/packages.functions";
import { useI18n } from "@/lib/i18n";
import { categoryImage } from "@/lib/offer-images";

/** Premium offer/package card used on the homepage section and /offers listing. */
export function PackageCard({ offer }: { offer: PackageSummary }) {
  const { lang, fmt } = useI18n();
  const ar = lang === "ar";
  const title = ar ? offer.title_ar : offer.title_en;
  const summary = ar ? offer.short_description_ar : offer.short_description_en;
  const nights = [
    offer.makkah_nights ? `${offer.makkah_nights} ${ar ? "ليلة مكة" : "nights Makkah"}` : null,
    offer.madinah_nights ? `${offer.madinah_nights} ${ar ? "ليلة المدينة" : "nights Madinah"}` : null,
    offer.other_nights
      ? `${offer.other_nights} ${ar ? `ليلة ${offer.other_destination ?? ""}` : `nights ${offer.other_destination ?? ""}`}`
      : null,
  ].filter(Boolean) as string[];

  const original = offer.original_price_usd
    ? offer.original_price_usd * offer.price.rate
    : null;

  return (
    <article className="surface-card lift-hover flex h-full flex-col overflow-hidden">
      <div className="relative aspect-16/10 overflow-hidden bg-secondary">
        <img
          src={offer.primary_image ?? categoryImage(offer.category)}
          alt={title}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 hover:scale-[1.05]"
        />
        {offer.badge ? (
          <span
            className="absolute top-3 start-3 rounded-full px-3 py-1 text-xs font-bold text-white shadow-soft"
            style={{ backgroundColor: offer.badge.color || "#1f5d47" }}
          >
            {ar ? offer.badge.label_ar : offer.badge.label_en}
          </span>
        ) : null}
        {offer.stars ? (
          <span className="absolute top-3 end-3 flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-xs font-bold text-forest-deep shadow-soft">
            {offer.stars}
            <Star className="size-3.5 fill-gold text-gold" />
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-lg leading-snug font-bold">{title}</h3>

        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-sage">
          {offer.total_days ? (
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {offer.total_days} {ar ? "يوم" : "days"}
            </span>
          ) : (ar ? offer.duration_ar : offer.duration_en) ? (
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {ar ? offer.duration_ar : offer.duration_en}
            </span>
          ) : null}
          {nights.length ? (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {nights.join(" · ")}
            </span>
          ) : null}
        </div>

        {summary ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{summary}</p>
        ) : null}

        {offer.inclusions.length ? (
          <ul className="grid gap-1.5">
            {offer.inclusions.slice(0, 3).map((inc) => (
              <li key={inc.name_en + inc.name_ar} className="flex items-start gap-2 text-xs">
                <Check className="mt-0.5 size-3.5 shrink-0 text-sage" />
                <span className="line-clamp-1">{ar ? inc.name_ar : inc.name_en}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {offer.price_display_mode === "fixed"
                ? ar
                  ? "السعر"
                  : "Price"
                : ar
                  ? "ابتداءً من"
                  : "Starting from"}
            </p>
            <p className="text-xl font-bold text-forest">
              {fmt(offer.price.total, offer.price.currency)}
            </p>
            {original && original > offer.price.total ? (
              <p className="text-xs text-muted-foreground line-through">
                {fmt(original, offer.price.currency)}
              </p>
            ) : null}
          </div>
          <Button asChild size="sm">
            <Link to="/offers/$slug" params={{ slug: offer.slug }}>
              {offer.child_count > 0
                ? ar
                  ? `الباقات الفرعية (${offer.child_count})`
                  : `Sub-packages (${offer.child_count})`
                : ar
                  ? "التفاصيل"
                  : "View details"}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function PackageCardSkeleton() {
  return (
    <div className="surface-card overflow-hidden">
      <Skeleton className="aspect-16/10 w-full rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}

export function PackageBadgePill({ label, color }: { label: string; color?: string | null }) {
  return (
    <Badge style={color ? { backgroundColor: color, color: "#fff" } : undefined}>{label}</Badge>
  );
}
