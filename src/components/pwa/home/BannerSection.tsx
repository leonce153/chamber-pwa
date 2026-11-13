import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import type { Lang } from '@/lib/language';
import { recordBannerView } from '@/lib/banner-stats';
import {
  BANNER_SHAPES, bannerInterval, bannerLabel, bannerShape, loc, slideStatus, slideTarget,
  type BannerShape, type BannerSlide, type HomeSection } from
'@/lib/home-layout';

const SWIPE_PX = 40;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function LabelPill({ text }: {text: string;}) {
  return (
    <span data-ev-id="ev_deb88495e8"
    className="absolute top-2 left-2 z-10 px-2 py-[3px] rounded-[999px] text-[11px] font-semibold leading-tight text-white pointer-events-none"
    style={{ backgroundColor: 'rgba(0,0,0,.55)' }}>
      {text}
    </span>);
}

/** Static banner card (admin previews). */
export function BannerFrame({ shape, imageUrl, alt, label }: {shape: BannerShape;imageUrl: string;alt: string;label: string | null;}) {
  return (
    <div data-ev-id="ev_c3370ad60d"
    className="relative w-full overflow-hidden rounded-[16px]"
    style={{ aspectRatio: String(BANNER_SHAPES[shape].ratio), backgroundColor: 'rgba(127,127,127,.15)' }}>
      {imageUrl && <img data-ev-id="ev_1cf1566f1c" src={imageUrl} alt={alt} className="absolute inset-0 w-full h-full object-cover" />}
      {label && <LabelPill text={label} />}
    </div>);
}

interface BannerSectionProps {
  section: HomeSection;
  /** Visible slides (any dates); only live ones are shown. */
  slides: BannerSlide[];
  lang: Lang;
  textColor: string;
  /** Count views (public app only, not the admin preview). */
  track: boolean;
  onOpen: (slide: BannerSlide) => void;
  ariaFor: (slide: BannerSlide) => string;
}

