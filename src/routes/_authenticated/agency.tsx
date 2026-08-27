import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AssistantWidget } from "@/components/AssistantWidget";
import { InstallAppPrompt } from "@/components/pwa/InstallAppPrompt";
import { NotificationBell } from "@/components/NotificationBell";
import { BrandMark, Wordmark } from "@/components/brand/Wordmark";
import { LanguageSwitcher } from "@/components/store/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useL } from "@/components/admin/Bilingual";
import { useRoles, useSession, useSignOut } from "@/lib/session";
import { autoLinkMyAgency } from "@/lib/agency-link.functions";

export const Route = createFileRoute("/_authenticated/agency")({
  head: () => ({
    meta: [
      { title: "Agency Portal — Gunited Travel | بوابة الوكالة" },
      {
        name: "description",
        content:
          "Travel agency portal for Gunited Travel partners: customers, orders, balance, payments and statements.",
      },
      { property: "og:title", content: "Agency Portal — Gunited Travel" },
      {
        property: "og:description",
        content: "Partner agencies manage customers, orders and their financial balance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgencyLayout,
});

function AgencyLayout() {
  const l = useL();
  const { session } = useSession();
  const { roles, isAgency, isStaff } = useRoles();
  const signOut = useSignOut();

  // The portal reads everything from the caller's linked agency; without a link
  // every server fn throws NO_AGENCY, so show a clear notice instead.
  const { data: linked, isPending: linkPending } = useQuery({
    queryKey: ["my-agency-link", session?.user?.id],
    enabled: Boolean(session?.user?.id),
    queryFn: async () => {
      const read = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("agency_id")
          .eq("id", session!.user.id)
          .maybeSingle();
        return (data?.agency_id as string | null) ?? null;
      };
      const current = await read();
      if (current) return current;
      // Direct visits (bookmark / refresh) skip the sign-in hook, so retry the
      // automatic link here before telling the user they are unlinked.
      try {
        const res = await autoLinkMyAgency();
        if (res?.agencyId) return res.agencyId;
      } catch {
        // best-effort
      }
      return await read();
    },
  });

  const NAV = [
    { to: "/agency", label: l("الرئيسية", "Home"), exact: true },
    { to: "/agency/offers", label: l("العروض", "Offers"), exact: false },
    { to: "/agency/customers", label: l("عملائي", "My customers"), exact: false },
    { to: "/agency/orders", label: l("طلباتي", "My orders"), exact: false },
    { to: "/agency/balance", label: l("رصيدي", "My balance"), exact: false },
    { to: "/agency/statement", label: l("كشف الحساب", "Statement"), exact: false },
  ] as const;

  if (roles.length === 0) {
    return (
      <div className="min-h-screen space-y-3 bg-cream p-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAgency && !isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream p-6">
        <div className="surface-card max-w-md p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {l("هذه البوابة للوكالات المعتمدة فقط.", "This portal is for partner agencies only.")}
          </p>
          <Button asChild className="mt-5">
            <Link to="/">{l("العودة للمتجر", "Back to store")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream lg:flex-row">
      <aside className="border-b border-border/70 bg-forest-deep text-cream lg:w-64 lg:border-b-0 lg:border-e">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <BrandMark />
          <Wordmark />
        </div>
        <div className="px-5 pb-3">
          <Badge className="bg-gold/90 text-forest-deep">{l("بوابة الوكالة", "Agency portal")}</Badge>
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="whitespace-nowrap rounded-lg px-3 py-2.5 text-[13px] font-semibold text-cream/70 transition-colors hover:bg-cream/10 hover:text-cream sm:px-4 sm:text-sm"
              activeProps={{ className: "bg-cream text-forest-deep" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-2 border-b border-border/70 bg-cream/95 px-3 py-2.5 backdrop-blur sm:px-5 sm:py-3">
          <div className="ms-auto flex items-center gap-2">
            <LanguageSwitcher />
            <NotificationBell />
            <Button asChild size="sm" variant="outline">
              <Link to="/catalog">{l("الخدمات", "Services")}</Link>
            </Button>
            {session ? (
              <Button
                size="sm"
                onClick={() => void signOut()}
                className="bg-forest text-cream hover:bg-forest-deep"
              >
                {l("خروج", "Sign out")}
              </Button>
            ) : null}
          </div>
        </header>
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-6">
          {linkPending ? (
            <Skeleton className="h-64 w-full" />
          ) : linked ? (
            <Outlet />
          ) : (
            <div className="surface-card mx-auto max-w-lg p-10 text-center">
              <p className="text-sm font-semibold text-forest-deep">
                {l("حسابك غير مرتبط بوكالة", "Your account is not linked to an agency")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {l(
                  "يرجى التواصل مع الإدارة لربط حسابك بملف وكالة حتى تظهر لك العملاء والطلبات والرصيد.",
                  "Ask an administrator to link your account to an agency profile so customers, orders and balance appear here.",
                )}
              </p>
              <Button asChild className="mt-5">
                <Link to="/catalog">{l("تصفح الخدمات", "Browse services")}</Link>
              </Button>
            </div>
          )}
        </main>
      </div>
      <AssistantWidget mode="client" />
      <InstallAppPrompt audience="agency" />
    </div>
  );
}
