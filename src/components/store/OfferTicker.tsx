import { Link } from "@tanstack/react-router";
import { ArrowUpLeft, Sparkles } from "lucide-react";
import type { CatalogOffer } from "@/lib/catalog.functions";
import { useI18n } from "@/lib/i18n";

export function OfferTicker({ offers }: { offers: CatalogOffer[] }) {
  const { lang, fmt } = useI18n();
  const ar = lang === "ar";

  if (offers.length === 0) return null;

  const items = [...offers, ...offers];

  return (
    <aside
      className="fixed inset-x-0 bottom-0 z-50 overflow-hidden border-t border-gold/50 bg-forest-deep text-primary-foreground shadow-lift"
      aria-label={ar ? "أحدث عروض السفر" : "Latest travel offers"}
    >
      <div className="flex h-11 items-center">
        <div className="relative z-10 flex h-full shrink-0 items-center gap-2 bg-gold px-4 text-xs font-bold text-forest-deep sm:px-6">
          <Sparkles className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{ar ? "أحدث العروض" : "Latest offers"}</span>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="offer-ticker-track flex w-max items-center hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]">
            {items.map((offer, index) => (
              <Link
                key={`${offer.id}-${index}`}
                to="/offers/$slug"
                params={{ slug: offer.slug }}
                className="flex h-11 shrink-0 items-center gap-3 border-e border-primary-foreground/15 px-5 text-xs transition-colors hover:bg-primary-foreground/10 focus-visible:bg-primary-foreground/10 focus-visible:outline-none sm:text-sm"
              >
                <span className="font-semibold">{ar ? offer.title_ar : offer.title_en}</span>
                <span className="text-gold">{fmt(offer.price.total, offer.price.currency)}</span>
                <ArrowUpLeft className="size-3.5 rtl:-rotate-90" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}