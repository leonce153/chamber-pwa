import type { ReactNode } from 'react';
import { Bell } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import type { Lang } from '@/lib/language';
import type { TranslationKey } from '@/i18n/en';
import { isOpenableUpdateUrl } from '@/components/pwa/linkRules';
import { getHomeIcon } from '@/components/pwa/home/homeIcons';
import { DISPLAY_FONT, FOCUS, MULE_IMG, homePalette } from '@/components/pwa/home/homeStyles';
import { BannerSection } from '@/components/pwa/home/BannerSection';
import { recordBannerTap } from '@/lib/banner-stats';
import { CountdownSection, EventsSection, SocialSection, SpotlightSection } from '@/components/pwa/home/ExtraSections';
import { GallerySection } from '@/components/pwa/home/GallerySection';
import {
  loc, tileTextColor, iconGlyphColor, isHexColor, LIMITS, itemBaseLabel, itemViewerTitle, liveSlides, slideTarget,
  type HomeItem, type HomeSection, type LinkTarget, type SectionType } from
'@/lib/home-layout';

export interface UpdateItem {
  id: string;
  title: string;
  body: string;
  sent_at: string;
  url: string | null;
}

function updateType(n: UpdateItem): 'Event' | 'Emergency Alert' | 'Update' {
  const text = `${n.title} ${n.body}`;
  if (/emergency|warning|alert/i.test(text)) return 'Emergency Alert';
  if (/\/events?(\/|$|\?)/i.test(n.url ?? '') || /\bevent/i.test(text)) return 'Event';
  return 'Update';
}

const TYPE_KEYS: Record<'Event' | 'Emergency Alert' | 'Update', TranslationKey> = {
  Event: 'type.event',
  'Emergency Alert': 'type.emergency',
  Update: 'type.update'
};


interface ItemButtonProps {
  item: HomeItem;
  lang: Lang;
  ariaLabel: string;
  onClick: () => void;
}

export function HomeTileButton({ item, lang, ariaLabel, onClick, span = false }: ItemButtonProps & { span?: boolean }) {
  const Icon = getHomeIcon(item.icon);
  const label = loc(item.label, item.label_es, lang);
  const hint = loc(item.hint, item.hint_es, lang);
  return (
    <button
      data-ev-id="ev_quick_pick"
      onClick={onClick}
      className={`relative overflow-hidden flex flex-col items-start gap-2 p-[14px] min-h-[96px] rounded-[18px] text-left ${span ? 'col-span-2' : ''} ${FOCUS}`}
      style={{ backgroundColor: item.color, color: tileTextColor(item.color) }}
      aria-label={ariaLabel}>
      <span
        data-ev-id="ev_quick_pick_circle"
        aria-hidden="true"
        className="absolute -top-5 -right-5 w-[70px] h-[70px] rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,.12)' }} />
      <Icon size={26} strokeWidth={2} aria-hidden="true" />
      <span data-ev-id="ev_quick_pick_text" className="flex flex-col min-w-0 w-full">
        <span data-ev-id="ev_quick_pick_label" className="text-[17px] font-bold leading-tight">{label}</span>
        {hint &&
        <span data-ev-id="ev_quick_pick_hint" className={`text-[13px] ${lang === 'es' ? 'line-clamp-2 leading-snug' : 'truncate'}`} style={{ opacity: 0.92 }}>{hint}</span>
        }
      </span>
    </button>);
}

