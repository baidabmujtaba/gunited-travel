/** Client-safe mapping of Amadeus error codes onto translation keys. */
export const AMADEUS_CODES = [
  "AMADEUS_NOT_CONFIGURED",
  "AMADEUS_AUTH_FAILED",
  "AMADEUS_AUTH_EXPIRED",
  "AMADEUS_RATE_LIMIT",
  "AMADEUS_NO_RESULTS",
  "AMADEUS_BAD_REQUEST",
  "AMADEUS_NOT_FOUND",
  "AMADEUS_ERROR",
] as const;

export function amadeusMessage(
  error: unknown,
  t: (key: string) => string,
): { message: string; detail: string; code: string | null } {
  const raw = String((error as Error)?.message ?? error ?? "");
  const code = AMADEUS_CODES.find((c) => raw.includes(c)) ?? null;
  if (!code) return { message: raw || t("common.error"), detail: "", code: null };
  const detail = raw.slice(raw.indexOf(code) + code.length).replace(/^[:\s]+/, "");
  return { message: t(`amadeus.${code}`), detail, code };
}
