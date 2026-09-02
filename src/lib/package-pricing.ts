/**
 * Package booking price engine. Pure math, shared by the server (authoritative)
 * and the UI (optimistic preview). Everything is anchored in USD; the display
 * currency only multiplies by the frozen exchange rate.
 */

export type QuoteRoomSelection = { priceUsd: number; qty: number };
export type QuoteExtraSelection = { priceUsd: number; qty: number };

export type QuoteCoupon = {
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
} | null;

export type PackageQuoteInput = {
  /** per-person price used when the offer has no room types */
  basePriceUsd: number;
  adults: number;
  children: number;
  infants: number;
  rooms: QuoteRoomSelection[];
  extras: QuoteExtraSelection[];
  taxPercent?: number | null;
  feeAmountUsd?: number | null;
  discountPercent?: number | null;
  coupon?: QuoteCoupon;
};

export type PackageQuote = {
  payingPax: number;
  totalPax: number;
  roomsUsd: number;
  baseUsd: number;
  extrasUsd: number;
  subtotalUsd: number;
  discountUsd: number;
  couponUsd: number;
  couponCode: string | null;
  taxUsd: number;
  feesUsd: number;
  totalUsd: number;
  perPersonUsd: number;
  /** display currency */
  currency: string;
  rate: number;
  base: number;
  rooms: number;
  extras: number;
  discount: number;
  coupon: number;
  tax: number;
  fees: number;
  total: number;
  perPerson: number;
};

const round = (n: number, decimals = 2) => {
  const f = 10 ** decimals;
  return Math.round(((Number.isFinite(n) ? n : 0) + Number.EPSILON) * f) / f;
};

export function computePackageQuote(
  input: PackageQuoteInput,
  currency = "USD",
  rate = 1,
  decimals = 2,
): PackageQuote {
  const adults = Math.max(0, Math.trunc(input.adults || 0));
  const children = Math.max(0, Math.trunc(input.children || 0));
  const infants = Math.max(0, Math.trunc(input.infants || 0));
  const payingPax = Math.max(1, adults + children);
  const totalPax = adults + children + infants;

  const roomsUsd = round(
    input.rooms.reduce((s, r) => s + Math.max(0, r.priceUsd) * Math.max(0, r.qty), 0),
  );
  const perPersonBase = round(Math.max(0, input.basePriceUsd) * payingPax);
  const baseUsd = roomsUsd > 0 ? roomsUsd : perPersonBase;
  const extrasUsd = round(
    input.extras.reduce((s, e) => s + Math.max(0, e.priceUsd) * Math.max(0, e.qty), 0),
  );

  const subtotalUsd = round(baseUsd + extrasUsd);
  const discountPct = Math.min(100, Math.max(0, Number(input.discountPercent) || 0));
  const discountUsd = round((subtotalUsd * discountPct) / 100);

  let couponUsd = 0;
  const coupon = input.coupon ?? null;
  if (coupon) {
    const remaining = Math.max(0, subtotalUsd - discountUsd);
    couponUsd =
      coupon.discount_type === "percent"
        ? round((remaining * Math.min(100, Math.max(0, coupon.discount_value))) / 100)
        : round(Math.min(remaining, Math.max(0, coupon.discount_value)));
  }

  const netUsd = Math.max(0, round(subtotalUsd - discountUsd - couponUsd));
  const taxUsd = round((netUsd * Math.max(0, Number(input.taxPercent) || 0)) / 100);
  const feesUsd = round(Math.max(0, Number(input.feeAmountUsd) || 0));
  const totalUsd = round(netUsd + taxUsd + feesUsd);
  const perPersonUsd = round(totalUsd / payingPax);

  const conv = (n: number) => round(n * rate, decimals);

  return {
    payingPax,
    totalPax,
    roomsUsd,
    baseUsd,
    extrasUsd,
    subtotalUsd,
    discountUsd,
    couponUsd,
    couponCode: coupon?.code ?? null,
    taxUsd,
    feesUsd,
    totalUsd,
    perPersonUsd,
    currency,
    rate,
    base: conv(baseUsd),
    rooms: conv(roomsUsd),
    extras: conv(extrasUsd),
    discount: conv(discountUsd),
    coupon: conv(couponUsd),
    tax: conv(taxUsd),
    fees: conv(feesUsd),
    total: conv(totalUsd),
    perPerson: conv(perPersonUsd),
  };
}
