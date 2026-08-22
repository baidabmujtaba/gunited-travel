import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Copy, Loader2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { getOffer, getPaymentMethods } from "@/lib/catalog.functions";
import { useI18n } from "@/lib/i18n";
import { createOrder } from "@/lib/orders.functions";
import { useSession } from "@/lib/session";

const ALLOWED = ["image/png", "image/jpeg", "application/pdf"];
const MAX_BYTES = 5 * 1024 * 1024;

export const Route = createFileRoute("/checkout/$slug")({
  validateSearch: z.object({ currency: z.string().default("USD") }),
  head: () => ({
    meta: [
      { title: "Checkout — Gunited Travel | إتمام الطلب" },
      {
        name: "description",
        content:
          "Complete your Gunited Travel order: choose a payment method, enter your transfer reference and upload your receipt for verification.",
      },
      { property: "og:title", content: "Checkout — Gunited Travel" },
      { property: "og:description", content: "Pay by bank or app transfer and upload your receipt." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { slug } = Route.useParams();
  const { currency } = Route.useSearch();
  const { lang, t, fmt } = useI18n();
  const { session, loading } = useSession();
  const navigate = useNavigate();

  const offerQuery = useQuery({
    queryKey: ["offer", slug, currency],
    queryFn: () => getOffer({ data: { slug, currency } }),
  });
  const methodsQuery = useQuery({ queryKey: ["payment-methods"], queryFn: () => getPaymentMethods() });

  const [methodId, setMethodId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ trackingId: string } | null>(null);

  useEffect(() => {
    if (session?.user) {
      setEmail((v) => v || (session.user.email ?? ""));
      const meta = session.user.user_metadata as { full_name?: string } | undefined;
      setName((v) => v || meta?.full_name || "");
    }
  }, [session]);

  const methods = methodsQuery.data ?? [];
  useEffect(() => {
    if (!methodId && methods.length) setMethodId(methods[0]!.id);
  }, [methods, methodId]);

  const offer = offerQuery.data?.offer;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!offer || !session?.user) throw new Error("NO_SESSION");
      if (!file) throw new Error("NO_FILE");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${session.user.id}/${Date.now()}-receipt.${ext}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw new Error(upErr.message);

      return createOrder({
        data: {
          offerId: offer.id,
          currency,
          customerName: name.trim(),
          customerEmail: email.trim(),
          whatsapp: whatsapp.trim(),
          transactionReference: reference.trim(),
          paymentMethodId: methodId,
          receiptPath: path,
        },
      });
    },
    onSuccess: (data) => {
      setResult({ trackingId: data.trackingId });
      toast.success(t("checkout.success"), { description: data.trackingId });
    },
    onError: (e) => toast.error(t("common.error"), { description: String(e.message ?? e) }),
  });

  function onPickFile(f: File | null) {
    if (!f) return setFile(null);
    if (!ALLOWED.includes(f.type)) return toast.error(t("checkout.filetype"));
    if (f.size > MAX_BYTES) return toast.error(t("checkout.filesize"));
    setFile(f);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !whatsapp.trim() || !reference.trim() || !file || !methodId) {
      toast.error(t("checkout.required"));
      return;
    }
    mutation.mutate();
  }

  if (result) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-lg px-5 py-20 text-center">
          <CheckCircle2 className="mx-auto size-14 text-sage" />
          <h1 className="mt-5 text-2xl font-bold">{t("checkout.success")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("checkout.note")}</p>
          <div className="surface-card mt-6 p-5">
            <p className="text-xs text-muted-foreground">{t("checkout.tracking")}</p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <p className="text-xl font-bold tracking-wide text-forest">{result.trackingId}</p>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  void navigator.clipboard.writeText(result.trackingId);
                  toast.success(result.trackingId);
                }}
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild>
              <Link to="/track" search={{ ref: result.trackingId }}>
                {t("nav.track")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/account">{t("nav.dashboard")}</Link>
            </Button>
          </div>
        </div>
      </StoreLayout>
    );
  }

  if (!loading && !session) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-md px-5 py-24 text-center">
          <h1 className="text-2xl font-bold">{t("checkout.title")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{t("checkout.needlogin")}</p>
          <Button
            className="mt-6"
            onClick={() => navigate({ to: "/auth", search: { redirect: `/checkout/${slug}?currency=${currency}` } })}
          >
            {t("nav.login")}
          </Button>
        </div>
      </StoreLayout>
    );
  }

  const p = offer?.price;

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-5xl px-5 py-10">
        <h1 className="text-3xl font-bold">{t("checkout.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("checkout.note")}</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <form onSubmit={submit} className="space-y-8">
            <section className="surface-card p-6">
              <h2 className="text-lg font-bold">{t("checkout.method")}</h2>
              <RadioGroup value={methodId} onValueChange={setMethodId} className="mt-4 space-y-3">
                {methods.map((m) => (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-secondary/40 p-4 transition-colors hover:bg-secondary"
                  >
                    <RadioGroupItem value={m.id} className="mt-1" />
                    <div className="text-sm">
                      <p className="font-semibold">{lang === "ar" ? m.name_ar : m.name_en}</p>
                      <dl className="mt-2 grid gap-1 text-muted-foreground">
                        {m.account_holder ? (
                          <Detail label={t("checkout.holder")} value={m.account_holder} />
                        ) : null}
                        {m.account_number ? (
                          <Detail label={t("checkout.account")} value={m.account_number} />
                        ) : null}
                        {m.iban ? <Detail label={t("checkout.iban")} value={m.iban} /> : null}
                        {m.branch ? <Detail label={t("checkout.branch")} value={m.branch} /> : null}
                      </dl>
                      <p className="mt-2 text-xs">
                        {lang === "ar" ? m.instructions_ar : m.instructions_en}
                      </p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </section>

            <section className="surface-card space-y-4 p-6">
              <h2 className="text-lg font-bold">{t("checkout.yourdetails")}</h2>
              <Field id="name" label={t("checkout.name")}>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field id="email" label={t("checkout.email")}>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field id="whatsapp" label={t("checkout.whatsapp")}>
                <Input
                  id="whatsapp"
                  inputMode="tel"
                  placeholder="+249912345678"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  required
                />
              </Field>
              <Field id="reference" label={t("checkout.reference")}>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  required
                />
              </Field>
              <Field id="receipt" label={t("checkout.receipt")}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-sage/70 bg-secondary/40 p-4 text-sm transition-colors hover:bg-secondary">
                  <Upload className="size-4 text-sage" />
                  <span className="truncate">{file ? file.name : t("checkout.receipt")}</span>
                  <input
                    id="receipt"
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf"
                    className="sr-only"
                    onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </Field>

              <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> {t("checkout.submitting")}
                  </>
                ) : (
                  t("checkout.submit")
                )}
              </Button>
            </section>
          </form>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="surface-card space-y-3 p-6">
              <h2 className="text-base font-bold">{t("checkout.summary")}</h2>
              {offer && p ? (
                <>
                  <p className="text-sm font-semibold">
                    {lang === "ar" ? offer.title_ar : offer.title_en}
                  </p>
                  <div className="flex items-baseline justify-between border-t border-border pt-3">
                    <span className="text-sm text-muted-foreground">{t("offer.total")}</span>
                    <span className="text-2xl font-bold text-forest">
                      {fmt(p.total, p.currency)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("offer.rate.note")}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </StoreLayout>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt>{label}:</dt>
      <dd className="font-medium text-forest-deep">{value}</dd>
    </div>
  );
}
