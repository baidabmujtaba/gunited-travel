/**
 * Agency-side catalog reads. The customer price is excluded from the SQL
 * projection itself so it can never reach the agency portal response.
 */
import { normalizeDocs, type RequiredDocument } from "./offer-docs";
import { computePrice, type PriceBreakdown } from "./pricing";

export type AgencyCatalogOffer = {
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
  allowed_payment_methods: string[];
  required_documents: RequiredDocument[];
  /** Agency price only — the customer price is never selected for this context. */
  price: PriceBreakdown;
  agency_price_missing: boolean;
};

/** Deliberately omits base_price_usd and customer_price_usd. */
export const AGENCY_OFFER_COLUMNS =
  "id,slug,title_en,title_ar,description_en,description_ar,category,duration_en,duration_ar," +
  "expiry_date,features,images,primary_image,tax_percent,fee_amount_usd,discount_percent," +
  "commission_percent,allowed_payment_methods,required_documents,agency_price_usd,status";

export type AgencyCurrency = {
  code: string;
  name_en: string;
  name_ar: string;
  symbol: string;
  decimals: number;
  rate: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

export async function loadCurrencies(sb: Sb): Promise<AgencyCurrency[]> {
  const [{ data: currencies }, { data: rates }] = await Promise.all([
    sb.from("currencies").select("code,name_en,name_ar,symbol,decimals").eq("is_active", true),
    sb.from("exchange_rates").select("currency_code,rate_per_usd"),
  ]);
  const rateMap = new Map(
    (rates ?? []).map((r: { currency_code: string; rate_per_usd: number }) => [
      r.currency_code,
      Number(r.rate_per_usd),
    ]),
  );
  return (currencies ?? []).map((c: Omit<AgencyCurrency, "rate">) => ({
    ...c,
    rate: Number(rateMap.get(c.code) ?? 1),
  }));
}

export async function requireAgencyId(sb: Sb, userId: string): Promise<string> {
  const { data } = await sb.from("profiles").select("agency_id").eq("id", userId).maybeSingle();
  if (!data?.agency_id) throw new Error("NO_AGENCY");
  return data.agency_id as string;
}

async function signImages(sb: Sb, paths: string[]): Promise<string[]> {
  const storagePaths = paths.filter((p) => p && !/^(https?:|\/|data:)/.test(p));
  if (storagePaths.length === 0) return paths;
  const { data } = await sb.storage.from("offer-images").createSignedUrls(storagePaths, 60 * 60);
  const map = new Map(
    (data ?? []).map((d: { path: string | null; signedUrl: string }) => [d.path, d.signedUrl]),
  );
  return paths.map((p) => (map.get(p) as string | undefined) ?? p);
}

export async function mapAgencyOffer(
  sb: Sb,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  r: any,
  cur: { code: string; rate: number; decimals: number },
): Promise<AgencyCatalogOffer> {
  const images: string[] = Array.isArray(r.images) ? (r.images as string[]) : [];
  const all = [...(r.primary_image ? [r.primary_image as string] : []), ...images];
  const signed = await signImages(sb, all);
  const primary = r.primary_image ? (signed[0] ?? null) : null;
  const gallery = r.primary_image ? signed.slice(1) : signed;

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
    images: gallery,
    primary_image: primary ?? gallery[0] ?? null,
    allowed_payment_methods: Array.isArray(r.allowed_payment_methods)
      ? (r.allowed_payment_methods as string[])
      : [],
    required_documents: normalizeDocs(r.required_documents),
    agency_price_missing: r.agency_price_usd === null || r.agency_price_usd === undefined,
    price: computePrice(
      {
        basePriceUsd: Number(r.agency_price_usd ?? 0),
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
