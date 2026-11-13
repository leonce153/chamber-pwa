import type { CSSProperties } from 'react';
import type { Lang } from '@/lib/language';
import { DISPLAY_FONT } from '@/components/pwa/home/homeStyles';
import { DEFAULT_TITLES } from '@/lib/home-extra';
import { loc, type HomeSection, type LinkTarget } from '@/lib/home-layout';

export interface ExtraSectionProps {
  section: HomeSection;
  lang: Lang;
  isDark: boolean;
  textColor: string;
  onItem: (target: LinkTarget, viewerTitle: string) => void;
  withBrowser: (target: LinkTarget, base: string) => string;
}

export const sectionHeading = (color: string): CSSProperties => ({ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 20, color });

export function sectionTitle(section: HomeSection, lang: Lang): string {
  const d = DEFAULT_TITLES[section.type];
  return loc(section.title, section.title_es, lang) || (d ? lang === 'es' ? d.es : d.en : '');
}
