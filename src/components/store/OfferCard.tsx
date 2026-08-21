import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { categoryImage } from "@/lib/offer-images";
import type { CatalogOffer } from "@/lib/catalog.functions";
import { useI18n } from "@/lib/i18n";

export function OfferCard({ offer }: { offer: CatalogOffer }) {
  const { lang, t, fmt } = useI18n();
  const title = lang === "ar" ? offer.title_ar : offer.title_en;
  const description = lang === "ar" ? offer.description_ar : offer.description_en;
  const duration = lang === "ar" ? offer.duration_ar : offer.duration_en;

  return (
    <article className="surface-card lift-hover flex flex-col overflow-hidden">
      <div className="relative aspect-16/10 overflow-hidden bg-secondary">
        <img
          src={offer.primary_image ?? categoryImage(offer.category)}
          alt={title}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 hover:scale-[1.04]"
        />
        <Badge className="absolute top-3 inline-end-3 bg-card text-forest-deep shadow-soft">
          {t(`category.${offer.category}`)}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-lg leading-snug font-bold">{title}</h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        {duration ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-sage">
            <Clock className="size-3.5" />
            {duration}
          </p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div>
            <p className="text-xs text-muted-foreground">{t("offer.total")}</p>
            <p className="text-xl font-bold text-forest">
              {fmt(offer.price.total, offer.price.currency)}
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/offers/$slug" params={{ slug: offer.slug }}>
              {t("catalog.view")}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function OfferCardSkeleton() {
  return (
    <div className="surface-card overflow-hidden">
      <Skeleton className="aspect-16/10 w-full rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}
