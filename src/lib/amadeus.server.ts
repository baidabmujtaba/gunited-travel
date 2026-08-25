/**
 * Amadeus Self-Service API client (server-only).
 * OAuth2 client_credentials with an in-worker token cache, plus explicit
 * mapping of Amadeus failures onto stable error codes the UI can translate.
 */

export type AmadeusEnv = "test" | "production";

const HOSTS: Record<AmadeusEnv, string> = {
  test: "https://test.api.amadeus.com",
  production: "https://api.amadeus.com",
};

export class AmadeusError extends Error {
  code: string;
  status: number;
  detail: string;
  constructor(code: string, status = 0, detail = "") {
    super(detail ? `${code}: ${detail}` : code);
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

type Credentials = { clientId: string; clientSecret: string; environment: AmadeusEnv };

/** Credentials live in the admin-only integration_credentials table. */
export async function loadAmadeusCredentials(): Promise<Credentials> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("integration_credentials")
    .select("client_id,client_secret,environment")
    .eq("key", "amadeus")
    .maybeSingle();
  if (error) throw new AmadeusError("AMADEUS_ERROR", 500, error.message);
  const clientId = (data?.client_id ?? "").trim();
  const clientSecret = (data?.client_secret ?? "").trim();
  if (!clientId || !clientSecret) throw new AmadeusError("AMADEUS_NOT_CONFIGURED");
  const environment: AmadeusEnv = data?.environment === "production" ? "production" : "test";
  return { clientId, clientSecret, environment };
}

type CachedToken = { token: string; expiresAt: number };
const tokenCache = new Map<string, CachedToken>();

async function getAccessToken(creds: Credentials): Promise<string> {
  const cacheKey = `${creds.environment}:${creds.clientId}`;
  const cached = tokenCache.get(cacheKey);
  // Refresh 60s early so an in-flight call never races expiry.
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;

  const res = await fetch(`${HOSTS[creds.environment]}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
    title?: string;
  };

  if (!res.ok || !body.access_token) {
    tokenCache.delete(cacheKey);
    if (res.status === 429) throw new AmadeusError("AMADEUS_RATE_LIMIT", 429);
    throw new AmadeusError(
      "AMADEUS_AUTH_FAILED",
      res.status,
      body.error_description ?? body.title ?? "",
    );
  }

  tokenCache.set(cacheKey, {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 1799) * 1000,
  });
  return body.access_token;
}

function firstDetail(payload: unknown): string {
  const errors = (payload as { errors?: Array<{ detail?: string; title?: string }> })?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    return errors[0]?.detail ?? errors[0]?.title ?? "";
  }
  return "";
}

/**
 * One authenticated Amadeus call. On 401 the cached token is dropped and the
 * request is retried once, which covers server-side revocation/expiry.
 */
export async function amadeusRequest<T>(
  path: string,
  init: { method?: string; query?: Record<string, string | number | undefined>; body?: unknown } = {},
): Promise<T> {
  const creds = await loadAmadeusCredentials();
  const host = HOSTS[creds.environment];

  const url = new URL(`${host}${path}`);
  for (const [key, value] of Object.entries(init.query ?? {})) {
    if (value !== undefined && value !== "" && value !== null) url.searchParams.set(key, String(value));
  }

  const send = async (token: string) =>
    fetch(url.toString(), {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    });

  let res = await send(await getAccessToken(creds));
  if (res.status === 401) {
    tokenCache.delete(`${creds.environment}:${creds.clientId}`);
    res = await send(await getAccessToken(creds));
  }

  if (res.status === 204) return undefined as T;

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new AmadeusError("AMADEUS_AUTH_EXPIRED", res.status, firstDetail(payload));
    }
    if (res.status === 429) throw new AmadeusError("AMADEUS_RATE_LIMIT", 429, firstDetail(payload));
    if (res.status === 400) throw new AmadeusError("AMADEUS_BAD_REQUEST", 400, firstDetail(payload));
    if (res.status === 404) throw new AmadeusError("AMADEUS_NOT_FOUND", 404, firstDetail(payload));
    throw new AmadeusError("AMADEUS_ERROR", res.status, firstDetail(payload));
  }

  return payload as T;
}
