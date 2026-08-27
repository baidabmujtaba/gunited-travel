import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import GunitedTicketCard from "@/components/GunitedTicketCard";

/**
 * Signature hero: a realistic airliner taxis along the dashed runway, rotates
 * nose-up, then climbs off the top-right leaving a sage vapour trail. The
 * headline reveals once it is airborne (~3.3s). Reduced motion skips to the
 * settled state (handled in styles.css).
 */
export function PlaneHero() {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden bg-beige">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(120% 80% at 50% 0%, var(--cream) 0%, transparent 60%), radial-gradient(90% 70% at 100% 100%, var(--mint) 0%, transparent 55%)",
        }}
        aria-hidden="true"
      />

      {/* vapour trail path */}
      <svg
        className="pointer-events-none absolute inset-0 size-full"
        viewBox="0 0 1000 500"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          className="gt-vapor"
          d="M150 400 C 380 380, 640 250, 980 30"
          fill="none"
          stroke="var(--sage)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0"
        />
      </svg>

      <div className="relative mx-auto w-full max-w-6xl px-5 pt-16 pb-28 sm:pt-24 sm:pb-36">
        <div className="max-w-2xl">
          <p className="gt-reveal text-sm font-semibold tracking-wide text-sage">
            {t("brand.name")} · {t("brand.tagline")}
          </p>
          <h1 className="gt-reveal mt-4 text-4xl leading-tight font-bold sm:text-6xl">
            {t("hero.title")}
          </h1>
          <p className="gt-reveal-late mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("hero.subtitle")}
          </p>
          <div className="gt-reveal-late mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/offers">{t("hero.cta.browse")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/track">{t("hero.cta.track")}</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* runway */}
      <div className="pointer-events-none absolute inset-x-0 bottom-10 h-px border-t-2 border-dashed border-sage/60" />

      {/* aircraft */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 h-24">
        <div className="gt-plane w-[240px] sm:w-[340px]">
          <Airliner />
        </div>
      </div>
    </section>
  );
}

function Airliner() {
  return (
    <svg viewBox="0 0 340 110" className="w-full drop-shadow-sm" aria-hidden="true">
      {/* tail fin with painted wordmark */}
      <path d="M232 62 L262 8 L282 8 L280 62 Z" fill="var(--mint)" />
      <text
        x="264"
        y="36"
        fill="var(--forest-deep)"
        fontSize="11"
        fontWeight="700"
        textAnchor="middle"
        transform="rotate(-90 264 36)"
        style={{ letterSpacing: "0.5px" }}
      >
        Gunited Travel
      </text>
      {/* horizontal stabiliser */}
      <path d="M248 62 L300 58 L306 66 L250 68 Z" fill="var(--sage)" />
      {/* fuselage */}
      <path
        d="M18 68 C 40 56, 90 50, 150 50 L 250 50 C 272 50, 286 56, 292 64 C 286 72, 268 76, 246 76 L 60 76 C 36 76, 24 73, 18 68 Z"
        fill="var(--cream)"
        stroke="var(--forest-deep)"
        strokeWidth="1.5"
      />
      {/* cockpit windows */}
      <path d="M30 64 L46 60 L48 66 L30 68 Z" fill="var(--forest-deep)" opacity="0.75" />
      {/* cabin window strip */}
      <g fill="var(--sage)" opacity="0.75">
        {Array.from({ length: 14 }).map((_, i) => (
          <rect key={i} x={68 + i * 13} y={58} width={6} height={5} rx={2.5} />
        ))}
      </g>
      {/* main wing */}
      <path d="M140 70 L214 92 L246 92 L188 68 Z" fill="var(--forest)" />
      <path d="M150 60 L208 34 L224 34 L184 62 Z" fill="var(--sage)" opacity="0.85" />
      {/* engine */}
      <rect x="146" y="72" width="42" height="15" rx="7.5" fill="var(--forest-deep)" />
      <rect x="146" y="72" width="7" height="15" rx="3.5" fill="var(--mint)" />
      {/* landing gear */}
      <g stroke="var(--forest-deep)" strokeWidth="2.5">
        <line x1="60" y1="76" x2="60" y2="88" />
        <line x1="170" y1="87" x2="170" y2="94" />
      </g>
      <circle cx="60" cy="91" r="4" fill="var(--forest-deep)" />
      <circle cx="170" cy="97" r="4.5" fill="var(--forest-deep)" />
      {/* belly stripe */}
      <path d="M40 73 L286 68 L286 71 L44 76 Z" fill="var(--gold)" opacity="0.85" />
    </svg>
  );
}
