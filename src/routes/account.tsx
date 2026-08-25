import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { getMyOrders } from "@/lib/orders.functions";
import { useSession } from "@/lib/session";

const STAGES = [
  "submitted",
  "payment_pending",
  "payment_confirmed",
  "processing",
  "completed",
] as const;

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My Orders — Gunited Travel | طلباتي" },
      {
        name: "description",
        content: "View your Gunited Travel orders, payment status and tracking IDs in one place.",
      },
      { property: "og:title", content: "My Orders — Gunited Travel" },
      { property: "og:description", content: "Your Gunited Travel order history." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const { t, fmt, lang } = useI18n();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth", search: { redirect: "/account" } });
  }, [loading, session, navigate]);

  const query = useQuery({
    queryKey: ["my-orders", session?.user?.id],
    queryFn: () => getMyOrders(),
    enabled: Boolean(session?.user),
  });

  // Real-time: status changes made by staff appear without a refresh.
  useEffect(() => {
    if (!session?.user) return;
    const channel = supabase
      .channel("my-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_orders" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.user?.id, queryClient]);

  const orders = query.data ?? [];

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-4xl px-5 py-12">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">{t("dash.title")}</h1>
          <Badge variant="outline" className="gap-1.5 border-forest/30 text-forest">
            <span className="size-2 animate-pulse rounded-full bg-forest" />
            {t("dash.live")}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t("dash.subtitle")}</p>

        {query.isPending ? (
          <div className="mt-8 space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : orders.length === 0 ? (
          <div className="surface-card mt-8 p-10 text-center">
            <p className="text-sm text-muted-foreground">{t("dash.empty")}</p>
            <Button asChild className="mt-5">
              <Link to="/offers">{t("nav.offers")}</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {orders.map((o) => {
              const stageIndex = STAGES.indexOf(o.status as (typeof STAGES)[number]);
              return (
                <li key={o.id} className="surface-card lift-hover space-y-4 p-5">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="min-w-40 flex-1">
                      <p className="font-bold tracking-wide text-forest">{o.tracking_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB")}
                      </p>
                    </div>
                    <Badge className="bg-mint text-forest-deep">{t(`status.${o.status}`)}</Badge>
                    <p className="font-semibold">{fmt(Number(o.amount_display), o.currency_code)}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/track" search={{ ref: o.tracking_id ?? "" }}>
                          {t("nav.track")}
                        </Link>
                      </Button>
                      {o.invoice ? (
                        <Button asChild size="sm">
                          <Link
                            to="/invoice/$number"
                            params={{ number: o.invoice.invoice_number }}
                          >
                            {t("dash.invoice")} · {o.invoice.invoice_number}
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {/* Live progress: refreshed by the realtime subscription above. */}
                  <div className="flex items-center gap-1.5">
                    {STAGES.map((stage, i) => (
                      <div key={stage} className="flex-1">
                        <span
                          className={`block h-1.5 rounded-full ${
                            stageIndex >= i ? "bg-forest" : "bg-border"
                          }`}
                        />
                        <span className="mt-1.5 block truncate text-[10px] text-muted-foreground">
                          {t(`status.${stage}`)}
                        </span>
                      </div>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </StoreLayout>
  );
}
