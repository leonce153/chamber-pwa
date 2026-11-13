import type { Lang } from '@/lib/language';
import type { TranslationKey } from '@/i18n/en';

type T = (key: TranslationKey) => string;

/** Map an NWS condition text to one of the app's own condition labels. */
function conditionKey(condition: string): TranslationKey | null {
  const c = condition.toLowerCase();
  if (c.includes('thunder') || c.includes('t-storm')) return 'cond.thunderstorm';
  if (c.includes('snow') || c.includes('sleet') || c.includes('ice') || c.includes('flurr')) return 'cond.snow';
  if (c.includes('rain') || c.includes('shower') || c.includes('drizzle')) return 'cond.rain';
  if (c.includes('fog') || c.includes('haze') || c.includes('smoke') || c.includes('dust')) return 'cond.fog';
  if (c.includes('wind') || c.includes('breez') || c.includes('blustery')) return 'cond.windy';
  if (c.includes('partly') || c.includes('mostly sunny') || c.includes('mostly clear')) return 'cond.partlyCloudy';
  if (c.includes('cloud') || c.includes('overcast')) return 'cond.cloudy';
  if (c.includes('sunny') || c.includes('clear') || c.includes('fair')) return 'cond.clear';
  return null;
}

/** English shows the NWS text as before; Spanish shows the app's translated condition label. */
export function conditionText(condition: string | null | undefined, lang: Lang, t: T): string {
  if (!condition) return '';
  if (lang === 'en') return condition;
  const key = conditionKey(condition);
  return key ? t(key) : condition;
}

/** Day name for the 7-day list. English keeps the NWS name; Spanish uses Intl weekday names. */
export function dayText(name: string, startTime: string, lang: Lang, locale: string, t: T): string {
  if (lang === 'en') return name;
  if (/tonight|overnight/i.test(name)) return t('day.tonight');
  if (/^(today|this afternoon|this morning)$/i.test(name.trim())) return t('day.today');
  const d = new Date(startTime);
  if (isNaN(d.getTime())) return name;
  const weekday = d.toLocaleDateString(locale, { weekday: 'long' });
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}
