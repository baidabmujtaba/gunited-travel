import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Banknote, FileCheck2, Headphones, MessageCircle, ShieldCheck, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { CatalogGrid } from "@/components/store/CatalogGrid";
import { FeaturedPackages } from "@/components/store/FeaturedPackages";
import { PlaneHero } from "@/components/store/PlaneHero";
import { OfferTicker } from "@/components/store/OfferTicker";
import { SecurityClearanceCard } from "@/components/store/SecurityClearanceCard";
import { StoreLayout } from "@/components/store/StoreLayout";
import { VideoSlideshow } from "@/components/store/VideoSlideshow";

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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

      <VideoSlideshow />

      <FeaturedPackages currency={currency} />

      <section className="border-y border-border/70 bg-card py-16 sm:py-24">
        <div className="mx-auto w-full max-w-6xl px-5">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-bold text-gold">{t("brand.name")}</p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              <Bilingual ar="لماذا تختار جيونايتد؟" en="Why travel with Gunited?" />
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, en: "Verified, protected payments", ar: "مدفوعات موثّقة ومحمية", bodyEn: "Clear payment records and private receipts for every order.", bodyAr: "سجل دفع واضح وإيصالات خاصة لكل طلب." },
            { icon: Timer, en: "Live order tracking", ar: "تتبع لحظي للطلب", bodyEn: "Follow every stage using your unique tracking number.", bodyAr: "تابع كل مرحلة باستخدام رقم التتبع الخاص بك." },
            { icon: Headphones, en: "Human support", ar: "دعم بشري مباشر", bodyEn: "A travel specialist is ready when you need help.", bodyAr: "متخصص سفر جاهز لمساعدتك وقت الحاجة." },
          ].map((item) => (
            <article key={item.en} className="border-t-2 border-gold px-2 py-6 text-center sm:px-6">
              <span className="mx-auto grid size-11 place-items-center rounded-md bg-secondary text-forest-deep">
                <item.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-bold">
                <Bilingual ar={item.ar} en={item.en} />
              </h3>
              <p className="mt-2 text-xs leading-6 text-muted-foreground"><Bilingual ar={item.bodyAr} en={item.bodyEn} /></p>
            </article>
          ))}
          </div>
        </div>
      </section>

      <SecurityClearanceCard />

      <section className="mx-auto grid w-full max-w-6xl gap-16 px-5 py-20 sm:py-28">
        {[
          { icon: Banknote, titleAr: "ادفع بالطريقة التي تناسبك", titleEn: "Pay the way that suits you", bodyAr: "اختر من وسائل الدفع المتاحة، ارفع إيصالك، واحتفظ بسجل واضح داخل طلبك.", bodyEn: "Choose an available payment method, upload your receipt and keep a clear record in your order.", action: "/offers" as const, labelAr: "استعرض الخدمات", labelEn: "Explore services" },
          { icon: Timer, titleAr: "تابع طلبك لحظة بلحظة", titleEn: "Track every step", bodyAr: "أدخل رقم الطلب لتعرف حالته الحالية وما إذا كان هناك مستند مطلوب أو تحديث جديد.", bodyEn: "Enter your order number to see its current status, required documents and recent updates.", action: "/track" as const, labelAr: "تتبع الطلب", labelEn: "Track order" },
          { icon: FileCheck2, titleAr: "استلم مستنداتك بأمان", titleEn: "Receive documents securely", bodyAr: "تظل مستندات الهوية والإيصالات داخل مساحة خاصة، مع إشعارات عند اكتمال الخدمة.", bodyEn: "Identity documents and receipts stay private, with notifications when your service is complete.", action: "/account" as const, labelAr: "افتح حسابي", labelEn: "Open my account" },
        ].map((item, index) => (
          <article key={item.titleEn} className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
            <div className={index % 2 ? "md:order-2" : undefined}>
              <span className="grid size-14 place-items-center rounded-md border border-gold/50 bg-secondary text-forest"><item.icon className="size-6" /></span>
              <h2 className="mt-6 text-3xl font-extrabold sm:text-4xl"><Bilingual ar={item.titleAr} en={item.titleEn} /></h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground"><Bilingual ar={item.bodyAr} en={item.bodyEn} /></p>
              <Button asChild variant="outline" className="mt-6">
                <Link to={item.action}><Bilingual ar={item.labelAr} en={item.labelEn} /></Link>
              </Button>
            </div>
            <div className={`grid min-h-56 place-items-center rounded-lg border border-border bg-card ${index % 2 ? "md:order-1" : ""}`}>
              <div className="relative grid size-32 place-items-center rounded-full border border-gold/50 bg-secondary text-forest">
                <item.icon className="size-12" />
                <BadgeCheck className="absolute -end-2 bottom-2 size-9 rounded-full bg-forest p-2 text-primary-foreground" />
              </div>
            </div>
          </article>
        ))}
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
        <div className="brand-gradient flex flex-col items-start gap-4 rounded-lg p-8 text-primary-foreground sm:flex-row sm:items-center sm:justify-between">
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
      <OfferTicker offers={data.offers} />
    </StoreLayout>
  );
}

function Bilingual({ ar, en }: { ar: string; en: string }) {
  const { lang } = useI18n();
  return <>{lang === "ar" ? ar : en}</>;
}
