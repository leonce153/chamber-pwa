import { ExternalLink, LogIn, UserPlus, Users, ChevronRight } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/helpers';
import { InAppViewer } from '@/components/pwa/InAppViewer';
import { openInBrowser } from '@/components/pwa/linkRules';
import { getPortalTabUrl } from '@/components/pwa/portalUrls';
import { useLanguage } from '@/hooks/use-language';
import type { TranslationKey } from '@/i18n/en';

type App = Tables<'apps'>;
type AppFeature = Tables<'app_features'>;

interface PortalTabProps {
  app: App;
  feature: AppFeature | null;
  basePortalUrl: string;
  primaryColor: string;
  textColor: string;
  accentTextColor: string;
  backgroundColor: string;
  tabType: 'directory' | 'events' | 'chat' | 'member';
  onBack: () => void;
  onOpenInAppBrowser: (link: { title: string; url: string }) => void;
  embedPortalPages: boolean;
}

const TAB_CONFIG: Record<PortalTabProps['tabType'], {titleKey: TranslationKey;defaultPath: string;useIframe: boolean;}> = {
  directory: {
    titleKey: 'portal.directoryTitle',
    defaultPath: '/directory',
    useIframe: true
  },
  events: {
    titleKey: 'portal.eventsTitle',
    defaultPath: '/events',
    useIframe: true
  },
  chat: {
    titleKey: 'portal.chatTitle',
    defaultPath: '/embed/ai-concierge',
    useIframe: true
  },
  member: {
    titleKey: 'portal.memberTitle',
    defaultPath: '/login?returnTo=/member-portal',
    // Sign-in opens in the browser (cookies are blocked in iframes on iPhone)
    useIframe: false
  }
};

export function PortalTab({
  feature,
  basePortalUrl,
  primaryColor,
  textColor,
  accentTextColor,
  backgroundColor,
  tabType,
  onBack,
  onOpenInAppBrowser,
  embedPortalPages
}: PortalTabProps) {
  const { t } = useLanguage();
  const config = TAB_CONFIG[tabType];
  const title = t(config.titleKey);
  const base = basePortalUrl.replace(/\/$/, '');

  // Feature settings URL (Build > feature settings) overrides the default
  const url = getPortalTabUrl(tabType, feature, basePortalUrl);

  // Embedding off: never render an iframe.
  // Tab taps open the browser directly; this only shows for deep links (?tab=...).
  if (config.useIframe && !embedPortalPages) {
    return (
      <div data-ev-id="ev_portal_browser_handoff" className="flex flex-col items-center justify-center gap-4 p-6 min-h-[60vh] text-center">
        <ExternalLink className="w-10 h-10" style={{ color: primaryColor }} />
        <h2 data-ev-id="ev_portal_handoff_title" className="text-xl font-semibold text-balance" style={{ color: accentTextColor }}>{title}</h2>
        <p data-ev-id="ev_portal_handoff_desc" className="text-base opacity-70 text-pretty" style={{ color: textColor }}>{t('portal.opensInBrowser')}</p>
        <button
          data-ev-id="ev_portal_handoff_open"
          onClick={() => openInBrowser(url)}
          className="flex items-center gap-2 px-5 min-h-11 rounded-xl text-base font-semibold text-white"
          style={{ backgroundColor: primaryColor }}>
          <ExternalLink className="w-5 h-5" />
          {t('common.openInBrowser')}
        </button>
      </div>);
  }

  if (config.useIframe) {
    // <main> has no fixed height, so pin the viewer between the header
    // (65px + top safe area) and the bottom nav (65px + bottom safe area)
    // to give the iframe a real height.
    return (
      <div
        data-ev-id="ev_portal_viewer_frame"
        className="fixed left-0 right-0 z-20"
        style={{
          top: 'calc(65px + env(safe-area-inset-top, 0px))',
          bottom: 'calc(65px + env(safe-area-inset-bottom, 0.5rem))',
          backgroundColor
        }}>
      <InAppViewer
        key={url}
        title={title}
        url={url}
        onBack={onBack}
        backLabel={t('common.backHome')}
        primaryColor={primaryColor}
        textColor={textColor}
        backgroundColor={backgroundColor} />
      </div>);
  }

  // Sign in tab: explain and hand off to the browser
  const secondaryActions = [
    { id: 'join', label: t('portal.joinLabel'), description: t('portal.joinDesc'), Icon: UserPlus, onClick: () => onOpenInAppBrowser({ title: t('portal.joinLabel'), url: `${base}/join` }), external: false },
    { id: 'register', label: t('portal.registerLabel'), description: t('portal.registerDesc'), Icon: Users, onClick: () => openInBrowser(`${base}/register`), external: true }
  ];

  return (
    <div data-ev-id="ev_member_portal_tab" className="flex flex-col gap-6 p-4 pb-24">
      <div data-ev-id="ev_member_header" className="flex flex-col items-center text-center gap-3 pt-6">
        <div data-ev-id="ev_member_icon" className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: primaryColor + '20' }}>
          <LogIn className="w-8 h-8" style={{ color: primaryColor }} />
        </div>
        <h2 data-ev-id="ev_member_title" className="text-2xl font-bold text-balance" style={{ color: textColor }}>
          {t('portal.memberHeading')}
        </h2>
        <p data-ev-id="ev_member_desc" className="text-base opacity-75 max-w-sm text-pretty" style={{ color: textColor }}>
          {t('portal.memberDesc')}
        </p>
      </div>

      <button
        data-ev-id="ev_open_full_portal"
        onClick={() => openInBrowser(url)}
        className="w-full flex items-center justify-center gap-2 min-h-12 px-4 rounded-xl text-base font-semibold text-white transition-opacity active:opacity-80"
        style={{ backgroundColor: primaryColor }}>
        <ExternalLink className="w-5 h-5" />
        {t('portal.memberButton')}
      </button>

      <div data-ev-id="ev_member_actions" className="flex flex-col gap-3">
        <p data-ev-id="ev_member_new" className="text-base font-semibold" style={{ color: accentTextColor }}>
          {t('portal.notMember')}
        </p>
        {secondaryActions.map(({ id, label, description, Icon, onClick, external }) =>
        <button
          key={id}
          data-ev-id={`ev_member_action_${id}`}
          onClick={onClick}
          className="flex items-center gap-4 p-4 min-h-11 rounded-xl border text-left transition-transform active:scale-[0.98]"
          style={{ borderColor: primaryColor + '30', backgroundColor: primaryColor + '10' }}>
            <div data-ev-id="ev_member_action_icon" className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: primaryColor + '20' }}>
              <Icon className="w-6 h-6" style={{ color: primaryColor }} />
            </div>
            <div data-ev-id="ev_member_action_text" className="flex-1 min-w-0">
              <p data-ev-id="ev_member_action_label" className="text-base font-semibold" style={{ color: textColor }}>{label}</p>
              <p data-ev-id="ev_member_action_desc" className="text-base opacity-70" style={{ color: textColor }}>{description}</p>
            </div>
            {external ?
          <ExternalLink className="w-5 h-5 opacity-50 shrink-0" style={{ color: textColor }} /> :
          <ChevronRight className="w-5 h-5 opacity-50 shrink-0" style={{ color: textColor }} />
          }
          </button>
        )}
      </div>
    </div>);
}
