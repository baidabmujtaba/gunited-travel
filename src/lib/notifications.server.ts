/**
 * Backend-driven automatic notifications for order status transitions.
 *
 * A real status change (old !== new) produces exactly one notification event,
 * identified by the `order_status_history` row id. That id is the idempotency
 * key, so page refreshes, duplicated API calls and worker retries can never
 * produce a second email.
 *
 * Server-only: nothing here may be imported from client code.
 */

type Sb = any;

export type OrderStatusKey =
  | "submitted"
  | "payment_pending"
  | "payment_confirmed"
  | "processing"
  | "completed"
  | "cancelled"
  | "rejected";

type Template = {
  key: string;
  subject_ar: string;
  subject_en: string;
  lead_ar: string;
  lead_en: string;
};

/** Template per new status. Extensible for further lifecycle states. */
const TEMPLATES: Record<OrderStatusKey, Template> = {
  submitted: {
    key: "order_submitted",
    subject_ar: "تم استلام طلبك – Gunited Travel",
    subject_en: "We received your order – Gunited Travel",
    lead_ar: "تم استلام طلبك وهو الآن قيد المراجعة.",
    lead_en: "Your order has been received and is under review.",
  },
  payment_pending: {
    key: "order_payment_pending",
    subject_ar: "بانتظار تأكيد الدفع – Gunited Travel",
    subject_en: "Awaiting payment confirmation – Gunited Travel",
    lead_ar: "طلبك بانتظار تأكيد الدفع من فريقنا المالي.",
    lead_en: "Your order is awaiting payment confirmation by our finance team.",
  },
  payment_confirmed: {
    key: "order_confirmed",
    subject_ar: "تم تأكيد طلبك – Gunited Travel",
    subject_en: "Your order is confirmed – Gunited Travel",
    lead_ar: "تم تأكيد الدفع وتأكيد طلبك بنجاح.",
    lead_en: "Your payment was confirmed and your order is now confirmed.",
  },
  processing: {
    key: "order_processing",
    subject_ar: "طلبك قيد التنفيذ – Gunited Travel",
    subject_en: "Your order is being processed – Gunited Travel",
    lead_ar: "بدأ فريقنا تنفيذ طلبك. سنبلغك عند اكتمال الإجراءات.",
    lead_en: "Our team started processing your order. We will notify you once complete.",
  },
  completed: {
    key: "order_completed",
    subject_ar: "تم إصدار طلبك – Gunited Travel",
    subject_en: "Your order is issued – Gunited Travel",
    lead_ar: "تم اكتمال طلبك وإصدار مستنداته.",
    lead_en: "Your order is complete and its documents have been issued.",
  },
  cancelled: {
    key: "order_cancelled",
    subject_ar: "تم إلغاء طلبك – Gunited Travel",
    subject_en: "Your order was cancelled – Gunited Travel",
    lead_ar: "تم إلغاء طلبك. لأي استفسار يمكنك التواصل معنا.",
    lead_en: "Your order was cancelled. Contact us for any question.",
  },
  rejected: {
    key: "order_rejected",
    subject_ar: "تم تحديث حالة طلبك",
    subject_en: "Your order status has been updated",
    lead_ar: "تم تحديث حالة طلبك، ولم نتمكن من إكماله في الوقت الحالي.",
    lead_en: "Your order status was updated; we could not complete it at this time.",
  },
};

/** Additional template used when extra documents are required. */
const DOCS_TEMPLATE: Template = {
  key: "order_requires_documents",
  subject_ar: "مطلوب مستندات إضافية لإكمال طلبك",
  subject_en: "Additional documents required to complete your order",
  lead_ar: "نحتاج مستندات إضافية لإكمال طلبك.",
  lead_en: "We need additional documents to complete your order.",
};

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  submitted: { ar: "تم الإرسال", en: "Submitted" },
  payment_pending: { ar: "بانتظار الدفع", en: "Payment pending" },
  payment_confirmed: { ar: "تم تأكيد الدفع", en: "Payment confirmed" },
  processing: { ar: "قيد التنفيذ", en: "Processing" },
  completed: { ar: "مكتمل", en: "Completed" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
  rejected: { ar: "مرفوض", en: "Rejected" },
};

export const SITE_URL = "https://gunited-travel.lovable.app";

function esc(v: unknown) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function statusLabel(status: string | null, lang: "ar" | "en") {
  if (!status) return lang === "ar" ? "—" : "—";
  return STATUS_LABEL[status]?.[lang] ?? status;
}

type EmailFacts = {
  customerName: string;
  reference: string;
  previousStatus: string | null;
  newStatus: string;
  changedAt: string;
  destination: string | null;
  bookingInfo: string | null;
  paymentStatus: string | null;
  staffNote: string | null;
  orderUrl: string;
};

