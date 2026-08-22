import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, Check, CalendarClock } from "lucide-react";
import { useState } from "react";
import { CurrencySelector } from "@/components/store/CurrencySelector";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOffer } from "@/lib/catalog.functions";
import { useI18n } from "@/lib/i18n";
import { categoryImage } from "@/lib/offer-images";

export const Route = createFileRoute("/offers/$slug")({
  loader: async ({ params }) => {
    const result = await getOffer({ data: { slug: params.slug, currency: "USD" } });
    if (!result.offer) throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    if (!loaderData?.offer) {
      return { meta: [{ title: "Offer unavailable — Gunited Travel" }, { name: "robots", content: "noindex" }] };
    }
    const o = loaderData.offer;
    const title = `${o.title_en} | ${o.title_ar} — Gunited Travel`;
    const description = o.description_en.slice(0, 155) || "Gunited Travel offer details.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: OfferDetail,
});

function OfferDetail() {
  const initial = Route.useLoaderData();
  const { slug } = Route.useParams();
  const [currency, setCurrency] = useState("USD");
  const [active, setActive] = useState(0);

  const { lang, t, fmt } = useI18n();

  const query = useQuery({
    queryKey: ["offer", slug, currency],
    queryFn: () => getOffer({ data: { slug, currency } }),
    initialData: currency === "USD" ? initial : undefined,
  });

  const data = query.data ?? initial;
  const offer = data.offer;

  if (!offer) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-2xl px-5 py-24 text-center">
          <h1 className="text-2xl font-bold">{t("offer.notfound")}</h1>
          <Button asChild className="mt-6">
            <Link to="/offers">{t("nav.offers")}</Link>
          </Button>
        </div>
      </StoreLayout>
    );
  }

  const title = lang === "ar" ? offer.title_ar : offer.title_en;
  const description = lang === "ar" ? offer.description_ar : offer.description_en;
  const duration = lang === "ar" ? offer.duration_ar : offer.duration_en;
  const gallery = offer.images.length ? offer.images : [offer.primary_image ?? categoryImage(offer.category)];
  const [active, setActive] = useState(0);
  const p = offer.price;

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-6xl px-5 py-10">
        <Link to="/offers" className="text-sm font-medium text-sage hover:underline">
          ← {t("nav.offers")}
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="surface-card overflow-hidden">
              <img
                src={gallery[Math.min(active, gallery.length - 1)]}
                alt={title}
                className="aspect-16/10 w-full object-cover"
              />
            </div>
            {gallery.length > 1 ? (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {gallery.map((src, i) => (
                  <button
                    key={src + i}
                    onClick={() => setActive(i)}
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                      i === active ? "border-forest" : "border-transparent"
                    }`}
                    aria-label={`${title} ${i + 1}`}
                  >
                    <img src={src} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-8">
              <Badge className="bg-mint text-forest-deep">{t(`category.${offer.category}`)}</Badge>
              <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{title}</h1>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                {duration ? (
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-4" /> {t("offer.duration")}: {duration}
                  </span>
                ) : null}
                {offer.expiry_date ? (
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="size-4" /> {t("offer.expires")}: {offer.expiry_date}
                  </span>
                ) : null}
              </div>
              <p className="mt-5 leading-relaxed whitespace-pre-line text-forest-deep/85">
                {description}
              </p>

              {offer.features.length ? (
                <div className="mt-7">
                  <h2 className="text-lg font-bold">{t("offer.includes")}</h2>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {offer.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-sage" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="surface-card space-y-4 p-6">
              <CurrencySelector
                currencies={data.currencies}
                value={currency}
                onChange={setCurrency}
              />
              <h2 className="text-base font-bold">{t("offer.breakdown")}</h2>
              <dl className="space-y-2 text-sm">
                <Row label={t("offer.base")} value={fmt(p.base, p.currency)} />
                {p.discount > 0 ? (
                  <Row label={t("offer.discount")} value={`− ${fmt(p.discount, p.currency)}`} />
                ) : null}
                {p.tax > 0 ? <Row label={t("offer.tax")} value={fmt(p.tax, p.currency)} /> : null}
                {p.fees > 0 ? <Row label={t("offer.fees")} value={fmt(p.fees, p.currency)} /> : null}
              </dl>
              <div className="flex items-baseline justify-between border-t border-border pt-4">
                <span className="font-semibold">{t("offer.total")}</span>
                <span className="text-2xl font-bold text-forest">{fmt(p.total, p.currency)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("offer.rate.note")}</p>
              <Button asChild size="lg" className="w-full">
                <Link to="/checkout/$slug" params={{ slug: offer.slug }} search={{ currency }}>
                  {t("offer.cta")}
                </Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </StoreLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
