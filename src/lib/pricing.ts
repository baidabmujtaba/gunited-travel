/**
 * Single source of truth for price math. Imported by server functions only —
 * components receive already-computed values from the server.
 */

export type PricingInput = {
  basePriceUsd: number;
  taxPercent?: number | null;
  feeAmountUsd?: number | null;
  discountPercent?: number | null;
  commissionPercent?: number | null;
  /** extra customer-level discount, e.g. agency tier */
  agencyDiscountPercent?: number | null;
};

export type PriceBreakdown = {
  baseUsd: number;
  discountUsd: number;
  taxUsd: number;
  feesUsd: number;
  totalUsd: number;
  commissionUsd: number;
  /** converted values in the requested currency */
  currency: string;
  rate: number;
  base: number;
  discount: number;
  tax: number;
  fees: number;
  total: number;
};

const round = (n: number, decimals = 2) => {
  const f = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * f) / f;
};

export function computePrice(
  input: PricingInput,
  currency: string,
  rate: number,
  decimals = 2,
): PriceBreakdown {
  const baseUsd = Math.max(0, Number(input.basePriceUsd) || 0);
  const discountPct =
    (Number(input.discountPercent) || 0) + (Number(input.agencyDiscountPercent) || 0);
  const discountUsd = round((baseUsd * Math.min(discountPct, 100)) / 100);
  const netUsd = baseUsd - discountUsd;
  const taxUsd = round((netUsd * (Number(input.taxPercent) || 0)) / 100);
  const feesUsd = round(Number(input.feeAmountUsd) || 0);
  const totalUsd = round(netUsd + taxUsd + feesUsd);
  const commissionUsd = round((totalUsd * (Number(input.commissionPercent) || 0)) / 100);
  const conv = (n: number) => round(n * rate, decimals);

  return {
    baseUsd,
    discountUsd,
    taxUsd,
    feesUsd,
    totalUsd,
    commissionUsd,
    currency,
    rate,
    base: conv(baseUsd),
    discount: conv(discountUsd),
    tax: conv(taxUsd),
    fees: conv(feesUsd),
    total: conv(totalUsd),
  };
}
