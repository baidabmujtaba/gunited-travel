import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  Footprints,
  MapPin,
  Star,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { CurrencySelector } from "@/components/store/CurrencySelector";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { categoryImage } from "@/lib/offer-images";
import { getPackage, trackPackageEvent } from "@/lib/packages.functions";

export const Route = createFileRoute("/offers/$slug")({
  loader: async ({ params }) => {
    const result = await getPackage({ data: { slug: params.slug, currency: "USD" } });
    if (!result.offer) throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    if (!loaderData?.offer) {
      return {
        meta: [
          { title: "Offer unavailable — Gunited Travel" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const o = loaderData.offer;
    const title = o.seo_title ?? `${o.title_en} | ${o.title_ar} — Gunited Travel`;
    const description =
      o.seo_description ??
      ((o.short_description_en || o.description_en).slice(0, 155) ||
        "Gunited Travel package details.");
    const image = o.primary_image && /^https:\/\//.test(o.primary_image) ? o.primary_image : null;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
    };
  },
  component: OfferDetail,
  notFoundComponent: () => (
    <StoreLayout>
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="text-2xl font-bold">العرض غير متاح / Offer unavailable</h1>
        <Button asChild className="mt-6">
          <Link to="/offers">كل العروض / All offers</Link>
        </Button>
      </div>
    </StoreLayout>
  ),
});

function OfferDetail() {
  const initial = Route.useLoaderData();
  const { slug } = Route.useParams();
  const { lang, fmt } = useI18n();
  const ar = lang === "ar";
  const [currency, setCurrency] = useState("USD");
  const [active, setActive] = useState(0);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["package", slug, currency],
    queryFn: () => getPackage({ data: { slug, currency } }),
    initialData: currency === "USD" ? initial : undefined,
  });

  const data = query.data ?? initial;
  const offer = data.offer;

  useEffect(() => {
    if (offer?.id) void trackPackageEvent({ data: { offerId: offer.id, event: "view" } });
  }, [offer?.id]);

  if (!offer) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-2xl px-5 py-24 text-center">
          <h1 className="text-2xl font-bold">العرض غير متاح / Offer unavailable</h1>
          <Button asChild className="mt-6">
            <Link to="/offers">كل العروض / All offers</Link>
          </Button>
        </div>
      </StoreLayout>
    );
  }

  const gallery = [offer.primary_image ?? categoryImage(offer.category), ...offer.images].filter(
    Boolean,
  ) as string[];
  const hero = gallery[Math.min(active, gallery.length - 1)] ?? categoryImage(offer.category);
  const included = offer.services.filter((s) => s.is_included);
  const excluded = offer.services.filter((s) => !s.is_included && !s.is_optional);
  const optional = offer.services.filter((s) => !s.is_included && s.is_optional);
  const isVisaOnly = offer.offer_type === "visa_only" || offer.category === "visa";
  const isCustom = offer.offer_type === "custom_package";

  const nights = [
    offer.makkah_nights ? { label: ar ? "مكة" : "Makkah", n: offer.makkah_nights } : null,
    offer.madinah_nights ? { label: ar ? "المدينة" : "Madinah", n: offer.madinah_nights } : null,
    offer.other_nights
      ? { label: offer.other_destination ?? (ar ? "أخرى" : "Other"), n: offer.other_nights }
      : null,
  ].filter(Boolean) as { label: string; n: number }[];

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-6xl px-5 pb-28 sm:pb-14">
        {/* Hero */}
        <div className="surface-card overflow-hidden">
          <div className="relative aspect-16/9 bg-secondary">
            <img src={hero} alt={ar ? offer.title_ar : offer.title_en} className="size-full object-cover" />
            {offer.badge ? (
              <span
                className="absolute top-4 start-4 rounded-full px-3 py-1 text-xs font-bold text-white shadow-soft"
                style={{ backgroundColor: offer.badge.color || "#1f5d47" }}
              >
                {ar ? offer.badge.label_ar : offer.badge.label_en}
              </span>
            ) : null}
          </div>
          {gallery.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto p-3">
              {gallery.map((g, i) => (
                <button
                  key={g + i}
                  onClick={() => setActive(i)}
                  className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === active ? "border-forest" : "border-transparent"}`}
                >
                  <img src={g} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            <header className="space-y-3">
              <h1 className="text-3xl font-bold sm:text-4xl">{ar ? offer.title_ar : offer.title_en}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {offer.total_days ? (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-4" />
                    {offer.total_days} {ar ? "يوم" : "days"}
                  </span>
                ) : null}
                {nights.map((n) => (
                  <span key={n.label} className="flex items-center gap-1.5">
                    <MapPin className="size-4" />
                    {n.n} {ar ? "ليلة" : "nights"} · {n.label}
                  </span>
                ))}
                {offer.stars ? (
                  <span className="flex items-center gap-1">
                    {offer.stars}
                    <Star className="size-4 fill-gold text-gold" />
                  </span>
                ) : null}
              </div>
              <p className="text-sm leading-relaxed">
                {ar ? offer.short_description_ar : offer.short_description_en}
              </p>
            </header>

            {(ar ? offer.description_ar : offer.description_en) ? (
              <Section title={ar ? "عن الباقة" : "About this package"}>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {ar ? offer.description_ar : offer.description_en}
                </p>
              </Section>
            ) : null}

            {!isVisaOnly && offer.hotels.length > 0 ? (
              <Section title={ar ? "الفنادق" : "Hotels"}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {offer.hotels.map((h) => (
                    <div key={h.id} className="surface-card overflow-hidden">
                      {h.image ? (
                        <img src={h.image} alt={ar ? h.name_ar : h.name_en} className="aspect-16/9 w-full object-cover" />
                      ) : null}
                      <div className="space-y-2 p-4">
                        <p className="text-xs text-muted-foreground">{ar ? h.city_ar : h.city_en}</p>
                        <p className="font-bold">{ar ? h.name_ar : h.name_en}</p>
                        <p className="flex items-center gap-1 text-xs">
                          {Array.from({ length: h.stars }).map((_, i) => (
                            <Star key={i} className="size-3.5 fill-gold text-gold" />
                          ))}
                        </p>
                        {h.distance_haram_m ? (
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Footprints className="size-3.5" />
                            {h.distance_haram_m} {ar ? "م من الحرم" : "m from the Haram"}
                          </p>
                        ) : null}
                        {h.distance_mosque_m ? (
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Footprints className="size-3.5" />
                            {h.distance_mosque_m} {ar ? "م من المسجد النبوي" : "m from the Prophet's Mosque"}
                          </p>
                        ) : null}
                        {(ar ? h.description_ar : h.description_en) ? (
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {ar ? h.description_ar : h.description_en}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            {!isVisaOnly && offer.rooms.length > 0 ? (
              <Section title={ar ? "أنواع الغرف والأسعار" : "Room types & prices"}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {offer.rooms.map((r) => (
                    <div key={r.id} className="surface-card flex items-center justify-between gap-3 p-4">
                      <div>
                        <p className="flex items-center gap-2 font-semibold">
                          <BedDouble className="size-4 text-sage" />
                          {ar ? r.name_ar : r.name_en}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.occupancy} {ar ? "أشخاص" : "persons"} ·{" "}
                          {r.available_rooms > 0
                            ? `${r.available_rooms} ${ar ? "غرفة متاحة" : "rooms left"}`
                            : ar
                              ? "غير متاح"
                              : "Sold out"}
                        </p>
                      </div>
                      <p className="font-bold text-forest">{fmt(r.price, offer.price.currency)}</p>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            {included.length > 0 || excluded.length > 0 || optional.length > 0 ? (
              <Section title={ar ? "الخدمات" : "Services"}>
                <div className="grid gap-6 sm:grid-cols-2">
                  {included.length ? (
                    <div>
                      <p className="mb-2 text-sm font-bold">{ar ? "يشمل" : "Included"}</p>
                      <ul className="space-y-2">
                        {included.map((s) => (
                          <li key={s.id} className="flex items-start gap-2 text-sm">
                            <Check className="mt-0.5 size-4 shrink-0 text-sage" />
                            <span>{ar ? s.name_ar : s.name_en}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {excluded.length || optional.length ? (
                    <div>
                      <p className="mb-2 text-sm font-bold">{ar ? "لا يشمل / إضافات" : "Not included / extras"}</p>
                      <ul className="space-y-2">
                        {[...excluded, ...optional].map((s) => (
                          <li key={s.id} className="flex items-start gap-2 text-sm">
                            <X className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            <span>
                              {ar ? s.name_ar : s.name_en}
                              {s.extra_price > 0 ? (
                                <span className="text-muted-foreground">
                                  {" "}
                                  (+{fmt(s.extra_price, offer.price.currency)})
                                </span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </Section>
            ) : null}

            {offer.departures.length > 0 ? (
              <Section title={ar ? "تواريخ المغادرة" : "Departure dates"}>
                <div className="flex flex-wrap gap-2">
                  {offer.departures.map((d) => (
                    <span
                      key={d.id}
                      className="surface-card px-3 py-2 text-xs font-medium"
                    >
                      {d.departure_date}
                      {d.seats_total > 0 ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · {d.seats_left} {ar ? "مقعد" : "seats"}
                        </span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </Section>
            ) : null}

            {(ar ? offer.important_info_ar : offer.important_info_en) ? (
              <Section title={ar ? "معلومات مهمة" : "Important information"}>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {ar ? offer.important_info_ar : offer.important_info_en}
                </p>
              </Section>
            ) : null}

            {(ar ? offer.terms_ar : offer.terms_en) ? (
              <Section title={ar ? "الشروط والأحكام" : "Terms & conditions"}>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {ar ? offer.terms_ar : offer.terms_en}
                </p>
              </Section>
            ) : null}

            {offer.faqs.length > 0 ? (
              <Section title={ar ? "الأسئلة الشائعة" : "FAQ"}>
                <div className="space-y-2">
                  {offer.faqs.map((f) => (
                    <div key={f.id} className="surface-card overflow-hidden">
                      <button
                        className="flex w-full items-center justify-between gap-3 p-4 text-start text-sm font-semibold"
                        onClick={() => setOpenFaq(openFaq === f.id ? null : f.id)}
                      >
                        {ar ? f.question_ar : f.question_en}
                        <ChevronDown
                          className={`size-4 transition-transform ${openFaq === f.id ? "rotate-180" : ""}`}
                        />
                      </button>
                      {openFaq === f.id ? (
                        <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">
                          {ar ? f.answer_ar : f.answer_en}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}
          </div>

          {/* Summary card */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="surface-card space-y-4 p-5">
              <CurrencySelector
                currencies={data.currencies}
                value={currency}
                onChange={setCurrency}
              />
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
                <p className="text-3xl font-bold text-forest">
                  {fmt(offer.price.total, offer.price.currency)}
                </p>
                {offer.original_price_usd &&
                offer.original_price_usd * offer.price.rate > offer.price.total ? (
                  <p className="text-sm text-muted-foreground line-through">
                    {fmt(offer.original_price_usd * offer.price.rate, offer.price.currency)}
                  </p>
                ) : null}
              </div>
              <dl className="space-y-1.5 text-sm">
                {offer.total_days ? (
                  <Row label={ar ? "المدة" : "Duration"} value={`${offer.total_days} ${ar ? "يوم" : "days"}`} />
                ) : null}
                {nights.map((n) => (
                  <Row key={n.label} label={n.label} value={`${n.n} ${ar ? "ليلة" : "nights"}`} />
                ))}
                {offer.price.tax > 0 ? (
                  <Row label={ar ? "الضريبة" : "Tax"} value={fmt(offer.price.tax, offer.price.currency)} />
                ) : null}
              </dl>
              <Button asChild size="lg" className="w-full">
                <Link to="/book/$slug" params={{ slug: offer.slug }}>
                  {isCustom
                    ? ar
                      ? "اطلب برنامجك الخاص"
                      : "Request a custom program"
                    : ar
                      ? "احجز هذه الباقة"
                      : "Book this package"}
                </Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky mobile CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-3 backdrop-blur sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-muted-foreground">{ar ? "ابتداءً من" : "From"}</p>
            <p className="font-bold text-forest">{fmt(offer.price.total, offer.price.currency)}</p>
          </div>
          <Button asChild className="flex-1">
            <Link to="/book/$slug" params={{ slug: offer.slug }}>
              {ar ? "احجز هذه الباقة" : "Book this package"}
            </Link>
          </Button>
        </div>
      </div>
    </StoreLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
