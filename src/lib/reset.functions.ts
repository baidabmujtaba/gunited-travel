import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Phrase the admin must type before the destructive reset runs. */
export const RESET_CONFIRM_PHRASE = "RESET";

const resetSchema = z.object({
  confirm: z.string().max(40),
  /** Also delete uploaded receipts, invoice PDFs and order documents from storage. */
  purgeFiles: z.boolean().default(true),
});

/** Counts of rows that would be removed, so the admin sees the impact first. */
export const getResetPreview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isSuper) throw new Error("FORBIDDEN");

    const sb = context.supabase;
    const count = async (table: string) => {
      const { count: c } = await sb.from(table as any).select("id", { count: "exact", head: true });
      return c ?? 0;
    };

    const [orders, invoices, payments, ledger, documents] = await Promise.all([
      count("service_orders"),
      count("invoices"),
      count("payments"),
      count("agency_ledger"),
      count("order_documents"),
    ]);

    return { canReset: true, orders, invoices, payments, ledger, documents };
  });

/**
 * Wipes all operational data: orders, order history/documents, invoices, payments,
 * the agency ledger, email queue/logs and notifications. Offers, customers,
 * agencies, users and settings are kept so the system stays usable.
 * Super admin only.
 */
export const resetOperationalData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => resetSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isSuper) throw new Error("FORBIDDEN");
    if (data.confirm.trim().toUpperCase() !== RESET_CONFIRM_PHRASE) {
      throw new Error("CONFIRM_MISMATCH");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Child rows first, then parents, so foreign keys never block the wipe.
    const order = [
      "email_queue",
      "email_logs",
      "agency_ledger",
      "payments",
      "invoices",
      "order_documents",
      "order_status_history",
      "service_orders",
      "notifications",
    ] as const;

    const deleted: Record<string, boolean> = {};
    for (const table of order) {
      const { error } = await supabaseAdmin
        .from(table as any)
        .delete()
        .not("id", "is", null);
      if (error) throw new Error(`${table}: ${error.message}`);
      deleted[table] = true;
    }

    let files = 0;
    if (data.purgeFiles) {
      for (const bucket of ["receipts", "invoices", "order-documents"]) {
        files += await emptyBucket(supabaseAdmin, bucket);
      }
    }

    const { data: actor } = await context.supabase
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: actor?.email ?? null,
      action: "system.reset",
      entity: "system",
      entity_id: "operational_data",
      after_data: { tables: Object.keys(deleted), files } as any,
    });

    return { ok: true, tables: Object.keys(deleted), files };
  });

/** Recursively removes every object in a storage bucket. Returns files removed. */
async function emptyBucket(admin: any, bucket: string, prefix = ""): Promise<number> {
  const { data: entries, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !entries) return 0;

  let removed = 0;
  const paths: string[] = [];
  for (const entry of entries) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id) paths.push(path);
    else removed += await emptyBucket(admin, bucket, path);
  }
  if (paths.length) {
    await admin.storage.from(bucket).remove(paths);
    removed += paths.length;
  }
  return removed;
}
