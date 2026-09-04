import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff, statusEnum } from "./admin.shared";
import { agencyBalance, chargeOrder, notifyBalanceState } from "./ledger.server";

/** Details of what the customer actually requested, shown in the admin queue. */
export type OrderRequestDetails = {
  travellers: { adults: number; children: number; infants: number; total: number } | null;
  rooms: { name_ar: string; name_en: string; qty: number; occupancy?: number | null }[];
  extras: { name_ar: string; name_en: string }[];
  travel_date: string | null;
  return_date: string | null;
  nationality: string | null;
  destination: string | null;
  coupon: string | null;
  customer_notes: string | null;
};

/** Reads the JSON snapshot the booking flow appends to internal notes. */
function parseSnapshot(notes: string | null): Record<string, any> | null {
  if (!notes) return null;
  const i = notes.indexOf("SNAPSHOT ");
  if (i < 0) return null;
  try {
    return JSON.parse(notes.slice(i + "SNAPSHOT ".length).trim());
  } catch {
    return null;
  }
}

function toRequestDetails(notes: string | null): OrderRequestDetails | null {
  const snap = parseSnapshot(notes);
  if (!snap) return null;
  const pax = snap["passengers"] ?? null;
  const adults = Number(pax?.adults ?? 0);
  const children = Number(pax?.children ?? 0);
  const infants = Number(pax?.infants ?? 0);
  const total = adults + children + infants;
  return {
    travellers: total > 0 ? { adults, children, infants, total } : null,
    rooms: Array.isArray(snap["rooms"])
      ? snap["rooms"]
          .filter((r: any) => Number(r?.qty ?? 0) > 0)
          .map((r: any) => ({
            name_ar: String(r.name_ar ?? ""),
            name_en: String(r.name_en ?? ""),
            qty: Number(r.qty ?? 0),
            occupancy: r.occupancy ?? null,
          }))
      : [],
    extras: Array.isArray(snap["extras"])
      ? snap["extras"].map((e: any) => ({
          name_ar: String(e.name_ar ?? ""),
          name_en: String(e.name_en ?? ""),
        }))
      : [],
    travel_date: snap["travelDate"] ?? null,
    return_date: snap["returnDate"] ?? null,
    nationality: snap["nationality"] ?? null,
    destination: snap["destination"] ?? null,
    coupon: snap["coupon"] ?? null,
    customer_notes: snap["notes"] ?? null,
  };
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const sb = context.supabase;

    const [{ data: orders }, { data: offers }, { data: profiles }] = await Promise.all([
      sb.from("service_orders").select("id,status,amount_usd,created_at,deleted_at"),
      sb.from("service_offers").select("id,status").is("deleted_at", null),
      sb.from("profiles").select("id,is_agency,created_at"),
    ]);

    // Archived orders drop out of the queue but stay in revenue.
    const every = orders ?? [];
    const all = every.filter((o: any) => !o.deleted_at);
    const revenueUsd = every
      .filter((o: any) => ["payment_confirmed", "processing", "completed"].includes(o.status))
      .reduce((s: number, o: any) => s + Number(o.amount_usd), 0);
    const pipelineUsd = all
      .filter((o: any) => ["submitted", "payment_pending"].includes(o.status))
      .reduce((s: number, o: any) => s + Number(o.amount_usd), 0);

    const byStatus: Record<string, number> = {};
    for (const o of all) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;

    // Last 6 months of confirmed revenue, for the dashboard trend chart.
    const monthlyMap: Record<string, number> = {};
    for (const o of every) {
      if (!["payment_confirmed", "processing", "completed"].includes(o.status)) continue;
      const key = String(o.created_at).slice(0, 7);
      monthlyMap[key] = (monthlyMap[key] ?? 0) + Number(o.amount_usd);
    }
    const monthlyRevenue = Object.entries(monthlyMap)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-6) as Array<[string, number]>;

    return {
      monthlyRevenue,
      totalOrders: all.length,
      awaitingReview: all.filter((o: any) => ["submitted", "payment_pending"].includes(o.status))
        .length,
      revenueUsd,
      pipelineUsd,
      byStatus,
      activeOffers: (offers ?? []).filter((o: any) => o.status === "active").length,
      totalOffers: (offers ?? []).length,
      customers: (profiles ?? []).filter((p: any) => !p.is_agency).length,
      partners: (profiles ?? []).filter((p: any) => p.is_agency).length,
    };
  });

