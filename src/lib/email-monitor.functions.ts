import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./admin.shared";

/** Monitoring view of the automatic notification system (read-only). */
export const getEmailAutomationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const sb = context.supabase;

    const { data: logs, error } = await sb
      .from("email_logs")
      .select(
        "id,order_id,recipient,notification_type,previous_status,new_status,status,sent_at,error,retry_count,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const rows = logs ?? [];
    const counts = { sent: 0, pending: 0, failed: 0, not_sent: 0 } as Record<string, number>;
    for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;

    const { data: queue } = await sb
      .from("email_queue")
      .select("id,status,retry_count,next_attempt_at,last_error,recipient")
      .order("created_at", { ascending: false })
      .limit(50);

    const pendingQueue = (queue ?? []).filter((q: any) => q.status === "pending").length;

    return {
      enabled: true,
      counts,
      pendingQueue,
      logs: rows,
    };
  });

/** Automatic notification history for one order. */
export const getOrderNotificationHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { data: rows, error } = await context.supabase
      .from("email_logs")
      .select(
        "id,recipient,notification_type,previous_status,new_status,status,sent_at,error,retry_count,created_at",
      )
      .eq("order_id", data.orderId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
