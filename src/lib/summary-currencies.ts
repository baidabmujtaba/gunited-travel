export const SUMMARY_CURRENCIES = ["SDG", "USD", "SAR", "AED"] as const;

export function summaryTotals(
  totalUsd: number,
  currencies: { code: string; rate: number; decimals: number }[],
) {
  return SUMMARY_CURRENCIES.map((code) => {
    const currency = currencies.find((item) => item.code === code);
    const rate = code === "USD" ? 1 : currency?.rate;
    return {
      code,
      total: rate !== undefined && Number.isFinite(rate) && rate > 0
        ? Math.round((totalUsd * rate + Number.EPSILON) * 10 ** (currency?.decimals ?? 2)) /
          10 ** (currency?.decimals ?? 2)
        : null,
    };
  });
}