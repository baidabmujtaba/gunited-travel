import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
  component: OffersPage,
  errorComponent: ({ error, reset }) => (
    <StoreLayout>
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <button
          className="mt-4 rounded-md bg-forest px-4 py-2 text-sm text-cream"
          onClick={reset}
        >
          إعادة المحاولة / Try again
        </button>
      </div>
    </StoreLayout>
  ),
});

function OffersPage() {
  const [currency, setCurrency] = useState("USD");
  const { t } = useI18n();
  const fetchCatalog = useServerFn(getCatalog);

  // Fetched client-side (not in the route loader) so a transient network
  // failure shows an inline retry instead of a blank screen.
  const query = useQuery({
    queryKey: ["catalog", currency],
    queryFn: () => fetchCatalog({ data: { currency } }),
    retry: 2,
  });
  const refetch = query.refetch;

  useEffect(() => {
    const channel = supabase
      .channel("offers-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_offers" }, () => {
        void refetch();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refetch]);

  const data = query.data;

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-6xl px-5 py-12">
        <h1 className="text-3xl font-bold sm:text-4xl">{t("catalog.title")}</h1>
        <p className="mt-2 mb-8 text-sm text-muted-foreground">{t("catalog.subtitle")}</p>
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
        ) : (
          <CatalogGrid
            offers={data?.offers ?? []}
            currencies={data?.currencies ?? []}
            currency={currency}
            onCurrencyChange={setCurrency}
            loading={query.isPending}
          />
        )}
      </div>
    </StoreLayout>
  );
}
