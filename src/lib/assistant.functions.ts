import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertStaff } from "./admin.shared";

const turnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4000),
});

const askSchema = z.object({
  question: z.string().min(2).max(1200),
  history: z.array(turnSchema).max(12).default([]),
});

/**
 * Public storefront assistant. Unauthenticated on purpose: it can only ever see the
 * published catalog context, never financial rows, never another person's data.
 */
export const askClientAssistant = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => askSchema.parse(d))
  .handler(async ({ data }) => {
    const { buildClientContext, runAssistant } = await import("./assistant.server");
    const context = await buildClientContext();
    const reply = await runAssistant("client", context, data.history, data.question);
    return { reply, mode: "client" as const };
  });

/**
 * Staff ERP copilot. Requires an authenticated session AND a staff role before any
 * internal data is read; the internal context is built with the caller's own
 * RLS-scoped client.
 */
export const askAdminAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => askSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { buildAdminContext, runAssistant } = await import("./assistant.server");
    const snapshot = await buildAdminContext(context.supabase);
    const reply = await runAssistant("admin", snapshot, data.history, data.question);
    return { reply, mode: "admin" as const };
  });
