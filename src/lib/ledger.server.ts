/**
 * The only writer of agency ledger rows. Append-only: corrections are new
 * reversal/adjustment entries, never updates or deletes.
 */

export type LedgerEntry = {
  agency_id: string;
  entry_type: "opening" | "charge" | "payment" | "adjustment" | "reversal" | "settlement";
  debit?: number;
  credit?: number;
  currency_code?: string;
  exchange_rate?: number;
  description?: string | null;
  reference?: string | null;
  payment_method?: string | null;
  order_id?: string | null;
  invoice_id?: string | null;
  payment_id?: string | null;
  reverses_entry_id?: string | null;
};

const money = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;

/** Inserts a ledger row after validating the amounts are non-negative. */
export async function postEntry(supabase: any, userId: string, entry: LedgerEntry) {
  const debit = money(entry.debit);
  const credit = money(entry.credit);
  if (debit < 0 || credit < 0) throw new Error("NEGATIVE_AMOUNT");
  if (debit === 0 && credit === 0) throw new Error("ZERO_AMOUNT");

  const { data, error } = await supabase
    .from("agency_ledger")
    .insert({
      agency_id: entry.agency_id,
      entry_type: entry.entry_type,
      debit,
      credit,
      currency_code: entry.currency_code ?? "USD",
      exchange_rate: entry.exchange_rate ?? 1,
      description: entry.description ?? null,
      reference: entry.reference ?? null,
      payment_method: entry.payment_method ?? null,
      order_id: entry.order_id ?? null,
      invoice_id: entry.invoice_id ?? null,
      payment_id: entry.payment_id ?? null,
      reverses_entry_id: entry.reverses_entry_id ?? null,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

/** Balance straight from the ledger — never a stored column. */
export async function agencyBalance(supabase: any, agencyId: string, currency = "USD") {
  const { data, error } = await supabase
    .from("agency_ledger")
    .select("debit,credit")
    .eq("agency_id", agencyId)
    .eq("currency_code", currency);
  if (error) throw new Error(error.message);
  const totalDue = (data ?? []).reduce((s: number, r: any) => s + Number(r.debit), 0);
  const totalPaid = (data ?? []).reduce((s: number, r: any) => s + Number(r.credit), 0);
  return {
    currency,
    totalDue: money(totalDue),
    totalPaid: money(totalPaid),
    outstanding: money(totalDue - totalPaid),
  };
}

export type FinancialState =
  | "settled"
  | "outstanding"
  | "over_limit"
  | "warning"
  | "financial_hold";

export function financialState(
  outstanding: number,
  creditLimit: number,
  warningPercent: number,
  financialHold: boolean,
): FinancialState {
  if (financialHold) return "financial_hold";
  if (outstanding <= 0) return "settled";
  if (creditLimit > 0 && outstanding > creditLimit) return "over_limit";
  if (creditLimit > 0 && outstanding >= (creditLimit * warningPercent) / 100) return "warning";
  return "outstanding";
}

/** Creates the receivable when an order is approved. Idempotent per order. */
export async function chargeOrder(
  supabase: any,
  userId: string,
  order: {
    id: string;
    agency_id: string | null;
    amount_usd: number;
    currency_code: string;
    frozen_rate: number;
    tracking_id: string | null;
  },
) {
  if (!order.agency_id) return null;
  const { data: existing } = await supabase
    .from("agency_ledger")
    .select("id")
    .eq("order_id", order.id)
    .eq("entry_type", "charge")
    .maybeSingle();
  if (existing) return existing.id as string;

  return postEntry(supabase, userId, {
    agency_id: order.agency_id,
    entry_type: "charge",
    debit: Number(order.amount_usd),
    currency_code: "USD",
    exchange_rate: Number(order.frozen_rate) || 1,
    description: `Order ${order.tracking_id ?? order.id} approved`,
    reference: order.tracking_id,
    order_id: order.id,
  });
}

/** Notifies staff + agency users when an agency crosses its warning/credit limit. */
export async function notifyBalanceState(
  supabase: any,
  agency: { id: string; agency_name: string; credit_limit_usd: number; warning_percent: number },
  outstanding: number,
) {
  const limit = Number(agency.credit_limit_usd) || 0;
  if (limit <= 0) return;
  const pct = (outstanding / limit) * 100;
  if (pct < Number(agency.warning_percent ?? 80)) return;

  const critical = pct >= 100;
  const titleEn = critical ? "Credit limit exceeded" : "Credit limit warning";
  const titleAr = critical ? "تجاوز حد الائتمان" : "تنبيه حد الائتمان";
  const bodyEn = `${agency.agency_name}: outstanding ${outstanding.toFixed(2)} USD of a ${limit.toFixed(2)} USD limit.`;
  const bodyAr = `${agency.agency_name}: المستحق ${outstanding.toFixed(2)} دولار من حد ${limit.toFixed(2)} دولار.`;

  const { data: members } = await supabase
    .from("profiles")
    .select("id")
    .eq("agency_id", agency.id);

  await supabase.from("notifications").insert([
    {
      audience: "staff",
      title_en: titleEn,
      title_ar: titleAr,
      body_en: bodyEn,
      body_ar: bodyAr,
      link: "/admin/balances",
    },
    ...(members ?? []).map((m: { id: string }) => ({
      user_id: m.id,
      audience: "user",
      title_en: titleEn,
      title_ar: titleAr,
      body_en: bodyEn,
      body_ar: bodyAr,
      link: "/agency/balance",
    })),
  ]);
}
