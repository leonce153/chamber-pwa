import { useEffect, useState } from 'react';
import type { Tables } from '@/integrations/supabase/helpers';

type App = Tables<'apps'>;

interface ServiceWorkerStatus {
  supported: boolean;
  registered: boolean;
  registration: ServiceWorkerRegistration | null;
  error: string | null;
}

/**
 * Registers a service worker for offline support and push notifications.
 * Each app gets its own scope based on subdomain or slug.
 */
export function useServiceWorker(app: App | null): ServiceWorkerStatus {
  const [status, setStatus] = useState<ServiceWorkerStatus>({
    supported: 'serviceWorker' in navigator,
    registered: false,
    registration: null,
    error: null,
  });

  useEffect(() => {
    if (!app || !status.supported) return;

    const registerSW = async () => {
      try {
        // Register Gravitec's push worker (which imports sw.js for offline caching)
        const swUrl = `/push-worker.js`;
        
        const registration = await navigator.serviceWorker.register(swUrl, {
          scope: '/',
        });

        setStatus(prev => ({
          ...prev,
          registered: true,
          registration,
          error: null,
        }));

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                console.log('New service worker version available');
              }
            });
          }
        });
      } catch (err) {
        setStatus(prev => ({
          ...prev,
          registered: false,
          error: err instanceof Error ? err.message : 'Failed to register service worker',
        }));
      }
    };

    registerSW();

    return () => {
      // Optionally unregister on cleanup if needed
    };
  }, [app, status.supported]);

  return status;
}

/**
 * Request notification permission for push notifications.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    return await Notification.requestPermission();
  }

  return Notification.permission;
}
