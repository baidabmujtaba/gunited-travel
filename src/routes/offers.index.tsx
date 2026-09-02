import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CurrencySelector } from "@/components/store/CurrencySelector";
import { PackageCard, PackageCardSkeleton } from "@/components/store/PackageCard";
import { SecurityClearanceCard } from "@/components/store/SecurityClearanceCard";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { listPackages } from "@/lib/packages.functions";

export const Route = createFileRoute("/offers/")({
  head: () => ({
    meta: [
      { title: "Packages & Offers — Gunited Travel | الباقات والعروض" },
      {
        name: "description",
        content:
          "Browse Gunited Travel Umrah packages, visas, flights and tourism offers. Filter by category, price, duration and hotel rating with live prices in your currency.",
      },
      { property: "og:title", content: "Packages & Offers — Gunited Travel" },
      {
        property: "og:description",
        content: "Umrah packages, visas, flights and tourism offers with live prices and filters.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OffersPage,
  errorComponent: ({ error, reset }) => (
    <StoreLayout>
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <button className="mt-4 rounded-md bg-forest px-4 py-2 text-sm text-cream" onClick={reset}>
          إعادة المحاولة / Try again
        </button>
      </div>
    </StoreLayout>
  ),
});

type Sort = "featured" | "popular" | "price_asc" | "price_desc" | "newest";

function OffersPage() {
  const { lang, t } = useI18n();
  const ar = lang === "ar";
  const fetchPackages = useServerFn(listPackages);

  const [currency, setCurrency] = useState("USD");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("featured");
  const [maxPrice, setMaxPrice] = useState("");
  const [minDays, setMinDays] = useState("");
  const [minStars, setMinStars] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(id);
  }, [search]);

  const params = useMemo(
    () => ({
      currency,
      categoryId,
      search: debounced || undefined,
      maxPriceUsd: maxPrice ? Number(maxPrice) : null,
      minDays: minDays ? Number(minDays) : null,
      minStars,
      sort,
    }),
    [currency, categoryId, debounced, maxPrice, minDays, minStars, sort],
  );

  const query = useQuery({
    queryKey: ["packages", params],
    queryFn: () => fetchPackages({ data: params }),
    retry: 2,
  });
  const refetch = query.refetch;

  useEffect(() => {
    const channel = supabase
      .channel("offers-listing")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_offers" }, () => {
        void refetch();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refetch]);

  const offers = query.data?.offers ?? [];
  const categories = query.data?.categories ?? [];

  const sorts: { value: Sort; ar: string; en: string }[] = [
    { value: "featured", ar: "المميزة", en: "Featured" },
    { value: "popular", ar: "الأكثر طلبًا", en: "Popular" },
    { value: "price_asc", ar: "الأقل سعرًا", en: "Price ↑" },
    { value: "price_desc", ar: "الأعلى سعرًا", en: "Price ↓" },
    { value: "newest", ar: "الأحدث", en: "Newest" },
  ];

  return (
    <StoreLayout>
      <SecurityClearanceCard />
      <div className="mx-auto w-full max-w-6xl px-5 pb-14">
        <h1 className="text-3xl font-bold sm:text-4xl">
          {ar ? "الباقات والعروض" : "Packages & offers"}
        </h1>
        <p className="mt-2 mb-8 text-sm text-muted-foreground">{t("catalog.subtitle")}</p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={ar ? "ابحث عن باقة أو خدمة" : "Search packages and services"}
              className="bg-card ps-9"
            />
          </div>
          <CurrencySelector
            currencies={query.data?.currencies ?? []}
            value={currency}
            onChange={setCurrency}
          />
          <Button variant="outline" onClick={() => setShowFilters((v) => !v)} className="gap-2">
            <SlidersHorizontal className="size-4" />
            {ar ? "تصفية" : "Filters"}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
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

        {showFilters ? (
          <div className="surface-card mt-4 grid gap-4 p-5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{ar ? "أقصى سعر (دولار)" : "Max price (USD)"}</Label>
              <Input
                type="number"
                min={0}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="2000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{ar ? "أقل عدد أيام" : "Min days"}</Label>
              <Input
                type="number"
                min={0}
                value={minDays}
                onChange={(e) => setMinDays(e.target.value)}
                placeholder="7"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{ar ? "تصنيف الفندق" : "Hotel rating"}</Label>
              <div className="flex gap-2">
                {[3, 4, 5].map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={minStars === s ? "default" : "outline"}
                    onClick={() => setMinStars(minStars === s ? null : s)}
                  >
                    {s}+
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{ar ? "ترتيب:" : "Sort:"}</span>
          {sorts.map((s) => (
            <Button
              key={s.value}
              size="sm"
              variant={sort === s.value ? "secondary" : "ghost"}
              onClick={() => setSort(s.value)}
            >
              {ar ? s.ar : s.en}
            </Button>
          ))}
          <span className="ms-auto text-xs text-muted-foreground">
            {offers.length} {ar ? "نتيجة" : "results"}
          </span>
        </div>

        <div className="mt-6">
          {query.isError ? (
            <div className="surface-card p-8 text-center text-sm text-muted-foreground">
              <p>
                تعذر تحميل العروض. تحقق من الاتصال وحاول مرة أخرى. / Could not load offers. Check your
                connection and try again.
              </p>
              <button
                className="mt-4 rounded-md bg-forest px-4 py-2 text-sm text-cream"
                onClick={() => void query.refetch()}
              >
                إعادة المحاولة / Try again
              </button>
            </div>
          ) : query.isPending ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <PackageCardSkeleton key={i} />
              ))}
            </div>
          ) : offers.length === 0 ? (
            <div className="surface-card grid place-items-center gap-2 p-14 text-center">
              <p className="font-semibold">{ar ? "لا توجد نتائج مطابقة" : "No matching offers"}</p>
              <p className="text-sm text-muted-foreground">
                {ar ? "جرّب تعديل عوامل التصفية." : "Try adjusting your filters."}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map((o) => (
                <PackageCard key={o.id} offer={o} />
              ))}
            </div>
          )}
        </div>
      </div>
    </StoreLayout>
  );
}
