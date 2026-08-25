import { createFileRoute, redirect } from "@tanstack/react-router";

/** Staff landing route after sign-in — the ERP hub lives at /admin. */
export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/admin", replace: true });
  },
});
