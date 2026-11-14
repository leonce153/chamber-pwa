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

  // Check if user has already granted notification permission
  useEffect(() => {
    if (!state.initialized) return;
    
    // Check browser permission state
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      setState(prev => ({ ...prev, subscribed: true }));
    }
  }, [state.initialized]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.initialized) {
      setState(prev => ({ ...prev, error: 'Push notifications not initialized' }));
      return false;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Request notification permission
      // Gravitec's client.js automatically subscribes the user when permission is granted
      const permission = await Notification.requestPermission();
      
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

      // Permission granted - Gravitec handles subscription automatically
      // Set alias with user ID for targeted test sends
      if (userId) {
        const gravitec = window.Gravitec;
        if (gravitec && !Array.isArray(gravitec) && typeof gravitec.push === 'function') {
          gravitec.push(['segmentation.setAlias', userId]);
        }
      }
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
  }, [state.initialized, userId]);

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
