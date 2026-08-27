import { createFileRoute } from "@tanstack/react-router";

/**
 * Background worker endpoint for the automatic notification email queue.
 * Called by the scheduled database job every minute with a bearer token that
 * is stored server-side. Bounded batch, single-flight claim per row, and
 * retries with exponential backoff live in processEmailQueue().
 */
export const Route = createFileRoute("/api/public/email-dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

        const { data: row } = await supabaseAdmin
          .from("settings")
          .select("value")
          .eq("key", "email_dispatch")
          .maybeSingle();
        const config = (row?.value ?? {}) as { token?: string; enabled?: boolean };

        if (!config.token || !token || token !== config.token) {
          return new Response("Unauthorized", { status: 401 });
        }
        if (config.enabled === false) {
          return Response.json({ ok: true, paused: true });
        }

        try {
          const { processEmailQueue } = await import("@/lib/notifications.server");
          const result = await processEmailQueue(20);
          return Response.json({ ok: true, ...result });
        } catch (err) {
          console.error("email_dispatch_failed", err);
          return Response.json({ ok: false, error: "DISPATCH_FAILED" }, { status: 500 });
        }
      },
    },
  },
});
