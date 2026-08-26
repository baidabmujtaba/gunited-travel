import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

/** Small helper so new finance screens can carry AR/EN copy without a dictionary entry each. */
export function useL() {
  const { lang } = useI18n();
  return (ar: string, en: string) => (lang === "ar" ? ar : en);
}

const STATE_TONE: Record<string, string> = {
  settled: "bg-mint text-forest-deep",
  outstanding: "bg-gold/25 text-forest-deep",
  warning: "bg-gold text-forest-deep",
  over_limit: "bg-destructive/15 text-destructive",
  financial_hold: "bg-destructive text-cream",
};

export function FinancialStateBadge({ state }: { state: string }) {
  const l = useL();
  const label: Record<string, string> = {
    settled: l("مسدد", "Settled"),
    outstanding: l("عليه مبلغ", "Outstanding"),
    warning: l("قرب الحد", "Near limit"),
    over_limit: l("تجاوز الحد", "Over limit"),
    financial_hold: l("موقوف مالياً", "On hold"),
  };
  return <Badge className={STATE_TONE[state] ?? "bg-secondary"}>{label[state] ?? state}</Badge>;
}

export function Section({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="surface-card p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-forest-deep">{title}</h2>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ms-auto flex items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="w-full overflow-x-auto">{children}</div>;
}
