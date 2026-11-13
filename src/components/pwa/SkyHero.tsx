import { SKY, type SkyPeriod } from '@/hooks/use-sky-period';
import type { WeatherState } from '@/hooks/use-weather';
import { weatherIcon } from '@/components/pwa/weatherIcons';
import { conditionText } from '@/components/pwa/weatherText';
import { useLanguage } from '@/hooks/use-language';
import type { TranslationKey } from '@/i18n/en';

interface SkyHeroProps {
  period: SkyPeriod;
  now: Date;
  weatherEnabled: boolean;
  weather: WeatherState;
  onOpenWeather: () => void;
}

const TEXT_SHADOW = '0 1px 6px rgba(0,0,0,.35)';
const DISPLAY_FONT = "'Playfair Display', Georgia, serif";
const BODY_FONT = "'DM Sans', system-ui, sans-serif";
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

const STARS = [
[8, 14], [22, 32], [37, 10], [55, 24], [68, 8], [79, 30], [90, 16], [47, 40], [15, 48]].
map(([x, y]) => `radial-gradient(circle at ${x}% ${y}%, #ffffffd9 0, #ffffffd9 1px, transparent 1.6px)`).join(', ');

function greetingKey(h: number): TranslationKey {
  if (h >= 5 && h < 12) return 'sky.morning';
  if (h >= 12 && h < 17) return 'sky.afternoon';
  return 'sky.evening';
}

export function SkyHero({ period, now, weatherEnabled, weather, onOpenWeather }: SkyHeroProps) {
  const { t, lang, locale } = useLanguage();
  const sky = SKY[period];
  const background = period === 'night' ? `${STARS}, ${sky.gradient}` : sky.gradient;

  const data = weatherEnabled ? weather.data : null;
  const periods = data?.periods ?? [];
  const temp = data?.current?.temperatureF ?? periods[0]?.temperatureF ?? null;
  const rawCondition = data?.current?.condition ?? periods[0]?.condition ?? '';
  const condition = conditionText(rawCondition, lang, t);
  const hi = periods[0]?.isDaytime ? periods[0].temperatureF : undefined;
  const lo = periods.find((p) => !p.isDaytime)?.temperatureF;
  const hiLo = [hi != null ? t('sky.high', { temp: hi }) : null, lo != null ? t('sky.low', { temp: lo }) : null].filter(Boolean).join(' · ');
  const Icon = weatherIcon(rawCondition, data?.isDaytime ?? true);
  const alert = data?.alerts?.[0];
  const showWeather = !!data && temp != null;

  const dateText = now.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <section
      data-ev-id="ev_sky_hero"
      className="relative w-full text-white"
      style={{ background, padding: '20px 18px 74px', textShadow: TEXT_SHADOW }}>
      <div data-ev-id="ev_sky_row" className="flex items-start justify-between gap-3">
        <div data-ev-id="ev_sky_left" className="flex-1 min-w-0 flex flex-col items-start gap-1.5">
          <h2
            data-ev-id="ev_sky_greeting"
            style={{ fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 27, lineHeight: 1.05 }}>
            {t(greetingKey(now.getHours()))}
            <br data-ev-id="ev_69e59af50f" />
            Muleshoe
          </h2>
          <p data-ev-id="ev_sky_date" style={{ fontFamily: BODY_FONT, fontSize: 14 }}>{dateText}</p>
          {showWeather && alert &&
          <button
            data-ev-id="ev_sky_alert_pill"
            onClick={onOpenWeather}
            className={`max-w-full truncate text-white font-bold rounded-full mt-1 ${FOCUS}`}
            style={{ backgroundColor: '#C0392B', fontSize: 13, padding: '4px 10px', textShadow: 'none' }}
            aria-label={t('sky.alertAria', { event: alert.event })}>
              {alert.event}
            </button>
          }
        </div>

        {showWeather &&
        <button
          data-ev-id="ev_sky_weather"
          onClick={onOpenWeather}
          className={`shrink-0 flex flex-col items-end text-right whitespace-nowrap rounded-xl min-h-11 ${FOCUS}`}
          aria-label={t('sky.weatherAria', { temp: temp ?? '', condition })}>
            <span data-ev-id="ev_sky_temp_row" className="flex items-center gap-1.5">
              <Icon size={30} strokeWidth={2} aria-hidden="true" />
              <span data-ev-id="ev_sky_temp" className="font-bold" style={{ fontSize: 40, lineHeight: 1 }}>{temp}°</span>
            </span>
            {condition && <span data-ev-id="ev_sky_condition" className="mt-1" style={{ fontSize: 13 }}>{condition}</span>}
            {hiLo && <span data-ev-id="ev_sky_hilo" style={{ fontSize: 13 }}>{hiLo}</span>}
          </button>
        }
      </div>

      <svg data-ev-id="ev_cbe29049c4"
      viewBox="0 0 390 70"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="absolute left-0 right-0 w-full"
      style={{ bottom: -1, height: 58 }}
      fill={sky.skyline}>
        <path data-ev-id="ev_6bb53bdac6" d="M0 52 Q60 47 130 50 T260 49 T390 48 V70 H0Z" /><rect data-ev-id="ev_8bf9d7aecc" x="40" y="16" width="30" height="15" rx="7" /><path data-ev-id="ev_5ed868fcdc" d="M40 18 L55 8 L70 18Z" /><path data-ev-id="ev_80a09c5762" d="M44 52 L49 30 L52 30 L48 52Z M66 52 L61 30 L58 30 L62 52Z M46 42 H64 V44 H46Z" /><path data-ev-id="ev_5ef149c5b7" d="M126 52 L132 22 L134 22 L140 52Z" /><path data-ev-id="ev_d8f82906cb" d="M133 22 L133 6 L135 6 L135 22Z M133 22 L119 16 L120 14 L134 21Z M134 22 L148 28 L147 30 L133 23Z M134 22 L142 10 L144 11 L135 23Z" /><path data-ev-id="ev_64d85f8119" d="M134 21 L150 19 L150 23 Z" /><rect data-ev-id="ev_60e068dd47" x="262" y="20" width="11" height="32" /><rect data-ev-id="ev_871a5b41e5" x="274" y="20" width="11" height="32" /><rect data-ev-id="ev_c14e6192bd" x="286" y="20" width="11" height="32" /><rect data-ev-id="ev_99282374ed" x="270" y="6" width="20" height="15" /><path data-ev-id="ev_3931e4aae3" d="M262 20 Q267.5 15 273 20Z M274 20 Q279.5 15 285 20Z M286 20 Q291.5 15 297 20Z" /><rect data-ev-id="ev_c8f070e960" x="298" y="36" width="26" height="16" /><path data-ev-id="ev_7ea71e0388" d="M296 36 L311 29 L326 36Z" /><rect data-ev-id="ev_b472e665da" x="180" y="44" width="2" height="8" /><rect data-ev-id="ev_0bdf343225" x="196" y="45" width="2" height="7" /><rect data-ev-id="ev_89ed113bd2" x="212" y="45" width="2" height="7" /><rect data-ev-id="ev_62726c0838" x="228" y="44" width="2" height="8" /><rect data-ev-id="ev_23f57cd48f" x="180" y="46" width="50" height="1.4" /><path data-ev-id="ev_82d84f93ac" d="M346 38 q4 -6 10 -4 l3 -6 l2 6 q8 1 10 6 v10 h-2 v-8 h-14 v8 h-2 v-8 q-5 0 -7 -4z" />
      </svg>
    </section>);
}