import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Throws unless the caller holds a staff role. RLS is the second line of defence. */
async function assertStaff(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("FORBIDDEN");
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const sb = context.supabase;

    const [{ data: orders }, { data: offers }, { data: profiles }] = await Promise.all([
      sb
        .from("service_orders")
        .select("id,status,amount_usd,created_at")
        .is("deleted_at", null),
      sb.from("service_offers").select("id,status").is("deleted_at", null),
      sb.from("profiles").select("id,is_agency,created_at"),
    ]);

    const all = orders ?? [];
    const revenueUsd = all
      .filter((o: any) => ["payment_confirmed", "processing", "completed"].includes(o.status))
      .reduce((s: number, o: any) => s + Number(o.amount_usd), 0);
    const pipelineUsd = all
      .filter((o: any) => ["submitted", "payment_pending"].includes(o.status))
      .reduce((s: number, o: any) => s + Number(o.amount_usd), 0);

    const byStatus: Record<string, number> = {};
    for (const o of all) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;

    return {
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

    const offerIds = [...new Set(orders.map((o: any) => o.offer_id).filter(Boolean))];
    const offers = offerIds.length
      ? (
          await context.supabase
            .from("service_offers")
            .select("id,title_en,title_ar")
            .in("id", offerIds)
        ).data ?? []
      : [];
    const map = new Map(offers.map((o: any) => [o.id, o]));

    return orders.map((o: any) => ({
      ...o,
      offer_title_en: map.get(o.offer_id)?.title_en ?? null,
      offer_title_ar: map.get(o.offer_id)?.title_ar ?? null,
    }));
  });

const statusEnum = z.enum([
  "submitted",
  "payment_pending",
  "payment_confirmed",
  "processing",
  "completed",
  "cancelled",
  "rejected",
]);

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
      .select("id,status,tracking_id,customer_id,customer_email")
      .eq("id", data.orderId)
      .maybeSingle();
    if (curErr) throw new Error(curErr.message);
    if (!current) throw new Error("ORDER_NOT_FOUND");

    const { error } = await sb
      .from("service_orders")
      .update({ status: data.status })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);

    const { data: actor } = await sb
      .from("profiles")
      .select("full_name,email")
      .eq("id", context.userId)
      .maybeSingle();

    await sb.from("order_status_history").insert({
      order_id: data.orderId,
      previous_status: current.status,
      new_status: data.status,
      note: data.note ?? null,
      actor_id: context.userId,
      actor_name: actor?.full_name || actor?.email || "Staff",
    });

    if (current.customer_id) {
      await sb.from("notifications").insert({
        user_id: current.customer_id,
        audience: "user",
        title_en: "Order status updated",
        title_ar: "تم تحديث حالة طلبك",
        body_en: `Order ${current.tracking_id} is now: ${data.status.replace("_", " ")}.`,
        body_ar: `طلبك ${current.tracking_id} أصبح في حالة: ${data.status}.`,
        link: `/track?ref=${current.tracking_id}`,
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

    return { ok: true };
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
        sb
          .from("service_orders")
          .select("status,amount_usd,currency_code,created_at")
          .is("deleted_at", null),
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
