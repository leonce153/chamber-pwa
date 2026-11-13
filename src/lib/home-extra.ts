import { centralInputToIso, formatCentral } from '@/lib/central-time';
import {
  LIMITS, isHexColor, linkError,
  type HomeSection, type LinkTarget, type LinkType, type ManualEvent, type OpenMode, type SectionSettings,
  type SectionType, type SocialLink, type SocialPlatform, type Spotlight } from
'@/lib/home-layout';

/** Rules and helpers for the events, spotlight, countdown, social and gallery sections (public app + admin). */

export const EXTRA_TYPES: SectionType[] = ['events', 'spotlight', 'countdown', 'social', 'gallery'];

export const SOCIAL_PLATFORMS: {key: SocialPlatform;label: string;color: string;email?: boolean;}[] = [
{ key: 'facebook', label: 'Facebook', color: '#1877F2' },
{ key: 'instagram', label: 'Instagram', color: '#E4405F' },
{ key: 'youtube', label: 'YouTube', color: '#FF0000' },
{ key: 'tiktok', label: 'TikTok', color: '#000000' },
{ key: 'x', label: 'X', color: '#000000' },
{ key: 'linkedin', label: 'LinkedIn', color: '#0A66C2' },
{ key: 'threads', label: 'Threads', color: '#000000' },
{ key: 'website', label: 'Website', color: '#2C6E73' },
{ key: 'email', label: 'Email', color: '#B4532A', email: true }];


export const DEFAULT_TITLES: Partial<Record<SectionType, {en: string;es: string;}>> = {
  events: { en: 'Coming up', es: 'Próximamente' },
  social: { en: 'Follow the Chamber', es: 'Siga a la Cámara' },
  gallery: { en: 'Around Muleshoe', es: 'Por Muleshoe' }
};

/** Every platform once, in the saved order, missing ones (off) at the end. */
export function normalizeSocial(list?: SocialLink[]): SocialLink[] {
  const seen = new Set<SocialPlatform>();
  const out: SocialLink[] = [];
  for (const l of list ?? []) {
    if (!SOCIAL_PLATFORMS.some((p) => p.key === l.platform) || seen.has(l.platform)) continue;
    seen.add(l.platform);
    out.push({ platform: l.platform, enabled: !!l.enabled, value: l.value ?? '' });
  }
  for (const p of SOCIAL_PLATFORMS) if (!seen.has(p.key)) out.push({ platform: p.key, enabled: false, value: '' });
  return out;
}

export function defaultSettingsFor(type: SectionType): SectionSettings {
  switch (type) {
    case 'events':
      return { event_count: 5, source: 'manual', events: [] };
    case 'spotlight':
      return { spotlights: [], spotlight_mode: 'rotate' };
    case 'countdown':
      return { name: '', color: '#2C6E73', after_text: 'Happening now!', after_text_es: '¡Está pasando ahora!', after_hours: 6 };
    case 'social':
      return { social: normalizeSocial([]) };
    case 'gallery':
      return { photo_count: 6, see_more: false };
    default:
      return {};
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function socialError(l: SocialLink): string | null {
  const v = l.value.trim();
  if (l.platform === 'email') return EMAIL.test(v.replace(/^mailto:/i, '')) ? null : 'Enter a valid email address.';
  if (!v.startsWith('https://')) return 'The address must start with https://';
  try {
    new URL(v);
  } catch {
    return 'This is not a valid web address.';
  }
  return null;
}

export function socialHref(l: SocialLink): string | null {
  if (!l.enabled || socialError(l)) return null;
  const v = l.value.trim();
  return l.platform === 'email' ? `mailto:${v.replace(/^mailto:/i, '')}` : v;
}

/** A link stored as link_type / link_value / open_mode, or null when there is none. */
export function optionalTarget(t: {link_type?: LinkType | null;link_value?: string | null;open_mode?: OpenMode;}): LinkTarget | null {
  if (!t.link_type || !t.link_value?.trim()) return null;
  return { link_type: t.link_type, link_value: t.link_value.trim(), open_mode: t.open_mode ?? 'auto' };
}

export type SpotlightStatus = 'live' | 'scheduled' | 'ended' | 'hidden' | 'incomplete';

export function spotlightStatus(s: Spotlight, now: number = Date.now()): SpotlightStatus {
  if (!s.image_url?.trim() || !s.name?.trim() || !s.alt?.trim()) return 'incomplete';
  if (!s.visible) return 'hidden';
  if (s.start_at && new Date(s.start_at).getTime() > now) return 'scheduled';
  if (s.end_at && new Date(s.end_at).getTime() <= now) return 'ended';
  return 'live';
}

export const spotlightLive = (s: Spotlight, now?: number) => spotlightStatus(s, now) === 'live';

/** Start of a hand-entered event (Central time); no time = all day. */
export function manualEventStart(e: ManualEvent): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date ?? '')) return null;
  const time = e.time && /^\d{2}:\d{2}/.test(e.time) ? e.time.slice(0, 5) : '00:00';
  return centralInputToIso(`${e.date}T${time}`);
}

export function eventCount(s: SectionSettings): number {
  const n = Number(s.event_count ?? 5);
  return Math.min(LIMITS.eventsMax, Math.max(LIMITS.eventsMin, Number.isFinite(n) ? Math.round(n) : 5));
}

export function afterHours(s: SectionSettings): number {
  const n = Number(s.after_hours ?? 6);
  return Math.min(72, Math.max(1, Number.isFinite(n) ? Math.round(n) : 6));
}

