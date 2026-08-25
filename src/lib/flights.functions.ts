import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./admin.shared";

const locationInput = z.object({
  keyword: z.string().min(1).max(60),
  subType: z.enum(["AIRPORT", "CITY", "AIRPORT,CITY"]).default("AIRPORT,CITY"),
});

const searchInput = z.object({
  origin: z.string().trim().length(3).toUpperCase(),
  destination: z.string().trim().length(3).toUpperCase(),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  adults: z.coerce.number().int().min(1).max(9).default(1),
  children: z.coerce.number().int().min(0).max(8).default(0),
  travelClass: z.enum(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]).optional(),
  nonStop: z.boolean().default(false),
  currencyCode: z.string().trim().length(3).toUpperCase().default("USD"),
  max: z.coerce.number().int().min(1).max(50).default(20),
});

const travelerInput = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(["MALE", "FEMALE"]),
  email: z.string().email(),
  countryCallingCode: z.string().regex(/^\d{1,4}$/),
  phone: z.string().regex(/^\d{5,15}$/),
});

export const searchAirports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => locationInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { amadeusRequest } = await import("./amadeus.server");
    const res = await amadeusRequest<{ data?: any[] }>("/v1/reference-data/locations", {
      query: { keyword: data.keyword, subType: data.subType, "page[limit]": 10, view: "LIGHT" },
    });
    const rows = (res.data ?? []).map((l) => ({
      iataCode: l.iataCode as string,
      name: l.name as string,
      subType: l.subType as string,
      cityName: (l.address?.cityName ?? "") as string,
      countryName: (l.address?.countryName ?? "") as string,
    }));
    return { locations: rows };
  });

export const searchFlightOffers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => searchInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { amadeusRequest, AmadeusError } = await import("./amadeus.server");
    const res = await amadeusRequest<{ data?: any[]; dictionaries?: any }>(
      "/v2/shopping/flight-offers",
      {
        query: {
          originLocationCode: data.origin,
          destinationLocationCode: data.destination,
          departureDate: data.departureDate,
          returnDate: data.returnDate || undefined,
          adults: data.adults,
          children: data.children || undefined,
          travelClass: data.travelClass,
          nonStop: data.nonStop ? "true" : undefined,
          currencyCode: data.currencyCode,
          max: data.max,
        },
      },
    );
    const offers = res.data ?? [];
    if (offers.length === 0) throw new AmadeusError("AMADEUS_NO_RESULTS");
    return { offers, dictionaries: res.dictionaries ?? {} };
  });

export const priceFlightOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ offer: z.any() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { amadeusRequest } = await import("./amadeus.server");
    const res = await amadeusRequest<{ data?: any }>(
      "/v1/shopping/flight-offers/pricing?forceClass=false",
      {
        method: "POST",
        body: { data: { type: "flight-offers-pricing", flightOffers: [data.offer] } },
      },
    );
    return { priced: res.data?.flightOffers?.[0] ?? null, full: res.data ?? null };
  });

export const createFlightOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ offer: z.any(), travelers: z.array(travelerInput).min(1).max(9) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { amadeusRequest, loadAmadeusCredentials } = await import("./amadeus.server");

    const travelers = data.travelers.map((t, i) => ({
      id: String(i + 1),
      dateOfBirth: t.dateOfBirth,
      name: { firstName: t.firstName.toUpperCase(), lastName: t.lastName.toUpperCase() },
      gender: t.gender,
      contact: {
        emailAddress: t.email,
        phones: [
          {
            deviceType: "MOBILE",
            countryCallingCode: t.countryCallingCode,
            number: t.phone,
          },
        ],
      },
    }));

    const res = await amadeusRequest<{ data?: any }>("/v1/booking/flight-orders", {
      method: "POST",
      body: { data: { type: "flight-order", flightOffers: [data.offer], travelers } },
    });

    const order = res.data;
    if (!order?.id) throw new Error("AMADEUS_ERROR: order was not created");

    const itineraries = order.flightOffers?.[0]?.itineraries ?? [];
    const firstSeg = itineraries[0]?.segments?.[0];
    const outboundSegs = itineraries[0]?.segments ?? [];
    const lastSeg = outboundSegs[outboundSegs.length - 1];
    const returnSeg = itineraries[1]?.segments?.[0];
    const { environment } = await loadAmadeusCredentials();

    await context.supabase.from("flight_bookings").insert({
      amadeus_order_id: order.id,
      reference: order.associatedRecords?.[0]?.reference ?? null,
      environment,
      status: "confirmed",
      origin: firstSeg?.departure?.iataCode ?? null,
      destination: lastSeg?.arrival?.iataCode ?? null,
      departure_date: firstSeg?.departure?.at?.slice(0, 10) ?? null,
      return_date: returnSeg?.departure?.at?.slice(0, 10) ?? null,
      travelers: travelers as any,
      itinerary: itineraries as any,
      total_amount: Number(order.flightOffers?.[0]?.price?.grandTotal ?? 0),
      currency_code: order.flightOffers?.[0]?.price?.currency ?? "USD",
      customer_email: data.travelers[0]?.email ?? null,
      raw_order: order as any,
      created_by: context.userId,
    });

    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      action: "flight.order.create",
      entity: "flight_bookings",
      entity_id: order.id,
      after_data: { reference: order.associatedRecords?.[0]?.reference ?? null } as any,
    });

    return { orderId: order.id as string, reference: order.associatedRecords?.[0]?.reference ?? null };
  });

export const listFlightBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data } = await context.supabase
      .from("flight_bookings")
      .select(
        "id,amadeus_order_id,reference,environment,status,origin,destination,departure_date,return_date,total_amount,currency_code,customer_email,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

/** Order Management: live retrieve straight from Amadeus, never from our cache. */
export const getFlightOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().min(3).max(120) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { amadeusRequest } = await import("./amadeus.server");
    const res = await amadeusRequest<{ data?: any }>(
      `/v1/booking/flight-orders/${encodeURIComponent(data.orderId)}`,
    );
    return { order: res.data ?? null };
  });

export const cancelFlightOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().min(3).max(120) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { amadeusRequest } = await import("./amadeus.server");
    await amadeusRequest(`/v1/booking/flight-orders/${encodeURIComponent(data.orderId)}`, {
      method: "DELETE",
    });

    await context.supabase
      .from("flight_bookings")
      .update({ status: "cancelled" })
      .eq("amadeus_order_id", data.orderId);

    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      action: "flight.order.cancel",
      entity: "flight_bookings",
      entity_id: data.orderId,
    });

    return { ok: true };
  });
