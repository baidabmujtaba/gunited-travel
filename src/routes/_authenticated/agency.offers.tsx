import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock } from "lucide-react";
import { Section, useL } from "@/components/admin/Bilingual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencySelector } from "@/components/store/CurrencySelector";
import { OfferCardSkeleton } from "@/components/store/OfferCard";
import { getAgencyCatalog } from "@/lib/agency-catalog.functions";
import { useI18n } from "@/lib/i18n";
import { categoryImage } from "@/lib/offer-images";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/agency/offers")({
  component: AgencyOffers,
  errorComponent: ({ error }) => (
    <p className="surface-card p-6 text-sm text-destructive">{error.message}</p>
  ),
  notFoundComponent: () => <p className="surface-card p-6 text-sm">404</p>,
});

function AgencyOffers() {
  const l = useL();
  const { t, lang, fmt } = useI18n();
  const [currency, setCurrency] = useState("USD");
  const load = useServerFn(getAgencyCatalog);

  const { data, isPending } = useQuery({
    queryKey: ["agency-catalog", currency],
    queryFn: () => load({ data: { currency } }),
  });

  return (
    <Section
      title={t("agency.offers.title")}
      subtitle={t("agency.offers.subtitle")}
      actions={
        <CurrencySelector
          currencies={data?.currencies ?? []}
          value={currency}
          onChange={setCurrency}
        />
      }
    >
      {isPending ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <OfferCardSkeleton key={i} />
          ))}
        </div>
      ) : (data?.offers ?? []).length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">{t("catalog.empty")}</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.offers ?? []).map((offer) => {
            const title = lang === "ar" ? offer.title_ar : offer.title_en;
            const duration = lang === "ar" ? offer.duration_ar : offer.duration_en;
            return (
              <article key={offer.id} className="surface-card flex flex-col overflow-hidden">
                <div className="relative aspect-16/10 overflow-hidden bg-secondary">
                  <img
                    src={offer.primary_image ?? categoryImage(offer.category)}
                    alt={title}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                  <Badge className="absolute top-3 end-3 bg-card text-forest-deep">
                    {t(`category.${offer.category}`)}
                  </Badge>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="text-lg leading-snug font-bold">{title}</h3>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {lang === "ar" ? offer.description_ar : offer.description_en}
                  </p>
                  {duration ? (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-sage">
                      <Clock className="size-3.5" />
                      {duration}
                    </p>
                  ) : null}
                  <div className="mt-auto flex items-end justify-between gap-3 pt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.offers.price.agency")}
                      </p>
                      {offer.agency_price_missing ? (
                        <p className="text-xs text-destructive">{t("agency.offers.missing")}</p>
                      ) : (
                        <p className="text-xl font-bold text-forest">
                          {fmt(offer.price.total, offer.price.currency)}
                        </p>
                      )}
                    </div>
                    <Button asChild size="sm" disabled={offer.agency_price_missing}>
                      <Link to="/checkout/$slug" params={{ slug: offer.slug }} search={{ currency }}>
                        {l("طلب جديد", "New order")}
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Section>
  );
}
