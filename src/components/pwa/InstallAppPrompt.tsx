import { Download, Share, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { isIosSafari, isStandalone } from "@/lib/pwa";

export type InstallAudience = "client" | "agency" | "staff";

const COPY: Record<InstallAudience, { ar: string; en: string }> = {
  client: {
    ar: "ثبّت تطبيق جيونايتد ترافيل لتصفّح العروض ومتابعة طلباتك بسرعة.",
    en: "Install Gunited Travel to browse offers and follow your orders instantly.",
  },
  agency: {
    ar: "ثبّت بوابة الوكالة للوصول السريع لإدارة الطلبات والعملاء والرصيد.",
    en: "Install the agency portal for quick access to orders, customers and balance.",
  },
  staff: {
    ar: "ثبّت لوحة التحكم كتطبيق مستقل لتسهيل العمل اليومي.",
    en: "Install the control panel as a standalone app for daily operations.",
  },
};

const DISMISS_KEY = "gt-install-dismissed-at";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function recentlyDismissed() {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < WEEK_MS;
  } catch {
    return false;
  }
}

export function InstallAppPrompt({ audience = "client" }: { audience?: InstallAudience }) {
  const { lang } = useI18n();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;
    setHidden(false);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const onInstalled = () => setHidden(true);
    window.addEventListener("appinstalled", onInstalled);

    if (isIosSafari()) setShowIosHint(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === "dismissed") dismiss();
    else setHidden(true);
  };

  if (hidden || (!deferred && !showIosHint)) return null;

  const message = COPY[audience][lang === "ar" ? "ar" : "en"];

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur sm:inset-x-auto sm:end-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label={lang === "ar" ? "إغلاق" : "Dismiss"}
        className="absolute end-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <div className="flex items-start gap-3 pe-6">
        <img
          src="/icons/icon-192.png"
          alt="Gunited Travel"
          className="size-11 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-forest">
            {lang === "ar" ? "ثبّت التطبيق" : "Install the app"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{message}</p>

          {deferred ? (
            <Button size="sm" className="mt-3 gap-2" onClick={install}>
              <Download className="size-4" />
              {lang === "ar" ? "ثبّت التطبيق" : "Install App"}
            </Button>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              <Share className="size-4 text-forest" />
              <span>{lang === "ar" ? "اضغط زر المشاركة" : "Tap the Share button"}</span>
              <span aria-hidden>→</span>
              <Plus className="size-4 text-forest" />
              <span>
                {lang === "ar" ? "أضف إلى الشاشة الرئيسية" : "Add to Home Screen"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
