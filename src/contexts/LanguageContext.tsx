import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en, type Dictionary, type TranslationKey } from '@/i18n/en';
import { es } from '@/i18n/es';
import { LANG_KEY, getCurrentLang, setCurrentLang, type Lang } from '@/lib/language';
import { LanguageContext, type LanguageContextType, type TranslationVars } from '@/hooks/use-language';

const DICTIONARIES: Record<Lang, Dictionary> = { en, es };

function applyHtmlLang(lang: Lang) {
  if (typeof document === 'undefined') return;
  // The admin area stays English
  if (window.location.pathname.startsWith('/admin')) return;
  document.documentElement.setAttribute('lang', lang);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => getCurrentLang());

  useEffect(() => {
    setCurrentLang(lang);
    applyHtmlLang(lang);
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setCurrentLang(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      // storage unavailable
    }
    setLangState(next);
  }, []);

  const t = useCallback((key: TranslationKey, vars?: TranslationVars) => {
    let text = DICTIONARIES[lang][key] ?? en[key] ?? key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.split(`{${name}}`).join(String(value));
      }
    }
    return text;
  }, [lang]);

  const value = useMemo<LanguageContextType>(() => ({
    lang,
    setLang,
    t,
    locale: lang === 'es' ? 'es-US' : 'en-US'
  }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
