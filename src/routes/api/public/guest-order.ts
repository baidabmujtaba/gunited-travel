import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { normalizeCurrency } from "@/lib/currency";
import { normalizeDocs } from "@/lib/offer-docs";
import { computePrice } from "@/lib/pricing";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "application/pdf"]);
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 20;

const guestFields = z.object({
  offerId: z.string().uuid(),
  currency: z.unknown().transform(normalizeCurrency),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(255),
  whatsapp: z.string().trim().regex(/^\+?[0-9][0-9\s-]{6,22}$/),
  transactionReference: z.string().trim().min(2).max(80),
  paymentMethodId: z.string().uuid(),
  nationality: z.string().trim().max(80).optional(),
  destination: z.string().trim().max(80).optional(),
  travelers: z.coerce.number().int().min(1).max(50).default(1),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  flightNumber: z.string().trim().max(30).optional(),
  borderPoint: z.enum(["argeen", "halfa"]).optional(),
  vehicleDetails: z.string().trim().max(120).optional(),
  website: z.string().max(0).default(""),
});

type Uploaded = { bucket: "receipts" | "order-documents"; path: string };

function extension(file: File) {
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  return "jpg";
}

function validateFile(value: FormDataEntryValue | null, required = true): File | null {
  if (!(value instanceof File) || value.size === 0) {
    if (required) throw new Error("FILE_REQUIRED");
    return null;
  }
  if (!ALLOWED_TYPES.has(value.type)) throw new Error("FILE_TYPE_INVALID");
  if (value.size > MAX_FILE_BYTES) throw new Error("FILE_TOO_LARGE");
  return value;
}

