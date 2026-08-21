import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type StaffRole = "super_admin" | "admin" | "booking_agent" | "accountant" | "client";

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

  const isStaff = roles.some((r) => r !== "client");
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  return { roles, isStaff, isAdmin };
}