export const listAdminOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ status: z.string().optional(), search: z.string().max(80).optional() })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    let q = context.supabase
      .from("service_orders")
      .select(
        "id,tracking_id,status,document_status,customer_name,customer_email,whatsapp,currency_code,amount_display,amount_usd,transaction_reference,receipt_path,internal_notes,created_at,offer_id",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);

    if (data.status && data.status !== "all") {
      q = q.eq("status", statusEnum.parse(data.status));
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    let orders = rows ?? [];
    const s = data.search?.trim().toLowerCase();
    if (s) {
      orders = orders.filter((o: any) =>
        [o.tracking_id, o.customer_name, o.customer_email, o.whatsapp, o.transaction_reference]
          .filter(Boolean)
          .some((v: string) => v.toLowerCase().includes(s)),
      );
    }

    // Offer titles plus the whole mother → child → grandchild chain, so staff
    // see exactly which package level the customer requested.
    const map = new Map<string, any>();
    let lookup = [...new Set(orders.map((o: any) => o.offer_id).filter(Boolean))] as string[];
    for (let depth = 0; depth < 6 && lookup.length > 0; depth++) {
      const { data: offerRows } = await context.supabase
        .from("service_offers")
        .select("id,title_en,title_ar,parent_offer_id,category")
        .in("id", lookup);
      for (const row of offerRows ?? []) map.set((row as any).id, row);
      lookup = [
        ...new Set(
          (offerRows ?? [])
            .map((r: any) => r.parent_offer_id)
            .filter((id: string | null) => id && !map.has(id)),
        ),
      ] as string[];
    }

    const pathFor = (offerId: string | null) => {
      const chain: any[] = [];
      let cursor = offerId ? map.get(offerId) : null;
      while (cursor && chain.length < 6) {
        chain.unshift(cursor);
        cursor = cursor.parent_offer_id ? map.get(cursor.parent_offer_id) : null;
      }
      return chain;
    };

    return orders.map((o: any) => {
      const chain = pathFor(o.offer_id);
      const leaf = chain.length > 0 ? chain[chain.length - 1] : null;
      return {
        ...o,
        offer_title_en: leaf?.title_en ?? null,
        offer_title_ar: leaf?.title_ar ?? null,
        offer_path_en: chain.map((c) => c.title_en).filter(Boolean),
        offer_path_ar: chain.map((c) => c.title_ar).filter(Boolean),
        offer_category: leaf?.category ?? null,
        request_details: toRequestDetails(o.internal_notes ?? null),
      };
    });
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        status: statusEnum,
        note: z.string().max(400).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const sb = context.supabase;

    const { data: current, error: curErr } = await sb
      .from("service_orders")
      .select(
        "id,status,tracking_id,customer_id,customer_email,agency_id,amount_usd,currency_code,frozen_rate",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (curErr) throw new Error(curErr.message);
    if (!current) throw new Error("ORDER_NOT_FOUND");

    // No real transition -> no history event, no notification, no email.
    if (current.status === data.status) {
      return { ok: true, unchanged: true, invoice: null };
    }

    const { error } = await sb
      .from("service_orders")
      .update({ status: data.status })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);


    // Approving an order creates the agency receivable (idempotent per order).
    if (
      current.agency_id &&
      ["payment_confirmed", "processing", "completed"].includes(data.status)
    ) {
      await chargeOrder(sb, context.userId, {
        id: current.id,
        agency_id: current.agency_id,
        amount_usd: Number(current.amount_usd),
        currency_code: current.currency_code,
        frozen_rate: Number(current.frozen_rate),
        tracking_id: current.tracking_id,
      });
      const { data: agency } = await sb
        .from("travel_agencies")
        .select("id,agency_name,credit_limit_usd,warning_percent")
        .eq("id", current.agency_id)
        .maybeSingle();
      if (agency) {
        const bal = await agencyBalance(sb, current.agency_id);
        await notifyBalanceState(sb, agency as any, bal.outstanding);
      }
    }


    const { data: actor } = await sb
      .from("profiles")
      .select("full_name,email")
      .eq("id", context.userId)
      .maybeSingle();

    // The history row id IS the status_change_event_id used for idempotency.
    const { data: event } = await sb
      .from("order_status_history")
      .insert({
        order_id: data.orderId,
        previous_status: current.status,
        new_status: data.status,
        note: data.note ?? null,
        actor_id: context.userId,
        actor_name: actor?.full_name || actor?.email || "Staff",
      })
      .select("id")
      .maybeSingle();

    if (event?.id) {
      const { queueStatusChangeEmails } = await import("./notifications.server");
      await queueStatusChangeEmails(sb, {
        eventId: event.id,
        orderId: data.orderId,
        previousStatus: current.status,
        newStatus: data.status,
        note: data.note ?? null,
      });
    }


    await sb.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: actor?.email ?? null,
      action: "order.status.update",
      entity: "service_orders",
      entity_id: data.orderId,
      before_data: { status: current.status },
      after_data: { status: data.status, note: data.note ?? null },
    });

    // Completing an order automatically issues + emails the archived invoice.
    let invoice: { invoiceNumber: string; emailSent: boolean; emailError?: string | undefined } | null = null;
    if (data.status === "completed" && current.status !== "completed") {
      try {
        const { issueInvoiceForOrder } = await import("./invoices.server");
        const result = await issueInvoiceForOrder(sb, context.userId, data.orderId);
        if (result) {
          invoice = {
            invoiceNumber: result.invoiceNumber,
            emailSent: result.emailSent,
            emailError: result.emailError,
          };
        }
      } catch (err) {
        console.error("invoice_generation_failed", err);
      }
    }

    return { ok: true, invoice };
  });

