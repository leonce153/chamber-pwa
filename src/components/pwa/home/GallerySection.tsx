import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { FOCUS, homePalette } from '@/components/pwa/home/homeStyles';
import { sectionHeading, sectionTitle, type ExtraSectionProps } from '@/components/pwa/home/extraHelpers';
import { optionalTarget } from '@/lib/home-extra';
import { loc, type GalleryPhoto } from '@/lib/home-layout';
import type { Lang } from '@/lib/language';

const SWIPE_PX = 40;

/** Full-screen photo viewer: swipe, arrows, caption. Close button, Esc and the back button close it. */
function GalleryViewer({ photos, index, lang, onClose }: {photos: GalleryPhoto[];index: number;lang: Lang;onClose: () => void;}) {
  const [i, setI] = useState(index);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const touch = useRef<{x: number;y: number;} | null>(null);
  const alive = useRef(true);
  const popped = useRef(false);
  const n = photos.length;
  const go = useCallback((d: number) => setI((v) => (v + d + n) % n), [n]);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    alive.current = true;
    // An extra history entry so the phone's back button closes the viewer
    if (!(history.state && history.state.homeGallery)) history.pushState({ ...(history.state ?? {}), homeGallery: true }, '');
    const onPop = () => {
      popped.current = true;
      onCloseRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();else
      if (e.key === 'ArrowRight') go(1);else
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      alive.current = false;
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
      // Closed with the button or Esc: remove the extra history entry
      window.setTimeout(() => {
        if (!alive.current && !popped.current && history.state?.homeGallery) history.back();
      }, 0);
    };
  }, [go]);

  const p = photos[Math.min(i, n - 1)];
  if (!p) return null;
  const alt = loc(p.alt_text, p.alt_text_es, lang);
  const caption = loc(p.caption, p.caption_es, lang);
  const es = lang === 'es';

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s || n < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(t.clientY - s.y)) go(dx < 0 ? 1 : -1);
  };

  const navBtn = 'w-11 h-11 rounded-full flex items-center justify-center text-white focus-visible:outline-2 focus-visible:outline-white';

  return createPortal(
    <div data-ev-id="ev_7135bf1f44"
    className="fixed inset-0 z-[1000] flex flex-col"
    style={{ backgroundColor: 'rgba(0,0,0,.94)' }}
    role="dialog"
    aria-modal="true"
    aria-label={es ? 'Fotos' : 'Photos'}
    onTouchStart={onTouchStart}
    onTouchEnd={onTouchEnd}>
      <div data-ev-id="ev_982edb68ec" className="flex items-center justify-between p-2" style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
        <span data-ev-id="ev_4ef2084cfb" className="px-3 text-sm text-white tabular-nums" style={{ opacity: 0.8 }} aria-live="polite">{i + 1} / {n}</span>
        <button data-ev-id="ev_016a3cf79c" ref={closeRef} onClick={onClose} aria-label={es ? 'Cerrar' : 'Close'} className={navBtn} style={{ backgroundColor: 'rgba(255,255,255,.12)' }}>
          <X size={24} aria-hidden="true" />
        </button>
      </div>
      <div data-ev-id="ev_5e8b6bde4f" className="relative flex-1 min-h-0 flex items-center justify-center px-2">
        <img data-ev-id="ev_5155574a62" key={p.id} src={p.image_url} alt={alt} draggable={false} className="max-w-full max-h-full object-contain select-none" />
        {n > 1 &&
        <>
            <button data-ev-id="ev_fc262d79e5" onClick={() => go(-1)} aria-label={es ? 'Foto anterior' : 'Previous photo'} className={`${navBtn} absolute left-2 top-1/2 -translate-y-1/2`} style={{ backgroundColor: 'rgba(0,0,0,.45)' }}>
              <ChevronLeft size={26} aria-hidden="true" />
            </button>
            <button data-ev-id="ev_7d52ca6c59" onClick={() => go(1)} aria-label={es ? 'Foto siguiente' : 'Next photo'} className={`${navBtn} absolute right-2 top-1/2 -translate-y-1/2`} style={{ backgroundColor: 'rgba(0,0,0,.45)' }}>
              <ChevronRight size={26} aria-hidden="true" />
            </button>
          </>
        }
      </div>
      <p data-ev-id="ev_0d35cfe444" className="px-4 pt-3 text-center text-[15px] text-white text-pretty min-h-[48px]" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        {caption}
      </p>
    </div>,
    document.body
  );
}

export function GallerySection({ section, lang, isDark, textColor, onItem, withBrowser }: ExtraSectionProps) {
  const [open, setOpen] = useState<number | null>(null);
  // Photos need a description before they show
  const photos = (section.photos ?? []).filter((p) => p.is_visible && p.alt_text.trim());
  if (!photos.length) return null;

  const { lineColor } = homePalette(isDark);
  const shown = photos.slice(0, section.settings.photo_count === 9 ? 9 : 6);
  const title = sectionTitle(section, lang);
  const seeMoreTarget = section.settings.see_more ? optionalTarget(section.settings) : null;
  const seeMore = lang === 'es' ? 'Ver más' : 'See more';
  const viewLabel = lang === 'es' ? 'Ver foto' : 'View photo';

  return (
    <section data-ev-id="ev_home_gallery" className="flex flex-col gap-3" aria-label={title}>
      <h3 data-ev-id="ev_670456fc3d" style={sectionHeading(textColor)}>{title}</h3>
      <div data-ev-id="ev_ac223df59a" className="grid grid-cols-3 gap-2">
        {shown.map((p, i) =>
        <button data-ev-id="ev_28090d8b35"
        key={p.id}
        onClick={() => setOpen(i)}
        className={`relative aspect-square overflow-hidden rounded-[12px] ${FOCUS}`}
        style={{ backgroundColor: 'rgba(127,127,127,.15)' }}
        aria-label={`${viewLabel}: ${loc(p.alt_text, p.alt_text_es, lang)}`}>
            <img data-ev-id="ev_d06673deee" src={p.image_url} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
          </button>
        )}
      </div>
      {seeMoreTarget &&
      <button data-ev-id="ev_f672d1b6d5"
      onClick={() => onItem(seeMoreTarget, title || seeMore)}
      className={`w-full min-h-11 px-4 rounded-xl text-base font-semibold ${FOCUS}`}
      style={{ border: `1px solid ${lineColor}`, color: textColor }}
      aria-label={withBrowser(seeMoreTarget, `${seeMore}: ${title}`)}>
          {seeMore}
        </button>
      }
      {open !== null && <GalleryViewer photos={photos} index={open} lang={lang} onClose={() => setOpen(null)} />}
    </section>);
}