/** Sponsor banner: one card, rotating or static, with dots and swipe. */
export function BannerSection({ section, slides, lang, textColor, track, onOpen, ariaFor }: BannerSectionProps) {
  const settings = section.settings;
  const shape = bannerShape(settings);
  const label = bannerLabel(settings, lang);
  const intervalMs = bannerInterval(settings) * 1000;
  const reducedMotion = usePrefersReducedMotion();

  const [now, setNow] = useState(() => Date.now());
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState<number[]>([0]);
  const [hovered, setHovered] = useState(false);
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const [background, setBackground] = useState(() => document.visibilityState === 'hidden');
  const [onScreen, setOnScreen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{x: number;y: number;} | null>(null);
  const swipedAt = useRef(0);

  const live = useMemo(
    () => slides.filter((s) => slideStatus(s, new Date(now)) === 'live').sort((a, b) => a.position - b.position),
    [slides, now]
  );
  const rotating = settings.mode !== 'static' && live.length > 1;
  const shown = useMemo(() => rotating ? live : live.slice(0, 1), [live, rotating]);
  const count = shown.length;
  const current = count ? Math.min(index, count - 1) : 0;
  const currentId = shown[current]?.id;

  // Re-check start/end dates while the app stays open
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  // Pause in the background
  useEffect(() => {
    const onVis = () => setBackground(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Actually on screen (for view counting)
  const hasCard = count > 0;
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setOnScreen(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting && entry.intersectionRatio >= 0.5), {
      threshold: [0, 0.5, 1]
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasCard]);

  // Lazy-load: the current slide and the next one
  useEffect(() => {
    if (!count) return;
    const want = [current, (current + 1) % count];
    setLoaded((prev) => want.every((i) => prev.includes(i)) ? prev : [...new Set([...prev, ...want])]);
  }, [current, count]);

  // Auto-advance
  useEffect(() => {
    if (!rotating || reducedMotion || hovered || touched || focused || background) return;
    const id = window.setTimeout(() => setIndex((current + 1) % count), intervalMs);
    return () => window.clearTimeout(id);
  }, [current, count, rotating, reducedMotion, hovered, touched, focused, background, intervalMs]);

  // One view per slide per session, when it's really on screen
  useEffect(() => {
    if (track && onScreen && !background && currentId) recordBannerView(currentId);
  }, [track, onScreen, background, currentId]);

  if (!count) return null;

  const go = (i: number) => setIndex((i % count + count) % count);
  const slideLabel = (i: number) => lang === 'es' ? `Diapositiva ${i + 1} de ${count}` : `Slide ${i + 1} of ${count}`;

  const onTouchStart = (e: TouchEvent) => {
    setTouched(true);
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    setTouched(false);
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || !rotating) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
      swipedAt.current = Date.now();
      go(current + (dx < 0 ? 1 : -1));
    }
  };

  return (
    <section
      data-ev-id="ev_sponsor_banner"
      className="flex flex-col"
      aria-roledescription={rotating ? 'carousel' : undefined}
      aria-label={label ?? (lang === 'es' ? 'Patrocinadores' : 'Sponsors')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}>
      <div data-ev-id="ev_80d3485791"
      ref={cardRef}
      className="relative w-full overflow-hidden rounded-[16px]"
      style={{ aspectRatio: String(BANNER_SHAPES[shape].ratio), backgroundColor: 'rgba(127,127,127,.15)', touchAction: 'pan-y' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => {
        setTouched(false);
        touchStart.current = null;
      }}>
        <div data-ev-id="ev_2c6e0b4a17"
        className="flex h-full"
        style={{
          transform: `translateX(-${current * 100}%)`,
          transition: reducedMotion ? 'none' : 'transform 550ms cubic-bezier(.4,0,.2,1)'
        }}>
          {shown.map((slide, i) => {
            const src = loc(slide.image_url, slide.image_url_es, lang);
            const alt = loc(slide.alt_text, slide.alt_text_es, lang);
            const linked = !!slideTarget(slide);
            const active = i === current;
            const img = loaded.includes(i) ?
            <img data-ev-id="ev_0103341f5d"
            src={src}
            alt={linked ? '' : alt}
            decoding="async"
            draggable={false}
            className="w-full h-full object-cover select-none"
            style={{ opacity: active ? 1 : 0.85, transition: reducedMotion ? 'none' : 'opacity 550ms ease' }} /> :
            null;
            return (
              <div data-ev-id="ev_9decf36004"
              key={slide.id}
              className="w-full h-full shrink-0"
              role={rotating ? 'group' : undefined}
              aria-roledescription={rotating ? 'slide' : undefined}
              aria-label={rotating ? slideLabel(i) : undefined}
              aria-hidden={active ? undefined : true}>
                {linked ?
                <button data-ev-id="ev_73e5eb4b8b"
                type="button"
                tabIndex={active ? 0 : -1}
                onClick={() => {
                  if (Date.now() - swipedAt.current < 400) return;
                  onOpen(slide);
                }}
                aria-label={ariaFor(slide)}
                className="block w-full h-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#2C6E73]">
                    {img}
                  </button> :
                img}
              </div>);
          })}
        </div>
        {label && <LabelPill text={label} />}
      </div>

      {rotating &&
      <>
          <div data-ev-id="ev_f09e802bb9" className="flex justify-center -mb-3" role="group" aria-label={lang === 'es' ? 'Elegir diapositiva' : 'Choose slide'}>
            {shown.map((slide, i) =>
          <button data-ev-id="ev_6dfa6e71a2"
          key={slide.id}
          type="button"
          onClick={() => go(i)}
          aria-label={slideLabel(i)}
          aria-current={i === current ? 'true' : undefined}
          className="w-11 h-11 flex items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-[#2C6E73]">
                <span data-ev-id="ev_fe5e5dd5d5"
            className="block h-2 rounded-full"
            style={{
              width: i === current ? 18 : 8,
              backgroundColor: textColor,
              opacity: i === current ? 0.85 : 0.3,
              transition: reducedMotion ? 'none' : 'width 300ms ease, opacity 300ms ease'
            }} />
              </button>
          )}
          </div>
          <p data-ev-id="ev_963d3b1309" className="sr-only" aria-live={reducedMotion || hovered || focused || touched ? 'polite' : 'off'}>
            {slideLabel(current)}
          </p>
        </>
      }
    </section>);
}