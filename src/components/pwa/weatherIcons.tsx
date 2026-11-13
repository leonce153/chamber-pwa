import type { LucideIcon } from 'lucide-react';
import { Sun, Moon, Cloud, CloudSun, CloudMoon, CloudRain, CloudSnow, CloudLightning, CloudFog, Wind } from 'lucide-react';

/** Pick an icon from an NWS short forecast / condition text. */
export function weatherIcon(condition: string | null | undefined, isDaytime = true): LucideIcon {
  const c = (condition ?? '').toLowerCase();
  if (c.includes('thunder') || c.includes('t-storm')) return CloudLightning;
  if (c.includes('snow') || c.includes('sleet') || c.includes('ice') || c.includes('flurr')) return CloudSnow;
  if (c.includes('rain') || c.includes('shower') || c.includes('drizzle')) return CloudRain;
  if (c.includes('fog') || c.includes('haze') || c.includes('smoke') || c.includes('dust')) return CloudFog;
  if (c.includes('wind') || c.includes('breez') || c.includes('blustery')) return Wind;
  if (c.includes('partly') || c.includes('mostly sunny') || c.includes('mostly clear')) return isDaytime ? CloudSun : CloudMoon;
  if (c.includes('cloud') || c.includes('overcast')) return Cloud;
  return isDaytime ? Sun : Moon;
}

/** Readable alert colors by NWS severity (fixed so they read in light and dark mode). */
export function alertColors(severity: string) {
  if (severity === 'Extreme' || severity === 'Severe') {
    return { bg: '#B91C1C', border: '#991B1B', text: '#ffffff' };
  }
  return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' };
}
