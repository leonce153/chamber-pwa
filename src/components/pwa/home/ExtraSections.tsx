import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { openInBrowser } from '@/components/pwa/linkRules';
import { FOCUS, homePalette } from '@/components/pwa/home/homeStyles';
import { SocialIcon } from '@/components/pwa/home/socialIcons';
import { sectionHeading, sectionTitle, type ExtraSectionProps } from '@/components/pwa/home/extraHelpers';
import { useHomeEvents } from '@/lib/home-events';
import {
  SOCIAL_PLATFORMS, countdownParts, countdownPhase, normalizeSocial, optionalTarget, socialHref, spotlightLive } from
'@/lib/home-extra';
import { isHexColor, loc, tileTextColor, type LinkTarget } from '@/lib/home-layout';

const TZ = 'America/Chicago';

const PRIMARY_BUTTON = { backgroundColor: '#2C6E73', color: '#FFFFFF' };

// ===== Upcoming events =====

export function EventsSection({ section, lang, isDark, textColor, onItem, withBrowser }: ExtraSectionProps) {
  const { locale } = useLanguage();
  const events = useHomeEvents(section, lang);
  if (!events.length) return null;

  const { card, muted } = homePalette(isDark);
  const title = sectionTitle(section, lang);
  const seeAll = lang === 'es' ? 'Ver todos' : 'See all';
  const allDay = lang === 'es' ? 'Todo el día' : 'All day';
  const tabTarget: LinkTarget = { link_type: 'tab', link_value: 'events', open_mode: 'auto' };

  return (
    <section data-ev-id="ev_home_events" className="flex flex-col gap-3" aria-label={title}>
      <div data-ev-id="ev_652bb74d58" className="flex items-center justify-between gap-3">
        <h3 data-ev-id="ev_65b3878f85" style={sectionHeading(textColor)}>{title}</h3>
        <button data-ev-id="ev_be8936d0b6"
        onClick={() => onItem(tabTarget, seeAll)}
        className={`min-h-11 px-2 -mr-2 rounded-lg text-[15px] font-semibold shrink-0 ${FOCUS}`}
        style={{ color: isDark ? '#7CC4C9' : '#2C6E73' }}
        aria-label={withBrowser(tabTarget, `${seeAll}: ${title}`)}>
          {seeAll}
        </button>
      </div>
      <div data-ev-id="ev_f242eb5931" className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-1 [scrollbar-width:none]">
        {events.map((ev) => {
          const d = new Date(ev.start);
          const month = d.toLocaleDateString(locale, { month: 'short', timeZone: TZ }).replace('.', '');
          const day = d.toLocaleDateString(locale, { day: 'numeric', timeZone: TZ });
          const weekday = d.toLocaleDateString(locale, { weekday: 'short', timeZone: TZ }).replace('.', '');
          const time = ev.all_day ? allDay : d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', timeZone: TZ });
          const meta = [`${weekday} · ${time}`, ev.location].filter(Boolean).join(' · ');
          const inner =
          <>
              <span data-ev-id="ev_f84ce80fea" className="w-[52px] shrink-0 rounded-xl flex flex-col items-center justify-center py-2 text-white" style={{ backgroundColor: '#B4532A' }}>
                <span data-ev-id="ev_80ff4eb6ae" className="text-[11px] font-bold uppercase leading-none">{month}</span>
                <span data-ev-id="ev_8ac0c9ab75" className="text-[22px] font-bold leading-tight">{day}</span>
              </span>
              <span data-ev-id="ev_386b4d047b" className="flex-1 min-w-0 flex flex-col gap-1">
                <span data-ev-id="ev_92e55b3e4d" className="text-[15px] font-semibold leading-snug line-clamp-2" style={{ color: textColor }}>{ev.title}</span>
                <span data-ev-id="ev_c91d81049b" className="text-[13px] leading-snug line-clamp-2" style={{ color: muted }}>{meta}</span>
              </span>
            </>;
          const cls = `snap-start shrink-0 w-[240px] min-h-[88px] flex items-start gap-3 p-3 rounded-[16px] text-left ${FOCUS}`;
          return ev.target ?
          <button data-ev-id="ev_058e1aebf9" key={ev.key} onClick={() => onItem(ev.target!, ev.title)} className={cls} style={card} aria-label={withBrowser(ev.target, `${ev.title}, ${month} ${day}, ${meta}`)}>
              {inner}
            </button> :

          <div data-ev-id="ev_6d14e2e5df" key={ev.key} className={cls} style={card}>{inner}</div>;
        })}
      </div>
    </section>);
}

