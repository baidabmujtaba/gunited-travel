import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeCurrency } from "./currency";
import {
  AGENCY_OFFER_COLUMNS,
  loadCurrencies,
  mapAgencyOffer,
  requireAgencyId,
  type AgencyCatalogOffer,
  type AgencyCurrency,
} from "./agency-catalog.server";

export type { AgencyCatalogOffer } from "./agency-catalog.server";

const currencyInput = z.object({
  currency: z.unknown().transform(normalizeCurrency).default("USD"),
});

/** Agency portal catalog: returns the agency price only. */
export const getAgencyCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => currencyInput.parse(d ?? {}))
  .handler(
    async ({
      context,
      data,
    }): Promise<{ offers: AgencyCatalogOffer[]; currencies: AgencyCurrency[] }> => {
      const sb = context.supabase;
      await requireAgencyId(sb, context.userId);
      const currencies = await loadCurrencies(sb);
      const selected =
        currencies.find((c) => c.code === data.currency) ??
        currencies.find((c) => c.code === "USD") ?? {
          code: "USD",
          decimals: 2,
          rate: 1,
          name_en: "US Dollar",
          name_ar: "دولار أمريكي",
          symbol: "$",
        };

      const { data: rows, error } = await sb
        .from("service_offers")
        .select(AGENCY_OFFER_COLUMNS)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);

      const today = new Date().toISOString().slice(0, 10);
      const offers = await Promise.all(
        (rows ?? [])

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((r: any) => !r.expiry_date || r.expiry_date >= today)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((r: any) => mapAgencyOffer(sb, r, selected)),
      );
      return { offers, currencies };
    },
  );

/** Single offer for the agency portal / agency checkout. Agency price only. */
export const getAgencyOffer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        slug: z.string().min(1),
        currency: z.unknown().transform(normalizeCurrency).default("USD"),
      })
      .parse(d),
  )
  .handler(
    async ({
      context,
      data,
    }): Promise<{ offer: AgencyCatalogOffer | null; currencies: AgencyCurrency[] }> => {
      const sb = context.supabase;
      await requireAgencyId(sb, context.userId);
      const currencies = await loadCurrencies(sb);
      const selected =
        currencies.find((c) => c.code === data.currency) ??
        currencies.find((c) => c.code === "USD") ?? {
          code: "USD",
          decimals: 2,
          rate: 1,
          name_en: "US Dollar",
          name_ar: "دولار أمريكي",
          symbol: "$",
        };

      const { data: row } = await sb
        .from("service_offers")
        .select(AGENCY_OFFER_COLUMNS)
        .eq("slug", data.slug)
        .eq("status", "active")
        .is("deleted_at", null)
        .maybeSingle();

      return {
        offer: row ? await mapAgencyOffer(sb, row, selected) : null,
        currencies,
      };
    },
  );
