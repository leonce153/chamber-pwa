import { useEffect } from 'react';
import type { Tables } from '@/integrations/supabase/helpers';
import { getHeaderThemeColor, getAppleStatusBarStyle } from '@/hooks/useTheme';

type App = Tables<'apps'>;

interface PWAManifestConfig {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation: 'portrait' | 'landscape' | 'any';
  theme_color: string;
  background_color: string;
  /** Required by Gravitec / FCM for web push subscription */
  gcm_sender_id: string;
  gcm_user_visible_only: boolean;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
}

/**
 * Generates and injects a dynamic manifest for a PWA based on app settings.
 * Creates a blob URL manifest and updates the document head.
 */
export function usePWAManifest(app: App | null) {
  useEffect(() => {
    if (!app) return;

    // Generate manifest config from app data
    const manifest: PWAManifestConfig = {
      name: app.name || 'PWA App',
      short_name: (app.name || 'App').slice(0, 12),
      description: app.description || `${app.name} - Progressive Web App`,
      start_url: '/',
      display: 'standalone',
      orientation: 'portrait',
      theme_color: app.theme_color || '#6366f1',
      background_color: app.background_color || '#ffffff',
      // Keep push registration working when this dynamic manifest replaces the static one
      gcm_sender_id: '330561634409',
      gcm_user_visible_only: true,
      icons: generateIcons(app.homepage_image_url),
    };

    // Create blob URL for manifest
    const manifestBlob = new Blob([JSON.stringify(manifest)], {
      type: 'application/json',
    });
    const manifestUrl = URL.createObjectURL(manifestBlob);

    // Remove any existing manifest link
    const existingManifest = document.querySelector('link[rel="manifest"]');
    if (existingManifest) {
      existingManifest.remove();
    }

    // Add new manifest link
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = manifestUrl;
    document.head.appendChild(manifestLink);

    // Update theme-color meta tag (matches the header color for the current light/dark mode)
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.setAttribute('content', getHeaderThemeColor());

    // Update apple-specific meta tags for iOS PWA support
    updateAppleMeta(app);

    // Cleanup on unmount
    return () => {
      URL.revokeObjectURL(manifestUrl);
    };
  }, [app]);
}

function generateIcons(iconUrl: string | null | undefined): PWAManifestConfig['icons'] {
  // Default PWA icon if no custom icon
  const defaultIcon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%236366f1" width="100" height="100" rx="20"/><text x="50" y="62" text-anchor="middle" font-size="40" fill="white">PWA</text></svg>';
  
  const src = iconUrl || defaultIcon;
  
  return [
    {
      src,
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ];
}

function updateAppleMeta(app: App) {
  // Apple Web App title
  let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (!appleTitle) {
    appleTitle = document.createElement('meta');
    appleTitle.setAttribute('name', 'apple-mobile-web-app-title');
    document.head.appendChild(appleTitle);
  }
  appleTitle.setAttribute('content', app.name || 'App');

  // Apple Web App capable
  let appleCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
  if (!appleCapable) {
    appleCapable = document.createElement('meta');
    appleCapable.setAttribute('name', 'apple-mobile-web-app-capable');
    document.head.appendChild(appleCapable);
  }
  appleCapable.setAttribute('content', 'yes');

  // Apple status bar style
  let appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (!appleStatusBar) {
    appleStatusBar = document.createElement('meta');
    appleStatusBar.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
    document.head.appendChild(appleStatusBar);
  }
  appleStatusBar.setAttribute('content', getAppleStatusBarStyle());

  // Apple touch icon
  if (app.homepage_image_url) {
    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.setAttribute('rel', 'apple-touch-icon');
      document.head.appendChild(appleIcon);
    }
    appleIcon.setAttribute('href', app.homepage_image_url);
  }
}
