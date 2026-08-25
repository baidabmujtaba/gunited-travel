import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AssistantWidget } from "@/components/AssistantWidget";
import { BrandMark, Wordmark } from "@/components/brand/Wordmark";
import { LanguageSwitcher } from "@/components/store/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useSession, useSignOut } from "@/lib/session";

const TABS = [
  { to: "/admin", key: "admin.tab.sales", exact: true },
  { to: "/admin/offers", key: "admin.tab.offers", exact: false },
  { to: "/admin/customers", key: "admin.tab.customers", exact: false },
  { to: "/admin/partners", key: "admin.tab.partners", exact: false },
  { to: "/admin/finance", key: "admin.tab.finance", exact: false },
  { to: "/admin/users", key: "admin.tab.users", exact: false },
  { to: "/admin/settings", key: "admin.tab.settings", exact: false },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { session } = useSession();
  const signOut = useSignOut();

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="border-b border-border/70 bg-forest-deep text-cream">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-5 py-4">
          <Link to="/admin" className="flex items-center gap-2.5">
            <BrandMark />
            <Wordmark />
          </Link>
          <Badge className="bg-gold/90 text-forest-deep">{t("admin.title")}</Badge>
          <div className="ms-auto flex items-center gap-2">
            <LanguageSwitcher />
            <Button asChild size="sm" variant="outline" className="border-cream/40 bg-transparent text-cream hover:bg-cream/10">
              <Link to="/">{t("admin.backstore")}</Link>
            </Button>
            {session ? (
              <Button
                size="sm"
                onClick={() => void signOut()}
                className="bg-gold text-forest-deep hover:bg-gold/90"
              >
                {t("nav.logout")}
              </Button>
            ) : (
              <Button asChild size="sm" className="bg-gold text-forest-deep hover:bg-gold/90">
                <Link to="/auth">{t("nav.login")}</Link>
              </Button>
            )}
          </div>
        </div>
        <nav className="mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto px-5">
          {TABS.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              activeOptions={{ exact: tab.exact }}
              className="whitespace-nowrap rounded-t-lg px-4 py-3 text-sm font-semibold text-cream/70 transition-colors hover:text-cream"
              activeProps={{ className: "bg-cream text-forest-deep" }}
            >
              {t(tab.key)}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8">{children}</main>
      <AssistantWidget mode="admin" />
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="surface-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold text-forest-deep">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const TONES: Record<string, string> = {
  submitted: "bg-beige text-forest-deep",
  payment_pending: "bg-gold/25 text-forest-deep",
  payment_confirmed: "bg-mint text-forest-deep",
  processing: "bg-sage/30 text-forest-deep",
  completed: "bg-forest text-cream",
  cancelled: "bg-muted text-muted-foreground",
  rejected: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  return <Badge className={TONES[status] ?? "bg-secondary"}>{t(`status.${status}`)}</Badge>;
}
