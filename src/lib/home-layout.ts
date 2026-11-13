import type { Lang } from '@/lib/language';
import { opensInBrowser, isChamberUrl } from '@/components/pwa/linkRules';

/** Home screen section builder: shared types, defaults and rules (public app + admin). */

export type SectionType =
  'hero' | 'ask_mule' | 'tiles' | 'icons' | 'alerts' | 'latest' | 'text' | 'footer' | 'banner' |
  'events' | 'spotlight' | 'countdown' | 'social' | 'gallery';
export type SocialPlatform = 'facebook' | 'instagram' | 'youtube' | 'tiktok' | 'x' | 'linkedin' | 'threads' | 'website' | 'email';
export type BannerMode = 'static' | 'rotate';
export type BannerShape = 'wide' | 'medium' | 'square';
export type SlideStatus = 'live' | 'scheduled' | 'ended' | 'hidden';
export type LinkType = 'portal' | 'url' | 'tab';
export type OpenMode = 'auto' | 'in_app' | 'browser';
export type HomeTabKey = 'home' | 'directory' | 'events' | 'chat' | 'member';

export interface LinkTarget {
  link_type: LinkType;
  link_value: string;
  open_mode: OpenMode;
}

export interface HomeItem extends LinkTarget {
  id: string;
  section_id: string;
  position: number;
  is_visible: boolean;
  label: string;
  label_es: string | null;
  hint: string | null;
  hint_es: string | null;
  viewer_title: string | null;
  viewer_title_es: string | null;
  icon: string;
  color: string;
  updated_at?: string;
  updated_by_name?: string | null;
}

export interface BannerSlide {
  id: string;
  section_id: string;
  position: number;
  is_visible: boolean;
  image_url: string;
  image_url_es: string | null;
  alt_text: string;
  alt_text_es: string | null;
  link_type: LinkType | null;
  link_value: string | null;
  open_mode: OpenMode;
  start_at: string | null;
  end_at: string | null;
  // Admin only (never sent to visitors)
  sponsor_name?: string | null;
  tap_count?: number;
  view_count?: number;
  updated_at?: string;
  updated_by_name?: string | null;
}

export interface ManualEvent {
  id: string;
  title: string;
  title_es?: string | null;
  /** YYYY-MM-DD (Central time) */
  date: string;
  /** HH:MM, empty = all day */
  time?: string | null;
  place?: string | null;
  link_type?: LinkType | null;
  link_value?: string | null;
  open_mode?: OpenMode;
}

export interface Spotlight {
  id: string;
  visible: boolean;
  image_url: string;
  alt: string;
  alt_es?: string | null;
  name: string;
  text?: string | null;
  text_es?: string | null;
  link_type?: LinkType | null;
  link_value?: string | null;
  open_mode?: OpenMode;
  start_at?: string | null;
  end_at?: string | null;
}

export interface SocialLink {
  platform: SocialPlatform;
  enabled: boolean;
  value: string;
}

export interface GalleryPhoto {
  id: string;
  section_id: string;
  position: number;
  is_visible: boolean;
  image_url: string;
  alt_text: string;
  alt_text_es: string | null;
  caption: string | null;
  caption_es: string | null;
  updated_at?: string;
  updated_by_name?: string | null;
}

export interface AskChip {
  text: string;
  text_es?: string | null;
}

export interface SectionSettings {
  // hero
  show_weather?: boolean;
  // ask_mule
  placeholder?: string;
  placeholder_es?: string;
  chips?: AskChip[];
  // tiles / icons
  columns?: number;
  // latest
  count?: number;
  empty_title?: string;
  empty_title_es?: string;
  empty_text?: string;
  empty_text_es?: string;
  // text (announcement)
  body?: string;
  body_es?: string;
  button_label?: string;
  button_label_es?: string;
  link_type?: LinkType;
  link_value?: string;
  open_mode?: OpenMode;
  bg_color?: string;
  // footer
  text?: string;
  text_es?: string;
  // banner
  mode?: BannerMode;
  interval_seconds?: number;
  shape?: BannerShape;
  show_label?: boolean;
  label?: string;
  label_es?: string;
  // events
  event_count?: number;
  source?: 'manual' | 'feed';
  feed_url?: string;
  events?: ManualEvent[];
  // spotlight
  spotlights?: Spotlight[];
  spotlight_mode?: 'rotate' | 'first';
  // countdown
  name?: string;
  name_es?: string;
  target_at?: string;
  image_url?: string;
  image_alt?: string;
  image_alt_es?: string;
  color?: string;
  after_text?: string;
  after_text_es?: string;
  after_hours?: number;
  // social
  social?: SocialLink[];
  // gallery
  photo_count?: number;
  see_more?: boolean;
}

