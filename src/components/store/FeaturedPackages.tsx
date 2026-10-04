import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PackageCard, PackageCardSkeleton } from "@/components/store/PackageCard";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { getFeaturedPackages } from "@/lib/packages.functions";

/** Homepage selection of active administrator-featured offers. */
export function FeaturedPackages({ currency = "USD" }: { currency?: string }) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["featured-packages", currency],
    queryFn: () => getFeaturedPackages({ data: { currency, limit: 12 } }),
  });

  const offers = query.data?.offers ?? [];
  const usedCategoryIds = new Set(offers.map((o) => o.category_id).filter(Boolean));
  const categories = (query.data?.categories ?? []).filter((c) => usedCategoryIds.has(c.id));
  const visible = categoryId ? offers.filter((o) => o.category_id === categoryId) : offers;

  if (!query.isPending && offers.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">{ar ? "عروض مختارة لك" : "Offers selected for you"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {ar
              ? "أحدث الخدمات والباقات التي أضافها فريق جيونايتد ترافيل."
              : "The latest services and packages published by the Gunited Travel team."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/offers">{ar ? "كل العروض" : "All offers"}</Link>
        </Button>
      </div>

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

      {query.isPending ? (
        <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <PackageCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {/* Horizontal scroll on mobile, grid from sm up. */}
          <div className="mt-7 -mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 sm:hidden">
            {visible.map((o) => (
              <div key={o.id} className="w-[82%] shrink-0 snap-start">
                <PackageCard offer={o} />
              </div>
            ))}
          </div>
          <div className="mt-7 hidden gap-6 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((o) => (
              <PackageCard key={o.id} offer={o} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