export const Route = createFileRoute("/api/public/guest-order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        if (origin && origin !== new URL(request.url).origin) {
          return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
        }

        try {
          const form = await request.formData();
          const raw = Object.fromEntries(
            [
              "offerId",
              "currency",
              "customerName",
              "customerEmail",
              "whatsapp",
              "transactionReference",
              "paymentMethodId",
              "nationality",
              "destination",
              "travelers",
              "travelDate",
              "flightNumber",
              "borderPoint",
              "vehicleDetails",
              "website",
            ].map((key) => [key, form.get(key) || undefined]),
          );
          const parsed = guestFields.safeParse(raw);
          if (!parsed.success) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
          const data = parsed.data;

          const receipt = validateFile(form.get("receipt"));
          if (!receipt) return Response.json({ error: "FILE_REQUIRED" }, { status: 400 });
          const docKeys = form.getAll("documentKey").map(String);
          if (docKeys.length > MAX_FILES || new Set(docKeys).size !== docKeys.length) {
            return Response.json({ error: "INVALID_DOCUMENTS" }, { status: 400 });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: offer, error: offerError } = await supabaseAdmin
            .from("service_offers")
            .select(
              "id,category,base_price_usd,customer_price_usd,tax_percent,fee_amount_usd,discount_percent,commission_percent,title_en,status,allowed_payment_methods,required_documents",
            )
            .eq("id", data.offerId)
            .is("deleted_at", null)
            .maybeSingle();
          if (offerError || !offer || offer.status !== "active") {
            return Response.json({ error: "OFFER_UNAVAILABLE" }, { status: 404 });
          }

          const allowedMethods = Array.isArray(offer.allowed_payment_methods)
            ? (offer.allowed_payment_methods as string[])
            : [];
          if (allowedMethods.length > 0 && !allowedMethods.includes(data.paymentMethodId)) {
            return Response.json({ error: "PAYMENT_METHOD_NOT_ALLOWED" }, { status: 400 });
          }
          const { data: method } = await supabaseAdmin
            .from("payment_method_configs")
            .select("id")
            .eq("id", data.paymentMethodId)
            .eq("is_active", true)
            .maybeSingle();
          if (!method) return Response.json({ error: "PAYMENT_METHOD_NOT_ALLOWED" }, { status: 400 });

          const configuredDocs = normalizeDocs(offer.required_documents);
          const requiredDocs = [...configuredDocs.filter((doc) => doc.required)];
          if (offer.category === "security_approval" && !requiredDocs.some((doc) => doc.key === "passport")) {
            requiredDocs.push({
              key: "passport",
              label_en: "Passport copy",
              label_ar: "صورة جواز السفر",
              required: true,
            });
          }
          if (requiredDocs.some((doc) => !docKeys.includes(doc.key))) {
            return Response.json({ error: "DOCUMENTS_MISSING" }, { status: 400 });
          }

          const documents = docKeys.map((key) => {
            const configured = requiredDocs.find((doc) => doc.key === key) ?? configuredDocs.find((doc) => doc.key === key);
            if (!configured) throw new Error("INVALID_DOCUMENT_KEY");
            const file = validateFile(form.get(`document:${key}`));
            if (!file) throw new Error("FILE_REQUIRED");
            return { ...configured, file };
          });

          const [{ data: currency }, { data: rateRow }] = await Promise.all([
            supabaseAdmin.from("currencies").select("code,decimals").eq("code", data.currency).maybeSingle(),
            supabaseAdmin
              .from("exchange_rates")
              .select("rate_per_usd")
              .eq("currency_code", data.currency)
              .maybeSingle(),
          ]);
          if (!currency) return Response.json({ error: "CURRENCY_UNAVAILABLE" }, { status: 400 });
          const appliedPriceUsd = Number(offer.customer_price_usd ?? offer.base_price_usd);
          const price = computePrice(
            {
              basePriceUsd: appliedPriceUsd,
              taxPercent: offer.tax_percent,
              feeAmountUsd: offer.fee_amount_usd,
              discountPercent: offer.discount_percent,
              commissionPercent: offer.commission_percent,
            },
            data.currency,
            Number(rateRow?.rate_per_usd ?? 1),
            currency.decimals,
          );

          const orderId = crypto.randomUUID();
          const prefix = `guest/${orderId}`;
          const uploaded: Uploaded[] = [];
          try {
            const receiptPath = `${prefix}/receipt.${extension(receipt)}`;
            const { error: receiptError } = await supabaseAdmin.storage
              .from("receipts")
              .upload(receiptPath, receipt, { contentType: receipt.type, upsert: false });
            if (receiptError) throw receiptError;
            uploaded.push({ bucket: "receipts", path: receiptPath });

            const savedDocs: Array<{ key: string; label_en: string; label_ar: string; path: string; name: string }> = [];
            for (const doc of documents) {
              const safeKey = doc.key.replace(/[^a-zA-Z0-9_-]/g, "-");
              const path = `${prefix}/${safeKey}.${extension(doc.file)}`;
              const { error } = await supabaseAdmin.storage
                .from("order-documents")
                .upload(path, doc.file, { contentType: doc.file.type, upsert: false });
              if (error) throw error;
              uploaded.push({ bucket: "order-documents", path });
              savedDocs.push({
                key: doc.key,
                label_en: doc.label_en,
                label_ar: doc.label_ar,
                path,
                name: doc.file.name.slice(0, 200),
              });
            }

            const snapshot = {
              passengers: { adults: data.travelers, children: 0, infants: 0 },
              rooms: [],
              extras: [],
              nationality: data.nationality ?? null,
              destination: data.destination ?? null,
              travelDate: data.travelDate ?? null,
              flightNumber: data.flightNumber ?? null,
              borderPoint: data.borderPoint ?? null,
              vehicleDetails: data.vehicleDetails ?? null,
              priceContext: "customer",
            };
            const notes = [
              `Request · ${offer.title_en}`,
              `Travellers: ${data.travelers}`,
              data.nationality ? `Nationality: ${data.nationality}` : null,
              data.destination ? `Destination: ${data.destination}` : null,
              data.travelDate ? `Travel date: ${data.travelDate}` : null,
              data.flightNumber ? `Flight: ${data.flightNumber}` : null,
              data.borderPoint ? `Border: ${data.borderPoint}` : null,
              data.vehicleDetails ? `Vehicle: ${data.vehicleDetails}` : null,
              `SNAPSHOT ${JSON.stringify(snapshot)}`,
            ].filter(Boolean).join("\n");

            const { data: order, error: orderError } = await supabaseAdmin
              .from("service_orders")
              .insert({
                id: orderId,
                offer_id: offer.id,
                customer_id: null,
                customer_name: data.customerName,
                customer_email: data.customerEmail,
                whatsapp: data.whatsapp,
                currency_code: data.currency,
                frozen_rate: price.rate,
                amount_usd: price.totalUsd,
                applied_price_usd: appliedPriceUsd,
                price_context: "customer",
                amount_display: price.total,
                payment_method_id: data.paymentMethodId,
                transaction_reference: data.transactionReference,
                receipt_path: receiptPath,
                payment_notified_at: new Date().toISOString(),
                document_status: requiredDocs.length > 0 ? "documents_submitted" : "awaiting_documents",
                internal_notes: notes,
                status: "submitted",
              })
              .select("id,tracking_id")
              .single();
            if (orderError) throw orderError;

            if (savedDocs.length > 0) {
              const { error } = await supabaseAdmin.from("order_documents").insert(
                savedDocs.map((doc) => ({
                  order_id: order.id,
                  doc_key: doc.key,
                  label_en: doc.label_en,
                  label_ar: doc.label_ar,
                  file_path: doc.path,
                  file_name: doc.name,
                  uploaded_by: null,
                })),
              );
              if (error) throw error;
            }

            const { data: event } = await supabaseAdmin
              .from("order_status_history")
              .insert({
                order_id: order.id,
                new_status: "submitted",
                note: `Payment notified · ${savedDocs.length} document(s) uploaded`,
                actor_name: "Guest customer",
              })
              .select("id")
              .single();

            await Promise.all([
              supabaseAdmin.from("notifications").insert({
                audience: "staff",
                title_en: "New guest order received",
                title_ar: "طلب ضيف جديد",
                body_en: `${data.customerName} submitted order ${order.tracking_id} with a receipt.`,
                body_ar: `قام ${data.customerName} بإرسال الطلب ${order.tracking_id} مع الإيصال.`,
                link: `/track?ref=${order.tracking_id}`,
              }),
              supabaseAdmin.from("audit_logs").insert({
                actor_email: data.customerEmail,
                action: "order.guest_create",
                entity: "service_orders",
                entity_id: order.id,
                after_data: { tracking_id: order.tracking_id, amount_usd: price.totalUsd },
              }),
            ]);

            const { queueStatusChangeEmails } = await import("@/lib/notifications.server");
            await queueStatusChangeEmails(supabaseAdmin, {
              eventId: event.id,
              orderId: order.id,
              previousStatus: null,
              newStatus: "submitted",
              note: null,
            });

            return Response.json({ trackingId: order.tracking_id, orderId: order.id }, { status: 201 });
          } catch (error) {
            await Promise.all(
              uploaded.map(({ bucket, path }) => supabaseAdmin.storage.from(bucket).remove([path])),
            );
            throw error;
          }
        } catch (error) {
          console.error("guest_order_failed", error);
          return Response.json({ error: "ORDER_CREATE_FAILED" }, { status: 400 });
        }
      },
    },
  },
});