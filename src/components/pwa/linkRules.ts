import { getCurrentLang } from '@/lib/language';

/**
 * Link rules for the public app.
 * Sign-in related portal pages must open in the browser because
 * iPhone blocks sign-in cookies inside iframes.
 */
const BROWSER_PATHS = ['/member-portal', '/login', '/register'];

/** Chamber website hosts that understand the app=1 and lang parameters. */
const CHAMBER_HOSTS = ['muleshoetxchamber.com', 'www.muleshoetxchamber.com'];

/** Whether a full URL is on the Chamber website. */
export function isChamberUrl(url: string): boolean {
  try {
    return CHAMBER_HOSTS.includes(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function opensInBrowser(pathOrUrl: string): boolean {
  let path = pathOrUrl;
  try {
    path = new URL(pathOrUrl, 'https://placeholder.invalid').pathname;
  } catch {
    // keep raw value
  }
  return BROWSER_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

/** Whether a notification link points somewhere worth opening (not the app itself). */
export function isOpenableUpdateUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (u.host === window.location.host || u.host === 'pwa.muleshoetxchamber.com') return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Sets query parameters on Chamber website URLs only (path, other params and #hash kept).
 * Other domains and invalid URLs are returned unchanged.
 */
export function withChamberParams(url: string, params: Record<string, string>): string {
  try {
    const u = new URL(url);
    if (!CHAMBER_HOSTS.includes(u.hostname.toLowerCase())) return url;
    for (const [key, value] of Object.entries(params)) u.searchParams.set(key, value);
    return u.toString();
  } catch {
    return url;
  }
}

/** Opens in the browser; Chamber website links get the current lang (never app=1). */
export function openInBrowser(url: string) {
  window.open(withChamberParams(url, { lang: getCurrentLang() }), '_blank', 'noopener,noreferrer');
}
