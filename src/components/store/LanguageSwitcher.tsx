import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      className="gap-1.5 font-medium"
    >
      <Languages className="size-4" />
      {lang === "ar" ? "English" : "العربية"}
    </Button>
  );
}