export interface HomeSection {
  id: string;
  type: SectionType;
  position: number;
  is_visible: boolean;
  title: string | null;
  title_es: string | null;
  settings: SectionSettings;
  items: HomeItem[];
  /** Banner sections only. */
  slides?: BannerSlide[];
  /** Gallery sections only. */
  photos?: GalleryPhoto[];
  updated_at?: string;
  updated_by_name?: string | null;
}

export const LIMITS = {
  tilesMin: 2,
  tilesMax: 8,
  iconsMax: 12,
  chipsMax: 5,
  bodyMax: 300,
  labelMax: 24,
  hintMax: 40,
  viewerTitleMax: 60,
  latestMin: 3,
  latestMax: 10,
  slidesMax: 10,
  intervalMin: 3,
  intervalMax: 15,
  altMax: 120,
  sponsorMax: 60,
  bannerLabelMax: 24,
  eventsMin: 3,
  eventsMax: 10,
  manualEventsMax: 30,
  spotlightsMax: 10,
  galleryMax: 30
};

export const SECTION_LABELS: Record<SectionType, string> = {
  hero: 'Sky header',
  ask_mule: 'Ask the Mule',
  tiles: 'Quick picks',
  icons: 'Icon buttons',
  alerts: 'Alerts card',
  latest: 'Latest from the Chamber',
  text: 'Announcement',
  footer: 'Footer',
  banner: 'Sponsor banner',
  events: 'Upcoming events',
  spotlight: 'Member spotlight',
  countdown: 'Countdown',
  social: 'Social links',
  gallery: 'Photo gallery'
};

/** Section types an admin can add more than once (and delete). */
export const REPEATABLE_TYPES: SectionType[] = ['tiles', 'icons', 'text', 'banner', 'events', 'spotlight', 'countdown', 'social', 'gallery'];

export const TAB_KEYS: HomeTabKey[] = ['home', 'directory', 'events', 'chat', 'member'];
/** Bottom tabs that show Chamber website pages (open in the browser when embedding is off). */
export const PORTAL_TABS: HomeTabKey[] = ['directory', 'events', 'chat'];

export const TAB_OPTIONS: { value: HomeTabKey; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'directory', label: 'Directory' },
  { value: 'events', label: 'Events' },
  { value: 'chat', label: 'Ask the Mule' },
  { value: 'member', label: 'Sign in' }
];

export const PORTAL_PAGES: { path: string; label: string }[] = [
  { path: '/events', label: 'Events' },
  { path: '/directory', label: 'Directory' },
  { path: '/news', label: 'News' },
  { path: '/sales', label: 'Deals' },
  { path: '/jobs', label: 'Jobs' },
  { path: '/visit', label: 'Visit' },
  { path: '/newsletter', label: 'Newsletter' },
  { path: '/join', label: 'Join' },
  { path: '/contact', label: 'Contact' },
  { path: '/member-portal', label: 'Member Portal' },
  { path: '/login?returnTo=/member-portal', label: 'Sign in' }
];

export const BRAND_SWATCHES = [
  '#B4532A', '#2C6E73', '#9A6A17', '#557236', '#4A7397', '#8F7AA8',
  '#D3A55B', '#2E9A64', '#8FA79A', '#6E7FA8', '#C0392B', '#2A221B'
];

/** Spanish text when the app is in Spanish and the field is filled, otherwise English. */
export function loc(en: string | null | undefined, es: string | null | undefined, lang: Lang): string {
  if (lang === 'es' && es && es.trim()) return es;
  return en ?? '';
}

/** Visible label used for a tile's / button's aria-label (before "opens in browser"). */
export function itemBaseLabel(item: HomeItem, lang: Lang, isTile: boolean): string {
  const label = loc(item.label, item.label_es, lang);
  const hint = isTile ? loc(item.hint, item.hint_es, lang) : '';
  return hint ? `${label}: ${hint}` : label;
}

/** Title for the in-app viewer bar: viewer title when filled, otherwise the item's title. */
export function itemViewerTitle(item: HomeItem, lang: Lang): string {
  const label = loc(item.label, item.label_es, lang);
  if (lang === 'es' && item.viewer_title_es?.trim()) return item.viewer_title_es;
  return item.viewer_title?.trim() ? item.viewer_title : label;
}

// ===== Color contrast =====

export const DARK_TEXT = '#1F1A15';

