import { ChevronLeft, RefreshCw, AlertTriangle, Droplets, Wind, Thermometer, Loader2, CloudOff } from 'lucide-react';
import type { WeatherState, WeatherPeriod } from '@/hooks/use-weather';
import { weatherIcon, alertColors } from '@/components/pwa/weatherIcons';
import { conditionText, dayText } from '@/components/pwa/weatherText';
import { useLanguage } from '@/hooks/use-language';

interface WeatherScreenProps {
  weather: WeatherState;
  primaryColor: string;
  textColor: string;
  accentTextColor: string;
  backgroundColor: string;
  onBack: () => void;
}

interface DayRow {
  key: string;
  name: string;
  condition: string;
  isDaytime: boolean;
  high: number | null;
  low: number | null;
  precipChance: number | null;
}

/** Pair NWS day/night periods into one row per day. */
function toDays(periods: WeatherPeriod[]): DayRow[] {
  const rows: DayRow[] = [];
  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    if (p.isDaytime) {
      const night = periods[i + 1] && !periods[i + 1].isDaytime ? periods[i + 1] : null;
      rows.push({
        key: p.startTime,
        name: p.name,
        condition: p.condition,
        isDaytime: true,
        high: p.temperatureF,
        low: night?.temperatureF ?? null,
        precipChance: Math.max(p.precipChance ?? 0, night?.precipChance ?? 0) || null
      });
      if (night) i++;
    } else {
      rows.push({ key: p.startTime, name: p.name, condition: p.condition, isDaytime: false, high: null, low: p.temperatureF, precipChance: p.precipChance });
    }
  }
  return rows.slice(0, 7);
}

