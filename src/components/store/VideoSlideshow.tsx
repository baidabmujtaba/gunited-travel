import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { listActiveVideos } from "@/lib/videos.functions";

const FALLBACK_MS = 8000;

/** Homepage slideshow of admin-managed videos: muted autoplay, auto-advance, manual controls. */
export function VideoSlideshow() {
  const { t, lang } = useI18n();
  const rtl = lang === "ar";
  const query = useQuery({ queryKey: ["homepage-videos"], queryFn: () => listActiveVideos() });
  const videos = query.data ?? [];
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const count = videos.length;
  const next = () => setIndex((i) => (count ? (i + 1) % count : 0));
  const prev = () => setIndex((i) => (count ? (i - 1 + count) % count : 0));

  // Fallback timer keeps the slideshow moving if a video never fires `ended`.
  useEffect(() => {
    if (count < 2) return;
    const timer = setTimeout(next, FALLBACK_MS * 3);
    return () => clearTimeout(timer);
  }, [index, count]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = muted;
    void el.play().catch(() => undefined);
  }, [index, muted]);

  if (query.isLoading) {
    return (
      <section className="mx-auto w-full max-w-6xl px-5 py-10">
        <div className="h-64 animate-pulse rounded-3xl bg-sage/30 sm:h-96" />
      </section>
    );
  }
  if (!count) return null;

  const current = videos[index]!;
  const caption = rtl ? current.title_ar : current.title_en;

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-10" dir={rtl ? "rtl" : "ltr"}>
      <h2 className="mb-5 text-2xl font-bold text-forest-deep sm:text-3xl">
        {t("videos.store.title")}
      </h2>
      <div className="surface-card relative overflow-hidden rounded-3xl bg-forest-deep p-0 shadow-lg">
        <video
          key={current.id}
          ref={videoRef}
          src={current.video_url}
          autoPlay
          muted={muted}
          loop={count === 1}
          playsInline
          onEnded={() => count > 1 && next()}
          onError={() => count > 1 && setTimeout(next, 400)}
          className="aspect-video w-full animate-in fade-in duration-500 object-cover"
        />
        {caption ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest-deep/85 to-transparent p-5 pt-14">
            <p className="text-base font-semibold text-cream sm:text-lg">{caption}</p>
          </div>
        ) : null}
        <Button
          size="icon"
          variant="secondary"
          aria-label={muted ? t("videos.sound.on") : t("videos.sound.off")}
          onClick={() => setMuted((m) => !m)}
          className="absolute end-3 top-3 rounded-full bg-cream/85 text-forest-deep hover:bg-cream"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </Button>
        {count > 1 ? (
          <>
            <Button
              size="icon"
              variant="secondary"
              aria-label={t("videos.prev")}
              onClick={prev}
              className="absolute start-3 top-1/2 -translate-y-1/2 rounded-full bg-cream/85 text-forest-deep hover:bg-cream"
            >
              {rtl ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            </Button>
            <Button
              size="icon"
              variant="secondary"
              aria-label={t("videos.next")}
              onClick={next}
              className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full bg-cream/85 text-forest-deep hover:bg-cream"
            >
              {rtl ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
            </Button>
          </>
        ) : null}
      </div>
      {count > 1 ? (
        <div className="mt-4 flex justify-center gap-2">
          {videos.map((v, i) => (
            <button
              key={v.id}
              type="button"
              aria-label={`${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2.5 rounded-full transition-all ${
                i === index ? "w-7 bg-forest" : "w-2.5 bg-sage hover:bg-forest/50"
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
