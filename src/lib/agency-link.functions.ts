import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./admin.shared";

const AGENCY_ROLES = ["travel_agency", "booking_agent"] as const;

/**
 * Called right after sign-in. If an agency record already exists for this user
 * (linked by user_id, or matching the account e-mail) the account is attached to
 * it: profiles.agency_id + travel_agencies.user_id + the travel_agency role.
 * Users already linked to an agency are never re-linked to another one.
 */
export const autoLinkMyAgency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const email = String((context.claims as any)?.email ?? "").toLowerCase();

    const { data: profile } = await sb
      .from("profiles")
      .select("agency_id,email")
      .eq("id", context.userId)
      .maybeSingle();

    if (profile?.agency_id) return { linked: true, agencyId: profile.agency_id, changed: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Match on an explicit user link first, then on e-mail for admin-provisioned agencies.
    const mail = email || String(profile?.email ?? "").toLowerCase();
    const { data: byUser } = await supabaseAdmin
      .from("travel_agencies")
      .select("id,user_id,email,deleted_at")
      .eq("user_id", context.userId)
      .is("deleted_at", null)
      .maybeSingle();

    let agency = byUser ?? null;
    if (!agency && mail) {
      const { data: byMail } = await supabaseAdmin
        .from("travel_agencies")
        .select("id,user_id,email,deleted_at")
        .ilike("email", mail)
        .is("deleted_at", null)
        .is("user_id", null)
        .maybeSingle();
      agency = byMail ?? null;
    }
    if (!agency) return { linked: false, agencyId: null, changed: false };

    await supabaseAdmin.from("profiles").update({ agency_id: agency.id, is_agency: true }).eq("id", context.userId);
    if (!agency.user_id) {
      await supabaseAdmin.from("travel_agencies").update({ user_id: context.userId }).eq("id", agency.id);
    }
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "travel_agency" }, { onConflict: "user_id,role" });

    return { linked: true, agencyId: agency.id, changed: true };
  });

/** Staff view: every agency with its linked account, plus accounts eligible for linking. */
export const listAgencyLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const sb = context.supabase;

    const [{ data: agencies }, { data: profiles }, { data: roles }] = await Promise.all([
      sb
        .from("travel_agencies")
        .select("id,agency_name,email,phone,city,user_id,is_active")
        .is("deleted_at", null)
        .order("agency_name"),
      sb.from("profiles").select("id,email,full_name,agency_id,is_active").order("created_at", { ascending: false }).limit(500),
      sb.from("user_roles").select("user_id,role"),
    ]);

    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]);

    const users = (profiles ?? []).map((p: any) => ({
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      agencyId: p.agency_id as string | null,
      isActive: p.is_active,
      roles: roleMap.get(p.id) ?? [],
    }));

    const byUser = new Map(users.map((u) => [u.id, u]));

    return {
      agencies: (agencies ?? []).map((a: any) => ({
        id: a.id,
        name: a.agency_name,
        email: a.email,
        phone: a.phone,
        city: a.city,
        isActive: a.is_active,
        linkedUser: a.user_id ? (byUser.get(a.user_id) ?? { id: a.user_id, email: null, fullName: null, roles: [] }) : null,
      })),
      users,
    };
  });

/** Links one account to one agency. Rejects accounts already linked elsewhere. */
export const linkUserToAgency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        agencyId: z.string().uuid(),
        role: z.enum(AGENCY_ROLES).default("travel_agency"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const sb = context.supabase;

    const { data: isAdmin } = await sb.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("FORBIDDEN");

    const { data: profile } = await sb
      .from("profiles")
      .select("id,agency_id")
      .eq("id", data.userId)
      .maybeSingle();
    if (!profile) throw new Error("USER_NOT_FOUND");
    if (profile.agency_id && profile.agency_id !== data.agencyId) throw new Error("USER_ALREADY_LINKED");

    const { data: agency } = await sb
      .from("travel_agencies")
      .select("id,user_id")
      .eq("id", data.agencyId)
      .maybeSingle();
    if (!agency) throw new Error("AGENCY_NOT_FOUND");
    if (agency.user_id && agency.user_id !== data.userId) throw new Error("AGENCY_ALREADY_LINKED");

    // Staff accounts must not double as agency logins.
    const { data: staffRoles } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId)
      .in("role", ["super_admin", "admin", "accountant"]);
    if ((staffRoles ?? []).length > 0) throw new Error("STAFF_CANNOT_BE_AGENCY");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ agency_id: data.agencyId, is_agency: true }).eq("id", data.userId);
    await supabaseAdmin.from("travel_agencies").update({ user_id: data.userId }).eq("id", data.agencyId);
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });

    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId,
      audience: "user",
      title_en: "Agency access granted",
      title_ar: "تم ربط حسابك بوكالة",
      body_en: "Your account is now linked to an agency profile.",
      body_ar: "تم ربط حسابك بملف وكالة، يمكنك الآن استخدام بوابة الوكالة.",
      link: "/agency",
    });

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "agency.link",
      entity: "travel_agencies",
      entity_id: data.agencyId,
      after_data: { user_id: data.userId, role: data.role },
    });

    return { ok: true };
  });

/** Detaches an account from its agency (agency data itself is untouched). */
export const unlinkUserFromAgency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("FORBIDDEN");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ agency_id: null, is_agency: false }).eq("id", data.userId);
    await supabaseAdmin.from("travel_agencies").update({ user_id: null }).eq("user_id", data.userId);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "agency.unlink",
      entity: "profiles",
      entity_id: data.userId,
    });

    return { ok: true };
  });
