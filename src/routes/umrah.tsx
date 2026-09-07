import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Loader2, MapPin, Minus, Plus, Users } from "lucide-react";
import { useState } from "react";

import { CurrencySelector } from "@/components/store/CurrencySelector";
import { PackageCard, PackageCardSkeleton } from "@/components/store/PackageCard";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDestinations } from "@/lib/catalog.functions";
import { useI18n } from "@/lib/i18n";
import { listUmrahPackages } from "@/lib/packages.functions";

/** Trip details chosen on this screen; the booking flow reads them back. */
export const UMRAH_REQUEST_KEY = "gt-umrah-request";

export const Route = createFileRoute("/umrah")({
  head: () => ({
    meta: [
      { title: "Umrah Request — Gunited Travel | طلب العمرة" },
      {
        name: "description",
        content:
          "Request an Umrah package with Gunited Travel: choose your destination, travellers and travel date, then complete a tracked booking with a real invoice.",
      },
      { property: "og:title", content: "Umrah Request — Gunited Travel" },
      {
        property: "og:description",
        content: "Choose your Umrah package, destination, travellers and travel date in one screen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UmrahPage,
  errorComponent: ({ error }) => (
    <StoreLayout>
      <p className="mx-auto max-w-lg px-5 py-20 text-center text-sm text-destructive">
        {error.message}
      </p>
    </StoreLayout>
  ),
  notFoundComponent: () => (
    <StoreLayout>
      <p className="px-5 py-20 text-center text-sm">404</p>
    </StoreLayout>
  ),
});

function UmrahPage() {
  const { lang, dir } = useI18n();
  const ar = lang === "ar";
  const rtl = dir === "rtl";
  const Forward = rtl ? ArrowLeft : ArrowRight;
  const navigate = useNavigate();

  const fetchUmrah = useServerFn(listUmrahPackages);
  const [currency, setCurrency] = useState("USD");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [destination, setDestination] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["umrah-packages", currency],
    queryFn: () => fetchUmrah({ data: { currency } }),
  });
  const destinations = useQuery({ queryKey: ["destinations"], queryFn: () => getDestinations() });

  const categories = query.data?.categories ?? [];
  const offers = (query.data?.offers ?? []).filter(
    (o) => !categoryId || o.category_id === categoryId,
  );
  const selectedOffer = offers.find((o) => o.slug === selected) ?? null;

  function proceed() {
    if (!selectedOffer) return;
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        UMRAH_REQUEST_KEY,
        JSON.stringify({ destination, travelDate, adults, children, infants }),
      );
    }
    void navigate({ to: "/book/$slug", params: { slug: selectedOffer.slug } });
  }

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-6xl px-5 pb-20">
        <header className="flex flex-wrap items-end justify-between gap-4 pt-6">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {ar ? "طلب العمرة" : "Umrah request"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {ar
                ? "اختر باقة العمرة وحدد الوجهة وعدد المسافرين وتاريخ الرحلة، ثم أكمل الحجز ليُسجّل في لوحة الطلبات."
                : "Pick an Umrah package, set your destination, travellers and travel date, then complete a tracked booking."}
            </p>
          </div>
          <CurrencySelector value={currency} onChange={setCurrency} />
        </header>

        {/* Trip details */}
        <section className="surface-card mt-6 grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {ar ? "الوجهة" : "Destination"}
            </Label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              aria-label={ar ? "الوجهة" : "Destination"}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{ar ? "اختر الوجهة" : "Select a destination"}</option>
              {(destinations.data ?? []).map((d) => (
                <option key={d.code} value={d.code}>
                  {ar ? d.name_ar : d.name_en}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{ar ? "تاريخ الرحلة" : "Travel date"}</Label>
            <Input
              type="date"
              value={travelDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setTravelDate(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="flex items-center gap-1.5">
              <Users className="size-3.5" />
              {ar ? "المسافرون" : "Travellers"}
            </Label>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stepper label={ar ? "بالغ" : "Adults"} value={adults} min={1} onChange={setAdults} />
              <Stepper label={ar ? "طفل" : "Children"} value={children} onChange={setChildren} />
              <Stepper label={ar ? "رضيع" : "Infants"} value={infants} onChange={setInfants} />
            </div>
          </div>
        </section>

        {/* Category filter */}
        {categories.length > 1 ? (
          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={categoryId === null ? "default" : "outline"}
              onClick={() => setCategoryId(null)}
            >
              {ar ? "الكل" : "All"}
            </Button>
            {categories.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={categoryId === c.id ? "default" : "outline"}
                onClick={() => setCategoryId(c.id)}
              >
                {ar ? c.name_ar : c.name_en}
              </Button>
            ))}
          </div>
        ) : null}

        {/* Packages */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {query.isPending
            ? [0, 1, 2].map((i) => <PackageCardSkeleton key={i} />)
            : offers.map((o) => (
                <div
                  key={o.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(o.slug)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelected(o.slug);
                  }}
                  className={`rounded-2xl transition ${
                    selected === o.slug ? "ring-2 ring-forest" : "ring-0"
                  }`}
                >
                  <PackageCard offer={o} />
                </div>
              ))}
        </div>

        {!query.isPending && offers.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            {ar ? "لا توجد باقات عمرة منشورة حاليًا." : "No Umrah packages are published yet."}{" "}
            <Link to="/offers" className="underline">
              {ar ? "تصفح كل العروض" : "Browse all offers"}
            </Link>
          </p>
        ) : null}

        {/* Continue */}
        <div className="surface-card sticky bottom-4 mt-8 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm">
            {selectedOffer
              ? `${ar ? "المحدد" : "Selected"}: ${ar ? selectedOffer.title_ar : selectedOffer.title_en}`
              : ar
                ? "اختر باقة للمتابعة"
                : "Select a package to continue"}
          </p>
          <Button disabled={!selectedOffer || !destination} onClick={proceed}>
            {ar ? "متابعة الطلب" : "Continue request"}
            <Forward className="size-4" />
          </Button>
        </div>
      </div>
    </StoreLayout>
  );
}

function Stepper({
  label,
  value,
  min = 0,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`${label} -`}
          className="grid size-7 place-items-center rounded-full border border-border disabled:opacity-40"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus className="size-3.5" />
        </button>
        <span className="w-5 text-center text-sm font-bold">{value}</span>
        <button
          type="button"
          aria-label={`${label} +`}
          className="grid size-7 place-items-center rounded-full border border-border"
          onClick={() => onChange(Math.min(20, value + 1))}
        >
          <Plus className="size-3.5" />
        </button>
      </span>
    </div>
  );
}

/** Loader guard so the spinner import is used in SSR-friendly fallbacks. */
export function UmrahFallback() {
  return <Loader2 className="size-5 animate-spin" />;
}
