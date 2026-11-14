import { useState, useEffect, useCallback } from 'react';
import { isForThisDevice } from '@/hooks/usePushTopics';
import { PUSH_ERRORS } from '@/lib/push-errors';
import type { Tables } from '@/integrations/supabase/helpers';
import { supabase } from '@/integrations/supabase/client';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { isOpenableUpdateUrl, opensInBrowser, openInBrowser } from '@/components/pwa/linkRules';
import { SkyHero } from '@/components/pwa/SkyHero';
import type { WeatherState } from '@/hooks/use-weather';
import type { SkyPeriod } from '@/hooks/use-sky-period';
import { useLanguage } from '@/hooks/use-language';
import { useHomeLayout } from '@/hooks/use-home-layout';
import { HomeSections, type UpdateItem } from '@/components/pwa/home/HomeSections';
import { AlertsCard } from '@/components/pwa/home/AlertsCard';
import { decideOpen, willOpenInBrowser, type HomeTabKey, type LinkTarget } from '@/lib/home-layout';

type App = Tables<'apps'>;
type AppFeature = Tables<'app_features'>;

export interface PushCardState {
  initialized: boolean;
  subscribed: boolean;
  loading: boolean;
  permission: NotificationPermission | null;
  error: string | null;
}

interface HomeTabProps {
  app: App;
  features: AppFeature[];
  primaryColor: string;
  textColor: string;
  accentTextColor: string;
  isDark: boolean;
  skyPeriod: SkyPeriod;
  now: Date;
  basePortalUrl?: string;
  push: PushCardState;
  onEnableNotifications: () => void;
  weatherEnabled: boolean;
  weather: WeatherState;
  onOpenWeather: () => void;
  onFeatureClick: (feature: AppFeature) => void;
  onNavigateTab?: (tab: HomeTabKey) => void;
  /** Opens a page following the "Open portal pages inside the app" setting. */
  onOpenInAppBrowser?: (link: {title: string;url: string;}) => void;
  /** Opens a page in the in-app viewer directly (already decided by the item's rules). */
  onOpenViewer?: (link: {title: string;url: string;}) => void;
  embedPortalPages?: boolean;
}

const DISMISS_KEY = 'ev_alerts_card_dismissed_at';
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;


export function HomeTab({
  app,
  textColor,
  isDark,
  skyPeriod,
  now,
  basePortalUrl = 'https://muleshoetxchamber.com',
  push,
  onEnableNotifications,
  weatherEnabled,
  weather,
  onOpenWeather,
  onNavigateTab,
  onOpenInAppBrowser,
  onOpenViewer,
  embedPortalPages = false
}: HomeTabProps) {
  const { t, lang } = useLanguage();
  const sections = useHomeLayout();
  const [recentNotifications, setRecentNotifications] = useState<UpdateItem[]>([]);
  const [dismissedAt, setDismissedAt] = useState<number>(() => Number(localStorage.getItem(DISMISS_KEY) ?? 0));
  const { isInstalled, isIOS, isIOSSafari } = usePWAInstall();
  const base = basePortalUrl.replace(/\/$/, '');

  const fetchNotifications = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.
    from('push_notifications').
    select('id, title, body, sent_at, url, topic_ids').
    eq('app_id', app.id).
    eq('status', 'sent').
    order('sent_at', { ascending: false }).
    limit(30);
    const filtered = (data ?? []).
    filter((n) => !n.title.startsWith('[TEST]') && isForThisDevice(n)).
    slice(0, 10) as UpdateItem[];
    setRecentNotifications(filtered);
  }, [app.id]);

  useEffect(() => {
    fetchNotifications();
    const handleFocus = () => fetchNotifications();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchNotifications]);

  const handleTarget = (target: LinkTarget, title: string) => {
    const decision = decideOpen(target, base, embedPortalPages);
    if (decision.kind === 'tab') {
      onNavigateTab?.(decision.tab);
      return;
    }
    if (decision.kind === 'none') return;
    if (decision.kind === 'browser') {
      openInBrowser(decision.url);
      return;
    }
    if (onOpenViewer) onOpenViewer({ title, url: decision.url });else
    if (onOpenInAppBrowser) onOpenInAppBrowser({ title, url: decision.url });else
    openInBrowser(decision.url);
  };

  const handleOpenUpdate = (notif: UpdateItem) => {
    if (!isOpenableUpdateUrl(notif.url)) return;
    if (opensInBrowser(notif.url) || !onOpenInAppBrowser) {
      openInBrowser(notif.url);
      return;
    }
    onOpenInAppBrowser({ title: notif.title, url: notif.url });
  };

  // Same as tapping the bottom "Ask the Mule" tab
  const openAskTheMule = () => onNavigateTab?.('chat');

  const dismissAlerts = () => {
    const ts = Date.now();
    localStorage.setItem(DISMISS_KEY, String(ts));
    setDismissedAt(ts);
  };

  // iPhone: push only works from the installed Home Screen app
  const needsIOSInstall = isIOS && !isInstalled;
  const dismissed = Date.now() - dismissedAt < DISMISS_MS;
  const showAlertsCard = !dismissed && !push.subscribed && (needsIOSInstall || push.permission === 'default');

  const pushError = push.error ? PUSH_ERRORS[push.error] ? t(PUSH_ERRORS[push.error]) : push.error : null;

  return (
    <HomeSections
      sections={sections}
      lang={lang}
      isDark={isDark}
      textColor={textColor}
      renderHero={(hero) =>
      <SkyHero
        period={skyPeriod}
        now={now}
        weatherEnabled={weatherEnabled && hero.settings.show_weather !== false}
        weather={weather}
        onOpenWeather={onOpenWeather} />
      }
      alerts={showAlertsCard ?
      <AlertsCard
        isDark={isDark}
        textColor={textColor}
        needsIOSInstall={needsIOSInstall}
        isIOSSafari={isIOSSafari}
        loading={push.loading}
        initialized={push.initialized}
        error={pushError}
        onEnable={onEnableNotifications}
        onDismiss={dismissAlerts} /> :
      null}
      updates={recentNotifications}
      onItem={handleTarget}
      isExternal={(target) => willOpenInBrowser(target, base, embedPortalPages)}
      onAsk={openAskTheMule}
      onOpenUpdate={handleOpenUpdate}
      trackBanners />);
}
