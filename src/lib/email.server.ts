/** Transactional email through Resend. Server-only. */

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  attachment?: { filename: string; content: string };
};

export type SendEmailResult = { sent: boolean; error?: string; messageId?: string };

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function bytesToBase64(bytes: Uint8Array) {
  return toBase64(bytes);
}

const SITE_NAME = "Gunited Travel";
const SENDER_DOMAIN = "notify.gunitedtravel.com";

/**
 * Notification emails go through the platform's managed email service:
 * delivery, retries, suppression and unsubscribe are handled there.
 * HTML/text are already rendered per recipient language by the queue.
 */
export async function sendManagedEmail(
  input: { to: string; subject: string; html: string; idempotencyKey?: string },
): Promise<SendEmailResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { sent: false, error: "EMAIL_API_KEY_MISSING" };

  const { EmailAPIError, sendLovableEmail } = await import("@lovable.dev/email-js");
  const text = input.html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  try {
    const res = await sendLovableEmail(
      {
        to: input.to,
        from: `${SITE_NAME} <noreply@${SENDER_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: input.subject,
        html: input.html,
        text,
        purpose: "transactional",
        label: "order-status",
        idempotency_key: input.idempotencyKey || crypto.randomUUID(),
      },
      { apiKey, sendUrl: process.env["LOVABLE_SEND_URL"] },
    );
    return res?.message_id ? { sent: true, messageId: res.message_id } : { sent: true };
  } catch (err) {
    if (err instanceof EmailAPIError) {
      const retryable = err.code === "rate_limited" || (err.status ?? 0) >= 500;
      console.error("managed_email_error", err.code, err.status, err.message);
      return {
        sent: false,
        error: `${retryable ? "EMAIL_RETRY" : "EMAIL_PERMANENT"}_${err.code ?? err.status ?? "UNKNOWN"}${
          err.message ? `: ${err.message.slice(0, 200)}` : ""
        }`,
      };
    }
    console.error("managed_email_exception", err);
    return { sent: false, error: "EMAIL_RETRY_REQUEST_FAILED" };
  }
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) return { sent: false, error: "RESEND_API_KEY_MISSING" };
  const from = process.env["INVOICE_FROM_EMAIL"] || "Gunited Travel <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.attachment
          ? { attachments: [{ filename: input.attachment.filename, content: input.attachment.content }] }
          : {}),
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("resend_error", res.status, detail, "from:", from);
      let reason = "";
      try {
        reason = (JSON.parse(detail) as { message?: string })?.message ?? "";
      } catch {
        reason = detail;
      }
      return {
        sent: false,
        error: `RESEND_${res.status}${reason ? `: ${reason.slice(0, 220)}` : ""}`,
      };
    }
    const body = (await res.json().catch(() => null)) as { id?: string } | null;
    return body?.id ? { sent: true, messageId: body.id } : { sent: true };

  } catch (err) {
    console.error("resend_exception", err);
    return { sent: false, error: "RESEND_REQUEST_FAILED" };
  }
}

export function invoiceEmailHtml(opts: {
  invoiceNumber: string;
  customerName: string;
  trackingId: string | null;
  totalDisplay: string;
  totalUsd: string;
  rows: { label: string; amount: string }[];
}) {
  const rows = opts.rows
    .map(
      (r) =>
        `<tr><td style="padding:8px 0;color:#4a4a4a">${r.label}</td><td style="padding:8px 0;text-align:right;font-weight:600">${r.amount}</td></tr>`,
    )
    .join("");

  return `<!doctype html><html dir="rtl" lang="ar"><body style="margin:0;background:#FBF8F2;font-family:Tahoma,Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#1F4D3A;color:#fff;border-radius:16px;padding:24px">
      <div style="font-size:20px;font-weight:700">جيونايتد ترافيل · Gunited Travel</div>
      <div style="color:#C9A063;font-size:13px;margin-top:4px">فاتورة ${opts.invoiceNumber}</div>
    </div>
    <div style="background:#fff;border-radius:16px;padding:24px;margin-top:16px">
      <p style="margin:0 0 12px">مرحباً ${opts.customerName}،</p>
      <p style="margin:0 0 16px;color:#4a4a4a">تم اكتمال طلبك${
        opts.trackingId ? ` رقم <b>${opts.trackingId}</b>` : ""
      } وهذه فاتورتك الرسمية (مرفقة بصيغة PDF).</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
      <div style="margin-top:16px;background:#F3EDE3;border-radius:12px;padding:14px;display:flex;justify-content:space-between">
        <b>الإجمالي</b> <b style="color:#1F4D3A">${opts.totalDisplay}</b>
      </div>
      <p style="margin:12px 0 0;color:#6B9080;font-size:12px">ما يعادل ${opts.totalUsd}</p>
    </div>
    <p style="text-align:center;color:#6B9080;font-size:12px;margin-top:16px">شكراً لسفرك مع جيونايتد ترافيل</p>
  </div></body></html>`;
}
