import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

const THEME_KEY = 'pwa_theme_preference';

/**
 * Get the initial theme before React hydrates.
 * This runs synchronously to avoid flash.
 */
function getInitialTheme(): Theme {
  // Check localStorage first
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    // Fall back to device preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }
  return 'light';
}

/**
 * Header / status bar color: Chamber beige (light) or dark brown (dark).
 * Reads the current data-theme so other code can re-apply it.
 */
export function getHeaderThemeColor(theme?: Theme): string {
  const t = theme ?? (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  return t === 'dark' ? '#2B2118' : '#EADCC4';
}

/** iPhone status bar: dark text in light mode, light text in dark mode. */
export function getAppleStatusBarStyle(theme?: Theme): string {
  const t = theme ?? (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  return t === 'dark' ? 'black-translucent' : 'default';
}

/**
 * Apply theme to document and meta tag.
 */
function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  
  // Set data attribute on html element
  document.documentElement.setAttribute('data-theme', theme);
  
  // Update theme-color meta tag (matches the header)
  const themeColor = getHeaderThemeColor(theme);
  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = themeColor;

  const statusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (statusBar) statusBar.setAttribute('content', getAppleStatusBarStyle(theme));
}

/**
 * Hook for managing light/dark theme.
 * Respects device preference, persists choice to localStorage.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't set a preference
      if (!localStorage.getItem(THEME_KEY)) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(THEME_KEY, newTheme);
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
  };
}

/**
 * Accent color for small text. The gold accent (#B8956B) is too light to read
 * as small text on white, so light mode uses a darker shade of the accent.
 */
export function getAccentTextColor(isDark: boolean, accent: string): string {
  if (isDark) return accent;
  const hex = accent.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return '#7E6343';
  const factor = 0.68;
  const channel = (i: number) =>
    Math.round(parseInt(hex.slice(i, i + 2), 16) * factor).toString(16).padStart(2, '0');
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

/**
 * Get theme colors based on current theme.
 */
export function getThemeColors(isDark: boolean) {
  return {
    background: isDark ? '#1A1A1A' : '#ffffff',
    backgroundElevated: isDark ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    text: isDark ? '#ffffff' : '#1A1A1A',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(26, 26, 26, 0.6)',
    border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(26, 26, 26, 0.1)',
    hoverBg: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(26, 26, 26, 0.1)',
    cardBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(26, 26, 26, 0.03)',
  };
}
