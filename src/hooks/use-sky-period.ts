import { useState, useEffect } from 'react';

export type SkyPeriod = 'morning' | 'day' | 'sunset' | 'night';

export const SKY: Record<SkyPeriod, { gradient: string; top: string; skyline: string }> = {
  morning: { gradient: 'linear-gradient(180deg, #7E9CC8 0%, #F2B48C 70%, #F7D9A8 100%)', top: '#7E9CC8', skyline: '#3A2E24' },
  day: { gradient: 'linear-gradient(180deg, #2F79B3 0%, #6FAAD6 62%, #E9C88E 100%)', top: '#2F79B3', skyline: '#3A2E24' },
  sunset: { gradient: 'linear-gradient(180deg, #4B3F72 0%, #C8607A 55%, #F2A65A 100%)', top: '#4B3F72', skyline: '#2A2019' },
  night: { gradient: 'linear-gradient(180deg, #0E1A2E 0%, #1D2B45 62%, #3E3346 100%)', top: '#0E1A2E', skyline: '#07090C' }
};

function periodForHour(h: number): SkyPeriod {
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'sunset';
  return 'night';
}

/** Time-of-day sky period (device local time), re-checked every 5 minutes. Dark mode is always night. */
export function useSkyPeriod(isDark: boolean): { period: SkyPeriod; now: Date } {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  return { period: isDark ? 'night' : periodForHour(now.getHours()), now };
}
