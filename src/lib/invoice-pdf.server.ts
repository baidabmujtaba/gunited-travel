/**
 * Invoice PDF builder. Pure JS (pdf-lib) so it runs inside the edge worker.
 * Standard PDF fonts only support Latin glyphs, so text is sanitised; the
 * full Arabic invoice lives on the printable /invoice/$number page.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type InvoiceLine = { label: string; amount: string };

export type InvoicePdfData = {
  invoiceNumber: string;
  issuedAt: string;
  trackingId: string | null;
  customerName: string;
  customerEmail: string;
  currency: string;
  lines: InvoiceLine[];
  totalUsd: string;
  totalDisplay: string;
  paymentMethod: string | null;
};

/** Keeps only glyphs the built-in WinAnsi fonts can draw. */
export function latin(value: string | null | undefined, fallback = "-") {
  const cleaned = (value ?? "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

export async function buildInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const forest = rgb(0.12, 0.3, 0.23);
  const gold = rgb(0.79, 0.63, 0.39);
  const muted = rgb(0.42, 0.45, 0.43);

  page.drawRectangle({ x: 0, y: 762, width: 595, height: 80, color: forest });
  page.drawText("GUNITED TRAVEL", { x: 42, y: 806, size: 20, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Travel & Tourism  |  Invoice", { x: 42, y: 786, size: 10, font, color: gold });

  let y = 720;
  const label = (text: string, value: string) => {
    page.drawText(text, { x: 42, y, size: 9, font, color: muted });
    page.drawText(value, { x: 170, y, size: 11, font: bold, color: forest });
    y -= 22;
  };

  label("Invoice number", latin(data.invoiceNumber));
  label("Issued at", latin(data.issuedAt));
  label("Order reference", latin(data.trackingId));
  label("Customer", latin(data.customerName, "Customer"));
  label("Email", latin(data.customerEmail));
  if (data.paymentMethod) label("Payment method", latin(data.paymentMethod));

  y -= 10;
  page.drawRectangle({ x: 42, y: y - 6, width: 511, height: 26, color: rgb(0.95, 0.93, 0.89) });
  page.drawText("Description", { x: 54, y, size: 10, font: bold, color: forest });
  page.drawText("Amount", { x: 470, y, size: 10, font: bold, color: forest });
  y -= 30;

  for (const line of data.lines) {
    page.drawText(latin(line.label), { x: 54, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(latin(line.amount), { x: 440, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
    y -= 20;
  }

  y -= 12;
  page.drawRectangle({ x: 42, y: y - 10, width: 511, height: 34, color: forest });
  page.drawText("TOTAL", { x: 54, y, size: 12, font: bold, color: rgb(1, 1, 1) });
  page.drawText(latin(data.totalDisplay), { x: 380, y, size: 12, font: bold, color: rgb(1, 1, 1) });

  y -= 46;
  page.drawText(`Total in USD: ${latin(data.totalUsd)}`, { x: 42, y, size: 10, font, color: muted });

  page.drawText(
    "Thank you for travelling with Gunited Travel. This invoice was generated automatically.",
    { x: 42, y: 60, size: 9, font, color: muted },
  );

  return doc.save();
}
