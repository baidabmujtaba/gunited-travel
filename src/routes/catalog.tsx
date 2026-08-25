import { createFileRoute, redirect } from "@tanstack/react-router";

/** Customer landing route after sign-in — the catalog lives at /offers. */
export const Route = createFileRoute("/catalog")({
  beforeLoad: () => {
    throw redirect({ to: "/offers", replace: true });
  },
});
