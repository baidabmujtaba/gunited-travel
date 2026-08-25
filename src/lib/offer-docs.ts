export type RequiredDocument = {
  key: string;
  label_en: string;
  label_ar: string;
  required: boolean;
};

/** Tolerant parser for the admin-defined required-documents checklist. */
export function normalizeDocs(value: unknown): RequiredDocument[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((d, i) => {
      const o = (d ?? {}) as Record<string, unknown>;
      const label_en = String(o["label_en"] ?? o["label"] ?? "").trim();
      const label_ar = String(o["label_ar"] ?? o["label"] ?? "").trim();
      if (!label_en && !label_ar) return null;
      return {
        key: String(o["key"] ?? `doc-${i + 1}`),
        label_en: label_en || label_ar,
        label_ar: label_ar || label_en,
        required: o["required"] !== false,
      };
    })
    .filter((d): d is RequiredDocument => d !== null);
}