export type CountdownPhase = {kind: 'before';ms: number;} | {kind: 'after';} | null;

/** Counting down, "happening now", or null (not set up / over: hide). */
export function countdownPhase(s: SectionSettings, now: number): CountdownPhase {
  if (!s.target_at || !s.name?.trim()) return null;
  const t = new Date(s.target_at).getTime();
  if (Number.isNaN(t)) return null;
  if (now < t) return { kind: 'before', ms: t - now };
  if (now < t + afterHours(s) * 3600000) return { kind: 'after' };
  return null;
}

export function countdownParts(ms: number): {days: number;hours: number;minutes: number;} {
  const total = Math.max(0, Math.ceil(ms / 60000));
  return { days: Math.floor(total / 1440), hours: Math.floor(total % 1440 / 60), minutes: total % 60 };
}

function validDates(start?: string | null, end?: string | null): boolean {
  return !start || !end || new Date(end).getTime() > new Date(start).getTime();
}

function validImage(url?: string | null): boolean {
  return !!url && /^https?:\/\/\S+$/i.test(url.trim());
}

/** Save-time checks for the new section types. Returns a message or null. */
export function validateExtra(type: SectionType, s: SectionSettings): string | null {
  switch (type) {
    case 'events':{
        if (s.source === 'feed') {
          const v = (s.feed_url ?? '').trim();
          if (!v) return 'Add the feed address.';
          try {
            const u = new URL(v.replace(/^webcal:/i, 'https:'));
            if (u.protocol !== 'https:' && u.protocol !== 'http:') return 'The feed address must start with https://';
          } catch {
            return 'The feed address is not a valid web address.';
          }
          return null;
        }
        for (const [i, e] of (s.events ?? []).entries()) {
          const n = `Event ${i + 1}`;
          if (!e.title?.trim()) return `${n}: add a title.`;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date ?? '')) return `${n}: choose a date.`;
          if (e.link_type) {
            const err = linkError(e.link_type, e.link_value ?? '');
            if (err) return `${n}: ${err}`;
          }
        }
        return null;
      }
    case 'spotlight':{
        for (const [i, sp] of (s.spotlights ?? []).entries()) {
          const n = sp.name?.trim() || `Spotlight ${i + 1}`;
          if (!validImage(sp.image_url)) return `${n}: add a photo.`;
          if (!sp.alt?.trim()) return `${n}: describe the photo for screen readers.`;
          if (!sp.name?.trim()) return `Spotlight ${i + 1}: add the business name.`;
          if (sp.link_type) {
            const err = linkError(sp.link_type, sp.link_value ?? '');
            if (err) return `${n}: ${err}`;
          }
          if (!validDates(sp.start_at, sp.end_at)) return `${n}: "Show until" must be after "Show from".`;
        }
        return null;
      }
    case 'countdown':{
        if (!s.name?.trim()) return 'Add the event name.';
        if (!s.target_at) return 'Choose the date and time it starts.';
        if (s.image_url && !validImage(s.image_url)) return 'The image address must start with https://';
        if (s.button_label?.trim() && s.link_type) {
          const err = linkError(s.link_type, s.link_value ?? '');
          if (err) return err;
        }
        if (s.color && !isHexColor(s.color)) return 'Use a hex color like #2C6E73.';
        return null;
      }
    case 'social':{
        for (const l of normalizeSocial(s.social)) {
          if (!l.enabled) continue;
          const err = socialError(l);
          if (err) return `${SOCIAL_PLATFORMS.find((p) => p.key === l.platform)?.label}: ${err}`;
        }
        return null;
      }
    case 'gallery':{
        if (s.see_more && s.link_type) return linkError(s.link_type, s.link_value ?? '');
        return null;
      }
    default:
      return null;
  }
}

/** One-line summary for the admin section list. */
export function extraSummary(sec: HomeSection): string {
  const s = sec.settings;
  switch (sec.type) {
    case 'events':{
        if (s.source === 'feed') return s.feed_url ? `Website feed · up to ${eventCount(s)} events` : 'Website feed not set up yet';
        const list = s.events ?? [];
        const now = Date.now();
        const upcoming = list.filter((e) => {
          const start = manualEventStart(e);
          return start && (e.time ? new Date(start).getTime() >= now : new Date(start).getTime() + 86400000 > now);
        }).length;
        return `${upcoming} upcoming of ${list.length} · up to ${eventCount(s)} shown`;
      }
    case 'spotlight':{
        const list = s.spotlights ?? [];
        const live = list.filter((x) => spotlightLive(x)).length;
        return `${live} live of ${list.length} · ${s.spotlight_mode === 'first' ? 'Shows the first live one' : 'Rotates each visit'}`;
      }
    case 'countdown':
      return s.name?.trim() && s.target_at ? `${s.name} · ${formatCentral(s.target_at)} CT` : 'Not set up yet';
    case 'social':{
        const on = normalizeSocial(s.social).filter((l) => l.enabled).length;
        return `${on} button${on === 1 ? '' : 's'} on`;
      }
    case 'gallery':{
        const photos = sec.photos ?? [];
        const ready = photos.filter((p) => p.is_visible && p.alt_text.trim()).length;
        const missing = photos.filter((p) => !p.alt_text.trim()).length;
        return `${ready} of ${photos.length} photos showing · ${s.photo_count === 9 ? 9 : 6} on Home${missing ? ` · ${missing} need a description` : ''}`;
      }
    default:
      return '';
  }
}