export function WeatherScreen({ weather, primaryColor, textColor, accentTextColor, backgroundColor, onBack }: WeatherScreenProps) {
  const { t, lang, locale } = useLanguage();
  const formatHour = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: 'numeric' });
  const cond = (c: string | null | undefined) => conditionText(c, lang, t);
  const { data, loading, refresh } = weather;
  const current = data?.current;
  const CurrentIcon = weatherIcon(current?.condition ?? data?.periods?.[0]?.condition, data?.isDaytime ?? true);
  const days = toDays(data?.periods ?? []);
  const cardStyle = { backgroundColor: primaryColor + '10', borderColor: primaryColor + '25' };

  return (
    <div data-ev-id="ev_weather_screen" className="fixed inset-0 z-[60] flex flex-col safe-area-top" style={{ backgroundColor }}>
      {/* Top bar */}
      <div data-ev-id="ev_weather_topbar" className="flex items-center gap-1 px-1 h-14 shrink-0 border-b" style={{ borderColor: primaryColor + '30' }}>
        <button data-ev-id="ev_weather_back" onClick={onBack} className="w-11 h-11 flex items-center justify-center rounded-xl active:opacity-60" aria-label={t('common.backHome')}>
          <ChevronLeft className="w-6 h-6" style={{ color: textColor }} />
        </button>
        <h2 data-ev-id="ev_weather_title" className="flex-1 text-base font-semibold" style={{ color: textColor }}>{t('weather.title')}</h2>
        <button data-ev-id="ev_weather_refresh" onClick={refresh} disabled={loading} className="w-11 h-11 flex items-center justify-center rounded-xl active:opacity-60 disabled:opacity-50" aria-label={t('weather.refresh')}>
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} style={{ color: textColor }} />
        </button>
      </div>

      <div data-ev-id="ev_weather_scroll" className="flex-1 overflow-y-auto">
        {!data ?
        <div data-ev-id="ev_weather_empty" className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            {loading ?
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: primaryColor }} /> :
          <CloudOff className="w-10 h-10 opacity-60" style={{ color: primaryColor }} />
          }
            <p data-ev-id="ev_weather_empty_text" className="text-base" style={{ color: textColor }}>
              {loading ? t('weather.loading') : t('weather.unavailable')}
            </p>
          </div> :

        <div data-ev-id="ev_weather_content" className="flex flex-col gap-6 p-4 pb-10 max-w-lg mx-auto">
            {/* Current conditions */}
            <section data-ev-id="ev_weather_current" className="flex flex-col items-center text-center gap-1 pt-2">
              <p data-ev-id="ev_weather_location" className="text-base font-semibold" style={{ color: accentTextColor }}>{data.location}</p>
              <CurrentIcon className="w-16 h-16 my-2" style={{ color: primaryColor }} />
              <p data-ev-id="ev_weather_now_temp" className="text-6xl font-bold" style={{ color: textColor }}>
                {current?.temperatureF ?? '--'}°F
              </p>
              <p data-ev-id="ev_weather_now_condition" className="text-lg" style={{ color: textColor }}>{cond(current?.condition ?? data.periods[0]?.condition)}</p>
              {current?.feelsLikeF != null && current.feelsLikeF !== current.temperatureF &&
            <p data-ev-id="ev_weather_feels" className="text-base opacity-70" style={{ color: textColor }}>{t('weather.feelsLikeValue', { temp: current.feelsLikeF })}</p>
            }
            </section>

            {/* Details */}
            <section data-ev-id="ev_weather_details" className="grid grid-cols-3 gap-3">
              {[
            { id: 'wind', Icon: Wind, label: t('weather.wind'), value: current?.windMph != null ? `${current.windDirection ?? ''} ${current.windMph} mph`.trim() : '--' },
            { id: 'humidity', Icon: Droplets, label: t('weather.humidity'), value: current?.humidity != null ? `${current.humidity}%` : '--' },
            { id: 'gusts', Icon: Thermometer, label: current?.windGustMph ? t('weather.gusts') : t('weather.feelsLike'), value: current?.windGustMph ? `${current.windGustMph} mph` : current?.feelsLikeF != null ? `${current.feelsLikeF}°` : '--' }].
            map(({ id, Icon, label, value }) =>
            <div key={id} data-ev-id={`ev_weather_detail_${id}`} className="flex flex-col items-center gap-1 p-3 rounded-xl border text-center" style={cardStyle}>
                  <Icon className="w-5 h-5" style={{ color: primaryColor }} />
                  <span data-ev-id="ev_weather_detail_label" className="text-sm opacity-70" style={{ color: textColor }}>{label}</span>
                  <span data-ev-id="ev_weather_detail_value" className="text-base font-semibold" style={{ color: textColor }}>{value}</span>
                </div>
            )}
            </section>

            {/* Alerts */}
            {data.alerts.length > 0 &&
          <section data-ev-id="ev_weather_alerts" className="flex flex-col gap-3">
                <h3 data-ev-id="ev_weather_alerts_title" className="text-base font-semibold" style={{ color: accentTextColor }}>{t('weather.activeAlerts')}</h3>
                {data.alerts.map((a) => {
              const colors = alertColors(a.severity);
              return (
                <details key={a.id} data-ev-id="ev_weather_alert" className="rounded-xl border p-4" style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}>
                      <summary data-ev-id="ev_weather_alert_summary" className="flex items-start gap-2 cursor-pointer list-none">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <span data-ev-id="ev_weather_alert_head" className="flex flex-col">
                          <span data-ev-id="ev_weather_alert_event" className="text-base font-bold">{a.event}</span>
                          {a.ends &&
                      <span data-ev-id="ev_weather_alert_ends" className="text-sm opacity-90">
                              {t('weather.until', { time: new Date(a.ends).toLocaleString(locale, { weekday: 'short', hour: 'numeric', minute: '2-digit' }) })}
                            </span>
                      }
                          <span data-ev-id="ev_weather_alert_more" className="text-sm underline mt-1">{t('weather.tapDetails')}</span>
                        </span>
                      </summary>
                      <p data-ev-id="ev_weather_alert_desc" className="text-base mt-3 whitespace-pre-line">{a.description}</p>
                      {a.instruction &&
                  <p data-ev-id="ev_weather_alert_instr" className="text-base mt-3 font-semibold whitespace-pre-line">{a.instruction}</p>
                  }
                    </details>);
            })}
              </section>
          }

            {/* Hourly */}
            {data.hourly.length > 0 &&
          <section data-ev-id="ev_weather_hourly" className="flex flex-col gap-3">
                <h3 data-ev-id="ev_weather_hourly_title" className="text-base font-semibold" style={{ color: accentTextColor }}>{t('weather.hourly')}</h3>
                <div data-ev-id="ev_weather_hourly_row" className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
                  {data.hourly.map((h) => {
                const HIcon = weatherIcon(h.condition, h.isDaytime);
                return (
                  <div key={h.time} data-ev-id="ev_weather_hour" className="flex flex-col items-center gap-1 min-w-[68px] p-3 rounded-xl border" style={cardStyle}>
                        <span data-ev-id="ev_weather_hour_time" className="text-sm opacity-70 whitespace-nowrap" style={{ color: textColor }}>{formatHour(h.time)}</span>
                        <HIcon className="w-6 h-6" style={{ color: primaryColor }} />
                        <span data-ev-id="ev_weather_hour_temp" className="text-base font-semibold" style={{ color: textColor }}>{h.temperatureF}°</span>
                        {h.precipChance ?
                    <span data-ev-id="ev_weather_hour_precip" className="text-sm" style={{ color: accentTextColor }}>{h.precipChance}%</span> :
                    null}
                      </div>);
              })}
                </div>
              </section>
          }

            {/* 7-day */}
            <section data-ev-id="ev_weather_daily" className="flex flex-col gap-3">
              <h3 data-ev-id="ev_weather_daily_title" className="text-base font-semibold" style={{ color: accentTextColor }}>{t('weather.daily')}</h3>
              <div data-ev-id="ev_weather_daily_list" className="flex flex-col rounded-xl border overflow-hidden" style={cardStyle}>
                {days.map((d, i) => {
                const DIcon = weatherIcon(d.condition, d.isDaytime);
                return (
                  <div key={d.key} data-ev-id="ev_weather_day" className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: primaryColor + '20' }}>
                      <span data-ev-id="ev_weather_day_name" className="w-24 shrink-0 text-base font-semibold" style={{ color: textColor }}>{dayText(d.name, d.key, lang, locale, t)}</span>
                      <DIcon className="w-6 h-6 shrink-0" style={{ color: primaryColor }} />
                      <span data-ev-id="ev_weather_day_cond" className="flex-1 min-w-0 text-base opacity-75 truncate" style={{ color: textColor }}>
                        {cond(d.condition)}{d.precipChance ? ` · ${d.precipChance}%` : ''}
                      </span>
                      <span data-ev-id="ev_weather_day_temps" className="text-base font-semibold whitespace-nowrap" style={{ color: textColor }}>
                        {d.high != null ? `${d.high}°` : ''}
                        {d.low != null && <span data-ev-id="ev_weather_day_low" className="opacity-60 font-normal">{d.high != null ? ' / ' : t('weather.low')}{d.low}°</span>}
                      </span>
                    </div>);
              })}
              </div>
            </section>

            <p data-ev-id="ev_weather_source" className="text-sm opacity-60 text-center" style={{ color: textColor }}>
              {t('weather.source', { time: new Date(data.updatedAt).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }) })}
            </p>
          </div>
        }
      </div>
    </div>);
}