export const saveOrderNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ orderId: z.string().uuid(), notes: z.string().max(2000) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("service_orders")
      .update({ internal_notes: data.notes })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getReceiptUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string().min(3).max(400) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { data: signed, error } = await context.supabase.storage
      .from("receipts")
      .createSignedUrl(data.path, 300);
    if (error) throw new Error(error.message);
    return { url: signed?.signedUrl ?? null };
  });

/** Directory of people: clients (isAgency=false) or partner agencies (isAgency=true). */
export const listDirectory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ agency: z.boolean(), search: z.string().max(80).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { data: rows, error } = await context.supabase
      .from("profiles")
      .select(
        "id,full_name,email,phone,whatsapp,nationality,is_agency,discount_tier,is_active,preferred_language,created_at",
      )
      .eq("is_agency", data.agency)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);

    let people = rows ?? [];
    const s = data.search?.trim().toLowerCase();
    if (s) {
      people = people.filter((p: any) =>
        [p.full_name, p.email, p.phone, p.whatsapp]
          .filter(Boolean)
          .some((v: string) => v.toLowerCase().includes(s)),
      );
    }

    const ids = people.map((p: any) => p.id);
    const orders = ids.length
      ? (
          await context.supabase
            .from("service_orders")
            .select("customer_id,amount_usd,status")
            .in("customer_id", ids)
            .is("deleted_at", null)
        ).data ?? []
      : [];

    return people.map((p: any) => {
      const mine = orders.filter((o: any) => o.customer_id === p.id);
      return {
        ...p,
        orderCount: mine.length,
        spendUsd: mine
          .filter((o: any) => ["payment_confirmed", "processing", "completed"].includes(o.status))
          .reduce((s2: number, o: any) => s2 + Number(o.amount_usd), 0),
      };
    });
  });

export const getFinanceBoard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const sb = context.supabase;

    const [{ data: invoices }, { data: orders }, { data: rates }, { data: methods }] =
      await Promise.all([
        sb
          .from("invoices")
          .select(
            "id,invoice_number,customer_name,customer_email,currency_code,total_usd,total_display,paid_usd,status,created_at",
          )
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(100),
        // Archived orders stay in the financial figures on purpose.
        sb.from("service_orders").select("status,amount_usd,currency_code,created_at"),
        sb.from("exchange_rates").select("currency_code,rate_per_usd,updated_at"),
        sb.from("payment_method_configs").select("id,name_en,name_ar,is_active,sort_order"),
      ]);

    const all = orders ?? [];
    const collectedUsd = all
      .filter((o: any) => ["payment_confirmed", "processing", "completed"].includes(o.status))
      .reduce((s: number, o: any) => s + Number(o.amount_usd), 0);
    const outstandingUsd = all
      .filter((o: any) => ["submitted", "payment_pending"].includes(o.status))
      .reduce((s: number, o: any) => s + Number(o.amount_usd), 0);

    const byCurrency: Record<string, number> = {};
    for (const o of all) {
      byCurrency[o.currency_code] = (byCurrency[o.currency_code] ?? 0) + Number(o.amount_usd);
    }

    const monthly: Record<string, number> = {};
    for (const o of all) {
      const key = String(o.created_at).slice(0, 7);
      monthly[key] = (monthly[key] ?? 0) + Number(o.amount_usd);
    }

    return {
      invoices: invoices ?? [],
      collectedUsd,
      outstandingUsd,
      byCurrency,
      monthly: Object.entries(monthly)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .slice(-6),
      rates: rates ?? [],
      methods: (methods ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    };
  });

/**
 * Archive a finished order (completed/cancelled/rejected). The row is soft-deleted so it
 * disappears from the operational queue, while invoices and revenue figures stay intact.
 */
export const archiveOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ orderId: z.string().uuid(), reason: z.string().max(400).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const sb = context.supabase;

    const { data: order, error } = await sb
      .from("service_orders")
      .select("id,tracking_id,status,amount_usd,currency_code,customer_email,deleted_at")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("ORDER_NOT_FOUND");
    if (order.deleted_at) return { ok: true };
    if (!["completed", "cancelled", "rejected"].includes(order.status)) {
      throw new Error("ORDER_NOT_FINISHED");
    }

    const { error: upErr } = await sb
      .from("service_orders")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", order.id);
    if (upErr) throw new Error(upErr.message);

    const { data: profile } = await sb
      .from("profiles")
      .select("email,full_name")
      .eq("id", context.userId)
      .maybeSingle();

    await sb.from("order_status_history").insert({
      order_id: order.id,
      previous_status: order.status,
      new_status: order.status,
      note: `Order archived${data.reason ? `: ${data.reason}` : ""} — financial records retained`,
      actor_id: context.userId,
      actor_name: profile?.full_name ?? profile?.email ?? null,
    });

    await sb.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: profile?.email ?? null,
      action: "order.archive",
      entity: "service_orders",
      entity_id: order.id,
      before_data: { status: order.status, deleted_at: null },
      after_data: {
        tracking_id: order.tracking_id,
        amount_usd: order.amount_usd,
        reason: data.reason ?? null,
      },
    });

    return { ok: true };
  });
