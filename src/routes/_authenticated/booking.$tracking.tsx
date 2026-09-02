import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2 } from "lucide-react";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { getMyBooking } from "@/lib/packages.functions";

export const Route = createFileRoute("/_authenticated/booking/$tracking")({
  head: () => ({
    meta: [
      { title: "Booking confirmation — Gunited Travel | تأكيد الحجز" },
      {
        name: "description",
        content:
          "Your Gunited Travel booking confirmation with tracking number, priced breakdown, payment status and invoice details.",
      },
      { property: "og:title", content: "Booking confirmation — Gunited Travel" },
      {
        property: "og:description",
        content: "Tracking number, price breakdown and payment status for your booking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookingConfirmation,
});

function BookingConfirmation() {
  const { tracking } = Route.useParams();
  const { lang, fmt } = useI18n();
  const ar = lang === "ar";
  const fetchBooking = useServerFn(getMyBooking);

  const query = useQuery({
    queryKey: ["my-booking", tracking],
    queryFn: () => fetchBooking({ data: { tracking } }),
  });

  if (query.isPending) {
    return (
      <StoreLayout>
        <div className="grid place-items-center px-5 py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </StoreLayout>
    );
  }

  const data = query.data;
  if (!data) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-lg px-5 py-24 text-center">
          <p className="font-semibold">{ar ? "لم يتم العثور على الحجز" : "Booking not found"}</p>
          <Button asChild className="mt-6">
            <Link to="/offers">{ar ? "كل الباقات" : "All packages"}</Link>
          </Button>
        </div>
      </StoreLayout>
    );
  }

  const { order, offer, method, invoice, snapshot } = data;
  const quote = snapshot?.quote ?? null;

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-2xl px-5 pb-16">
        <div className="surface-card space-y-4 p-6 text-center">
          <CheckCircle2 className="mx-auto size-12 text-sage" />
          <h1 className="text-2xl font-bold">{ar ? "تم استلام حجزك" : "Booking received"}</h1>
          <p className="text-sm text-muted-foreground">
            {ar
              ? "سنراجع الدفع ونحدّث حالة الطلب. يمكنك متابعة الطلب برقم التتبع."
              : "We will verify your payment and update the order status. Track it any time with your tracking number."}
          </p>
          <p className="text-lg font-bold tracking-wide text-forest">{order.tracking_id}</p>
        </div>

        <div className="surface-card mt-5 space-y-2 p-5 text-sm">
          <h2 className="font-bold">{ar ? "تفاصيل الحجز" : "Booking details"}</h2>
          {offer ? <Row label={ar ? "الباقة" : "Package"} value={ar ? offer.title_ar : offer.title_en} /> : null}
          {snapshot?.travelDate ? (
            <Row label={ar ? "تاريخ السفر" : "Travel date"} value={snapshot.travelDate} />
          ) : null}
          {snapshot?.passengers ? (
            <Row
              label={ar ? "المسافرون" : "Travellers"}
              value={`${snapshot.passengers.adults} ${ar ? "بالغ" : "adults"} · ${snapshot.passengers.children} ${ar ? "طفل" : "children"} · ${snapshot.passengers.infants} ${ar ? "رضيع" : "infants"}`}
            />
          ) : null}
          {Array.isArray(snapshot?.rooms) && snapshot.rooms.length ? (
            <Row
              label={ar ? "الغرف" : "Rooms"}
              value={snapshot.rooms
                .filter((r: any) => r.qty > 0)
                .map((r: any) => `${r.qty}× ${ar ? r.name_ar : r.name_en}`)
                .join(", ")}
            />
          ) : null}
          <Row label={ar ? "حالة الطلب" : "Order status"} value={order.status} />
          {method ? (
            <Row label={ar ? "طريقة الدفع" : "Payment method"} value={ar ? method.name_ar : method.name_en} />
          ) : null}
        </div>

        <div className="surface-card mt-5 space-y-2 p-5 text-sm">
          <h2 className="font-bold">{ar ? "السعر المسجَّل" : "Recorded price"}</h2>
          {quote ? (
            <>
              <Row
                label={quote.roomsUsd > 0 ? (ar ? "الغرف" : "Rooms") : ar ? "السعر الأساسي" : "Base"}
                value={fmt(quote.roomsUsd > 0 ? quote.rooms : quote.base, quote.currency)}
              />
              {quote.extrasUsd > 0 ? (
                <Row label={ar ? "خدمات إضافية" : "Extras"} value={fmt(quote.extras, quote.currency)} />
              ) : null}
              {quote.discountUsd > 0 ? (
                <Row label={ar ? "خصم" : "Discount"} value={`− ${fmt(quote.discount, quote.currency)}`} />
              ) : null}
              {quote.couponUsd > 0 ? (
                <Row
                  label={`${ar ? "كود" : "Coupon"} ${quote.couponCode ?? ""}`}
                  value={`− ${fmt(quote.coupon, quote.currency)}`}
                />
              ) : null}
              {quote.taxUsd > 0 ? <Row label={ar ? "ضريبة" : "Tax"} value={fmt(quote.tax, quote.currency)} /> : null}
              {quote.feesUsd > 0 ? <Row label={ar ? "رسوم" : "Fees"} value={fmt(quote.fees, quote.currency)} /> : null}
            </>
          ) : null}
          <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
            <span>{ar ? "الإجمالي" : "Total"}</span>
            <span className="text-forest">
              {fmt(Number(order.amount_display), order.currency_code)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {ar ? "المبلغ المرجعي بالدولار" : "USD anchor"}: {Number(order.amount_usd).toFixed(2)} USD
          </p>
          {invoice ? (
            <p className="text-xs text-muted-foreground">
              {ar ? "الفاتورة" : "Invoice"}: {invoice.invoice_number} · {invoice.status}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/track" search={{ ref: order.tracking_id } as never}>
              {ar ? "تتبع الطلب" : "Track order"}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/offers">{ar ? "تصفح الباقات" : "Browse packages"}</Link>
          </Button>
        </div>
      </div>
    </StoreLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
