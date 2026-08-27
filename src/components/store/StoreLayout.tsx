import { Link } from "@tanstack/react-router";
import { LogOut, Menu } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { AssistantWidget } from "@/components/AssistantWidget";
import { InstallAppPrompt } from "@/components/pwa/InstallAppPrompt";
import { NotificationBell } from "@/components/NotificationBell";
import { BrandMark, Wordmark } from "@/components/brand/Wordmark";
import { LanguageSwitcher } from "@/components/store/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n";
import { useRoles, useSession, useSignOut } from "@/lib/session";

export function StoreLayout({ children }: { children: ReactNode }) {
  const { t, lang } = useI18n();
  const { session } = useSession();
  const { isStaff, isAgency } = useRoles();
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/", label: t("nav.home") },
    { to: "/offers", label: t("nav.offers") },
    { to: "/track", label: t("nav.track") },
  ] as const;

  // Quick link label is shorter and friendlier for the header button.
  const agencyLabel = lang === "ar" ? "وكالتي" : "My agency";
  const accountLabel = lang === "ar" ? "حسابي" : "My account";


  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-5 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark />
            <Wordmark />
          </Link>

          <nav className="mx-auto hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-lg px-3 py-2 text-sm font-medium text-forest-deep/80 transition-colors hover:bg-secondary hover:text-forest-deep"
                activeProps={{ className: "bg-secondary text-forest-deep" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-2 md:ms-0">
            <LanguageSwitcher />
            <NotificationBell />
            {isStaff ? (
              <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
                <Link to="/admin">{t("nav.admin")}</Link>
              </Button>
            ) : null}
            {isAgency ? (
              <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
                <Link to="/agency">{agencyLabel}</Link>
              </Button>
            ) : null}
            {session ? (
              <>
                <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                  <Link to="/account">{accountLabel}</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={() => void signOut()}
                >
                  <LogOut className="me-1.5 size-4" />
                  {t("nav.logout")}
                </Button>
              </>
            ) : (
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link to="/auth">{t("nav.login")}</Link>
              </Button>
            )}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("nav.home")}>
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetTitle className="sr-only">{t("brand.name")}</SheetTitle>
                <div className="mt-6 flex flex-col gap-1">
                  {links.map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-secondary"
                    >
                      {l.label}
                    </Link>
                  ))}
                  {isStaff ? (
                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-secondary"
                    >
                      {t("nav.admin")}
                    </Link>
                  ) : null}
                  {isAgency ? (
                    <Link
                      to="/agency"
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-secondary"
                    >
                      {agencyLabel}
                    </Link>
                  ) : null}
                  <Link
                    to={session ? "/account" : "/auth"}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-secondary"
                  >
                    {session ? accountLabel : t("nav.login")}
                  </Link>
                  {session ? (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        void signOut();
                      }}
                      className="rounded-lg px-3 py-2.5 text-start text-sm font-medium hover:bg-secondary"
                    >
                      {t("nav.logout")}
                    </button>
                  ) : null}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-border/70 bg-beige">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <Wordmark showBoth />
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Gunited Travel · جيونايتد ترافيل — {t("footer.rights")}
          </p>
        </div>
      </footer>

      <AssistantWidget mode="client" />
      <InstallAppPrompt audience={isStaff ? "staff" : isAgency ? "agency" : "client"} />
    </div>
  );
}
