import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/helpers';

type App = Tables<'apps'>;

export interface SubdomainInfo {
  subdomain: string | null;
  isSubdomain: boolean;
  isMainDomain: boolean;
  app: App | null;
  loading: boolean;
  error: string | null;
}

// Reserved subdomains that shouldn't map to apps
const RESERVED_SUBDOMAINS = ['www', 'api', 'admin', 'app', 'dashboard', 'mail', 'smtp', 'ftp'];

// UUID v4 pattern - used to detect sandbox/preview environments
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Detects the current subdomain and fetches the associated app.
 * Returns null subdomain if on the main platform domain.
 */
export function useSubdomain(): SubdomainInfo {
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [app, setApp] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const detectSubdomain = (): string | null => {
    const hostname = window.location.hostname;
    
    // localhost or IP addresses = main domain
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return null;
    }

    const parts = hostname.split('.');
    
    // Need at least 3 parts for a subdomain (e.g., myapp.example.com)
    if (parts.length < 3) {
      return null;
    }

    // First part is the potential subdomain
    const potentialSubdomain = parts[0];

    // Check if it's a reserved subdomain
    if (RESERVED_SUBDOMAINS.includes(potentialSubdomain.toLowerCase())) {
      return null;
    }

    // Check if it's a UUID (sandbox/preview environment identifier)
    if (UUID_PATTERN.test(potentialSubdomain)) {
      return null;
    }

    return potentialSubdomain.toLowerCase();
  };

  useEffect(() => {
    const detectedSubdomain = detectSubdomain();
    setSubdomain(detectedSubdomain);

    if (!detectedSubdomain || !supabase) {
      setLoading(false);
      return;
    }

    // Fetch the app for this subdomain
    const fetchApp = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('apps')
          .select('*')
          .eq('subdomain', detectedSubdomain)
          .eq('status', 'active')
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            // No app found for this subdomain
            setError('App not found');
          } else {
            setError(fetchError.message);
          }
          setApp(null);
        } else {
          setApp(data);
          setError(null);
        }
      } catch (err) {
        setError('Failed to load app');
        setApp(null);
      } finally {
        setLoading(false);
      }
    };

    fetchApp();
  }, []);

  return {
    subdomain,
    isSubdomain: subdomain !== null,
    isMainDomain: subdomain === null,
    app,
    loading,
    error,
  };
}

/**
 * Gets the full URL for a given subdomain.
 * Useful for generating PWA links.
 */
export function getSubdomainUrl(subdomain: string): string {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;

  // For localhost/dev, just return the preview URL
  if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
    const portSuffix = port ? `:${port}` : '';
    return `${protocol}//${hostname}${portSuffix}/preview/${subdomain}`;
  }

  // For production, construct subdomain URL
  const parts = hostname.split('.');
  const baseDomain = parts.slice(-2).join('.');
  
  return `${protocol}//${subdomain}.${baseDomain}`;
}
