/** Transactional email through Resend. Server-only. */

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  attachment?: { filename: string; content: string };
};

export type SendEmailResult = { sent: boolean; error?: string };

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function bytesToBase64(bytes: Uint8Array) {
  return toBase64(bytes);
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
      console.error("resend_error", res.status, detail);
      return { sent: false, error: `RESEND_${res.status}` };
    }
    return { sent: true };
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
