import type { ReactNode } from 'react';
import { Bell, Sun, Moon } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import type { Lang } from '@/lib/language';

interface PWAHeaderProps {
  appName: string;
  logoUrl?: string | null;
  primaryColor: string;
  textColor: string;
  onNotificationClick?: () => void;
  isDark?: boolean;
  onThemeToggle?: () => void;
}

const LANG_ACCENT = '#B8956B';
const LANG_OPTIONS: {code: Lang;label: string;aria: string;}[] = [
{ code: 'en', label: 'EN', aria: 'English' },
{ code: 'es', label: 'ES', aria: 'Español' }];


/** Chamber brand header colors: beige in light mode, dark brown in dark mode (same on every screen). */
const HEADER_COLORS = {
  light: {
    bg: '#EADCC4',
    border: '#D6C3A3',
    title: '#1A1A1A',
    subtitle: '#5C4A35',
    icon: '#2B2118',
    btnBg: 'bg-[rgba(43,33,24,.08)]',
    btnHover: 'group-hover:bg-[rgba(43,33,24,.14)] group-active:bg-[rgba(43,33,24,.14)]',
    focus: 'focus-visible:outline-[#2B2118]'
  },
  dark: {
    bg: '#2B2118',
    border: '#3D3024',
    title: '#F5ECDD',
    subtitle: '#CDBFA8',
    icon: '#F5ECDD',
    btnBg: 'bg-[rgba(245,236,221,.10)]',
    btnHover: 'group-hover:bg-[rgba(245,236,221,.18)] group-active:bg-[rgba(245,236,221,.18)]',
    focus: 'focus-visible:outline-[#F5ECDD]'
  }
};

export function PWAHeader({
  appName,
  logoUrl,
  primaryColor,
  onNotificationClick,
  isDark = true,
  onThemeToggle
}: PWAHeaderProps) {
  const { t, lang, setLang } = useLanguage();
  const c = isDark ? HEADER_COLORS.dark : HEADER_COLORS.light;
  const focusRing = `focus-visible:outline-2 focus-visible:outline-offset-2 ${c.focus}`;

  // 40x40 rounded square inside a 44px tap target
  const iconWrap = (icon: ReactNode) =>
  <span data-ev-id="ev_header_icon_btn" className={`w-10 h-10 rounded-[12px] flex items-center justify-center transition-colors ${c.btnBg} ${c.btnHover}`}>{icon}</span>;

  return (
    <header data-ev-id="ev_324d44a1da"
    className="sticky top-0 z-30 safe-area-top"
    style={{
      backgroundColor: c.bg,
      borderBottom: `1px solid ${c.border}`
    }}>

      <div data-ev-id="ev_0c5626b3be" className="flex items-center justify-between gap-1 px-3 py-3">
        {/* Logo & App Name */}
        <div data-ev-id="ev_204ea52e20" className="flex items-center gap-2 min-w-0">
          {logoUrl ?
          <img data-ev-id="ev_2b4f50c0c3"
          src={logoUrl}
          alt={appName}
          className="w-10 h-10 rounded-xl object-contain shrink-0" /> :


          <div data-ev-id="ev_4250c0bbd4"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
          style={{
            backgroundColor: primaryColor + '30',
            color: primaryColor
          }}>

              {appName.charAt(0).toUpperCase()}
            </div>
          }
          <h1 data-ev-id="ev_29988ee576" className="flex flex-col leading-tight min-w-0">
            <span data-ev-id="ev_header_title" className="text-[16px] font-bold truncate" style={{ color: c.title }}>Muleshoe Chamber</span>
            <span data-ev-id="ev_header_subtitle" className="text-[12px] truncate" style={{ color: c.subtitle }}>{t('header.subtitle')}</span>
          </h1>
        </div>

        {/* Actions */}
        <div data-ev-id="ev_f9d2f39821" className="flex items-center shrink-0">
          {/* Language: EN | ES (each side has a 44px-tall tap target) */}
          <div
            data-ev-id="ev_header_lang"
            role="group"
            aria-label={t('lang.group')}
            className="relative flex items-center h-11">
            <span
              data-ev-id="ev_header_lang_track"
              aria-hidden="true"
              className={`absolute -left-0.5 -right-0.5 top-1.5 bottom-1.5 rounded-full ${c.btnBg}`} />
            {LANG_OPTIONS.map(({ code, label, aria }) => {
              const active = lang === code;
              return (
                <button
                  data-ev-id={`ev_header_lang_${code}`}
                  key={code}
                  onClick={() => setLang(code)}
                  className={`relative h-11 flex items-center justify-center rounded-full ${focusRing}`}
                  aria-label={aria}
                  aria-pressed={active}>
                  <span
                    data-ev-id="ev_header_lang_label"
                    className="min-w-[28px] h-7 px-1 rounded-full flex items-center justify-center text-[13px] font-bold leading-none"
                    style={{
                      backgroundColor: active ? LANG_ACCENT : 'transparent',
                      color: active ? '#1A1A1A' : c.icon
                    }}>
                    {label}
                  </span>
                </button>);
            })}
          </div>

          {/* Theme Toggle */}
          {onThemeToggle &&
          <button data-ev-id="ev_27b64d530f"
          onClick={onThemeToggle}
          className={`group w-11 h-11 flex items-center justify-center rounded-xl ${focusRing}`}
          style={{ color: c.icon }}
          aria-label={isDark ? t('header.lightMode') : t('header.darkMode')}>

              {iconWrap(isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />)}
            </button>
          }
          
          {/* Notification Bell */}
          <button data-ev-id="ev_0cadb50347"
          onClick={onNotificationClick}
          className={`group w-11 h-11 flex items-center justify-center rounded-xl ${focusRing}`}
          style={{ color: c.icon }}
          aria-label={t('header.notifications')}>

            {iconWrap(<Bell className="w-6 h-6" />)}
          </button>
        </div>
      </div>
    </header>);

}
