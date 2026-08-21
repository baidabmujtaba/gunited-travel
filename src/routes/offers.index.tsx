import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CatalogGrid } from "@/components/store/CatalogGrid";
import { StoreLayout } from "@/components/store/StoreLayout";
import { getCatalog } from "@/lib/catalog.functions";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/offers/")({
  head: () => ({
    meta: [
      { title: "Offers & Services — Gunited Travel | العروض والخدمات" },
      {
        name: "description",
        content:
          "Browse all active Gunited Travel offers: visa services, flight deals, tourism packages and travel insurance, priced live in your currency.",
      },
      { property: "og:title", content: "Offers & Services — Gunited Travel" },
      {
        property: "og:description",
        content: "Visa services, flight deals, packages and insurance priced live in your currency.",
      },
    ],
  }),
  loader: () => getCatalog({ data: { currency: "USD" } }),
  component: OffersPage,
});

function OffersPage() {
  const initial = Route.useLoaderData();
  const [currency, setCurrency] = useState("USD");
  const { t } = useI18n();

  const query = useQuery({
    queryKey: ["catalog", currency],
    queryFn: () => getCatalog({ data: { currency } }),
    initialData: currency === "USD" ? initial : undefined,
  });

  useEffect(() => {
    const channel = supabase
      .channel("offers-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_offers" }, () =>
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
      <div className="mx-auto w-full max-w-6xl px-5 py-12">
        <h1 className="text-3xl font-bold sm:text-4xl">{t("catalog.title")}</h1>
        <p className="mt-2 mb-8 text-sm text-muted-foreground">{t("catalog.subtitle")}</p>
        <CatalogGrid
          offers={data.offers}
          currencies={data.currencies}
          currency={currency}
          onCurrencyChange={setCurrency}
          loading={query.isFetching && !query.data}
        />
      </div>
    </StoreLayout>
  );
}
