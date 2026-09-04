/** Customer-service WhatsApp contact used by "price on request" packages. */
export const SUPPORT_WHATSAPP = "249912345678";

/** Build a wa.me link with a pre-filled bilingual enquiry message. */
export function whatsappLink(message?: string) {
  const base = `https://wa.me/${SUPPORT_WHATSAPP}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
