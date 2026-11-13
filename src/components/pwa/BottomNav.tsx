import { Home, Building2, Calendar, MessageCircle, LogIn } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import type { TranslationKey } from '@/i18n/en';

export type NavTab = 'home' | 'directory' | 'events' | 'chat' | 'member';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  primaryColor: string;
  textColor: string;
  isDark?: boolean;
}

const tabs: {id: NavTab;labelKey: TranslationKey;Icon: typeof Home;}[] = [
{ id: 'home', labelKey: 'tabs.home', Icon: Home },
{ id: 'directory', labelKey: 'tabs.directory', Icon: Building2 },
{ id: 'events', labelKey: 'tabs.events', Icon: Calendar },
{ id: 'chat', labelKey: 'tabs.chat', Icon: MessageCircle },
{ id: 'member', labelKey: 'tabs.member', Icon: LogIn }];


export function BottomNav({ activeTab, onTabChange, primaryColor, textColor, isDark = true }: BottomNavProps) {
  const { t, lang } = useLanguage();
  const bgColor = isDark ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  // Spanish labels are longer: size tabs to their label and use a slightly smaller font so labels stay on one line
  const isEs = lang === 'es';
  
  return (
    <nav data-ev-id="ev_1c6c7ac4cf"
    className="fixed bottom-0 left-0 right-0 border-t backdrop-blur-lg z-40"
    style={{
      backgroundColor: bgColor,
      borderColor: primaryColor + '30'
    }}>

      {/* Safe area padding for devices with home indicators */}
      <div data-ev-id="ev_006b1c60f8" className="flex items-stretch justify-around gap-1 px-1 pt-2 pb-safe">
        {tabs.map(({ id, labelKey, Icon }) => {
          const isActive = activeTab === id;
          const label = t(labelKey);
          return (
            <button data-ev-id="ev_8a32635c56"
            key={id}
            onClick={() => onTabChange(id)}
            className={`${isEs ? 'flex-auto px-0.5' : 'flex-1 px-1'} min-w-0 min-h-[52px] flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-all`}
            aria-label={t('tabs.aria', { label })}
            aria-current={isActive ? 'page' : undefined}
            style={{
              backgroundColor: isActive ? primaryColor + '20' : 'transparent'
            }}>

              <Icon
                className="w-6 h-6 transition-colors"
                style={{ color: isActive ? primaryColor : textColor + '80' }} />

              <span data-ev-id="ev_d5601792d4"
              className={`${isEs ? 'text-[11px] tracking-[-0.01em]' : 'text-xs'} font-medium whitespace-nowrap transition-colors`}
              style={{ color: isActive ? primaryColor : textColor + '80' }}>

                {label}
              </span>
            </button>);

        })}
      </div>
    </nav>);

}
