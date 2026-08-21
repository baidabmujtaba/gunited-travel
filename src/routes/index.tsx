import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, MessageCircle, ShieldCheck, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { CatalogGrid } from "@/components/store/CatalogGrid";
import { PlaneHero } from "@/components/store/PlaneHero";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { getCatalog } from "@/lib/catalog.functions";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gunited Travel | جيونايتد ترافيل — Visas, Flights & Packages" },
      {
        name: "description",
        content:
          "Book visas, flight deals, tourism packages and travel insurance with Gunited Travel. Live prices in USD, SDG, SAR and AED, plus real-time order tracking.",
      },
      { property: "og:title", content: "Gunited Travel | جيونايتد ترافيل" },
      {
        property: "og:description",
        content:
          "Visas, flight deals, tourism packages and travel insurance with live prices and order tracking.",
      },
    ],
  }),
  loader: () => getCatalog({ data: { currency: "USD" } }),
  component: Home,
});

function Home() {
  const initial = Route.useLoaderData();
  const [currency, setCurrency] = useState("USD");
  const { t } = useI18n();

  const query = useQuery({
    queryKey: ["catalog", currency],
    queryFn: () => getCatalog({ data: { currency } }),
    initialData: currency === "USD" ? initial : undefined,
  });

  // Live sync: offers published, edited or archived by admins appear instantly.
  useEffect(() => {
    const channel = supabase
      .channel("storefront-offers")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_offers" }, () =>
        query.refetch(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "exchange_rates" }, () =>
        query.refetch(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [query]);

  const data = query.data ?? initial;

  return (
    <StoreLayout>
      <PlaneHero />

      <section className="mx-auto w-full max-w-6xl px-5 py-14">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, en: "Verified payments", ar: "دفع موثّق ومراجَع" },
            { icon: Timer, en: "Live order tracking", ar: "تتبع لحظي للطلب" },
            { icon: BadgeCheck, en: "Bilingual invoices", ar: "فواتير بالعربية والإنجليزية" },
          ].map((item) => (
            <div key={item.en} className="surface-card lift-hover flex items-center gap-3 p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-mint text-forest-deep">
                <item.icon className="size-5" />
              </span>
              <p className="text-sm font-semibold">
                <Bilingual ar={item.ar} en={item.en} />
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="catalog" className="mx-auto w-full max-w-6xl px-5 pb-8">
        <div className="mb-7">
          <h2 className="text-3xl font-bold">{t("catalog.title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("catalog.subtitle")}</p>
        </div>
        <CatalogGrid
          offers={data.offers}
          currencies={data.currencies}
          currency={currency}
          onCurrencyChange={setCurrency}
          loading={query.isFetching && !query.data}
        />
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-14">
        <div className="brand-gradient flex flex-col items-start gap-4 rounded-3xl p-8 text-primary-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary-foreground">
              <Bilingual ar="عندك سؤال قبل الحجز؟" en="Questions before you book?" />
            </h2>
            <p className="mt-2 text-sm text-primary-foreground/80">
              <Bilingual
                ar="فريق جيونايتد ترافيل جاهز للرد عبر واتساب."
                en="The Gunited Travel team replies on WhatsApp."
              />
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="secondary">
              <a
                href="https://wa.me/249912345678"
                target="_blank"
                rel="noreferrer"
                className="gap-2"
              >
                <MessageCircle className="size-4" />
                {t("common.whatsapp")}
              </a>
            </Button>
            <Button asChild variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/track">{t("nav.track")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </StoreLayout>
  );
}

function Bilingual({ ar, en }: { ar: string; en: string }) {
  const { lang } = useI18n();
  return <>{lang === "ar" ? ar : en}</>;
}
