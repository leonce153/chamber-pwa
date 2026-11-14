import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/helpers';
import { FeatureContentPreview } from '@/components/editor/FeatureContentPreview';
import { usePWAManifest } from '@/hooks/usePWAManifest';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { useGravitecPush } from '@/hooks/useGravitecPush';
import { usePushTopics, isForThisDevice } from '@/hooks/usePushTopics';
import { PUSH_ERRORS } from '@/lib/push-errors';
import { useTheme, getAccentTextColor } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav, type NavTab } from '@/components/pwa/BottomNav';
import { PWAHeader } from '@/components/pwa/PWAHeader';
import { HomeTab } from '@/components/pwa/HomeTab';
import { PortalTab } from '@/components/pwa/PortalTab';
import { getPortalTabUrl } from '@/components/pwa/portalUrls';
import { InAppViewer } from '@/components/pwa/InAppViewer';
import { WeatherScreen } from '@/components/pwa/WeatherScreen';
import { useWeather } from '@/hooks/use-weather';
import { useSkyPeriod } from '@/hooks/use-sky-period';
import { isOpenableUpdateUrl, opensInBrowser, openInBrowser } from '@/components/pwa/linkRules';
import { Loader2, Smartphone, X, Bell, BellRing, Check, ChevronRight, Languages } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import type { Lang } from '@/lib/language';

type App = Tables<'apps'>;
type AppFeature = Tables<'app_features'>;
type AppSettings = Tables<'app_settings'>;

// Default primary color (Muleshoe Chamber Gold)
const DEFAULT_PRIMARY = '#B8956B';

// Map URL query param to NavTab
const TAB_PARAM_MAP: Record<string, NavTab> = {
  home: 'home',
  directory: 'directory',
  events: 'events',
  concierge: 'chat',
  chat: 'chat',
  member: 'member'
};

// Tabs that show portal pages, mapped to their feature type
const PORTAL_TAB_FEATURE: Partial<Record<NavTab, string>> = {
  directory: 'business-directory',
  events: 'events-calendar',
  chat: 'ai-concierge'
};

interface AppPreviewProps {
  appFromSubdomain?: App | null;
}

interface PanelNotification {
  id: string;
  title: string;
  body: string;
  sent_at: string;
  url: string | null;
}