/** Renders the email body from real database values only. */
export function renderStatusEmail(
  tpl: Template,
  lang: "ar" | "en",
  f: EmailFacts,
): { subject: string; html: string } {
  const ar = lang === "ar";
  const subject = ar ? tpl.subject_ar : tpl.subject_en;
  const lead = ar ? tpl.lead_ar : tpl.lead_en;
  const L = (a: string, e: string) => (ar ? a : e);

  const rows: [string, string | null][] = [
    [L("رقم الطلب", "Order reference"), f.reference],
    [L("الحالة السابقة", "Previous status"), statusLabel(f.previousStatus, lang)],
    [L("الحالة الجديدة", "New status"), statusLabel(f.newStatus, lang)],
    [L("التاريخ والوقت", "Date and time"), f.changedAt],
    [L("الوجهة / الخدمة", "Destination / service"), f.destination],
    [L("معلومات الحجز", "Booking information"), f.bookingInfo],
    [L("حالة الدفع", "Payment status"), f.paymentStatus],
    [L("ملاحظة من الفريق", "Message from our team"), f.staffNote],
  ];

  const body = rows
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;color:#4a4a4a">${esc(k)}</td><td style="padding:8px 0;${
          ar ? "text-align:left" : "text-align:right"
        };font-weight:600">${esc(v)}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html dir="${ar ? "rtl" : "ltr"}" lang="${ar ? "ar" : "en"}"><body style="margin:0;background:#FBF8F2;font-family:Tahoma,Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#1F4D3A;color:#fff;border-radius:16px;padding:24px">
      <div style="font-size:20px;font-weight:700">جيونايتد ترافيل · Gunited Travel</div>
      <div style="color:#C9A063;font-size:13px;margin-top:4px">${esc(subject)}</div>
    </div>
    <div style="background:#fff;border-radius:16px;padding:24px;margin-top:16px">
      <p style="margin:0 0 12px">${esc(L("مرحباً", "Hello"))} ${esc(f.customerName)},</p>
      <p style="margin:0 0 16px;color:#4a4a4a">${esc(lead)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${body}</table>
      <p style="margin:20px 0 0">
        <a href="${esc(f.orderUrl)}" style="display:inline-block;background:#1F4D3A;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:700">${esc(
          L("عرض الطلب", "View order"),
        )}</a>
      </p>
    </div>
    <p style="text-align:center;color:#6B9080;font-size:12px;margin-top:16px">${esc(
      L("شكراً لسفرك مع جيونايتد ترافيل", "Thank you for travelling with Gunited Travel"),
    )}</p>
  </div></body></html>`;

  return { subject, html };
}

function normalizeLang(v: unknown): "ar" | "en" | null {
  const s = String(v ?? "").toLowerCase();
  if (s.startsWith("ar")) return "ar";
  if (s.startsWith("en")) return "en";
  return null;
}

type Recipient = {
  email: string;
  lang: "ar" | "en";
  name: string;
  kind: "customer" | "agency";
};

/**
 * Automatically resolves who must be emailed and in which language.
 * Language priority: customer preference -> agency preference -> account
 * language -> system default (Arabic).
 */
async function resolveRecipients(
  sb: Sb,
  order: any,
): Promise<{ recipients: Recipient[]; customerLang: "ar" | "en" }> {
  let customerProfile: any = null;
  if (order.customer_id) {
    const { data } = await sb
      .from("profiles")
      .select("email,full_name,preferred_language")
      .eq("id", order.customer_id)
      .maybeSingle();
    customerProfile = data;
  }

  let agency: any = null;
  let agencyLang: "ar" | "en" | null = null;
  if (order.agency_id) {
    const { data } = await sb
      .from("travel_agencies")
      .select("id,agency_name,email,contact_name,user_id")
      .eq("id", order.agency_id)
      .maybeSingle();
    agency = data;
    if (agency?.user_id) {
      const { data: ap } = await sb
        .from("profiles")
        .select("preferred_language")
        .eq("id", agency.user_id)
        .maybeSingle();
      agencyLang = normalizeLang(ap?.preferred_language);
    }
  }

  const customerLang =
    normalizeLang(customerProfile?.preferred_language) ?? agencyLang ?? "ar";

  const recipients: Recipient[] = [];
  const customerEmail = (order.customer_email || customerProfile?.email || "").trim();
  if (customerEmail) {
    recipients.push({
      email: customerEmail,
      lang: customerLang,
      name: order.customer_name || customerProfile?.full_name || customerEmail,
      kind: "customer",
    });
  }

  // Agency-linked orders: the managing agency is a legitimate party to the
  // order it created, so it receives the same status update.
  const agencyEmail = (agency?.email ?? "").trim();
  if (agencyEmail && agencyEmail.toLowerCase() !== customerEmail.toLowerCase()) {
    recipients.push({
      email: agencyEmail,
      lang: agencyLang ?? customerLang,
      name: agency.contact_name || agency.agency_name || agencyEmail,
      kind: "agency",
    });
  }

  return { recipients, customerLang };
}

/** Notifies staff/admins in-app (used when no email could be sent). */
async function notifyStaff(
  sb: Sb,
  opts: { title_en: string; title_ar: string; body_en: string; body_ar: string; link?: string },
) {
  await sb.from("notifications").insert({
    audience: "staff",
    title_en: opts.title_en,
    title_ar: opts.title_ar,
    body_en: opts.body_en,
    body_ar: opts.body_ar,
    link: opts.link ?? "/admin/email-notifications",
  });
}

/**
 * Queues the automatic emails for one real status transition.
 * Never throws into the caller: a notification problem must not fail the
 * order status update.
 */
export async function queueStatusChangeEmails(
  sb: Sb,
  input: {
    eventId: string;
    orderId: string;
    previousStatus: string | null;
    newStatus: OrderStatusKey;
    note: string | null;
  },
): Promise<void> {
  try {
    // Queue and log writes are backend-only tables; use the service client.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    sb = supabaseAdmin as Sb;
    const { data: order } = await sb
      .from("service_orders")
      .select(
        "id,tracking_id,status,document_status,customer_id,customer_name,customer_email,agency_id,offer_id,currency_code,amount_display,amount_usd,transaction_reference,created_at",
      )
      .eq("id", input.orderId)
      .maybeSingle();
    if (!order) return;

    let offer: any = null;
    if (order.offer_id) {
      const { data } = await sb
        .from("service_offers")
        .select("title_en,title_ar,category")
        .eq("id", order.offer_id)
        .maybeSingle();
      offer = data;
    }

    const requiresDocs = String(order.document_status ?? "").toLowerCase() === "required";
    const tpl = requiresDocs && input.newStatus === "processing"
      ? DOCS_TEMPLATE
      : TEMPLATES[input.newStatus];

    const { recipients, customerLang } = await resolveRecipients(sb, order);
    const reference = order.tracking_id ?? order.id;
    const changedAtIso = new Date().toISOString();

    // In-app notification, created in parallel with the email queue entries.
    if (order.customer_id) {
      await sb.from("notifications").insert({
        user_id: order.customer_id,
        audience: "user",
        title_ar: tpl.subject_ar,
        title_en: tpl.subject_en,
        body_ar: `${tpl.lead_ar} (${reference})`,
        body_en: `${tpl.lead_en} (${reference})`,
        link: `/track?ref=${reference}`,
      });
    }
    if (order.agency_id) {
      await sb.from("notifications").insert({
        agency_id: order.agency_id,
        audience: "agency",
        title_ar: tpl.subject_ar,
        title_en: tpl.subject_en,
        body_ar: `${tpl.lead_ar} (${reference})`,
        body_en: `${tpl.lead_en} (${reference})`,
        link: `/agency/orders`,
      });
    }

    if (recipients.length === 0) {
      const key = `${input.eventId}:none`;
      await sb.from("email_logs").upsert(
        {
          idempotency_key: key,
          order_id: order.id,
          customer_id: order.customer_id,
          agency_id: order.agency_id,
          status_change_event_id: input.eventId,
          recipient: null,
          notification_type: tpl.key,
          previous_status: input.previousStatus,
          new_status: input.newStatus,
          template: tpl.key,
          status: "not_sent",
          error: "NO_EMAIL_ON_RECORD",
        },
        { onConflict: "idempotency_key", ignoreDuplicates: true },
      );
      await notifyStaff(sb, {
        title_ar: "لا يوجد بريد إلكتروني مسجّل",
        title_en: "No email on record",
        body_ar: `لم يُرسل إشعار الطلب ${reference} لعدم وجود بريد مسجّل.`,
        body_en: `No automatic email sent for order ${reference}: no email on record.`,
      });
      return;
    }

    for (const r of recipients) {
      const key = `${input.eventId}:${r.kind}:${r.email.toLowerCase()}`;

      const [{ data: queued }, { data: logged }] = await Promise.all([
        sb.from("email_queue").select("id").eq("idempotency_key", key).maybeSingle(),
        sb.from("email_logs").select("id").eq("idempotency_key", key).maybeSingle(),
      ]);
      if (queued || logged) continue;

      const facts: EmailFacts = {
        customerName: r.kind === "agency" ? r.name : order.customer_name || r.name,
        reference,
        previousStatus: input.previousStatus,
        newStatus: input.newStatus,
        changedAt: new Date(changedAtIso).toLocaleString(r.lang === "ar" ? "ar-EG" : "en-GB", {
          timeZone: "UTC",
        }),
        destination: offer ? (r.lang === "ar" ? offer.title_ar : offer.title_en) : null,
        bookingInfo: order.amount_display
          ? `${Number(order.amount_display).toLocaleString()} ${order.currency_code}`
          : null,
        paymentStatus: statusLabel(order.status, r.lang),
        staffNote: input.note,
        orderUrl:
          r.kind === "agency"
            ? `${SITE_URL}/agency/orders`
            : `${SITE_URL}/track?ref=${encodeURIComponent(reference)}`,
      };

      const { subject, html } = renderStatusEmail(tpl, r.lang, facts);

      await sb.from("email_queue").insert({
        idempotency_key: key,
        order_id: order.id,
        customer_id: order.customer_id,
        agency_id: order.agency_id,
        status_change_event_id: input.eventId,
        notification_type: tpl.key,
        template: tpl.key,
        previous_status: input.previousStatus,
        new_status: input.newStatus,
        recipient: r.email,
        language: r.lang,
        subject,
        html,
        payload: { kind: r.kind, reference },
        status: "pending",
      });

      await sb.from("email_logs").upsert(
        {
          idempotency_key: key,
          order_id: order.id,
          customer_id: order.customer_id,
          agency_id: order.agency_id,
          status_change_event_id: input.eventId,
          recipient: r.email,
          notification_type: tpl.key,
          previous_status: input.previousStatus,
          new_status: input.newStatus,
          template: tpl.key,
          status: "pending",
        },
        { onConflict: "idempotency_key", ignoreDuplicates: true },
      );
    }
  } catch (err) {
    console.error("queue_status_change_emails_failed", err);
  }
}

const BACKOFF_MINUTES = [1, 5, 15];
const MAX_RETRIES = 3;

/**
 * Drains the email queue. Called by the scheduled background job only.
 * Each item is retried at most 3 times with exponential backoff.
 */
export async function processEmailQueue(limit = 20) {
  const { sendEmail } = await import("./email.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const sb = supabaseAdmin as Sb;

  const { data: items, error } = await sb
    .from("email_queue")
    .select("*")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  let sent = 0;
  let failed = 0;
  let retried = 0;

  for (const item of items ?? []) {
    // Single-flight claim: only one worker can move a row out of 'pending'.
    const { data: claimed } = await sb
      .from("email_queue")
      .update({ status: "processing", locked_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    const result = await sendEmail({
      to: item.recipient,
      subject: item.subject,
      html: item.html,
    });

    if (result.sent) {
      sent += 1;
      await sb
        .from("email_queue")
        .update({ status: "sent", last_error: null, locked_at: null })
        .eq("id", item.id);
      await sb
        .from("email_logs")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          error: null,
          retry_count: item.retry_count,
          resend_message_id: result.messageId ?? null,
        })
        .eq("idempotency_key", item.idempotency_key);
      continue;
    }

    const retry = Number(item.retry_count) + 1;
    // Client-side rejections (invalid address, unverified sender) never succeed
    // on retry; only 429 and 5xx are worth backing off.
    const code = Number(/^RESEND_(\d{3})/.exec(result.error ?? "")?.[1] ?? 0);
    const terminalStatus = code >= 400 && code < 500 && code !== 429;
    const permanent =
      result.error === "RESEND_API_KEY_MISSING" || terminalStatus || retry >= MAX_RETRIES;

    if (permanent) {
      failed += 1;
      await sb
        .from("email_queue")
        .update({ status: "failed", retry_count: retry, last_error: result.error, locked_at: null })
        .eq("id", item.id);
      await sb
        .from("email_logs")
        .update({ status: "failed", error: result.error ?? "UNKNOWN", retry_count: retry })
        .eq("idempotency_key", item.idempotency_key);
      await notifyStaff(sb, {
        title_ar: "فشل إرسال إشعار بريدي",
        title_en: "Automatic email failed",
        body_ar: `تعذّر إرسال البريد إلى ${item.recipient} بعد ${retry} محاولات (${result.error}).`,
        body_en: `Email to ${item.recipient} failed after ${retry} attempts (${result.error}).`,
      });
      continue;
    }

    retried += 1;
    const delay = BACKOFF_MINUTES[retry - 1] ?? 15;
    await sb
      .from("email_queue")
      .update({
        status: "pending",
        retry_count: retry,
        last_error: result.error,
        locked_at: null,
        next_attempt_at: new Date(Date.now() + delay * 60_000).toISOString(),
      })
      .eq("id", item.id);
    await sb
      .from("email_logs")
      .update({ status: "pending", error: result.error ?? null, retry_count: retry })
      .eq("idempotency_key", item.idempotency_key);
  }

  return { processed: (items ?? []).length, sent, failed, retried };
}
