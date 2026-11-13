export type Lang = 'en' | 'es';

export const LANG_KEY = 'chamber_lang';

/** Saved choice, else Spanish when the device language starts with "es", else English. Same logic as index.html. */
export function getInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === 'en' || stored === 'es') return stored;
  } catch {
    // storage unavailable
  }
  try {
    if ((navigator.language || '').toLowerCase().startsWith('es')) return 'es';
  } catch {
    // navigator unavailable
  }
  return 'en';
}

// Module copy so plain functions (e.g. openInBrowser) can read the current language
let currentLang: Lang = typeof window !== 'undefined' ? getInitialLang() : 'en';

export function getCurrentLang(): Lang {
  return currentLang;
}

export function setCurrentLang(lang: Lang) {
  currentLang = lang;
}
