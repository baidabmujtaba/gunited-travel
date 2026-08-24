/** Client- and server-safe currency code helpers. */

export const DEFAULT_CURRENCY = "USD";

/**
 * Accepts messy input (lowercase, whitespace, "USD — US Dollar", null) and
 * returns a safe 3-6 letter currency code, falling back to USD.
 */
export function normalizeCurrency(input: unknown): string {
  if (typeof input !== "string") return DEFAULT_CURRENCY;
  const code = input.trim().split(/[^A-Za-z]/)[0]?.toUpperCase() ?? "";
  if (code.length < 3 || code.length > 6) return DEFAULT_CURRENCY;
  return code;
}
