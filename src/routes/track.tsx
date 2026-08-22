import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { trackOrder } from "@/lib/orders.functions";

const STAGES = ["submitted", "payment_pending", "payment_confirmed", "processing", "completed"] as const;

export const Route = createFileRoute("/track")({
  validateSearch: z.object({ ref: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Track My Order — Gunited Travel | تتبع طلبي" },
      {
        name: "description",
        content:
          "Enter your Gunited Travel tracking ID to follow your order from receipt upload to payment confirmation and completion.",
      },
      { property: "og:title", content: "Track My Order — Gunited Travel" },
      { property: "og:description", content: "Follow your order status in real time." },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const { ref } = Route.useSearch();
  const navigate = useNavigate();
  const { lang, t, fmt } = useI18n();
  const [input, setInput] = useState(ref ?? "");

  const query = useQuery({
    queryKey: ["track", ref],
    queryFn: () => trackOrder({ data: { ref: ref! } }),
    enabled: Boolean(ref),
  });

  const order = query.data?.order ?? null;
  const currentIndex = order ? STAGES.indexOf(order.status as (typeof STAGES)[number]) : -1;

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-bold sm:text-4xl">{t("track.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("track.subtitle")}</p>

        <form
          className="mt-6 flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/track", search: { ref: input.trim() } });
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("track.placeholder")}
            className="bg-card"
          />
          <Button type="submit" className="gap-2">
            <Search className="size-4" />
            {t("track.search")}
          </Button>
        </form>

        {query.isFetching ? (
          <div className="surface-card mt-8 space-y-3 p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : ref && !order ? (
          <div className="surface-card mt-8 p-8 text-center">
            <p className="font-semibold">{t("track.notfound")}</p>
          </div>
        ) : order ? (
          <div className="mt-8 space-y-6">
            <div className="surface-card flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <p className="text-xs text-muted-foreground">{t("checkout.tracking")}</p>
                <p className="text-lg font-bold tracking-wide text-forest">{order.tracking_id}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {query.data?.offerTitle
                    ? lang === "ar"
                      ? query.data.offerTitle.ar
                      : query.data.offerTitle.en
                    : null}
                </p>
              </div>
              <div className="text-end">
                <p className="text-xs text-muted-foreground">{t("dash.amount")}</p>
                <p className="text-lg font-bold">
                  {fmt(Number(order.amount_display), order.currency_code)}
                </p>
              </div>
            </div>

            <ol className="surface-card space-y-1 p-6">
              {STAGES.map((stage, i) => {
                const done = currentIndex >= i;
                const current = currentIndex === i;
                return (
                  <li key={stage} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={`grid size-8 place-items-center rounded-full border-2 transition-colors ${
                          done
                            ? "border-forest bg-forest text-primary-foreground"
                            : "border-border bg-card text-muted-foreground"
                        }`}
                      >
                        {done ? (
                          <Check className="size-4" />
                        ) : current ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <span className="text-xs font-semibold">{i + 1}</span>
                        )}
                      </span>
                      {i < STAGES.length - 1 ? (
                        <span
                          className={`w-0.5 flex-1 ${currentIndex > i ? "bg-forest" : "bg-border"}`}
                        />
                      ) : null}
                    </div>
                    <div className="pb-6">
                      <p className={`text-sm font-semibold ${done ? "" : "text-muted-foreground"}`}>
                        {t(`status.${stage}`)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>

            {query.data?.history?.length ? (
              <div className="surface-card p-6">
                <h2 className="text-base font-bold">{t("track.history")}</h2>
                <ul className="mt-3 space-y-3 text-sm">
                  {query.data.history.map((h) => (
                    <li key={h.id} className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium">{t(`status.${h.new_status}`)}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(h.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")}
                        {h.actor_name ? ` · ${h.actor_name}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {order.status === "completed" && query.data?.invoice ? (
              <Button className="w-full sm:w-auto">
                {t("track.invoice")} — {query.data.invoice.invoice_number}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </StoreLayout>
  );
}
