import { z } from "zod";

export const statusEnum = z.enum([
  "submitted",
  "payment_pending",
  "payment_confirmed",
  "processing",
  "completed",
  "cancelled",
  "rejected",
]);

export type OrderStatus = z.infer<typeof statusEnum>;

/** Throws unless the caller holds a staff role. RLS is the second line of defence. */
export async function assertStaff(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("FORBIDDEN");
}