export function isHexColor(value: string | null | undefined): value is string {
  return !!value && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Contrast ratio of a hex color against white (1–21). */
export function contrastWithWhite(hex: string): number {
  if (!isHexColor(hex)) return 21;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const l = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return 1.05 / (l + 0.05);
}

/** Tiles carry text: white unless it fails 4.5:1, then dark text. */
export function tileTextColor(hex: string): string {
  return contrastWithWhite(hex) >= 4.5 ? '#FFFFFF' : DARK_TEXT;
}

/** Icon squares only hold an icon: stay white unless the color is very light (keeps today's 6 buttons white). */
export const ICON_DARK_BELOW = 2;
export function iconGlyphColor(hex: string): string {
  return contrastWithWhite(hex) >= ICON_DARK_BELOW ? '#FFFFFF' : DARK_TEXT;
}

// ===== Links =====

/** Full address for a link (null for app tabs). */
export function linkUrl(target: Pick<LinkTarget, 'link_type' | 'link_value'>, basePortalUrl: string): string | null {
  const value = (target.link_value ?? '').trim();
  if (!value) return null;
  if (target.link_type === 'tab') return null;
  if (target.link_type === 'portal') return `${basePortalUrl.replace(/\/$/, '')}${value.startsWith('/') ? value : `/${value}`}`;
  return value;
}

export function linkError(linkType: LinkType, linkValue: string): string | null {
  const v = (linkValue ?? '').trim();
  if (linkType === 'portal') {
    if (!v.startsWith('/')) return 'The page path must start with "/".';
    return null;
  }
  if (linkType === 'url') {
    if (!v.startsWith('https://')) return 'The address must start with https://';
    try {
      new URL(v);
    } catch {
      return 'This is not a valid web address.';
    }
    return null;
  }
  if (!TAB_KEYS.includes(v as HomeTabKey)) return 'Choose an app tab.';
  return null;
}

export type OpenDecision =
  { kind: 'tab'; tab: HomeTabKey } |
  { kind: 'browser'; url: string } |
  { kind: 'in_app'; url: string } |
  { kind: 'none' };

/**
 * Where a tap goes. Sign-in pages (/login, /register, /member-portal) always open in the browser.
 * "auto": Chamber website pages follow the "Open portal pages inside the app" setting; other sites open in the browser.
 */
export function decideOpen(target: LinkTarget, basePortalUrl: string, embedPortalPages: boolean): OpenDecision {
  if (target.link_type === 'tab') {
    const tab = target.link_value as HomeTabKey;
    return TAB_KEYS.includes(tab) ? { kind: 'tab', tab } : { kind: 'none' };
  }
  const url = linkUrl(target, basePortalUrl);
  if (!url) return { kind: 'none' };
  if (opensInBrowser(url)) return { kind: 'browser', url };
  if (target.open_mode === 'browser') return { kind: 'browser', url };
  if (target.open_mode === 'in_app') return { kind: 'in_app', url };
  if (target.link_type === 'url' && !isChamberUrl(url)) return { kind: 'browser', url };
  if (!embedPortalPages) return { kind: 'browser', url };
  return { kind: 'in_app', url };
}

/** For aria-labels ("opens in browser"). */
export function willOpenInBrowser(target: LinkTarget, basePortalUrl: string, embedPortalPages: boolean): boolean {
  if (target.link_type === 'tab') return !embedPortalPages && PORTAL_TABS.includes(target.link_value as HomeTabKey);
  return decideOpen(target, basePortalUrl, embedPortalPages).kind === 'browser';
}

// ===== Layout helpers =====

/** Hero first, footer last, everything else by position. */
export function orderSections(sections: HomeSection[]): HomeSection[] {
  const middle = sections.filter((s) => s.type !== 'hero' && s.type !== 'footer').sort((a, b) => a.position - b.position);
  return [...sections.filter((s) => s.type === 'hero'), ...middle, ...sections.filter((s) => s.type === 'footer')];
}

export function visibleLayout(sections: HomeSection[]): HomeSection[] {
  return orderSections(sections.filter((s) => s.is_visible)).map((s) => ({
    ...s,
    items: s.items.filter((i) => i.is_visible).sort((a, b) => a.position - b.position),
    slides: s.slides?.filter((x) => x.is_visible).sort((a, b) => a.position - b.position),
    photos: s.photos?.filter((x) => x.is_visible).sort((a, b) => a.position - b.position)
  }));
}

function asSettings(value: unknown): SectionSettings {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as SectionSettings : {};
}

/** Builds sections (with nested items) from database rows. */
export function buildLayout(rawSections: unknown[], rawItems: unknown[], visibleOnly: boolean, rawSlides: unknown[] = [], rawPhotos: unknown[] = []): HomeSection[] {
  const sections: HomeSection[] = (rawSections as (Omit<HomeSection, 'items' | 'settings'> & { settings: unknown })[]).
  filter((s) => !visibleOnly || s.is_visible).
  map((s) => ({ ...s, settings: asSettings(s.settings), items: [] }));
  const byId = new Map(sections.map((s) => [s.id, s]));
  for (const item of rawItems as HomeItem[]) {
    if (visibleOnly && !item.is_visible) continue;
    byId.get(item.section_id)?.items.push(item);
  }
  for (const slide of rawSlides as BannerSlide[]) {
    if (visibleOnly && !slide.is_visible) continue;
    const section = byId.get(slide.section_id);
    if (section && section.type === 'banner') (section.slides ??= []).push(slide);
  }
  for (const photo of rawPhotos as GalleryPhoto[]) {
    if (visibleOnly && !photo.is_visible) continue;
    const section = byId.get(photo.section_id);
    if (section && section.type === 'gallery') (section.photos ??= []).push(photo);
  }
  sections.forEach((s) => {
    s.items.sort((a, b) => a.position - b.position);
    if (s.type === 'banner') s.slides = (s.slides ?? []).sort((a, b) => a.position - b.position);
    if (s.type === 'gallery') s.photos = (s.photos ?? []).sort((a, b) => a.position - b.position);
  });
  return orderSections(sections);
}

// ===== Sponsor banners =====

export const BANNER_SHAPES: Record<BannerShape, {label: string;ratio: number;w: number;h: number;}> = {
  wide: { label: 'Wide 3:1', ratio: 3, w: 1200, h: 400 },
  medium: { label: 'Medium 2:1', ratio: 2, w: 1200, h: 600 },
  square: { label: 'Square 1:1', ratio: 1, w: 1080, h: 1080 }
};

export const BANNER_DEFAULTS: SectionSettings = {
  mode: 'rotate',
  interval_seconds: 6,
  shape: 'wide',
  show_label: true,
  label: 'Sponsored',
  label_es: 'Patrocinado'
};

export function bannerShape(s: SectionSettings): BannerShape {
  return s.shape === 'medium' || s.shape === 'square' ? s.shape : 'wide';
}

export function bannerInterval(s: SectionSettings): number {
  const n = Number(s.interval_seconds ?? 6);
  return Math.min(LIMITS.intervalMax, Math.max(LIMITS.intervalMin, Number.isFinite(n) ? Math.round(n) : 6));
}

/** The corner label text, or null when it's switched off. */
export function bannerLabel(s: SectionSettings, lang: Lang): string | null {
  if (s.show_label === false) return null;
  return loc(s.label, s.label_es, lang).trim() || (lang === 'es' ? 'Patrocinado' : 'Sponsored');
}

/** Uses the device time. */
export function slideStatus(slide: Pick<BannerSlide, 'is_visible' | 'start_at' | 'end_at'>, now: Date = new Date()): SlideStatus {
  if (!slide.is_visible) return 'hidden';
  const t = now.getTime();
  if (slide.start_at && new Date(slide.start_at).getTime() > t) return 'scheduled';
  if (slide.end_at && new Date(slide.end_at).getTime() <= t) return 'ended';
  return 'live';
}

export function liveSlides(section: HomeSection, now: Date = new Date()): BannerSlide[] {
  return (section.slides ?? []).filter((s) => slideStatus(s, now) === 'live').sort((a, b) => a.position - b.position);
}

/** Where a slide goes, or null when it isn't clickable. */
export function slideTarget(slide: BannerSlide): LinkTarget | null {
  if (!slide.link_type || !slide.link_value?.trim()) return null;
  return { link_type: slide.link_type, link_value: slide.link_value, open_mode: slide.open_mode ?? 'auto' };
}

// ===== Default layout (fallback when nothing is cached and the database can't be reached) =====

type ItemSeed = Partial<HomeItem> & Pick<HomeItem, 'label' | 'icon' | 'color' | 'link_type' | 'link_value'>;

function seedItem(sectionId: string, position: number, p: ItemSeed): HomeItem {
  return {
    id: `${sectionId}-${position}`,
    section_id: sectionId,
    position,
    is_visible: true,
    label_es: null,
    hint: null,
    hint_es: null,
    viewer_title: null,
    viewer_title_es: null,
    open_mode: 'auto',
    ...p
  };
}

function seedSection(id: string, type: SectionType, position: number, p: Partial<HomeSection> = {}): HomeSection {
  return { id, type, position, is_visible: true, title: null, title_es: null, settings: {}, items: [], ...p };
}

export const DEFAULT_LAYOUT: HomeSection[] = [
  seedSection('default-hero', 'hero', 1, { settings: { show_weather: true } }),
  seedSection('default-ask', 'ask_mule', 2, {
    settings: {
      placeholder: 'Ask the Mule anything…',
      placeholder_es: 'Pregúntele lo que sea a la Mula…',
      chips: [
        { text: 'Where can I eat?', text_es: '¿Dónde puedo comer?' },
        { text: "What's on this week?", text_es: '¿Qué hay esta semana?' },
        { text: "Who's hiring?", text_es: '¿Quién está contratando?' }]
    }
  }),
  seedSection('default-tiles', 'tiles', 3, {
    title: 'Quick picks',
    title_es: 'Accesos rápidos',
    settings: { columns: 2 },
    items: [
      seedItem('default-tiles', 1, { label: 'Events', label_es: 'Eventos', hint: "What's on in town", hint_es: 'Qué hay en el pueblo', icon: 'calendar', color: '#B4532A', link_type: 'tab', link_value: 'events' }),
      seedItem('default-tiles', 2, { label: 'Directory', label_es: 'Directorio', hint: 'Find a local business', hint_es: 'Encuentre un negocio local', icon: 'building-2', color: '#2C6E73', link_type: 'tab', link_value: 'directory' }),
      seedItem('default-tiles', 3, { label: 'Deals', label_es: 'Ofertas', hint: 'Member specials', hint_es: 'Especiales para miembros', icon: 'tag', color: '#9A6A17', link_type: 'portal', link_value: '/sales' }),
      seedItem('default-tiles', 4, { label: 'Jobs', label_es: 'Empleos', hint: 'Now hiring nearby', hint_es: 'Se contrata cerca', icon: 'briefcase', color: '#557236', link_type: 'portal', link_value: '/jobs' })]
  }),
  seedSection('default-icons', 'icons', 4, {
    settings: { columns: 3 },
    items: [
      seedItem('default-icons', 1, { label: 'News', label_es: 'Noticias', icon: 'newspaper', color: '#4A7397', link_type: 'portal', link_value: '/news' }),
      seedItem('default-icons', 2, { label: 'Visit', label_es: 'Visítenos', viewer_title: 'Visit Muleshoe', viewer_title_es: 'Visite Muleshoe', icon: 'map-pin', color: '#8F7AA8', link_type: 'portal', link_value: '/visit' }),
      seedItem('default-icons', 3, { label: 'Newsletter', label_es: 'Boletín', icon: 'mail', color: '#D3A55B', link_type: 'portal', link_value: '/newsletter' }),
      seedItem('default-icons', 4, { label: 'Join', label_es: 'Únase', viewer_title: 'Join the Chamber', viewer_title_es: 'Únase a la Cámara', icon: 'user-plus', color: '#2E9A64', link_type: 'portal', link_value: '/join' }),
      seedItem('default-icons', 5, { label: 'Contact', label_es: 'Contacto', viewer_title: 'Contact Us', viewer_title_es: 'Contáctenos', icon: 'phone', color: '#8FA79A', link_type: 'portal', link_value: '/contact' }),
      seedItem('default-icons', 6, { label: 'Member Portal', label_es: 'Portal de miembros', icon: 'users', color: '#6E7FA8', link_type: 'portal', link_value: '/member-portal', open_mode: 'browser' })]
  }),
  seedSection('default-alerts', 'alerts', 5),
  seedSection('default-latest', 'latest', 6, {
    title: 'Latest from the Chamber',
    title_es: 'Lo último de la Cámara',
    settings: {
      count: 3,
      empty_title: 'All quiet on the range.',
      empty_title_es: 'Todo tranquilo por aquí.',
      empty_text: 'News and events from the Chamber will show up here.',
      empty_text_es: 'Aquí aparecerán las noticias y eventos de la Cámara.'
    }
  }),
  seedSection('default-footer', 'footer', 7, {
    settings: {
      text: 'Muleshoe, Texas · Home of the National Mule Memorial',
      text_es: 'Muleshoe, Texas · Hogar del National Mule Memorial'
    }
  })];

// ===== Local cache (instant Home on next launch) =====

const CACHE_KEY = 'chamber_home_layout_v1';

export function readLayoutCache(): HomeSection[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomeSection[];
    if (!Array.isArray(parsed) || !parsed.length || !parsed.every((s) => s && typeof s.type === 'string' && Array.isArray(s.items))) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLayoutCache(sections: HomeSection[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(sections));
  } catch {
    // storage full or blocked: ignore
  }
}
