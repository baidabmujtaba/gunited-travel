import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CurrencyInfo } from "@/lib/catalog.functions";
import { useI18n } from "@/lib/i18n";

export function CurrencySelector({
  currencies,
  value,
  onChange,
}: {
  currencies: CurrencyInfo[];
  value: string;
  onChange: (code: string) => void;
}) {
  const { lang, t } = useI18n();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[190px] bg-card" aria-label={t("catalog.currency")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {currencies.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.code} — {lang === "ar" ? c.name_ar : c.name_en}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
