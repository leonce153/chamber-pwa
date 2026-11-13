import { createContext, useContext } from 'react';
import type { TranslationKey } from '@/i18n/en';
import type { Lang } from '@/lib/language';

export type TranslationVars = Record<string, string | number>;

export interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: TranslationVars) => string;
  /** Intl locale for dates, times and numbers. */
  locale: 'en-US' | 'es-US';
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/** Public app language: { lang, setLang, t, locale }. */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
}
