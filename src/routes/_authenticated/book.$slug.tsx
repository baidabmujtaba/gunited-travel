import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Check, Loader2, Minus, Plus, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getPaymentMethods } from "@/lib/catalog.functions";
import { useI18n } from "@/lib/i18n";
import { createPackageBooking, getPackage, quotePackage } from "@/lib/packages.functions";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/book/$slug")({
  head: () => ({
    meta: [
      { title: "Book your package — Gunited Travel | احجز باقتك" },
      {
        name: "description",
        content:
          "Complete your Gunited Travel package booking: travel date, travellers, rooms, extras and payment — with a transparent price breakdown.",
      },
      { property: "og:title", content: "Book your package — Gunited Travel" },
      {
        property: "og:description",
        content: "Travel date, travellers, rooms, extras and payment with a transparent price breakdown.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookPackage,
});

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 5 * 1024 * 1024;

function BookPackage() {
  const { slug } = Route.useParams();
  const { lang, fmt } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const { session } = useSession();
  const book = useServerFn(createPackageBooking);

  const [currency, setCurrency] = useState("USD");
  const [step, setStep] = useState(1);
  const [departureId, setDepartureId] = useState<string | null>(null);
  const [travelDate, setTravelDate] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [rooms, setRooms] = useState<Record<string, number>>({});
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [nationality, setNationality] = useState("");
  const [notes, setNotes] = useState("");
  const [docFiles, setDocFiles] = useState<Record<string, File>>({});
  const [methodId, setMethodId] = useState("");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);

  const offerQuery = useQuery({
    queryKey: ["package", slug, currency],
    queryFn: () => getPackage({ data: { slug, currency } }),
  });
  const methodsQuery = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => getPaymentMethods(),
  });

  const offer = offerQuery.data?.offer ?? null;

  useEffect(() => {
    if (session?.user) {
      setEmail((v) => v || (session.user.email ?? ""));
      const meta = session.user.user_metadata as { full_name?: string } | undefined;
      setName((v) => v || meta?.full_name || "");
    }
  }, [session]);

  const allowedIds = offer?.allowed_payment_methods ?? [];
  const methods = (methodsQuery.data ?? []).filter(
    (m) => allowedIds.length === 0 || allowedIds.includes(m.id),
  );
  useEffect(() => {
    if (methods.length && !methods.some((m) => m.id === methodId)) setMethodId(methods[0]!.id);
  }, [methods, methodId]);

  const optionalServices = (offer?.services ?? []).filter((s) => !s.is_included && s.is_optional);
  const requiredDocs = offer?.required_documents ?? [];

  const selection = useMemo(
    () => ({
      offerId: offer?.id ?? "",
      currency,
      adults,
      children,
      infants,
      rooms: Object.entries(rooms)
        .filter(([, qty]) => qty > 0)
        .map(([roomTypeId, qty]) => ({ roomTypeId, qty })),
      serviceIds,
      couponCode: appliedCoupon || null,
    }),
    [offer?.id, currency, adults, children, infants, rooms, serviceIds, appliedCoupon],
  );

  const quoteQuery = useQuery({
    queryKey: ["package-quote", selection],
    queryFn: () => quotePackage({ data: selection }),
    enabled: Boolean(offer?.id),
  });
  const quote = quoteQuery.data?.quote ?? null;
  const couponError = quoteQuery.data?.couponError ?? null;

  useEffect(() => {
    if (couponError) toast.error(ar ? "كود الخصم غير صالح" : "Coupon not valid");
  }, [couponError, ar]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!offer || !session?.user) throw new Error("NO_SESSION");
      if (!receipt) throw new Error("NO_FILE");
      const ext = receipt.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${session.user.id}/${Date.now()}-receipt.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("receipts")
        .upload(path, receipt, { contentType: receipt.type, upsert: false });
      if (upErr) throw new Error(upErr.message);

      const documents: {
        key: string;
        label_en: string;
        label_ar: string;
        path: string;
        name: string;
      }[] = [];
      for (const doc of requiredDocs) {
        const f = docFiles[doc.key];
        if (!f) continue;
        const dExt = f.name.split(".").pop()?.toLowerCase() ?? "bin";
        const dPath = `${session.user.id}/${Date.now()}-${doc.key}.${dExt}`;
        const { error: dErr } = await supabase.storage
          .from("order-documents")
          .upload(dPath, f, { contentType: f.type, upsert: false });
        if (dErr) throw new Error(dErr.message);
        documents.push({
          key: doc.key,
          label_en: doc.label_en,
          label_ar: doc.label_ar,
          path: dPath,
          name: f.name,
        });
      }

      return book({
        data: {
          ...selection,
          departureId,
          travelDate: travelDate || null,
          customerName: name.trim(),
          customerEmail: email.trim(),
          whatsapp: whatsapp.trim(),
          nationality: nationality.trim() || null,
          notes: notes.trim() || null,
          paymentMethodId: methodId,
          transactionReference: reference.trim(),
          receiptPath: path,
          documents,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(ar ? "تم استلام حجزك" : "Booking received", { description: res.trackingId });
      void navigate({ to: "/booking/$tracking", params: { tracking: res.trackingId } });
    },
    onError: (e) =>
      toast.error(ar ? "تعذر إكمال الحجز" : "Booking failed", {
        description: String((e as Error).message ?? e),
      }),
  });

  if (offerQuery.isPending) {
    return (
      <StoreLayout>
        <div className="grid place-items-center px-5 py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </StoreLayout>
    );
  }

  if (!offer) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-lg px-5 py-24 text-center">
          <p className="font-semibold">{ar ? "العرض غير متاح" : "Offer unavailable"}</p>
        </div>
      </StoreLayout>
    );
  }

  const steps = [
    ar ? "التاريخ" : "Date",
    ar ? "المسافرون" : "Travellers",
    ar ? "الإضافات" : "Extras",
    ar ? "بياناتك" : "Your details",
    ar ? "الدفع" : "Payment",
  ];

  function pickFile(f: File | null, set: (f: File) => void) {
    if (!f) return;
    if (!ALLOWED.includes(f.type)) {
      toast.error(ar ? "نوع الملف غير مدعوم" : "Unsupported file type");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error(ar ? "حجم الملف كبير جدًا" : "File is too large");
      return;
    }
    set(f);
  }

  function next() {
    if (step === 1 && offer!.departures.length > 0 && !departureId) {
      toast.error(ar ? "اختر تاريخ المغادرة" : "Select a departure date");
      return;
    }
    if (step === 1 && offer!.departures.length === 0 && !travelDate) {
      toast.error(ar ? "اختر تاريخ السفر" : "Select a travel date");
      return;
    }
    if (step === 4 && (!name.trim() || !email.trim() || !whatsapp.trim())) {
      toast.error(ar ? "أكمل البيانات المطلوبة" : "Complete the required fields");
      return;
    }
    if (step === 4 && requiredDocs.some((d) => d.required && !docFiles[d.key])) {
      toast.error(ar ? "أرفق كل المستندات المطلوبة" : "Attach all required documents");
      return;
    }
    setStep((s) => Math.min(5, s + 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submit() {
    if (!methodId || !reference.trim() || !receipt) {
      toast.error(ar ? "أكمل بيانات الدفع" : "Complete the payment details");
      return;
    }
    mutation.mutate();
  }

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-3xl px-5 pb-16">
        <h1 className="text-2xl font-bold sm:text-3xl">
          {ar ? "حجز" : "Book"} · {ar ? offer.title_ar : offer.title_en}
        </h1>

        {/* Stepper */}
        <ol className="mt-6 flex items-center gap-1">
          {steps.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            return (
              <li key={label} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full items-center">
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      n === step
                        ? "bg-forest text-cream"
                        : done
                          ? "bg-sage text-cream"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {done ? <Check className="size-3.5" /> : n}
                  </span>
                  {i < steps.length - 1 ? (
                    <span className={`h-0.5 flex-1 ${done ? "bg-sage" : "bg-border"}`} />
                  ) : null}
                </div>
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </li>
            );
          })}
        </ol>

        <div className="surface-card mt-6 space-y-5 p-5">
          {step === 1 ? (
            <>
              <h2 className="font-bold">{ar ? "تاريخ السفر" : "Travel date"}</h2>
              {offer.departures.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {offer.departures.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDepartureId(d.id)}
                      disabled={d.seats_total > 0 && d.seats_left <= 0}
                      className={`rounded-xl border p-3 text-start text-sm disabled:opacity-50 ${
                        departureId === d.id ? "border-forest bg-mint/40" : "border-border"
                      }`}
                    >
                      <p className="font-semibold">{d.departure_date}</p>
                      {d.return_date ? (
                        <p className="text-xs text-muted-foreground">
                          {ar ? "العودة" : "Return"}: {d.return_date}
                        </p>
                      ) : null}
                      {d.seats_total > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {d.seats_left} {ar ? "مقعد متاح" : "seats left"}
                        </p>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>{ar ? "التاريخ المطلوب" : "Preferred date"}</Label>
                  <Input
                    type="date"
                    value={travelDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setTravelDate(e.target.value)}
                  />
                </div>
              )}
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h2 className="font-bold">{ar ? "المسافرون والغرف" : "Travellers & rooms"}</h2>
              <Counter
                label={ar ? "بالغ" : "Adults"}
                value={adults}
                min={1}
                onChange={setAdults}
              />
              <Counter
                label={ar ? "طفل" : "Children"}
                hint={ar ? "من 2 إلى 11 سنة" : "2–11 years"}
                value={children}
                onChange={setChildren}
              />
              <Counter
                label={ar ? "رضيع" : "Infants"}
                hint={ar ? "أقل من سنتين" : "under 2 years"}
                value={infants}
                onChange={setInfants}
              />

              {offer.rooms.length > 0 ? (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold">{ar ? "الغرف" : "Rooms"}</h3>
                  {offer.rooms.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{ar ? r.name_ar : r.name_en}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.occupancy} {ar ? "أشخاص" : "persons"} · {fmt(r.price, currency)} ·{" "}
                          {r.available_rooms} {ar ? "متاح" : "left"}
                        </p>
                      </div>
                      <Counter
                        label=""
                        value={rooms[r.id] ?? 0}
                        max={r.available_rooms}
                        onChange={(v) => setRooms((p) => ({ ...p, [r.id]: v }))}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h2 className="font-bold">{ar ? "خدمات إضافية وكود الخصم" : "Extras & coupon"}</h2>
              {optionalServices.length ? (
                <div className="space-y-2">
                  {optionalServices.map((s) => {
                    const on = serviceIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() =>
                          setServiceIds((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))
                        }
                        className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-start ${
                          on ? "border-forest bg-mint/40" : "border-border"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold">{ar ? s.name_ar : s.name_en}</p>
                          <p className="text-xs text-muted-foreground">
                            {ar ? s.description_ar : s.description_en}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-forest">
                          +{fmt(s.extra_price, currency)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {ar ? "لا توجد خدمات إضافية لهذه الباقة." : "No optional extras for this package."}
                </p>
              )}

              <div className="space-y-1.5">
                <Label>{ar ? "كود الخصم" : "Coupon code"}</Label>
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="GUNITED10"
                  />
                  <Button variant="outline" onClick={() => setAppliedCoupon(couponCode.trim())}>
                    {ar ? "تطبيق" : "Apply"}
                  </Button>
                </div>
                {appliedCoupon && !couponError ? (
                  <p className="text-xs text-sage">
                    {ar ? "تم تطبيق الكود" : "Coupon applied"}: {appliedCoupon}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <h2 className="font-bold">{ar ? "بياناتك والمستندات" : "Your details & documents"}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={ar ? "الاسم الكامل" : "Full name"} value={name} onChange={setName} />
                <Field label={ar ? "البريد الإلكتروني" : "Email"} value={email} onChange={setEmail} type="email" />
                <Field label={ar ? "واتساب" : "WhatsApp"} value={whatsapp} onChange={setWhatsapp} />
                <Field label={ar ? "الجنسية" : "Nationality"} value={nationality} onChange={setNationality} />
              </div>
              <div className="space-y-1.5">
                <Label>{ar ? "ملاحظات" : "Notes"}</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
              {requiredDocs.length ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold">{ar ? "المستندات المطلوبة" : "Required documents"}</h3>
                  {requiredDocs.map((d) => (
                    <div key={d.key} className="space-y-1.5">
                      <Label>
                        {ar ? d.label_ar : d.label_en}
                        {d.required ? " *" : ""}
                      </Label>
                      <Input
                        type="file"
                        accept={ALLOWED.join(",")}
                        onChange={(e) =>
                          pickFile(e.target.files?.[0] ?? null, (f) =>
                            setDocFiles((p) => ({ ...p, [d.key]: f })),
                          )
                        }
                      />
                      {docFiles[d.key] ? (
                        <p className="text-xs text-sage">{docFiles[d.key]!.name}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}

          {step === 5 ? (
            <>
              <h2 className="font-bold">{ar ? "الدفع" : "Payment"}</h2>
              <div className="space-y-2">
                {methods.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMethodId(m.id)}
                    className={`w-full rounded-xl border p-3 text-start ${
                      methodId === m.id ? "border-forest bg-mint/40" : "border-border"
                    }`}
                  >
                    <p className="text-sm font-semibold">{ar ? m.name_ar : m.name_en}</p>
                    <p className="text-xs text-muted-foreground">
                      {[m.account_holder, m.account_number, m.iban, m.branch]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {(ar ? m.instructions_ar : m.instructions_en) ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ar ? m.instructions_ar : m.instructions_en}
                      </p>
                    ) : null}
                  </button>
                ))}
              </div>
              <Field
                label={ar ? "رقم الحوالة / المرجع" : "Transfer reference"}
                value={reference}
                onChange={setReference}
              />
              <div className="space-y-1.5">
                <Label>{ar ? "إيصال التحويل" : "Transfer receipt"} *</Label>
                <Input
                  type="file"
                  accept={ALLOWED.join(",")}
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null, setReceipt)}
                />
                {receipt ? (
                  <p className="flex items-center gap-1.5 text-xs text-sage">
                    <Upload className="size-3.5" />
                    {receipt.name}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        {/* Live price breakdown */}
        <div className="surface-card mt-5 space-y-2 p-5 text-sm">
          <h2 className="font-bold">{ar ? "تفاصيل السعر" : "Price breakdown"}</h2>
          {quoteQuery.isPending || !quote ? (
            <p className="text-muted-foreground">{ar ? "جارٍ الحساب…" : "Calculating…"}</p>
          ) : (
            <dl className="space-y-1.5">
              <Line
                label={quote.roomsUsd > 0 ? (ar ? "الغرف" : "Rooms") : ar ? "السعر الأساسي" : "Base"}
                value={fmt(quote.roomsUsd > 0 ? quote.rooms : quote.base, quote.currency)}
              />
              {quote.extrasUsd > 0 ? (
                <Line label={ar ? "خدمات إضافية" : "Extras"} value={fmt(quote.extras, quote.currency)} />
              ) : null}
              {quote.discountUsd > 0 ? (
                <Line label={ar ? "خصم" : "Discount"} value={`− ${fmt(quote.discount, quote.currency)}`} />
              ) : null}
              {quote.couponUsd > 0 ? (
                <Line
                  label={`${ar ? "كود" : "Coupon"} ${quote.couponCode ?? ""}`}
                  value={`− ${fmt(quote.coupon, quote.currency)}`}
                />
              ) : null}
              {quote.taxUsd > 0 ? (
                <Line label={ar ? "ضريبة" : "Tax"} value={fmt(quote.tax, quote.currency)} />
              ) : null}
              {quote.feesUsd > 0 ? (
                <Line label={ar ? "رسوم" : "Fees"} value={fmt(quote.fees, quote.currency)} />
              ) : null}
              <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
                <span>{ar ? "الإجمالي" : "Total"}</span>
                <span className="text-forest">{fmt(quote.total, quote.currency)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {fmt(quote.perPerson, quote.currency)} {ar ? "للفرد" : "per person"} ·{" "}
                {quote.totalPax} {ar ? "مسافر" : "travellers"}
              </p>
            </dl>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="gap-2"
          >
            <ArrowLeft className="size-4" />
            {ar ? "رجوع" : "Back"}
          </Button>
          {step < 5 ? (
            <Button onClick={next} className="gap-2">
              {ar ? "متابعة" : "Continue"}
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={mutation.isPending} className="gap-2">
              {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {ar ? "تأكيد الحجز" : "Confirm booking"}
            </Button>
          )}
        </div>
      </div>
    </StoreLayout>
  );
}

function Counter({
  label,
  hint,
  value,
  min = 0,
  max = 40,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      {label ? (
        <div>
          <p className="text-sm font-semibold">{label}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus className="size-4" />
        </Button>
        <span className="w-8 text-center font-bold">{value}</span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
