import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CurrencySelector } from "@/components/store/CurrencySelector";
import { OfferCard, OfferCardSkeleton } from "@/components/store/OfferCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CatalogOffer, CurrencyInfo } from "@/lib/catalog.functions";
import { useI18n } from "@/lib/i18n";

export function CatalogGrid({
  offers,
  currencies,
  currency,
  onCurrencyChange,
  loading = false,
}: {
  offers: CatalogOffer[];
  currencies: CurrencyInfo[];
  currency: string;
  onCurrencyChange: (c: string) => void;
  loading?: boolean;
}) {
  const { lang, t } = useI18n();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(offers.map((o) => o.category)))],
    [offers],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return offers.filter((o) => {
      if (category !== "all" && o.category !== category) return false;
      if (!q) return true;
      const haystack = [o.title_ar, o.title_en, o.description_ar, o.description_en]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [offers, query, category, lang]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("catalog.search")}
            className="bg-card ps-9"
          />
        </div>
        <CurrencySelector currencies={currencies} value={currency} onChange={onCurrencyChange} />
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <Button
            key={c}
            size="sm"
            variant={category === c ? "default" : "outline"}
            onClick={() => setCategory(c)}
          >
            {c === "all" ? t("catalog.all") : t(`category.${c}`)}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <OfferCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface-card grid place-items-center gap-2 p-14 text-center">
          <p className="font-semibold">{t("catalog.empty")}</p>
          <p className="text-sm text-muted-foreground">{t("catalog.subtitle")}</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o) => (
            <OfferCard key={o.id} offer={o} />
          ))}
        </div>
      )}
    </div>
  );
}
