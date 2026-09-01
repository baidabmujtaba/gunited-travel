import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Globe,
  Info,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  User,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getDestinations, getOffer } from "@/lib/catalog.functions";
import { NATIONALITIES } from "@/lib/countries";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/request/$slug")({
  head: () => ({
    meta: [
      { title: "Submit a Request — Gunited Travel | تقديم طلب موافقة" },
      {
        name: "description",
        content:
          "Start your Gunited Travel approval request: confirm the service, nationality, destination and number of travellers before uploading documents.",
      },
      { property: "og:title", content: "Submit a Request — Gunited Travel" },
      {
        property: "og:description",
        content: "Guided approval request: service, traveller details, documents and payment.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RequestPage,
  errorComponent: ({ error }) => (
    <p className="p-6 text-sm text-destructive">{error.message}</p>
  ),
  notFoundComponent: () => <p className="p-6 text-sm">404</p>,
});

const STEP_KEYS = [
  "request.step.type",
  "request.step.data",
  "request.step.docs",
  "request.step.payment",
  "request.step.confirm",
] as const;

/** Session-scoped hand-off so step 3 (documents/payment) keeps the traveller details. */
export const REQUEST_DRAFT_PREFIX = "gt-request-draft:";

function RequestPage() {
  const { slug } = Route.useParams();
  const i18n = useI18n();
  const t = i18n.t;
  const lang = i18n.lang;
  const rtl = i18n.dir === "rtl";
  const navigate = useNavigate();
  const Back = rtl ? ArrowRight : ArrowLeft;
  const Forward = rtl ? ArrowLeft : ArrowRight;

  const offerQuery = useQuery({
    queryKey: ["request-offer", slug],
    queryFn: () => getOffer({ data: { slug, currency: "USD" } }),
  });
  const destinationsQuery = useQuery({
    queryKey: ["destinations"],
    queryFn: () => getDestinations(),
  });

  const offer = offerQuery.data?.offer ?? null;
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [gender, setGender] = useState("");
  const [nationality, setNationality] = useState("");
  const [destination, setDestination] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [borderPoint, setBorderPoint] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [travelers, setTravelers] = useState(1);

  const currentStep = 1; // zero-based: "البيانات"

  const canProceed =
    Boolean(fullName.trim()) &&
    Boolean(email.trim()) &&
    Boolean(whatsapp.trim()) &&
    Boolean(passportNumber.trim()) &&
    Boolean(nationality) &&
    Boolean(destination);

  const proceed = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        `${REQUEST_DRAFT_PREFIX}${slug}`,
        JSON.stringify({
          fullName,
          email,
          whatsapp,
          passportNumber,
          passportExpiry,
          gender,
          nationality,
          destination,
          travelDate,
          borderPoint,
          purpose,
          notes,
          travelers,
        }),
      );
    }
    void navigate({ to: "/checkout/$slug", params: { slug }, search: { currency: "USD" } });
  };


  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="sticky top-0 z-30 bg-forest text-primary-foreground shadow-soft">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
          <Link to="/select" aria-label={t("common.back")} className="rounded-lg p-2 hover:bg-white/10">
            <Back className="size-5" />
          </Link>
          <h1 className="flex-1 text-center font-display text-base font-bold">
            {t("request.title")}
          </h1>
          <span className="size-9" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4">
        <ol className="flex items-start justify-between gap-1 overflow-hidden py-5">
          {STEP_KEYS.map((key, index) => {
            const done = index < currentStep;
            const active = index === currentStep;
            return (
              <li key={key} className="relative flex flex-1 flex-col items-center gap-2">
                {index > 0 && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-4 h-0.5 w-full",
                      rtl ? "start-1/2" : "end-1/2",
                      index <= currentStep ? "bg-gold" : "bg-border",
                    )}
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 grid size-8 place-items-center rounded-full text-xs font-bold",
                    done && "bg-gold text-forest-deep",
                    active && "bg-gold text-forest-deep ring-4 ring-gold/25",
                    !done && !active && "bg-beige text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-4" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "text-center text-[10px] leading-tight",
                    active ? "font-bold text-forest-deep" : "text-muted-foreground",
                  )}
                >
                  {t(key)}
                </span>
              </li>
            );
          })}
        </ol>

        {offerQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-forest" />
          </div>
        ) : !offer ? (
          <p className="surface-card bg-white p-6 text-sm text-destructive">
            {t("request.not_found")}
          </p>
        ) : (
          <div className="space-y-5">
            <article className="surface-card flex items-center gap-3 bg-white p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-forest">
                <ShieldCheck className="size-5 text-primary-foreground" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{t("request.selected")}</p>
                <p className="truncate text-sm font-bold text-forest-deep">
                  {lang === "ar" ? offer.title_ar : offer.title_en}
                </p>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {lang === "ar" ? offer.description_ar : offer.description_en}
                </p>
              </div>
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-forest/10">
                <Check className="size-4 text-forest" />
              </span>
            </article>

            <SelectField
              label={t("request.nationality")}
              placeholder={t("request.nationality_placeholder")}
              icon={<Globe className="size-4 text-forest" />}
              value={nationality}
              onChange={setNationality}
              options={NATIONALITIES.map((c) => ({
                value: c.code,
                label: lang === "ar" ? c.name_ar : c.name_en,
              }))}
            />

            <SelectField
              label={t("request.destination")}
              placeholder={t("request.destination_placeholder")}
              icon={<MapPin className="size-4 text-forest" />}
              value={destination}
              onChange={setDestination}
              options={(destinationsQuery.data ?? []).map((d) => ({
                value: d.code,
                label: lang === "ar" ? d.name_ar : d.name_en,
              }))}
            />

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-forest-deep">{t("request.travelers")}</p>
              <div className="flex items-center justify-between rounded-2xl border border-border bg-white p-3">
                <button
                  type="button"
                  aria-label={t("request.decrease")}
                  onClick={() => setTravelers((n) => Math.max(1, n - 1))}
                  className="grid size-9 place-items-center rounded-full border border-border text-forest-deep disabled:opacity-40"
                  disabled={travelers <= 1}
                >
                  <Minus className="size-4" />
                </button>
                <span className="flex items-center gap-2">
                  <User className="size-4 text-forest" />
                  <span className="text-xl font-bold text-forest-deep">{travelers}</span>
                </span>
                <button
                  type="button"
                  aria-label={t("request.increase")}
                  onClick={() => setTravelers((n) => Math.min(20, n + 1))}
                  className="grid size-9 place-items-center rounded-full bg-forest text-primary-foreground"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-2xl bg-beige/50 p-3 text-xs text-forest-deep">
              <Info className="mt-0.5 size-4 shrink-0 text-gold" />
              <p>{t("request.info")}</p>
            </div>

            <Button
              className="h-12 w-full rounded-2xl text-sm font-bold"
              disabled={!nationality || !destination}
              onClick={proceed}
            >
              {t("request.continue")}
              <Forward className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SelectField({
  label,
  placeholder,
  icon,
  value,
  onChange,
  options,
}: {
  label: string;
  placeholder: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-forest-deep">{label}</label>
      <div className="relative flex items-center rounded-2xl border border-border bg-white px-3">
        <span className="shrink-0">{icon}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className={cn(
            "h-12 w-full appearance-none bg-transparent px-2 text-sm outline-none",
            value ? "text-forest-deep" : "text-muted-foreground",
          )}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </div>
    </div>
  );
}
