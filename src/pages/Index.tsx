import { useEffect } from 'react';
import { useApp } from '@/hooks/useApp';
import { useAppSettings } from '@/hooks/useAppSettings';
import AppPreview from '@/pages/AppPreview';
import { getHeaderThemeColor } from '@/hooks/useTheme';
import { Loader2 } from 'lucide-react';

/**
 * Root page serves the public PWA for end users.
 * Management area is at /admin/*
 */
export default function Index() {
  const { app, loading: appLoading } = useApp();
  const { settings, loading: settingsLoading } = useAppSettings();

  // Update document title and favicon from settings
  useEffect(() => {
    if (settings) {
      document.title = settings.app_name || 'App';

      // Update favicon if icon_url exists
      if (settings.icon_url) {
        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = settings.icon_url;
        document.head.appendChild(link);
      }

      // Update theme-color meta
      let themeMeta = document.querySelector("meta[name='theme-color']") as HTMLMetaElement;
      if (!themeMeta) {
        themeMeta = document.createElement('meta');
        themeMeta.name = 'theme-color';
        document.head.appendChild(themeMeta);
      }
      themeMeta.content = getHeaderThemeColor();
    }
  }, [settings]);

  if (appLoading || settingsLoading) {
    return (
      <div data-ev-id="ev_d47f89d659" className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>);

  }

  if (!app) {
    return (
      <div data-ev-id="ev_6c09434437" className="min-h-screen bg-background flex items-center justify-center">
        <div data-ev-id="ev_348e99ee86" className="text-center p-8">
          <h1 data-ev-id="ev_8265d1b038" className="text-4xl font-bold text-text mb-4">App Not Configured</h1>
          <p data-ev-id="ev_b8f75a9485" className="text-muted mb-6">
            This app hasn't been set up yet.
          </p>
          <a data-ev-id="ev_c0d47bde11"
          href="/admin"
          className="inline-block bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-hover transition-colors">

            Go to Admin
          </a>
        </div>
      </div>);

  }

  // Render the public PWA
  return <AppPreview appFromSubdomain={app} />;
}