// ===== Member spotlight =====

export function SpotlightSection({ section, lang, isDark, textColor, onItem, withBrowser }: ExtraSectionProps) {
  const spotlights = section.settings.spotlights;
  const list = useMemo(() => (spotlights ?? []).filter((s) => spotlightLive(s)), [spotlights]);
  const rotate = section.settings.spotlight_mode !== 'first';
  const storageKey = `home_spotlight_next_${section.id}`;
  const [start] = useState(() => {
    if (!rotate) return 0;
    try {
      return Number(localStorage.getItem(storageKey) ?? 0) || 0;
    } catch {
      return 0;
    }
  });
  const advanced = useRef(false);

  // Next visit shows the next spotlight
  useEffect(() => {
    if (!rotate || advanced.current || list.length < 2) return;
    advanced.current = true;
    try {
      localStorage.setItem(storageKey, String((start + 1) % 1000));
    } catch {

      // storage blocked
    }}, [rotate, list.length, start, storageKey]);

  if (!list.length) return null;
  const sp = list[rotate ? start % list.length : 0];
  const { card, muted } = homePalette(isDark);
  const label = lang === 'es' ? 'Miembro destacado' : 'Member spotlight';
  const text = loc(sp.text, sp.text_es, lang);
  const target = optionalTarget(sp);
  const button = lang === 'es' ? 'Ver su página' : 'Visit their page';

  return (
    <section data-ev-id="ev_home_spotlight" className="flex flex-col gap-3 p-3 rounded-2xl" style={card} aria-label={label}>
      <div data-ev-id="ev_7e71b60605" className="relative w-full overflow-hidden rounded-[16px]" style={{ aspectRatio: '16 / 9', backgroundColor: 'rgba(127,127,127,.15)' }}>
        <img data-ev-id="ev_3bf25ae21e" src={sp.image_url} alt={loc(sp.alt, sp.alt_es, lang)} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
      </div>
      <div data-ev-id="ev_e04be46275" className="flex flex-col gap-1.5 px-1">
        <span data-ev-id="ev_fa87e6300a" className="self-start px-2.5 py-1 rounded-full text-[11px] font-bold uppercase text-white" style={{ backgroundColor: '#2C6E73', letterSpacing: '.04em' }}>
          {label}
        </span>
        <h3 data-ev-id="ev_d4d897103b" className="text-[17px] font-bold leading-snug text-balance" style={{ color: textColor }}>{sp.name}</h3>
        {text && <p data-ev-id="ev_c1273a425c" className="text-[15px] text-pretty" style={{ color: muted }}>{text}</p>}
      </div>
      {target &&
      <button data-ev-id="ev_d2feea6c90"
      onClick={() => onItem(target, sp.name)}
      className={`w-full min-h-11 px-4 rounded-xl text-base font-semibold ${FOCUS}`}
      style={PRIMARY_BUTTON}
      aria-label={withBrowser(target, `${button}: ${sp.name}`)}>
          {button}
        </button>
      }
    </section>);
}

// ===== Countdown =====

function useMinuteNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let iv: number | undefined;
    const to = window.setTimeout(() => {
      setNow(Date.now());
      iv = window.setInterval(() => setNow(Date.now()), 60000);
    }, 60000 - Date.now() % 60000 + 50);
    const onVis = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearTimeout(to);
      if (iv) window.clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return now;
}

