import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WeatherCurrent {
  temperatureF: number | null;
  feelsLikeF: number | null;
  condition: string | null;
  windMph: number | null;
  windGustMph: number | null;
  windDirection: string | null;
  humidity: number | null;
  observedAt: string | null;
}

export interface WeatherHour {
  time: string;
  temperatureF: number;
  condition: string;
  precipChance: number | null;
  isDaytime: boolean;
}

export interface WeatherPeriod {
  name: string;
  startTime: string;
  isDaytime: boolean;
  temperatureF: number;
  condition: string;
  detailed: string;
  precipChance: number | null;
  wind: string;
}

export interface WeatherAlert {
  id: string;
  event: string;
  headline: string | null;
  severity: string;
  description: string;
  instruction: string | null;
  ends: string | null;
}

export interface WeatherData {
  location: string;
  updatedAt: string;
  isDaytime: boolean;
  current: WeatherCurrent | null;
  hourly: WeatherHour[];
  periods: WeatherPeriod[];
  alerts: WeatherAlert[];
}

export interface WeatherState {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const REFRESH_AFTER_MS = 10 * 60 * 1000;

/** Loads Muleshoe weather (°F, mph) from the get-weather server function. */
export function useWeather(enabled: boolean): WeatherState {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetch = useRef(0);

  const load = useCallback(async () => {
    if (!supabase || !enabled) return;
    setLoading(true);
    setError(null);
    const { data: res, error: fnError } = await supabase.functions.invoke('get-weather');
    if (fnError || !res?.success) {
      setError('Weather is unavailable right now.');
    } else {
      setData(res.weather as WeatherData);
      lastFetch.current = Date.now();
    }
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    load();
    const onFocus = () => {
      if (Date.now() - lastFetch.current > REFRESH_AFTER_MS) load();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [enabled, load]);

  return { data, loading, error, refresh: load };
}
