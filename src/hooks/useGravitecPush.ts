import { useEffect, useState, useCallback } from 'react';
import type { Tables } from '@/integrations/supabase/helpers';

type App = Tables<'apps'>;

// Gravitec SDK interface (loaded via script tag in index.html)
interface GravitecSDK {
  push: (args: [string, ...unknown[]]) => void;
  isSubscribed?: () => Promise<boolean>;
  subscribe?: () => Promise<void>;
  unsubscribe?: () => Promise<void>;
}

declare global {
  interface Window {
    Gravitec?: GravitecSDK | unknown[];
  }
}

interface GravitecPushState {
  initialized: boolean;
  subscribed: boolean;
  permission: NotificationPermission | null;
  error: string | null;
  loading: boolean;
}

/**
 * Hook for Gravitec push notification integration.
 * Detects the Gravitec SDK loaded via script tag in index.html.
 * 
 * The SDK is loaded by: <script src="https://cdn.gravitec.net/storage/{appKey}/client.js" async>
 */
type GravitecQueue = { push: (args: unknown[]) => void };

/** The loaded Gravitec SDK, or null while it is still loading (or blocked). */
function gravitecSdk(): GravitecQueue | null {
  const g = window.Gravitec as unknown;
  if (!g || Array.isArray(g) || typeof (g as GravitecQueue).push !== 'function') return null;
  return g as GravitecQueue;
}

export function useGravitecPush(app: App | null, userId?: string | null): GravitecPushState & {
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
} {
  const [state, setState] = useState<GravitecPushState>({
    initialized: false,
    subscribed: false,
    permission: typeof Notification !== 'undefined' ? Notification.permission : null,
    error: null,
    loading: false,
  });

  // Check if Gravitec SDK is loaded (via script tag in index.html)
  useEffect(() => {
    if (!app) return;

    const checkGravitec = () => {
      // The Gravitec client.js script sets window.Gravitec
      if (typeof window !== 'undefined' && window.Gravitec && !Array.isArray(window.Gravitec)) {
        setState(prev => ({ ...prev, initialized: true, error: null }));
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkGravitec()) return;

    // If not loaded yet, poll for it (script loads async)
    const interval = setInterval(() => {
      if (checkGravitec()) {
        clearInterval(interval);
      }
    }, 500);

    // Stop polling after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      // Use setState callback to check current state without dependency
      setState(prev => {
        if (!prev.initialized) {
          return { ...prev, error: 'Push notification service unavailable' };
        }
        return prev;
      });
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [app]);

  // Follow the browser's permission: already granted on load, or granted later through another
  // prompt (Gravitec's own pop-up, or the browser's site settings) without using our toggle.
  useEffect(() => {
    if (!state.initialized || typeof Notification === 'undefined') return;
    let last: NotificationPermission | null = null;
    const sync = () => {
      const p = Notification.permission;
      if (p === last) return;
      last = p;
      setState(prev => ({
        ...prev,
        permission: p,
        subscribed: p === 'granted' ? true : p === 'denied' ? false : prev.subscribed,
        error: p === 'granted' ? null : prev.error,
      }));
      if (p === 'granted' && userId) gravitecSdk()?.push(['segmentation.setAlias', userId]);
    };
    sync();
    const timer = setInterval(sync, 1500);
    const onVisible = () => sync();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [state.initialized, userId]);

  // Subscribe to push notifications.
  // Gravitec's registerUserForPush asks the browser for permission AND registers this device with
  // Gravitec. (Asking the browser alone, as before, left the device unregistered until a reload.)
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
      setState(prev => ({ ...prev, error: 'Push notification service unavailable' }));
      return false;
    }
    if (Notification.permission === 'denied') {
      setState(prev => ({ ...prev, permission: 'denied', error: 'Notification permission denied. Please enable in browser settings.' }));
      return false;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    // The SDK loads async; give it a few seconds if the person was quick.
    let gravitec = gravitecSdk();
    for (let i = 0; !gravitec && i < 10; i++) {
      await new Promise(r => setTimeout(r, 500));
      gravitec = gravitecSdk();
    }
    if (!gravitec) {
      setState(prev => ({ ...prev, loading: false, error: 'Push notification service unavailable' }));
      return false;
    }

    try {
      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => { if (!done) { done = true; resolve(); } };
        // Native prompt: the person already tapped our own button, so skip Gravitec's extra pop-up.
        gravitec!.push(['registerUserForPush', finish, { mobileProps: { type: 'NATIVE' }, desktopProps: { type: 'NATIVE' } }]);
        // Resolve once the browser answers, even if Gravitec never calls back.
        const started = Date.now();
        const poll = setInterval(() => {
          if (Notification.permission !== 'default' || Date.now() - started > 60000) {
            clearInterval(poll);
            setTimeout(finish, 1500);
          }
        }, 300);
      });

      const permission = Notification.permission as NotificationPermission;
      setState(prev => ({ ...prev, permission }));
      if (permission !== 'granted') {
        setState(prev => ({
          ...prev,
          loading: false,
          error: permission === 'denied'
            ? 'Notification permission denied. Please enable in browser settings.'
            : 'Notification permission required',
        }));
        return false;
      }

      // Alias = team member id, so "Send test to me" reaches this device.
      if (userId) gravitec.push(['segmentation.setAlias', userId]);
      setState(prev => ({ ...prev, subscribed: true, loading: false }));
      return true;
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to enable notifications. Please try again.',
      }));
      return false;
    }
  }, [userId]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.initialized) {
      return false;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const gravitec = window.Gravitec;
      if (gravitec && !Array.isArray(gravitec) && typeof gravitec.unsubscribe === 'function') {
        await gravitec.unsubscribe();
      }
      
      setState(prev => ({ ...prev, subscribed: false, loading: false }));
      return true;
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to unsubscribe',
      }));
      return false;
    }
  }, [state.initialized]);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}