export function HomeIconButton({ item, lang, ariaLabel, onClick, textColor }: ItemButtonProps & { textColor: string }) {
  const Icon = getHomeIcon(item.icon);
  const label = loc(item.label, item.label_es, lang);
  return (
    <button
      data-ev-id="ev_more_link"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 py-1 min-h-11 rounded-xl ${FOCUS}`}
      aria-label={ariaLabel}>
      <span
        data-ev-id="ev_more_link_icon"
        className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: item.color, color: iconGlyphColor(item.color), boxShadow: '0 6px 14px -8px rgba(0,0,0,.5)' }}>
        <Icon size={24} strokeWidth={2} aria-hidden="true" />
      </span>
      <span
        data-ev-id="ev_more_link_label"
        className="text-[12px] font-semibold uppercase text-center leading-tight"
        style={{ letterSpacing: '.04em', color: textColor }}>
        {label}
      </span>
    </button>);
}

interface HomeSectionsProps {
  /** Visible sections in order, with visible items only. */
  sections: HomeSection[];
  lang: Lang;
  isDark: boolean;
  textColor: string;
  renderHero: (section: HomeSection) => ReactNode;
  /** Alerts card node (null when it shouldn't show). */
  alerts: ReactNode;
  updates: UpdateItem[];
  onItem: (target: LinkTarget, viewerTitle: string) => void;
  isExternal: (target: LinkTarget) => boolean;
  onAsk: () => void;
  onOpenUpdate: (update: UpdateItem) => void;
  /** Count sponsor banner views and taps (public app only). */
  trackBanners?: boolean;
}

/** Renders the Home screen from its sections, using the original designs for each type. */
export function HomeSections({
  sections, lang, isDark, textColor, renderHero, alerts, updates, onItem, isExternal, onAsk, onOpenUpdate, trackBanners = false
}: HomeSectionsProps) {
  const { t, locale } = useLanguage();
  const { card, lineColor, muted } = homePalette(isDark);
  const headingStyle = { fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 20, color: textColor };

  const hero = sections.find((s) => s.type === 'hero');
  const withBrowser = (target: LinkTarget, base: string) => isExternal(target) ? t('common.opensInBrowser', { label: base }) : base;

  const renderSection = (s: HomeSection, prev: SectionType | null): ReactNode => {
    const title = loc(s.title, s.title_es, lang);
    switch (s.type) {
      case 'ask_mule':{
          const placeholder = loc(s.settings.placeholder, s.settings.placeholder_es, lang) || t('home.askPlaceholder');
          const chips = (s.settings.chips ?? []).filter((c) => c.text?.trim()).slice(0, LIMITS.chipsMax);
          return (
            <section key={s.id} data-ev-id="ev_ask_bar" className="flex flex-col gap-3 p-3 rounded-2xl" style={card}>
            <button
                data-ev-id="ev_ask_bar_button"
                onClick={onAsk}
                className={`flex items-center gap-3 w-full text-left rounded-[14px] ${FOCUS}`}
                aria-label={t('home.askAria')}>
              <img
                  data-ev-id="ev_ask_bar_mule"
                  src={MULE_IMG}
                  alt=""
                  className="w-11 h-11 rounded-full bg-white object-contain shrink-0"
                  style={{ border: '2px solid #C9A27A' }} />
              <span
                  data-ev-id="ev_ask_bar_field"
                  className="flex-1 min-w-0 h-11 flex items-center px-4 rounded-[14px] text-[15px] truncate"
                  style={{ backgroundColor: isDark ? '#121417' : '#F5F0E9', color: muted }}>
                {placeholder}
              </span>
            </button>
            {chips.length > 0 &&
              <div data-ev-id="ev_ask_chips" className="flex gap-2 overflow-x-auto -mx-3 px-3 [scrollbar-width:none]">
                {chips.map((chip, i) => {
                  const text = loc(chip.text, chip.text_es, lang);
                  return (
                    <button
                      data-ev-id="ev_ask_chip"
                      key={i}
                      onClick={onAsk}
                      className={`shrink-0 min-h-11 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap ${FOCUS}`}
                      style={{ border: `1px solid ${lineColor}`, color: textColor }}
                      aria-label={t('home.chipAria', { chip: text })}>
                      {text}
                    </button>);
                })}
              </div>
              }
          </section>);
        }

      case 'tiles':{
          if (!s.items.length) return null;
          const odd = s.items.length % 2 === 1;
          return (
            <section key={s.id} data-ev-id="ev_quick_picks" className="flex flex-col gap-3">
            {title && <h3 data-ev-id="ev_quick_picks_title" style={headingStyle}>{title}</h3>}
            <div data-ev-id="ev_quick_picks_grid" className="grid grid-cols-2 gap-[10px]">
              {s.items.map((item, i) =>
                <HomeTileButton
                  key={item.id}
                  item={item}
                  lang={lang}
                  span={odd && i === s.items.length - 1}
                  onClick={() => onItem(item, itemViewerTitle(item, lang))}
                  ariaLabel={withBrowser(item, itemBaseLabel(item, lang, true))} />
                )}
            </div>
          </section>);
        }

      case 'icons':{
          if (!s.items.length) return null;
          const cols = s.settings.columns === 4 ? 'grid-cols-4' : 'grid-cols-3';
          // Directly under a tile group: same 16px spacing as the original Quick picks + links group
          const style = prev === 'tiles' ? { marginTop: -2 } : undefined;
          const grid = (aria?: string) =>
          <div data-ev-id="ev_more_links" className={`grid ${cols} gap-x-2 gap-y-3`} aria-label={aria} role={aria ? 'group' : undefined}>
              {s.items.map((item) =>
            <HomeIconButton
              key={item.id}
              item={item}
              lang={lang}
              textColor={textColor}
              onClick={() => onItem(item, itemViewerTitle(item, lang))}
              ariaLabel={withBrowser(item, itemBaseLabel(item, lang, false))} />
            )}
            </div>;
          if (!title) {
            return (
              <section key={s.id} data-ev-id="ev_more_links_section" style={style} aria-label={t('home.moreLinks')}>
              {grid()}
            </section>);
          }
          return (
            <section key={s.id} data-ev-id="ev_more_links_section" className="flex flex-col gap-3" style={style}>
            <h3 data-ev-id="ev_more_links_title" style={headingStyle}>{title}</h3>
            {grid(title)}
          </section>);
        }

      case 'banner':{
          if (!liveSlides(s).length) return null;
          return (
            <BannerSection
              key={s.id}
              section={s}
              slides={s.slides ?? []}
              lang={lang}
              textColor={textColor}
              track={trackBanners}
              onOpen={(slide) => {
                const target = slideTarget(slide);
                if (!target) return;
                if (trackBanners) recordBannerTap(slide.id);
                onItem(target, loc(slide.alt_text, slide.alt_text_es, lang));
              }}
              ariaFor={(slide) => {
                const alt = loc(slide.alt_text, slide.alt_text_es, lang);
                const target = slideTarget(slide);
                return target ? withBrowser(target, alt) : alt;
              }} />);
        }

      case 'alerts':
        return alerts ? <div key={s.id} data-ev-id="ev_alerts_wrap" className="contents">{alerts}</div> : null;

      case 'text':{
          const body = loc(s.settings.body, s.settings.body_es, lang);
          const button = loc(s.settings.button_label, s.settings.button_label_es, lang);
          const hasLink = !!button && !!s.settings.link_type && !!s.settings.link_value;
          if (!title && !body && !hasLink) return null;
          const bg = isHexColor(s.settings.bg_color) ? s.settings.bg_color : null;
          const fg = bg ? tileTextColor(bg) : textColor;
          const target: LinkTarget | null = hasLink ?
          { link_type: s.settings.link_type!, link_value: s.settings.link_value!, open_mode: s.settings.open_mode ?? 'auto' } :
          null;
          return (
            <section
              key={s.id}
              data-ev-id="ev_announcement"
              className="flex flex-col gap-3 p-4 rounded-2xl"
              style={bg ? { backgroundColor: bg, border: `1px solid ${bg}` } : card}>
            {title && <h3 data-ev-id="ev_announcement_title" className="text-base font-semibold text-balance" style={{ color: fg }}>{title}</h3>}
            {body && <p data-ev-id="ev_announcement_body" className="text-[15px] text-pretty whitespace-pre-line" style={{ color: bg ? fg : muted }}>{body}</p>}
            {target &&
              <button
                data-ev-id="ev_announcement_button"
                onClick={() => onItem(target, title || button)}
                className={`w-full min-h-11 px-4 rounded-xl text-base font-semibold ${FOCUS}`}
                style={bg ? { backgroundColor: fg, color: bg } : { backgroundColor: '#2C6E73', color: '#FFFFFF' }}
                aria-label={withBrowser(target, button)}>
                {button}
              </button>
              }
          </section>);
        }

      case 'latest':{
          const count = Math.min(LIMITS.latestMax, Math.max(LIMITS.latestMin, s.settings.count ?? 3));
          const list = updates.slice(0, count);
          const emptyTitle = loc(s.settings.empty_title, s.settings.empty_title_es, lang) || t('home.emptyTitle');
          const emptyText = loc(s.settings.empty_text, s.settings.empty_text_es, lang) || t('home.emptyDesc');
          return (
            <section key={s.id} data-ev-id="ev_latest_updates" className="flex flex-col gap-3">
            {title && <h3 data-ev-id="ev_updates_title" style={headingStyle}>{title}</h3>}
            <div data-ev-id="ev_updates_card" className="rounded-2xl overflow-hidden" style={card}>
              {list.length > 0 ?
                list.map((notif, i) => {
                  const openable = isOpenableUpdateUrl(notif.url);
                  const type = updateType(notif);
                  const typeLabel = t(TYPE_KEYS[type]);
                  const date = new Date(notif.sent_at);
                  const squareColor = type === 'Event' ? '#B4532A' : type === 'Emergency Alert' ? '#C0392B' : '#2C6E73';
                  return (
                    <button
                      data-ev-id={`ev_update_${notif.id}`}
                      key={notif.id}
                      onClick={() => onOpenUpdate(notif)}
                      disabled={!openable}
                      className={`w-full flex items-center gap-3 px-4 py-3 min-h-11 text-left disabled:cursor-default ${FOCUS}`}
                      style={i > 0 ? { borderTop: `1px solid ${lineColor}` } : undefined}
                      aria-label={`${typeLabel}: ${notif.title}`}>
                      <span
                        data-ev-id="ev_update_square"
                        className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 text-white"
                        style={{ backgroundColor: squareColor }}>
                        {type === 'Event' ?
                        <>
                            <span data-ev-id="ev_update_month" className="text-[11px] font-bold leading-none uppercase">
                              {date.toLocaleDateString(locale, { month: 'short' }).replace('.', '')}
                            </span>
                            <span data-ev-id="ev_update_day" className="text-[11px] font-bold leading-tight">{date.getDate()}</span>
                          </> :
                        <Bell size={18} aria-hidden="true" />
                        }
                      </span>
                      <span data-ev-id="ev_update_text" className="flex-1 min-w-0 flex flex-col">
                        <span data-ev-id="ev_update_title" className="text-[15px] font-semibold truncate" style={{ color: textColor }}>{notif.title}</span>
                        <span data-ev-id="ev_update_meta" className="text-[13px]" style={{ color: muted }}>
                          {typeLabel} · {date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                        </span>
                      </span>
                    </button>);
                }) :

                <div data-ev-id="ev_updates_empty" className="flex items-center gap-3 p-4">
                  <img
                    data-ev-id="ev_updates_empty_mule"
                    src={MULE_IMG}
                    alt=""
                    className="w-[52px] h-[52px] rounded-full bg-white object-contain shrink-0"
                    style={{ border: '2px solid #C9A27A' }} />
                  <div data-ev-id="ev_updates_empty_text" className="flex-1 min-w-0">
                    <p data-ev-id="ev_empty_title" className="text-[15px] font-bold" style={{ color: textColor }}>{emptyTitle}</p>
                    <p data-ev-id="ev_empty_desc" className="text-[15px] text-pretty" style={{ color: muted }}>{emptyText}</p>
                  </div>
                </div>
                }
            </div>
          </section>);
        }

      case 'footer':{
          const text = loc(s.settings.text, s.settings.text_es, lang);
          if (!text) return null;
          return (
            <p key={s.id} data-ev-id="ev_home_footer" className="text-[12px] text-center text-pretty" style={{ color: muted }}>
            {text}
          </p>);
        }

      case 'events':
      case 'spotlight':
      case 'countdown':
      case 'social':
      case 'gallery':{
          const Comp = { events: EventsSection, spotlight: SpotlightSection, countdown: CountdownSection, social: SocialSection, gallery: GallerySection }[s.type];
          return <Comp key={s.id} section={s} lang={lang} isDark={isDark} textColor={textColor} onItem={onItem} withBrowser={withBrowser} />;
        }
      default:
        return null;
    }
  };

  const blocks: ReactNode[] = [];
  let prev: SectionType | null = null;
  for (const s of sections) {
    if (s.type === 'hero') continue;
    const node = renderSection(s, prev);
    if (node) {
      blocks.push(node);
      prev = s.type;
    }
  }

  return (
    <div data-ev-id="ev_3306fa3e16" className="flex flex-col">
      {hero && renderHero(hero)}
      <div data-ev-id="ev_home_body" className="flex flex-col gap-[18px] px-4 pt-4 pb-10">
        {blocks}
      </div>
    </div>);
}