export function CountdownSection({ section, lang, onItem, withBrowser }: ExtraSectionProps) {
  const now = useMinuteNow();
  const s = section.settings;
  const phase = countdownPhase(s, now);
  if (!phase) return null;

  const bg = isHexColor(s.color) ? s.color : '#2C6E73';
  const fg = tileTextColor(bg);
  const name = loc(s.name, s.name_es, lang);
  const button = loc(s.button_label, s.button_label_es, lang);
  const target = button ? optionalTarget(s) : null;
  const after = loc(s.after_text, s.after_text_es, lang) || (lang === 'es' ? '¡Está pasando ahora!' : 'Happening now!');

  let parts: [number, string][] = [];
  if (phase.kind === 'before') {
    const { days, hours, minutes } = countdownParts(phase.ms);
    const es = lang === 'es';
    if (days > 0) parts.push([days, es ? days === 1 ? 'día' : 'días' : days === 1 ? 'day' : 'days']);
    if (days > 0 || hours > 0) parts.push([hours, es ? 'h' : hours === 1 ? 'hr' : 'hrs']);
    parts.push([minutes, 'min']);
  } else {
    parts = [];
  }
  const spoken = parts.map(([v, u]) => `${v} ${u}`).join(' ');

  return (
    <section data-ev-id="ev_home_countdown" className="flex flex-col gap-3 p-4 rounded-2xl" style={{ backgroundColor: bg, color: fg }} aria-label={name}>
      <div data-ev-id="ev_b22532cd8a" className="flex items-center gap-3">
        {s.image_url &&
        <img data-ev-id="ev_fe05c07124" src={s.image_url} alt={loc(s.image_alt, s.image_alt_es, lang)} className="w-16 h-16 rounded-[12px] object-cover shrink-0" loading="lazy" />
        }
        <div data-ev-id="ev_019259c837" className="flex-1 min-w-0 flex flex-col gap-1">
          <h3 data-ev-id="ev_203b4919e7" className="text-[17px] font-bold leading-snug text-balance">{name}</h3>
          {phase.kind === 'before' ?
          <p data-ev-id="ev_b6119aff76" className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular-nums" aria-label={lang === 'es' ? `Faltan ${spoken}` : `${spoken} to go`}>
              {parts.map(([v, u]) =>
            <span data-ev-id="ev_3a94118e1f" key={u} className="whitespace-nowrap" aria-hidden="true">
                  <span data-ev-id="ev_2be0a69d56" className="text-[30px] font-bold leading-none">{v}</span>{' '}
                  <span data-ev-id="ev_2163757365" className="text-[14px] font-semibold" style={{ opacity: 0.9 }}>{u}</span>
                </span>
            )}
            </p> :

          <p data-ev-id="ev_d2fa0e4cee" className="text-[22px] font-bold leading-tight text-balance">{after}</p>
          }
        </div>
      </div>
      {target &&
      <button data-ev-id="ev_c59658cb16"
      onClick={() => onItem(target, name || button)}
      className={`w-full min-h-11 px-4 rounded-xl text-base font-semibold ${FOCUS}`}
      style={{ backgroundColor: fg, color: bg }}
      aria-label={withBrowser(target, button)}>
          {button}
        </button>
      }
    </section>);
}

// ===== Social links =====

export function SocialSection({ section, lang, isDark, textColor }: ExtraSectionProps) {
  const { t } = useLanguage();
  const links = normalizeSocial(section.settings.social).
  map((l) => ({ l, href: socialHref(l) })).
  filter((x): x is {l: typeof x.l;href: string;} => !!x.href);
  if (!links.length) return null;
  const title = sectionTitle(section, lang);

  return (
    <section data-ev-id="ev_home_social" className="flex flex-col items-center gap-3" aria-label={title}>
      <h3 data-ev-id="ev_285722737a" className="text-center text-balance" style={sectionHeading(textColor)}>{title}</h3>
      <div data-ev-id="ev_2de64a6a31" className="flex flex-wrap justify-center gap-3">
        {links.map(({ l, href }) => {
          const p = SOCIAL_PLATFORMS.find((x) => x.key === l.platform)!;
          const isEmail = l.platform === 'email';
          const label = isEmail ? lang === 'es' ? 'Correo electrónico' : 'Email' : p.label;
          const darkBrand = p.color === '#000000';
          return (
            <button data-ev-id="ev_142019b4f5"
            key={l.platform}
            onClick={() => {
              if (isEmail) window.location.href = href;else
              openInBrowser(href);
            }}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${FOCUS}`}
            style={{ backgroundColor: p.color, boxShadow: isDark && darkBrand ? '0 0 0 1px rgba(255,255,255,.4)' : undefined }}
            aria-label={isEmail ? label : t('common.opensInBrowser', { label })}>
              <SocialIcon platform={l.platform} size={22} />
            </button>);
        })}
      </div>
    </section>);
}