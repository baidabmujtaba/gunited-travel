import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { amadeusMessage } from "@/lib/amadeus-errors";
import { useI18n } from "@/lib/i18n";
import {
  cancelFlightOrder,
  createFlightOrder,
  getFlightOrder,
  listFlightBookings,
  priceFlightOffer,
  searchAirports,
  searchFlightOffers,
} from "@/lib/flights.functions";

export const Route = createFileRoute("/_authenticated/admin/flights")({
  head: () => ({
    meta: [
      { title: "Flight Search & Bookings — Gunited Travel ERP" },
      {
        name: "description",
        content:
          "Live Amadeus flight search, final pricing, order creation and booking management for the Gunited Travel team.",
      },
      { property: "og:title", content: "Flight Search & Bookings — Gunited Travel ERP" },
      {
        property: "og:description",
        content: "Search real airline offers, confirm pricing and issue flight orders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminFlightsPage,
  errorComponent: ({ error }) => (
    <p className="surface-card p-6 text-sm text-destructive">{error.message}</p>
  ),
  notFoundComponent: () => <p className="surface-card p-6 text-sm">404</p>,
});

type Traveler = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE";
  email: string;
  countryCallingCode: string;
  phone: string;
};

const emptyTraveler = (): Traveler => ({
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "MALE",
  email: "",
  countryCallingCode: "249",
  phone: "",
});

function duration(iso?: string) {
  if (!iso) return "—";
  return iso.replace("PT", "").replace("H", "h ").replace("M", "m").toLowerCase();
}

function timeOf(at?: string) {
  return at ? at.slice(11, 16) : "--:--";
}

function AdminFlightsPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    origin: "",
    destination: "",
    departureDate: "",
    returnDate: "",
    adults: 1,
    children: 0,
    travelClass: "ANY",
    nonStop: false,
    currencyCode: "USD",
  });
  const [lookup, setLookup] = useState("");
  const [offers, setOffers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [priced, setPriced] = useState<any | null>(null);
  const [travelers, setTravelers] = useState<Traveler[]>([emptyTraveler()]);
  const [liveOrder, setLiveOrder] = useState<any | null>(null);

  const fail = (e: unknown) => {
    const { message, detail } = amadeusMessage(e, t);
    toast.error(message, { description: detail || undefined });
  };

  const locations = useMutation({
    mutationFn: (keyword: string) => searchAirports({ data: { keyword, subType: "AIRPORT,CITY" } }),
    onError: fail,
  });

  const search = useMutation({
    mutationFn: () =>
      searchFlightOffers({
        data: {
          origin: form.origin,
          destination: form.destination,
          departureDate: form.departureDate,
          returnDate: form.returnDate || undefined,
          adults: form.adults,
          children: form.children,
          travelClass: form.travelClass === "ANY" ? undefined : (form.travelClass as any),
          nonStop: form.nonStop,
          currencyCode: form.currencyCode,
          max: 20,
        },
      }),
    onSuccess: (res) => {
      setOffers(res.offers);
      setSelected(null);
      setPriced(null);
    },
    onError: (e) => {
      setOffers([]);
      fail(e);
    },
  });

  const price = useMutation({
    mutationFn: (offer: any) => priceFlightOffer({ data: { offer } }),
    onSuccess: (res, offer) => {
      setSelected(res.priced ?? offer);
      setPriced(res.priced);
      const before = Number(offer?.price?.grandTotal ?? 0);
      const after = Number(res.priced?.price?.grandTotal ?? before);
      toast.success(
        after !== before ? t("flights.price.changed") : t("flights.price.confirmed"),
        { description: `${after} ${res.priced?.price?.currency ?? form.currencyCode}` },
      );
    },
    onError: fail,
  });

  const book = useMutation({
    mutationFn: () => createFlightOrder({ data: { offer: priced ?? selected, travelers } }),
    onSuccess: (res) => {
      toast.success(t("flights.booked"), { description: res.reference ?? res.orderId });
      setSelected(null);
      setPriced(null);
      setOffers([]);
      setTravelers([emptyTraveler()]);
      void qc.invalidateQueries({ queryKey: ["flight-bookings"] });
    },
    onError: fail,
  });

  const bookings = useQuery({
    queryKey: ["flight-bookings"],
    queryFn: () => listFlightBookings(),
  });

  const retrieve = useMutation({
    mutationFn: (orderId: string) => getFlightOrder({ data: { orderId } }),
    onSuccess: (res) => setLiveOrder(res.order),
    onError: fail,
  });

  const cancel = useMutation({
    mutationFn: (orderId: string) => cancelFlightOrder({ data: { orderId } }),
    onSuccess: () => {
      toast.success(t("flights.orders.cancelled"));
      setLiveOrder(null);
      void qc.invalidateQueries({ queryKey: ["flight-bookings"] });
    },
    onError: fail,
  });

  const paxCount = form.adults + form.children;
  const travelerRows = useMemo(() => {
    if (travelers.length === paxCount) return travelers;
    const next = [...travelers];
    while (next.length < paxCount) next.push(emptyTraveler());
    return next.slice(0, paxCount);
  }, [travelers, paxCount]);

  const setTraveler = (i: number, patch: Partial<Traveler>) => {
    const next = [...travelerRows];
    next[i] = { ...next[i]!, ...patch };
    setTravelers(next);
  };

  const canSearch = form.origin.length === 3 && form.destination.length === 3 && form.departureDate;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-forest-deep">{t("flights.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("flights.subtitle")}</p>
      </header>

      <Tabs defaultValue="search">
        <TabsList>
          <TabsTrigger value="search">{t("flights.tab.search")}</TabsTrigger>
          <TabsTrigger value="orders">{t("flights.tab.orders")}</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-5 pt-4">
          <section className="surface-card space-y-4 p-5">
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <Label>{t("flights.origin")}</Label>
                <Input
                  value={form.origin}
                  maxLength={3}
                  placeholder="KRT"
                  onChange={(e) => setForm({ ...form, origin: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <Label>{t("flights.destination")}</Label>
                <Input
                  value={form.destination}
                  maxLength={3}
                  placeholder="DXB"
                  onChange={(e) => setForm({ ...form, destination: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <Label>{t("flights.depart")}</Label>
                <Input
                  type="date"
                  value={form.departureDate}
                  onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("flights.return")}</Label>
                <Input
                  type="date"
                  value={form.returnDate}
                  onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("flights.adults")}</Label>
                <Input
                  type="number"
                  min={1}
                  max={9}
                  value={form.adults}
                  onChange={(e) => setForm({ ...form, adults: Number(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>{t("flights.children")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={8}
                  value={form.children}
                  onChange={(e) => setForm({ ...form, children: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>{t("flights.class")}</Label>
                <Select
                  value={form.travelClass}
                  onValueChange={(v) => setForm({ ...form, travelClass: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">{t("flights.class.any")}</SelectItem>
                    <SelectItem value="ECONOMY">Economy</SelectItem>
                    <SelectItem value="PREMIUM_ECONOMY">Premium economy</SelectItem>
                    <SelectItem value="BUSINESS">Business</SelectItem>
                    <SelectItem value="FIRST">First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("flights.currency")}</Label>
                <Input
                  value={form.currencyCode}
                  maxLength={3}
                  onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.nonStop}
                  onChange={(e) => setForm({ ...form, nonStop: e.target.checked })}
                />
                {t("flights.nonstop")}
              </label>
              <Button
                className="bg-forest text-cream hover:bg-forest-deep"
                disabled={!canSearch || search.isPending}
                onClick={() => search.mutate()}
              >
                {search.isPending ? t("flights.searching") : t("flights.search")}
              </Button>
            </div>

            <div className="rounded-lg border border-border/70 p-3">
              <p className="text-xs text-muted-foreground">{t("flights.lookup.hint")}</p>
              <div className="mt-2 flex gap-2">
                <Input
                  value={lookup}
                  placeholder="Khartoum"
                  onChange={(e) => setLookup(e.target.value)}
                />
                <Button
                  variant="outline"
                  disabled={lookup.trim().length < 2 || locations.isPending}
                  onClick={() => locations.mutate(lookup.trim())}
                >
                  {t("flights.lookup")}
                </Button>
              </div>
              {locations.data?.locations?.length ? (
                <ul className="mt-3 grid gap-1 text-sm md:grid-cols-2">
                  {locations.data.locations.map((l) => (
                    <li key={`${l.subType}-${l.iataCode}-${l.name}`} className="flex items-center gap-2">
                      <Badge className="bg-mint text-forest-deep">{l.iataCode}</Badge>
                      <span>
                        {l.name} · {l.cityName} {l.countryName ? `(${l.countryName})` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>

          {offers.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-deep">{t("flights.results")}</h2>
              {offers.map((offer) => {
                const isSelected = selected?.id === offer.id;
                return (
                  <article key={offer.id} className="surface-card space-y-3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-2">
                        {(offer.itineraries ?? []).map((it: any, idx: number) => {
                          const segs = it.segments ?? [];
                          const first = segs[0];
                          const last = segs[segs.length - 1];
                          return (
                            <div key={idx} className="text-sm">
                              <span className="font-semibold text-forest-deep">
                                {first?.departure?.iataCode} {timeOf(first?.departure?.at)} →{" "}
                                {last?.arrival?.iataCode} {timeOf(last?.arrival?.at)}
                              </span>
                              <span className="ms-2 text-muted-foreground">
                                {duration(it.duration)} ·{" "}
                                {segs.length > 1
                                  ? `${segs.length - 1} ${t("flights.stops")}`
                                  : t("flights.nonstopLabel")}{" "}
                                · {segs.map((s: any) => `${s.carrierCode}${s.number}`).join(", ")}
                              </span>
                            </div>
                          );
                        })}
                        {offer.numberOfBookableSeats ? (
                          <p className="text-xs text-muted-foreground">
                            {t("flights.seats")}: {offer.numberOfBookableSeats}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-end">
                        <p className="text-xl font-bold text-forest-deep">
                          {offer.price?.grandTotal} {offer.price?.currency}
                        </p>
                        <Button
                          size="sm"
                          className="mt-2 bg-gold text-forest-deep hover:bg-gold/90"
                          disabled={price.isPending}
                          onClick={() => price.mutate(offer)}
                        >
                          {t("flights.price.confirm")}
                        </Button>
                      </div>
                    </div>
                    {isSelected && priced ? (
                      <p className="rounded-md bg-mint/40 px-3 py-2 text-xs text-forest-deep">
                        {t("flights.price.confirmed")} — {priced.price?.grandTotal}{" "}
                        {priced.price?.currency}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </section>
          ) : null}

          {selected ? (
            <section className="surface-card space-y-4 p-5">
              <h2 className="text-lg font-semibold text-forest-deep">{t("flights.travelers")}</h2>
              {travelerRows.map((tr, i) => (
                <div key={i} className="grid gap-3 border-t border-border/60 pt-3 md:grid-cols-4">
                  <p className="md:col-span-4 text-sm font-semibold text-forest">
                    {t("flights.traveler")} {i + 1}
                  </p>
                  <div>
                    <Label>{t("flights.firstName")}</Label>
                    <Input
                      value={tr.firstName}
                      onChange={(e) => setTraveler(i, { firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t("flights.lastName")}</Label>
                    <Input
                      value={tr.lastName}
                      onChange={(e) => setTraveler(i, { lastName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t("flights.dob")}</Label>
                    <Input
                      type="date"
                      value={tr.dateOfBirth}
                      onChange={(e) => setTraveler(i, { dateOfBirth: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t("flights.gender")}</Label>
                    <Select
                      value={tr.gender}
                      onValueChange={(v) => setTraveler(i, { gender: v as Traveler["gender"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">{t("flights.gender.male")}</SelectItem>
                        <SelectItem value="FEMALE">{t("flights.gender.female")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>{t("flights.email")}</Label>
                    <Input
                      type="email"
                      value={tr.email}
                      onChange={(e) => setTraveler(i, { email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t("flights.countryCode")}</Label>
                    <Input
                      value={tr.countryCallingCode}
                      onChange={(e) =>
                        setTraveler(i, { countryCallingCode: e.target.value.replace(/\D/g, "") })
                      }
                    />
                  </div>
                  <div>
                    <Label>{t("flights.phone")}</Label>
                    <Input
                      value={tr.phone}
                      onChange={(e) => setTraveler(i, { phone: e.target.value.replace(/\D/g, "") })}
                    />
                  </div>
                </div>
              ))}
              <Button
                className="bg-forest text-cream hover:bg-forest-deep"
                disabled={book.isPending}
                onClick={() => book.mutate()}
              >
                {book.isPending ? t("flights.booking") : t("flights.book")}
              </Button>
            </section>
          ) : null}
        </TabsContent>

        <TabsContent value="orders" className="space-y-4 pt-4">
          <section className="surface-card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-beige/70 text-start text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 text-start">{t("flights.orders.ref")}</th>
                  <th className="p-3 text-start">{t("flights.orders.route")}</th>
                  <th className="p-3 text-start">{t("flights.depart")}</th>
                  <th className="p-3 text-start">{t("flights.orders.total")}</th>
                  <th className="p-3 text-start">{t("flights.orders.status")}</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {(bookings.data ?? []).map((b: any) => (
                  <tr key={b.id} className="border-t border-border/60">
                    <td className="p-3 font-semibold text-forest-deep">
                      {b.reference ?? b.amadeus_order_id}
                    </td>
                    <td className="p-3">
                      {b.origin} → {b.destination}
                    </td>
                    <td className="p-3">{b.departure_date ?? "—"}</td>
                    <td className="p-3">
                      {Number(b.total_amount).toFixed(2)} {b.currency_code}
                    </td>
                    <td className="p-3">
                      <Badge
                        className={
                          b.status === "cancelled"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-forest text-cream"
                        }
                      >
                        {b.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={retrieve.isPending}
                          onClick={() => retrieve.mutate(b.amadeus_order_id)}
                        >
                          {t("flights.orders.retrieve")}
                        </Button>
                        {b.status !== "cancelled" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            disabled={cancel.isPending}
                            onClick={() => {
                              if (window.confirm(t("flights.orders.cancelConfirm"))) {
                                cancel.mutate(b.amadeus_order_id);
                              }
                            }}
                          >
                            {t("flights.orders.cancel")}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {(bookings.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      {t("flights.orders.empty")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>

          {liveOrder ? (
            <section className="surface-card p-5">
              <h2 className="text-sm font-semibold text-forest-deep">{t("flights.orders.live")}</h2>
              <pre
                dir="ltr"
                className="mt-2 max-h-80 overflow-auto rounded-md bg-beige/60 p-3 text-xs"
              >
                {JSON.stringify(liveOrder, null, 2)}
              </pre>
            </section>
          ) : null}
        </TabsContent>
      </Tabs>
      <span className="hidden">{lang}</span>
    </div>
  );
}
