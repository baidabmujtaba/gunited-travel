import { useEffect } from "react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { applyServiceWorkerUpdate, registerServiceWorker } from "@/lib/pwa";

export function PwaBootstrap() {
  const { lang } = useI18n();

  useEffect(() => {
    let notified = false;
    void registerServiceWorker(() => {
      if (notified) return;
      notified = true;
      toast(
        lang === "ar" ? "يتوفر تحديث جديد للتطبيق" : "A new version is available",
        {
          duration: Infinity,
          action: {
            label: lang === "ar" ? "إعادة التحميل" : "Reload",
            onClick: () => void applyServiceWorkerUpdate(),
          },
        },
      );
    });
  }, [lang]);

  return null;
}
