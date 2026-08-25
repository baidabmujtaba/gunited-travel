import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./admin.shared";

export const ASSIGNABLE_ROLES = [
  "super_admin",
  "admin",
  "booking_agent",
  "accountant",
  "client",
  "travel_agency",
] as const;

const roleEnum = z.enum(ASSIGNABLE_ROLES);

async function assertSuperAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "super_admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("FORBIDDEN");
}

export const listPlatformUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ search: z.string().max(80).optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const sb = context.supabase;

    const [{ data: profiles, error }, { data: roles, error: rolesError }, { data: isSuper }] =
      await Promise.all([
        sb
          .from("profiles")
          .select("id,email,full_name,phone,whatsapp,is_agency,is_active,created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        sb.from("user_roles").select("user_id,role"),
        sb.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
      ]);
    if (error) throw new Error(error.message);
    if (rolesError) throw new Error(rolesError.message);

    const roleMap = new Map<string, string[]>();
    for (const row of roles ?? []) {
      const list = roleMap.get(row.user_id) ?? [];
      list.push(row.role);
      roleMap.set(row.user_id, list);
    }

    const s = data.search?.trim().toLowerCase();
    const users = (profiles ?? [])
      .map((p: any) => ({ ...p, roles: roleMap.get(p.id) ?? [] }))
      .filter((p: any) =>
        !s
          ? true
          : [p.email, p.full_name, p.phone, p.whatsapp, ...(p.roles as string[])]
              .filter(Boolean)
              .some((v: string) => String(v).toLowerCase().includes(s)),
      );

    return { users, canManage: Boolean(isSuper), currentUserId: context.userId };
  });

/** Only a super admin may change roles. Writes go through the service role because
 *  user_roles is intentionally read-only for every client-facing policy. */
export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), role: roleEnum }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    if (data.userId === context.userId) throw new Error("SELF_ROLE_CHANGE");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: before } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);

    const { error: delError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);
    if (delError) throw new Error(delError.message);

    const { error: insError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role } as any);
    if (insError) throw new Error(insError.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "user_role.update",
      entity: "user_roles",
      entity_id: data.userId,
      before_data: { roles: (before ?? []).map((r: any) => r.role) } as any,
      after_data: { roles: [data.role] } as any,
    } as any);

    return { ok: true };
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), isActive: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    if (data.userId === context.userId) throw new Error("SELF_ROLE_CHANGE");
    const { error } = await context.supabase
      .from("profiles")
      .update({ is_active: data.isActive })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      action: data.isActive ? "user.activate" : "user.deactivate",
      entity: "profiles",
      entity_id: data.userId,
    });
    return { ok: true };
  });
