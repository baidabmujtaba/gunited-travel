import { Link } from "@tanstack/react-router";
import { ArrowUpLeft, MapPin, PlaneTakeoff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import heroImage from "@/assets/home-travel-hero.jpg";

/**
 * Editorial storefront hero with the primary travel actions above the fold.
 */
export function PlaneHero() {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  return (
    <section className="relative min-h-[38rem] overflow-hidden border-b border-border/70 sm:min-h-[43rem]">
      <img
        src={heroImage}
        alt=""
        width={1400}
        height={800}
        fetchPriority="high"
        className="absolute inset-0 size-full object-cover object-center"
      />
      <div className="hero-veil absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-[38rem] w-full max-w-6xl flex-col items-center px-5 pt-16 pb-10 text-center sm:min-h-[43rem] sm:pt-24">
        <p className="gt-reveal inline-flex items-center gap-2 text-sm font-bold text-forest">
          <ShieldCheck className="size-4 text-gold" aria-hidden="true" />
          {isAr ? "إجراءات سفر موثوقة من البداية للنهاية" : "Trusted travel services, end to end"}
        </p>
        <h1 className="gt-reveal mt-5 max-w-4xl text-4xl leading-[1.15] font-extrabold sm:text-6xl">
          {isAr ? (
            <>أسرع طريق لإتمام <span className="text-gold">رحلتك</span> بثقة</>
          ) : (
            <>A faster way to complete your <span className="text-gold">journey</span></>
          )}
        </h1>
        <p className="gt-reveal-late mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          {isAr
            ? "موافقات أمنية، تأشيرات، رحلات وباقات عمرة في مكان واحد مع متابعة واضحة لكل طلب."
            : "Security approvals, visas, flights and Umrah packages in one place, with clear tracking for every request."}
        </p>

        <div className="gt-reveal-late mt-8 grid w-full max-w-4xl gap-3 rounded-lg border border-border/80 bg-card/95 p-3 shadow-lift backdrop-blur sm:grid-cols-[1fr_1fr_auto]">
          <Link
            to="/request/$slug"
            params={{ slug: "security-approval" }}
            className="flex min-h-16 items-center gap-3 rounded-md border border-border bg-background px-4 text-start transition-colors hover:border-gold"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-forest"><PlaneTakeoff className="size-4" /></span>
            <span><span className="block text-[11px] text-muted-foreground">{isAr ? "نوع الخدمة" : "Service"}</span><span className="block text-sm font-bold">{isAr ? "موافقة أمنية للطيران" : "Flight security approval"}</span></span>
          </Link>
          <Link
            to="/select"
            className="flex min-h-16 items-center gap-3 rounded-md border border-border bg-background px-4 text-start transition-colors hover:border-gold"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-forest"><MapPin className="size-4" /></span>
            <span><span className="block text-[11px] text-muted-foreground">{isAr ? "الوجهة" : "Destination"}</span><span className="block text-sm font-bold">{isAr ? "اختر خدمتك أو وجهتك" : "Choose service or destination"}</span></span>
          </Link>
          <Button asChild size="lg" className="min-h-16 px-7">
            <Link to="/select">{isAr ? "ابدأ الطلب" : "Start request"}<ArrowUpLeft className="size-4 rtl:-rotate-90" /></Link>
          </Button>
        </div>

        <div className="mt-auto flex flex-wrap justify-center gap-x-7 gap-y-2 pt-8 text-xs font-semibold text-forest-deep/80">
          <span>✓ {isAr ? "دفع آمن وموثّق" : "Verified payment"}</span>
          <span>✓ {isAr ? "تتبع لحظي" : "Live tracking"}</span>
          <span>✓ {isAr ? "خدمة بالعربية والإنجليزية" : "Arabic and English service"}</span>
        </div>
      </div>
    </section>
  );
}
