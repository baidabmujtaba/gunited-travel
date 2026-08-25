import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./admin.shared";

const kindEnum = z.enum(["customer", "agency"]);

const AWAITING = ["submitted", "payment_pending"];
const CONFIRMED = ["payment_confirmed", "processing", "completed"];

function tableFor(kind: z.infer<typeof kindEnum>) {
  return kind === "customer" ? "customers" : "travel_agencies";
}

const optionalText = z.string().trim().max(160).optional().nullable();

const recordInput = z.object({
  kind: kindEnum,
  full_name: z.string().trim().max(160).optional().nullable(),
  agency_name: z.string().trim().max(160).optional().nullable(),
  license_number: optionalText,
  contact_name: optionalText,
  email: optionalText,
  phone: optionalText,
  whatsapp: optionalText,
  nationality: optionalText,
  city: optionalText,
  notes: z.string().trim().max(2000).optional().nullable(),
});

/** Orders belonging to a CRM record, matched on email (case-insensitive). */
async function ordersForEmails(supabase: any, emails: string[]) {
  if (emails.length === 0) return [];
  const { data } = await supabase
    .from("service_orders")
    .select(
      "id,tracking_id,status,customer_email,customer_name,currency_code,amount_display,amount_usd,created_at",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);
  const set = new Set(emails.map((e) => e.toLowerCase()));
  return (data ?? []).filter((o: any) => set.has(String(o.customer_email ?? "").toLowerCase()));
}

export const getCrmSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ kind: kindEnum }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const sb = context.supabase;

    const [{ data: rows }, { data: orders }] = await Promise.all([
      sb.from(tableFor(data.kind)).select("id,email"),
      sb.from("service_orders").select("status,amount_usd,customer_email").is("deleted_at", null),
    ]);

    const emails = new Set(
      (rows ?? [])
        .map((r: any) => String(r.email ?? "").toLowerCase())
        .filter((e: string) => e.length > 0),
    );
    const mine = (orders ?? []).filter((o: any) =>
      emails.has(String(o.customer_email ?? "").toLowerCase()),
    );

    return {
      records: (rows ?? []).length,
      totalOrders: mine.length,
      awaitingReview: mine.filter((o: any) => AWAITING.includes(o.status)).length,
      totalUsd: mine
        .filter((o: any) => CONFIRMED.includes(o.status))
        .reduce((s: number, o: any) => s + Number(o.amount_usd), 0),
    };
  });

export const listCrmRecords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ kind: kindEnum, search: z.string().max(80).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { data: rows, error } = await context.supabase
      .from(tableFor(data.kind))
      .select("*")
      .order("created_at", { ascending: false })
      .limit(400);
    if (error) throw new Error(error.message);

    let records = rows ?? [];
    const s = data.search?.trim().toLowerCase();
    if (s) {
      records = records.filter((r: any) =>
        [r.full_name, r.agency_name, r.contact_name, r.license_number, r.email, r.phone, r.whatsapp]
          .filter(Boolean)
          .some((v: string) => String(v).toLowerCase().includes(s)),
      );
    }

    const orders = await ordersForEmails(
      context.supabase,
      records.map((r: any) => String(r.email ?? "")).filter(Boolean),
    );

    return records.map((r: any) => {
      const mine = orders.filter(
        (o: any) =>
          String(o.customer_email ?? "").toLowerCase() === String(r.email ?? "").toLowerCase() &&
          r.email,
      );
      return {
        ...r,
        orderCount: mine.length,
        totalUsd: mine
          .filter((o: any) => CONFIRMED.includes(o.status))
          .reduce((s: number, o: any) => s + Number(o.amount_usd), 0),
      };
    });
  });

export const getCrmRecord = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ kind: kindEnum, id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { data: record, error } = await context.supabase
      .from(tableFor(data.kind))
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!record) return { record: null, orders: [] };

    const orders = record.email
      ? await ordersForEmails(context.supabase, [String(record.email)])
      : [];
    return { record, orders };
  });

export const createCrmRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => recordInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { kind, ...fields } = data;

    const payload: Record<string, unknown> = {
      email: fields.email || null,
      phone: fields.phone || null,
      whatsapp: fields.whatsapp || null,
      city: fields.city || null,
      notes: fields.notes || "",
      created_by: context.userId,
    };

    if (kind === "customer") {
      const name = (fields.full_name ?? "").trim();
      if (!name) throw new Error("NAME_REQUIRED");
      payload["full_name"] = name;
      payload["nationality"] = fields.nationality || null;
    } else {
      const name = (fields.agency_name ?? "").trim();
      if (!name) throw new Error("NAME_REQUIRED");
      payload["agency_name"] = name;
      payload["license_number"] = fields.license_number || null;
      payload["contact_name"] = fields.contact_name || null;
    }

    const { data: inserted, error } = await context.supabase
      .from(tableFor(kind))
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      action: `${kind}.create`,
      entity: tableFor(kind),
      entity_id: inserted.id,
      after_data: payload as any,
    });

    return { id: inserted.id as string };
  });
