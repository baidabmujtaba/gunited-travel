import { Plane } from "lucide-react";

const LABELS = {
  en: {
    brand: "Gunited Travel",
    class: "Class",
    ref: "Booking Ref",
    passenger: "Passenger",
    dir: "ltr",
  },
  ar: {
    brand: "جيونايتد ترافيل",
    class: "الدرجة",
    ref: "رقم الحجز",
    passenger: "المسافر",
    dir: "rtl",
  },
} as const;

export type TicketEndpoint = {
  city?: string;
  country?: string;
  code?: string;
  time?: string;
};

export type GunitedTicketCardProps = {
  locale?: "ar" | "en";
  from?: TicketEndpoint | null;
  to?: TicketEndpoint | null;
  bookingRef: string;
  travelClass?: string | null;
  passenger?: string | null;
};

export default function GunitedTicketCard({
  locale = "ar",
  from = null,
  to = null,
  bookingRef,
  travelClass = null,
  passenger = null,
}: GunitedTicketCardProps) {
  const t = LABELS[locale] ?? LABELS.ar;
  const isRtl = t.dir === "rtl";
  const hasRoute = Boolean(from?.code || to?.code);

  return (
    <div className="gt-container" dir={t.dir}>
      <style>{`
        .gt-container { perspective: 1000px; display: inline-block; max-width: 100%; }

        .gt-card {
          position: relative;
          height: 160px;
          width: 340px;
          max-width: 100%;
          display: flex;
          color: #2d2d2d;
          background-color: #fffdf8;
          border: 1px solid #ece3d2;
          border-radius: 1rem;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.25);
          z-index: 10;
          gap: 1rem;
          animation: gt-animation-card 12s infinite;
          overflow: hidden;
          box-shadow: 0 8px 24px -12px rgba(31, 77, 58, 0.35);
        }

        .gt-card:hover { animation-play-state: paused; transform: translateY(-10px); }
        .gt-card:hover .gt-content::after,
        .gt-card:hover .gt-content::before,
        .gt-card:hover .gt-icons { animation-play-state: paused; }

        .gt-card.gt-rtl { flex-direction: row-reverse; }

        .gt-separator {
          position: absolute;
          top: 0;
          left: 56px;
          width: 16px;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }

        .gt-card.gt-rtl .gt-separator { left: auto; right: 56px; }

        .gt-separator .gt-span-lines {
          position: relative;
          display: flex;
          height: 100%;
          border-left: 2px dashed #d8cdb8;
        }

        .gt-card.gt-rtl .gt-separator .gt-span-lines {
          border-left: none;
          border-right: 2px dashed #d8cdb8;
        }

        .gt-separator .gt-span-lines::after,
        .gt-separator .gt-span-lines::before {
          content: "";
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 16px;
          height: 16px;
          border-radius: 16px;
          background-color: #f5efe6;
          border: 1px solid #ece3d2;
        }

        .gt-separator .gt-span-lines::after { top: -8px; }
        .gt-separator .gt-span-lines::before { bottom: -8px; }

        .gt-content { position: relative; justify-content: space-between; width: 100%; display: flex; }

        .gt-content::after {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          background-image: linear-gradient(90deg, rgba(31,77,58,0), rgba(31,77,58,0.55));
          transform: translateX(200px) scale(1.5);
          filter: blur(10px);
          width: 200px;
          height: 100%;
          animation: gt-shadow-card 12s infinite;
        }

        .gt-content::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100px;
          background-image: linear-gradient(90deg, rgba(255,255,255,0), #fffdf8, rgba(255,255,255,0));
          transform: translateX(-100px) scale(1.5) rotate(20deg);
          width: 80px;
          height: 100%;
          animation: gt-light-card 12s infinite;
        }

        .gt-data {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          width: 100%;
          padding: 0.7rem 0.85rem;
          gap: 0.35rem;
        }

        .gt-data-flex { width: 100%; display: flex; justify-content: space-between; gap: 0.25rem; }

        .gt-label { font-size: 9px; letter-spacing: 0.04em; color: #a99c7e; }
        .gt-rtl .gt-label { letter-spacing: 0; }

        .gt-value { font-size: 11px; font-weight: 600; color: #1f4d3a; }

        .gt-brand { font-size: 11px; font-weight: 700; color: #1f4d3a; display: flex; align-items: center; gap: 4px; }

        .gt-destination { display: flex; align-items: center; justify-content: space-between; margin-top: 0.15rem; }

        .gt-dest { display: flex; flex-direction: column; }
        .gt-dest .gt-country { font-size: 9px; line-height: 1; color: #a99c7e; }
        .gt-dest .gt-acronym { font-weight: 800; font-size: 15px; color: #1f4d3a; }
        .gt-dest .gt-hour { font-size: 10px; color: #6b6558; }

        .gt-route-icon { color: #c9a063; margin: 0 6px; }

        .gt-icons {
          width: fit-content;
          padding: 0.7rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          animation: gt-color-card 12s infinite;
        }

        .gt-icons .gt-icon { color: #fffdf8; transform: rotate(45deg); }
        .gt-rtl .gt-icons .gt-icon { transform: rotate(-45deg) scaleX(-1); }
        .gt-rtl .gt-route-icon { transform: scaleX(-1); }

        @keyframes gt-animation-card {
          0% { transform: translateZ(0px); }
          25% { transform: translateX(-8px) rotateY(-14deg); }
          75% { transform: translateX(8px) rotateY(14deg); }
          100% { transform: translateZ(0px); }
        }

        @keyframes gt-light-card {
          25% { transform: translateX(470px) scale(1.5) rotate(25deg); }
          50% { transform: translateX(-100px) scale(1.5) rotate(25deg); }
        }

        @keyframes gt-shadow-card {
          35% { transform: translateX(200px) scale(1.5); }
          75% { transform: translateX(0px) scale(1.5); }
        }

        @keyframes gt-color-card {
          0%   { background-color: #1F4D3A; }
          20%  { background-color: #6B9080; }
          40%  { background-color: #C9A063; }
          60%  { background-color: #6B9080; }
          80%  { background-color: #1F4D3A; }
          100% { background-color: #1F4D3A; }
        }

        @media (prefers-reduced-motion: reduce) {
          .gt-card, .gt-icons, .gt-content::after, .gt-content::before { animation: none !important; }
        }
      `}</style>

      <div className={`gt-card ${isRtl ? "gt-rtl" : ""}`}>
        <div className="gt-separator">
          <span className="gt-span-lines" />
        </div>

        <div className="gt-content">
          <div className="gt-data">
            <div className="gt-data-flex">
              <span className="gt-brand">
                <Plane size={12} style={{ transform: "rotate(45deg)" }} />
                {t.brand}
              </span>
              {travelClass ? (
                <div style={{ textAlign: isRtl ? "left" : "right" }}>
                  <div className="gt-label">{t.class}</div>
                  <div className="gt-value">{travelClass}</div>
                </div>
              ) : null}
            </div>

            <div className="gt-data-flex">
              <div>
                <div className="gt-label">{t.ref}</div>
                <div className="gt-value" dir="ltr">
                  {bookingRef}
                </div>
              </div>
              {passenger ? (
                <div style={{ textAlign: isRtl ? "left" : "right" }}>
                  <div className="gt-label">{t.passenger}</div>
                  <div className="gt-value">{passenger}</div>
                </div>
              ) : null}
            </div>

            {hasRoute ? (
              <div className="gt-destination">
                <div className="gt-dest">
                  <span className="gt-country" dir="ltr">
                    {from?.country ?? from?.city ?? ""}
                  </span>
                  <span className="gt-acronym" dir="ltr">
                    {from?.code ?? "—"}
                  </span>
                  <span className="gt-hour" dir="ltr">
                    {from?.time ?? ""}
                  </span>
                </div>

                <Plane size={16} className="gt-route-icon" />

                <div className="gt-dest" style={{ alignItems: isRtl ? "flex-start" : "flex-end" }}>
                  <span className="gt-country" dir="ltr">
                    {to?.country ?? to?.city ?? ""}
                  </span>
                  <span className="gt-acronym" dir="ltr">
                    {to?.code ?? "—"}
                  </span>
                  <span className="gt-hour" dir="ltr">
                    {to?.time ?? ""}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="gt-icons">
            <Plane className="gt-icon" size={18} />
          </div>
        </div>
      </div>
    </div>
  );
}
