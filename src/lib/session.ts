import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StaffRole =
  | "super_admin"
  | "admin"
  | "booking_agent"
  | "accountant"
  | "client"
  | "travel_agency";

/** Booking agents are agency-side users: they use the agency portal, never the admin hub. */
const STAFF_ROLES: StaffRole[] = ["super_admin", "admin", "accountant"];
const AGENCY_ROLES: StaffRole[] = ["travel_agency", "booking_agent"];

export function isStaffRole(role: StaffRole) {
  return STAFF_ROLES.includes(role);
}

export function isAgencyRole(role: StaffRole) {
  return AGENCY_ROLES.includes(role);
}

/** Landing page after sign-in: staff → ERP hub, agencies/booking agents → agency portal. */
export function landingPathForRoles(roles: StaffRole[]) {
  if (roles.some(isStaffRole)) return "/admin/dashboard";
  if (roles.some(isAgencyRole)) return "/agency";
  return "/catalog";
}

/** Reads the signed-in user's roles directly (used right after sign-in). */
export async function fetchLandingPath(userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return landingPathForRoles((data ?? []).map((r) => r.role as StaffRole));
}

/** Single client-side session hook, kept in sync with auth state changes. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading, user: session?.user ?? null };
}

export function useRoles() {
  const { session } = useSession();
  const [roles, setRoles] = useState<StaffRole[]>([]);

  useEffect(() => {
    if (!session?.user) {
      setRoles([]);
      return;
    }
    let active = true;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .then(({ data }) => {
        if (active) setRoles((data ?? []).map((r) => r.role as StaffRole));
      });
    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  const isStaff = roles.some(isStaffRole);
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const isAgency = roles.some(isAgencyRole);
  return { roles, isStaff, isAdmin, isAgency };
}

/** Clears cached data + the Supabase session, then returns to the sign-in page. */
export function useSignOut() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }, [navigate, queryClient]);
}
