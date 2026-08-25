import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Wordmark } from "@/components/brand/Wordmark";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useI18n } from "@/lib/i18n";
import { fetchLandingPath, useSession } from "@/lib/session";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — Gunited Travel | تسجيل الدخول" },
      {
        name: "description",
        content: "Sign in or create a Gunited Travel account to book services and follow your orders.",
      },
      { property: "og:title", content: "Sign in — Gunited Travel" },
      { property: "og:description", content: "Access your Gunited Travel account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function safePath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const requested = safePath(redirect);
  const target = requested ?? "/catalog";

  useEffect(() => {
    if (loading || !session) return;
    let active = true;
    void (async () => {
      const dest = requested ?? (await fetchLandingPath(session.user.id));
      if (active) void navigate({ to: dest, replace: true });
    })();
    return () => {
      active = false;
    };
  }, [loading, session, requested, navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(t("common.error"), { description: error.message });
      return;
    }
    const dest = requested ?? (data.user ? await fetchLandingPath(data.user.id) : "/catalog");
    void navigate({ to: dest, replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}${target}`,
      },
    });
    setBusy(false);
    if (error) {
      toast.error(t("common.error"), { description: error.message });
      return;
    }
    toast.success(t("auth.signup"));
  }

  async function google() {
    setBusy(true);
    sessionStorage.setItem("gt_redirect", target);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setBusy(false);
    if (result.error) {
      toast.error(t("common.error"), { description: result.error.message });
      return;
    }
    if (result.redirected) return;
    void navigate({ to: target, replace: true });
  }

  async function forgot() {
    if (!email) {
      toast.error(t("checkout.required"));
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) {
      toast.error(t("common.error"), { description: error.message });
      return;
    }
    toast.success(t("auth.reset.sent"));
  }

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-md px-5 py-14">
        <div className="mb-8 text-center">
          <Wordmark className="mx-auto" />
          <h1 className="mt-4 text-2xl font-bold">{t("auth.title")}</h1>
        </div>

        <Tabs defaultValue="signin" className="surface-card p-6">
          <TabsList className="w-full">
            <TabsTrigger value="signin" className="flex-1">
              {t("auth.signin")}
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">
              {t("auth.signup")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={signIn} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("checkout.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : t("auth.signin")}
              </Button>
              <button
                type="button"
                onClick={forgot}
                className="w-full text-xs text-sage hover:underline"
              >
                {t("auth.forgot")}
              </button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={signUp} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t("checkout.name")}</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email2">{t("checkout.email")}</Label>
                <Input
                  id="email2"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password2">{t("auth.password")}</Label>
                <Input
                  id="password2"
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : t("auth.signup")}
              </Button>
            </form>
          </TabsContent>

          <div className="mt-6 border-t border-border pt-5">
            <Button variant="outline" className="w-full" onClick={google} disabled={busy}>
              {t("auth.google")}
            </Button>
          </div>
        </Tabs>
      </div>
    </StoreLayout>
  );
}
