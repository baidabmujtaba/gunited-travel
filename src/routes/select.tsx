import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  Building2,
  Check,
  Clock,
  Headphones,
  Loader2,
  Menu,
  Plane,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";

import { getOfferTypes, type OfferType } from "@/lib/catalog.functions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/select")({
  head: () => ({
    meta: [
      { title: "Choose a Service — Gunited Travel | اختر نوع الموافقة" },
      {
        name: "description",
        content:
          "Pick the Gunited Travel service you need — security approval, border crossing, flights or visa support — and start your request in minutes.",
      },
      { property: "og:title", content: "Choose a Service — Gunited Travel" },
      {
        property: "og:description",
        content: "Select the required service and continue to your Gunited Travel request.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SelectPage,
  errorComponent: ({ error }) => (
    <p className="p-6 text-sm text-destructive">{error.message}</p>
  ),
  notFoundComponent: () => <p className="p-6 text-sm">404</p>,
});

const ICONS = {
  plane: Plane,
  shield: ShieldCheck,
  ticket: Ticket,
  building: Building2,
  users: Users,
  sparkles: Sparkles,
  badge: BadgeCheck,
} as const;

function iconFor(offer: OfferType) {
  const key = (offer.icon ?? "") as keyof typeof ICONS;
  if (ICONS[key]) return ICONS[key];
  if (offer.category === "security_approval") return ShieldCheck;
  if (offer.category === "flight" || offer.category === "flights") return Plane;
  if (offer.category === "visa") return BadgeCheck;
  return Ticket;
}

/** Odd cards get forest, even cards gold — unless the admin pinned a badge color. */
function badgeClass(offer: OfferType, index: number) {
  const pinned = offer.badge_color?.toLowerCase();
  if (pinned === "gold") return "bg-gold text-forest-deep";
  if (pinned === "forest" || pinned === "green") return "bg-forest text-primary-foreground";
  return index % 2 === 0 ? "bg-forest text-primary-foreground" : "bg-gold text-forest-deep";
}

function SelectPage() {
  const i18n = useI18n();
  const t = i18n.t;
  const lang = i18n.lang;
  const rtl = i18n.dir === "rtl";
  const Forward = rtl ? ArrowLeft : ArrowRight;

  const query = useQuery({ queryKey: ["offer-types"], queryFn: () => getOfferTypes() });
  const offers = query.data ?? [];

  const perks = [
    t("select.perk.easy"),
    t("select.perk.followup"),
    t("select.perk.fast"),
  ];
  const trust = [
    { icon: ShieldCheck, label: t("select.trust.secure") },
    { icon: Clock, label: t("select.trust.speed") },
    { icon: Headphones, label: t("select.trust.support") },
    { icon: BadgeCheck, label: t("select.trust.expertise") },
  ];

  return (
    <div className="min-h-screen bg-cream pb-28">
      <header className="sticky top-0 z-30 bg-forest text-primary-foreground shadow-soft">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to="/" aria-label={t("nav.home")} className="rounded-lg p-2 hover:bg-white/10">
            <Menu className="size-5" />
          </Link>
          <span className="font-display text-lg font-bold tracking-wide">Gunited</span>
          <Link
            to="/account"
            aria-label={t("nav.dashboard")}
            className="rounded-lg p-2 hover:bg-white/10"
          >
            <Bell className="size-5" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4">
        <section className="py-6 text-center">
          <h1 className="font-display text-2xl font-bold text-forest-deep">{t("select.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("select.subtitle")}</p>
        </section>

        {query.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-forest" />
          </div>
        ) : (
          <section className="grid grid-cols-2 gap-3">
            {offers.map((offer, index) => {
              const Icon = iconFor(offer);
              return (
                <Link
                  key={offer.id}
                  to="/request/$slug"
                  params={{ slug: offer.slug }}
                  className="surface-card lift-hover relative flex flex-col gap-3 bg-white p-4 text-start"
                >
                  <span
                    className={cn(
                      "absolute top-3 grid size-6 place-items-center rounded-full text-xs font-bold",
                      rtl ? "start-3" : "start-3",
                      badgeClass(offer, index),
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="mt-6 grid size-12 place-items-center rounded-full bg-beige/70">
                    <Icon className="size-6 text-forest" />
                  </span>
                  <span className="text-sm font-bold leading-snug text-forest-deep">
                    {lang === "ar" ? offer.title_ar : offer.title_en}
                  </span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {lang === "ar" ? offer.description_ar : offer.description_en}
                  </span>
                  <Forward className="mt-auto size-4 self-end text-gold" />
                </Link>
              );
            })}

            <article className="surface-card col-span-2 space-y-3 bg-beige/40 p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-forest font-display text-lg font-bold text-primary-foreground">
                  G
                </span>
                <div>
                  <p className="text-sm font-bold text-forest-deep">{t("select.brand.title")}</p>
                  <p className="text-xs text-muted-foreground">{t("select.brand.subtitle")}</p>
                </div>
              </div>
              <ul className="grid gap-2 sm:grid-cols-3">
                {perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2 text-xs text-forest-deep">
                    <span className="grid size-4 place-items-center rounded-full bg-forest/10">
                      <Check className="size-3 text-forest" />
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>
            </article>
          </section>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 bg-forest text-primary-foreground">
        <ul className="mx-auto grid max-w-3xl grid-cols-4 gap-1 px-2 py-3 text-center">
          {trust.map(({ icon: Icon, label }) => (
            <li key={label} className="flex flex-col items-center gap-1">
              <Icon className="size-5 text-gold" />
              <span className="text-[10px] leading-tight">{label}</span>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
