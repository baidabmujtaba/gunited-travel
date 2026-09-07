/**
 * Treasury bridge for customer (non-agency) bookings.
 * A booking creates a pending payment row plus an unpaid invoice at its frozen
 * price; staff verification flips both to confirmed/paid. Server-only.
 */

const money = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;

export type CustomerTransfer = {
  orderId: string;
  agencyId?: string | null;
  customerId?: string | null;
  amount: number;
  currencyCode: string;
  frozenRate: number;
  amountUsd: number;
  paymentMethod: string;
  payerName?: string | null;
  transactionReference?: string | null;
  receiptPath?: string | null;
  description?: string | null;
};

/** Idempotent per order: one pending customer transfer row. */
export async function recordCustomerTransfer(
  sbAdmin: any,
  actorId: string | null,
  t: CustomerTransfer,
): Promise<string | null> {
  const { data: existing } = await sbAdmin
    .from("payments")
    .select("id")
    .eq("order_id", t.orderId)
    .eq("payment_type", "customer")
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data, error } = await sbAdmin
    .from("payments")
    .insert({
      agency_id: t.agencyId ?? null,
      customer_id: t.customerId ?? null,
      order_id: t.orderId,
      amount: money(t.amount),
      currency_code: t.currencyCode,
      frozen_rate: Number(t.frozenRate) || 1,
      amount_usd: money(t.amountUsd),
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: t.paymentMethod,
      payment_type: "customer",
      payer_name: t.payerName ?? null,
      transaction_reference: t.transactionReference ?? null,
      receipt_path: t.receiptPath ?? null,
      description: t.description ?? null,
      status: "pending",
      recorded_by: actorId,
    })
    .select("id")
    .single();
  if (error) {
    console.error("customer_transfer_insert_failed", error.message);
    return null;
  }
  return data.id as string;
}

/** Staff verified the transfer: confirm the payment row and settle the invoice. */
export async function confirmOrderTreasury(sbAdmin: any, orderId: string) {
  await sbAdmin
    .from("payments")
    .update({ status: "recorded" })
    .eq("order_id", orderId)
    .eq("payment_type", "customer")
    .eq("status", "pending");

  const { data: invoice } = await sbAdmin
    .from("invoices")
    .select("id,total_usd")
    .eq("order_id", orderId)
    .maybeSingle();
  if (!invoice) return;
  await sbAdmin
    .from("invoices")
    .update({ status: "paid", paid_usd: invoice.total_usd })
    .eq("id", invoice.id);
}
