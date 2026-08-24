import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeCurrency } from "./currency";
import { computePrice, type PriceBreakdown } from "./pricing";
import { getPublicClient } from "./public-client.server";

export type CurrencyInfo = {
  code: string;
  name_en: string;
  name_ar: string;
  symbol: string;
  decimals: number;
  rate: number;
};

export type CatalogOffer = {
  id: string;
  slug: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  category: string;
  duration_en: string | null;
  duration_ar: string | null;
  expiry_date: string | null;
  features: string[];
  images: string[];
  primary_image: string | null;
  price: PriceBreakdown;
};

const currencyInput = z.object({
  currency: z.unknown().transform(normalizeCurrency).default("USD"),
});

async function loadCurrencies() {
  const sb = getPublicClient();
  const [{ data: currencies }, { data: rates }] = await Promise.all([
    sb.from("currencies").select("code,name_en,name_ar,symbol,decimals").eq("is_active", true),
    sb.from("exchange_rates").select("currency_code,rate_per_usd"),
  ]);
  const rateMap = new Map((rates ?? []).map((r) => [r.currency_code, Number(r.rate_per_usd)]));
  const list: CurrencyInfo[] = (currencies ?? []).map((c) => ({
    ...c,
    rate: rateMap.get(c.code) ?? 1,
  }));
  return list;
}

export const getCurrencies = createServerFn({ method: "GET" }).handler(async () => loadCurrencies());

export const getCatalog = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => currencyInput.parse(d ?? {}))
  .handler(async ({ data }): Promise<{ offers: CatalogOffer[]; currencies: CurrencyInfo[] }> => {
    const sb = getPublicClient();
    const currencies = await loadCurrencies();
    const selected = currencies.find((c) => c.code === data.currency) ?? {
      code: "USD",
      decimals: 2,
      rate: 1,
      name_en: "US Dollar",
      name_ar: "دولار أمريكي",
      symbol: "$",
    };

    const { data: rows, error } = await sb
      .from("service_offers")
      .select("*")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const today = new Date().toISOString().slice(0, 10);
    const offers = (rows ?? [])
      .filter((r) => !r.expiry_date || r.expiry_date >= today)
      .map((r) => mapOffer(r, selected));

    return { offers, currencies };
  });

export const getOffer = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        slug: z.string().min(1),
        currency: z.unknown().transform(normalizeCurrency).default("USD"),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ offer: CatalogOffer | null; currencies: CurrencyInfo[] }> => {
    const sb = getPublicClient();
    const currencies = await loadCurrencies();
    const selected =
      currencies.find((c) => c.code === data.currency) ??
      currencies.find((c) => c.code === "USD")!;
    const { data: row } = await sb
      .from("service_offers")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "active")
      .is("deleted_at", null)
      .maybeSingle();
    return { offer: row ? mapOffer(row, selected) : null, currencies };
  });

export const getPaymentMethods = createServerFn({ method: "GET" }).handler(async () => {
  const sb = getPublicClient();
  const { data } = await sb
    .from("payment_method_configs")
    .select(
      "id,name_en,name_ar,account_holder,account_number,iban,branch,qr_image_url,instructions_en,instructions_ar",
    )
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
});

type OfferRow = {
  id: string;
  slug: string | null;
  title_en: string;
  title_ar: string;
  description_en: string | null;
  description_ar: string | null;
  category: string;
  base_price_usd: number;
  duration_en: string | null;
  duration_ar: string | null;
  expiry_date: string | null;
  features: unknown;
  images: unknown;
  primary_image: string | null;
  tax_percent: number;
  fee_amount_usd: number;
  discount_percent: number;
  commission_percent: number;
};

function mapOffer(
  r: OfferRow,
  cur: { code: string; rate: number; decimals: number },
): CatalogOffer {
  return {
    id: r.id,
    slug: r.slug ?? r.id,
    title_en: r.title_en,
    title_ar: r.title_ar,
    description_en: r.description_en ?? "",
    description_ar: r.description_ar ?? "",
    category: r.category,
    duration_en: r.duration_en,
    duration_ar: r.duration_ar,
    expiry_date: r.expiry_date,
    features: Array.isArray(r.features) ? (r.features as string[]) : [],
    images: Array.isArray(r.images) ? (r.images as string[]) : [],
    primary_image: r.primary_image,
    price: computePrice(
      {
        basePriceUsd: Number(r.base_price_usd),
        taxPercent: r.tax_percent,
        feeAmountUsd: r.fee_amount_usd,
        discountPercent: r.discount_percent,
        commissionPercent: r.commission_percent,
      },
      cur.code,
      cur.rate,
      cur.decimals,
    ),
  };
}