export default function AppPreview({ appFromSubdomain }: AppPreviewProps = {}) {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [app, setApp] = useState<App | null>(appFromSubdomain ?? null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [features, setFeatures] = useState<AppFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getInitialTab = (): NavTab => {
    const tabParam = searchParams.get('tab');
    if (tabParam && TAB_PARAM_MAP[tabParam.toLowerCase()]) {
      return TAB_PARAM_MAP[tabParam.toLowerCase()];
    }
    return 'home';
  };

  const [activeTab, setActiveTab] = useState<NavTab>(getInitialTab);

  const handleTabChange = (tab: NavTab) => {
    // Embedding off: portal tabs open in the browser on tap (no iframe)
    const portalFeature = PORTAL_TAB_FEATURE[tab];
    if (portalFeature && !embedPortalPages) {
      openInBrowser(getPortalTabUrl(tab as 'directory' | 'events' | 'chat', getFeatureForTab(portalFeature), basePortalUrl));
      return;
    }
    setActiveTab(tab);
    if (tab === 'home') {
      searchParams.delete('tab');
    } else {
      const urlTab = tab === 'chat' ? 'concierge' : tab;
      searchParams.set('tab', urlTab);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const [activeFeature, setActiveFeature] = useState<AppFeature | null>(null);
  const [activeInAppLink, setActiveInAppLink] = useState<{title: string;url: string;} | null>(null);

  // PWA hooks
  usePWAManifest(app);
  useServiceWorker(app);
  const push = useGravitecPush(app, user?.id ?? null);
  const pushTopics = usePushTopics(push.subscribed);
  const { isDark, toggleTheme } = useTheme();
  const { t, lang, setLang, locale } = useLanguage();
  const { period: skyPeriod, now: skyNow } = useSkyPeriod(isDark);

  // Weather (on/off in admin Settings)
  const weatherEnabled = !!app && (settings?.weather_enabled ?? true);

  // Portal pages in the in-app viewer (admin Settings, default off)
  const embedPortalPages = settings?.embed_portal_pages ?? false;
  const weather = useWeather(weatherEnabled);
  const [showWeather, setShowWeather] = useState(false);

  // "Notifications Enabled" banner: only right after tapping Enable, hides after 3s
  const [justSubscribed, setJustSubscribed] = useState(false);
  useEffect(() => {
    if (!justSubscribed) return;
    const timer = setTimeout(() => setJustSubscribed(false), 3000);
    return () => clearTimeout(timer);
  }, [justSubscribed]);

  const handleEnableNotifications = async () => {
    const ok = await push.subscribe();
    if (ok) setJustSubscribed(true);
  };

  // Notification panel
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [panelNotifications, setPanelNotifications] = useState<PanelNotification[]>([]);

  const fetchPanelNotifications = useCallback(async () => {
    if (!supabase || !app) return;
    const { data } = await supabase.
    from('push_notifications').
    select('id, title, body, sent_at, url, topic_ids').
    eq('app_id', app.id).
    eq('status', 'sent').
    order('sent_at', { ascending: false }).
    limit(30);
    const filtered = (data ?? []).filter((n) => !n.title.startsWith('[TEST]') && isForThisDevice(n, pushTopics.chosen)).slice(0, 20) as PanelNotification[];
    setPanelNotifications(filtered);
  }, [app, pushTopics.chosen]);

  const handleBellClick = () => {
    setShowNotificationPanel(true);
    fetchPanelNotifications();
  };

  const openLink = (title: string, url: string) => {
    if (!embedPortalPages || opensInBrowser(url)) {
      openInBrowser(url);
      return;
    }
    setActiveInAppLink({ title, url });
  };

  useEffect(() => {
    fetchAppData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, appFromSubdomain]);

  const fetchAppData = async () => {
    if (!supabase) {
      setError('Database not configured');
      setLoading(false);
      return;
    }

    try {
      const { data: settingsData } = await supabase.
      from('app_settings').
      select('*').
      limit(1).
      single();

      setSettings(settingsData);

      if (appFromSubdomain) {
        setApp(appFromSubdomain);
        const { data: featuresData } = await supabase.
        from('app_features').
        select('*').
        eq('app_id', appFromSubdomain.id).
        eq('is_enabled', true).
        order('position');
        setFeatures(featuresData ?? []);
        setLoading(false);
        return;
      }

      if (!slug) {
        if (settingsData?.legacy_app_id) {
          const { data: appData } = await supabase.
          from('apps').
          select('*').
          eq('id', settingsData.legacy_app_id).
          single();

          if (appData) {
            setApp(appData);
            const { data: featuresData } = await supabase.
            from('app_features').
            select('*').
            eq('app_id', appData.id).
            eq('is_enabled', true).
            order('position');
            setFeatures(featuresData ?? []);
          }
        }
        setLoading(false);
        return;
      }

      const { data: appData, error: appError } = await supabase.
      from('apps').
      select('*').
      eq('slug', slug).
      single();

      if (appError || !appData) {
        setError('App not found');
        setLoading(false);
        return;
      }

      const { data: featuresData } = await supabase.
      from('app_features').
      select('*').
      eq('app_id', appData.id).
      eq('is_enabled', true).
      order('position');

      setApp(appData);
      setFeatures(featuresData ?? []);
    } catch {
      setError('Failed to load app');
    } finally {
      setLoading(false);
    }
  };

  // Theme-aware colors
  const primaryColor = app?.theme_color ?? settings?.primary_color ?? DEFAULT_PRIMARY;
  const accentTextColor = getAccentTextColor(isDark, primaryColor);
  const backgroundColor = isDark ? '#1A1A1A' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#1A1A1A';
  const hoverBg = isDark ? 'hover:bg-white/10' : 'hover:bg-black/10';
  const basePortalUrl = settings?.base_portal_url ?? 'https://muleshoetxchamber.com';
  const appName = app?.name ?? settings?.app_name ?? 'Muleshoe Chamber';
  const logoUrl = app?.icon_url ?? settings?.icon_url ?? 'https://base44.app/api/apps/6a8c85d1bf3d91ec40ae059d/files/mp/public/6a8c85d1bf3d91ec40ae059d/9cad9bfca_chamberlogo55in1-w1000-o-circle.png';

  const getFeatureForTab = (featureType: string) => {
    return features.find((f) => f.feature_type === featureType && f.is_enabled) ?? null;
  };

  if (loading) {
    return (
      <div data-ev-id="ev_ba2eceb75e"
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>);
  }

  if (error || !app) {
    return (
      <div data-ev-id="ev_1544c9db25"
      className="min-h-screen flex flex-col items-center justify-center p-8 text-center"
      style={{ backgroundColor }}>
        <Smartphone className="w-16 h-16 mb-4" style={{ color: primaryColor + '60' }} />
        <h1 data-ev-id="ev_18272c6dab" className="text-2xl font-bold mb-2" style={{ color: textColor }}>{t('app.notFoundTitle')}</h1>
        <p data-ev-id="ev_e60c08915f" className="text-base" style={{ color: textColor + '99' }}>{t('app.notFoundDesc')}</p>
      </div>);
  }

  const portalTabProps = {
    app,
    basePortalUrl,
    primaryColor,
    textColor,
    accentTextColor,
    backgroundColor,
    onBack: () => handleTabChange('home'),
    onOpenInAppBrowser: (link: {title: string;url: string;}) => openLink(link.title, link.url),
    embedPortalPages
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeTab
            app={app}
            features={features}
            primaryColor={primaryColor}
            textColor={textColor}
            accentTextColor={accentTextColor}
            isDark={isDark}
            skyPeriod={skyPeriod}
            now={skyNow}
            basePortalUrl={basePortalUrl}
            push={{
              initialized: push.initialized,
              subscribed: push.subscribed,
              loading: push.loading,
              permission: push.permission,
              error: push.error
            }}
            onEnableNotifications={handleEnableNotifications}
            weatherEnabled={weatherEnabled}
            weather={weather}
            onOpenWeather={() => setShowWeather(true)}
            onFeatureClick={setActiveFeature}
            onNavigateTab={handleTabChange}
            onOpenInAppBrowser={(link) => openLink(link.title, link.url)}
            onOpenViewer={(link) => setActiveInAppLink(link)}
            embedPortalPages={embedPortalPages} />);
      case 'directory':
        return <PortalTab {...portalTabProps} feature={getFeatureForTab('business-directory')} tabType="directory" />;
      case 'events':
        return <PortalTab {...portalTabProps} feature={getFeatureForTab('events-calendar')} tabType="events" />;
      case 'chat':
        return <PortalTab {...portalTabProps} feature={getFeatureForTab('ai-concierge')} tabType="chat" />;
      case 'member':
        return <PortalTab {...portalTabProps} feature={getFeatureForTab('member-portal')} tabType="member" />;
      default:
        return null;
    }
  };

  return (
    <div data-ev-id="ev_afd3847407"
    className="min-h-screen flex flex-col"
    style={{
      backgroundColor,
      fontFamily: app.font_family ?? 'Inter, system-ui, sans-serif'
    }}>

      <PWAHeader
        appName={appName}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
        textColor={textColor}
        isDark={isDark}
        onThemeToggle={toggleTheme}
        onNotificationClick={handleBellClick} />

      <main
        data-ev-id="ev_b1728c01ab"
        className="flex-1 overflow-auto overflow-x-hidden pb-20"
        style={activeTab === 'home' ? {
          background: isDark ?
          'linear-gradient(180deg, #1A1714 0%, #11151A 100%)' :
          'linear-gradient(180deg, #F5F0E9 0%, #E6EBEE 100%)'
        } : undefined}>
        {renderTabContent()}
      </main>

      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        primaryColor={primaryColor}
        textColor={textColor}
        isDark={isDark} />

      {/* Feature Modal */}
      {activeFeature &&
      <div data-ev-id="ev_ba73e5d86b"
      className="fixed inset-0 flex items-end justify-center z-50"
      onClick={() => setActiveFeature(null)}>
          <div data-ev-id="ev_592ec1da00" className="absolute inset-0 bg-black/50" />
          <div data-ev-id="ev_573a3c1c39"
        className="relative w-full max-h-[80vh] rounded-t-3xl p-6 overflow-y-auto"
        style={{ backgroundColor }}
        onClick={(e) => e.stopPropagation()}>
            <div data-ev-id="ev_95fae635b7" className="flex justify-center mb-4">
              <div data-ev-id="ev_0a44f5b2c9" className="w-12 h-1 rounded-full" style={{ backgroundColor: textColor + '30' }} />
            </div>
            <div data-ev-id="ev_658e049083" className="flex items-center gap-4 mb-6">
              <div data-ev-id="ev_a2a23730d7"
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: primaryColor + '25' }}>
                <span data-ev-id="ev_2d26d58ab0" className="text-2xl font-bold" style={{ color: primaryColor }}>
                  {activeFeature.name.charAt(0)}
                </span>
              </div>
              <h2 data-ev-id="ev_2b8369760d" className="text-xl font-bold flex-1" style={{ color: textColor }}>
                {activeFeature.name}
              </h2>
              <button data-ev-id="ev_349ef69fe2"
            onClick={() => setActiveFeature(null)}
            className={`w-11 h-11 rounded-full flex items-center justify-center ${hoverBg} transition-colors`}
            aria-label={t('common.close')}>
                <X className="w-5 h-5" style={{ color: textColor }} />
              </button>
            </div>
            <div data-ev-id="ev_9d7b7aa900" className="mb-6">
              <FeatureContentPreview
              app={app}
              feature={activeFeature}
              onOpenInAppBrowser={(link) => openLink(link.title, link.url)} />
            </div>
            <button data-ev-id="ev_fce2517fff"
          onClick={() => setActiveFeature(null)}
          className="w-full min-h-12 rounded-xl text-base font-semibold text-white"
          style={{ backgroundColor: primaryColor }}>
              {t('common.close')}
            </button>
          </div>
        </div>
      }

      {/* In-app viewer (full screen) */}
      {activeInAppLink &&
      <div data-ev-id="ev_a2c0e9275a" className="fixed inset-0 z-[60] safe-area-top" style={{ backgroundColor }}>
          <InAppViewer
          key={activeInAppLink.url}
          title={activeInAppLink.title}
          url={activeInAppLink.url}
          onBack={() => setActiveInAppLink(null)}
          primaryColor={primaryColor}
          textColor={textColor}
          backgroundColor={backgroundColor} />
        </div>
      }

      {/* Weather screen */}
      {showWeather && weatherEnabled &&
      <WeatherScreen
        weather={weather}
        primaryColor={primaryColor}
        textColor={textColor}
        accentTextColor={accentTextColor}
        backgroundColor={backgroundColor}
        onBack={() => setShowWeather(false)} />
      }

      {/* "Notifications Enabled" confirmation */}
      {justSubscribed &&
      <div
        data-ev-id="ev_push_enabled"
        className="fixed bottom-24 left-4 right-4 max-w-sm mx-auto rounded-xl shadow-lg p-3 z-50 flex items-center gap-3"
        style={{ backgroundColor: primaryColor }}
        role="status">
          <div data-ev-id="ev_eb81ce9982" className="p-2 rounded-lg bg-white/20">
            <BellRing className="w-5 h-5 text-white" />
          </div>
          <p data-ev-id="ev_579bbea6b5" className="text-base font-semibold text-white flex items-center gap-2">
            <Check className="w-5 h-5" />
            {t('app.notificationsEnabled')}
          </p>
        </div>
      }

      {/* Notification Panel */}
      {showNotificationPanel &&
      <div data-ev-id="ev_94fe85193d"
      className="fixed inset-0 flex items-end justify-center z-50"
      onClick={() => setShowNotificationPanel(false)}>
          <div data-ev-id="ev_91787587cc" className="absolute inset-0 bg-black/50" />
          <div data-ev-id="ev_a0a101dd9d"
        className="relative w-full max-h-[80vh] rounded-t-3xl p-6 overflow-y-auto"
        style={{ backgroundColor }}
        onClick={(e) => e.stopPropagation()}>
            <div data-ev-id="ev_2abe727d4a" className="flex justify-center mb-4">
              <div data-ev-id="ev_81d883cc0d" className="w-12 h-1 rounded-full" style={{ backgroundColor: textColor + '30' }} />
            </div>

            <div data-ev-id="ev_4a2324ee26" className="flex items-center justify-between mb-4">
              <h2 data-ev-id="ev_a545441e73" className="text-xl font-bold" style={{ color: textColor }}>
                {t('panel.title')}
              </h2>
              <button data-ev-id="ev_5f5b1e2978"
            onClick={() => setShowNotificationPanel(false)}
            className={`w-11 h-11 rounded-full flex items-center justify-center ${hoverBg} transition-colors`}
            aria-label={t('panel.close')}>
                <X className="w-5 h-5" style={{ color: textColor }} />
              </button>
            </div>

            {/* Notifications toggle */}
            <div data-ev-id="ev_f0e971e99c"
          className="flex items-center justify-between gap-3 p-4 rounded-xl mb-4"
          style={{ backgroundColor: primaryColor + '15' }}>
              <div data-ev-id="ev_9752858488" className="flex items-center gap-3">
                <Bell className="w-5 h-5" style={{ color: primaryColor }} />
                <span data-ev-id="ev_38848df2d5" className="text-base font-semibold" style={{ color: textColor }}>
                  {t('panel.push')}
                </span>
              </div>
              <button data-ev-id="ev_528a0c409a"
            onClick={() => push.subscribed ? push.unsubscribe() : push.subscribe()}
            disabled={push.loading}
            className="min-w-11 min-h-11 flex items-center justify-center"
            role="switch"
            aria-checked={push.subscribed}
            aria-label={push.subscribed ? t('panel.disable') : t('panel.enable')}>
                <span data-ev-id="ev_toggle_track"
              className="relative w-12 h-7 rounded-full transition-colors"
              style={{ backgroundColor: push.subscribed ? primaryColor : textColor + '30' }}>
                  <span data-ev-id="ev_53d7934bb8"
                className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: push.subscribed ? '26px' : '4px' }} />
                </span>
              </button>
            </div>

            {push.error && !push.subscribed &&
          <p data-ev-id="ev_panel_push_error" role="alert" className="-mt-2 mb-4 px-1 text-[15px] text-pretty" style={{ color: isDark ? '#F1948A' : '#C0392B' }}>
                {PUSH_ERRORS[push.error] ? t(PUSH_ERRORS[push.error]) : push.error}
              </p>
          }

            {/* Topics this device follows (only when the chamber has set some up) */}
            {pushTopics.topics.length > 0 &&
          <div data-ev-id="ev_panel_topics"
          className="flex flex-col gap-3 p-4 rounded-xl mb-4"
          style={{ backgroundColor: primaryColor + '15' }}>
                <div data-ev-id="ev_panel_topics_head" className="flex flex-col gap-1">
                  <span data-ev-id="ev_panel_topics_label" id="panel-topics-label" className="text-base font-semibold" style={{ color: textColor }}>
                    {t('panel.topics')}
                  </span>
                  <span data-ev-id="ev_panel_topics_hint" className="text-sm opacity-70" style={{ color: textColor }}>
                    {push.subscribed ? t('panel.topicsHint') : t('panel.topicsOff')}
                  </span>
                </div>
                <div data-ev-id="ev_panel_topics_list" role="group" aria-labelledby="panel-topics-label" className="flex flex-col gap-1">
                  {pushTopics.topics.map((topic) => {
                const on = pushTopics.chosen.includes(topic.id);
                const name = lang === 'es' && topic.name_es ? topic.name_es : topic.name;
                const desc = lang === 'es' && topic.description_es ? topic.description_es : topic.description;
                return (
                  <button data-ev-id="ev_panel_topic"
                  key={topic.id}
                  onClick={() => pushTopics.toggle(topic.id)}
                  disabled={!push.subscribed}
                  role="switch"
                  aria-checked={on}
                  className="flex items-center justify-between gap-3 min-h-11 py-1 text-left disabled:opacity-50">
                        <span data-ev-id="ev_panel_topic_text" className="flex-1 min-w-0">
                          <span data-ev-id="ev_panel_topic_name" className="block text-base" style={{ color: textColor }}>{name}</span>
                          {desc && <span data-ev-id="ev_panel_topic_desc" className="block text-sm opacity-60" style={{ color: textColor }}>{desc}</span>}
                        </span>
                        <span data-ev-id="ev_panel_topic_track"
                    className="relative w-12 h-7 rounded-full transition-colors shrink-0"
                    style={{ backgroundColor: on && push.subscribed ? primaryColor : textColor + '30' }}>
                          <span data-ev-id="ev_panel_topic_knob"
                      className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all"
                      style={{ left: on && push.subscribed ? '26px' : '4px' }} />
                        </span>
                      </button>);
              })}
                </div>
              </div>
          }

            {/* Language / Idioma (same setting as the EN | ES header switch) */}
            <div data-ev-id="ev_panel_language"
          className="flex flex-col gap-3 p-4 rounded-xl mb-4"
          style={{ backgroundColor: primaryColor + '15' }}>
              <div data-ev-id="ev_panel_language_head" className="flex items-center gap-3">
                <Languages className="w-5 h-5" style={{ color: primaryColor }} />
                <span data-ev-id="ev_panel_language_label" id="panel-language-label" className="text-base font-semibold" style={{ color: textColor }}>
                  {t('settings.language')}
                </span>
              </div>
              <div data-ev-id="ev_panel_language_options" role="group" aria-labelledby="panel-language-label" className="grid grid-cols-2 gap-2">
                {([{ code: 'en', label: t('lang.english') }, { code: 'es', label: t('lang.spanish') }] as {code: Lang;label: string;}[]).map(({ code, label }) => {
                const active = lang === code;
                return (
                  <button data-ev-id={`ev_panel_language_${code}`}
                  key={code}
                  onClick={() => setLang(code)}
                  aria-pressed={active}
                  className="min-h-11 px-3 rounded-xl text-base font-semibold border transition-colors"
                  style={{
                    backgroundColor: active ? '#B8956B' : 'transparent',
                    borderColor: active ? '#B8956B' : textColor + '30',
                    color: active ? '#1A1A1A' : textColor
                  }}>
                      {label}
                    </button>);
              })}
              </div>
            </div>

            {panelNotifications.length > 0 ?
          <div data-ev-id="ev_38e20db34d" className="flex flex-col gap-3">
                {panelNotifications.map((notif) => {
              const openable = isOpenableUpdateUrl(notif.url);
              return (
                <button data-ev-id="ev_942805567f"
                key={notif.id}
                disabled={!openable}
                onClick={() => {
                  if (!isOpenableUpdateUrl(notif.url)) return;
                  setShowNotificationPanel(false);
                  openLink(notif.title, notif.url);
                }}
                className="flex items-center gap-3 p-4 min-h-11 rounded-xl text-left transition-opacity enabled:active:opacity-70 disabled:cursor-default"
                style={{ backgroundColor: primaryColor + '10' }}>
                      <div data-ev-id="ev_7d1b24bf58" className="flex-1 min-w-0 flex flex-col gap-1">
                        <div data-ev-id="ev_panel_meta" className="flex items-center gap-2">
                          <span data-ev-id="ev_panel_type" className="text-base font-semibold" style={{ color: accentTextColor }}>{t('type.update')}</span>
                          <span data-ev-id="ev_549b615e76" className="text-sm opacity-60" style={{ color: textColor }}>
                            · {new Date(notif.sent_at).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p data-ev-id="ev_96a3e7a056" className="text-base font-semibold" style={{ color: textColor }}>
                          {notif.title}
                        </p>
                        <p data-ev-id="ev_02e399f641" className="text-base opacity-75 line-clamp-2" style={{ color: textColor }}>
                          {notif.body}
                        </p>
                      </div>
                      {openable && <ChevronRight className="w-5 h-5 opacity-50 shrink-0" style={{ color: textColor }} />}
                    </button>);
            })}
              </div> :

          <div data-ev-id="ev_a509d214d8"
          className="p-6 rounded-xl text-center"
          style={{ backgroundColor: primaryColor + '0D' }}>
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" style={{ color: primaryColor }} />
                <p data-ev-id="ev_e6fac3bef7" className="text-base" style={{ color: textColor }}>
                  {t('home.emptyDesc')}
                </p>
              </div>
          }
          </div>
        </div>
      }
    </div>);
}
