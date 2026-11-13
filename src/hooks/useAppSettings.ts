import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesUpdate } from '@/integrations/supabase/helpers';

export type AppSettings = Tables<'app_settings'>;

interface UseAppSettingsReturn {
  settings: AppSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (updates: TablesUpdate<'app_settings'>) => Promise<{ error: string | null }>;
  refetch: () => void;
}

/**
 * Hook to access the single-tenant app settings.
 * Returns the one app_settings row that configures this installation.
 */
export function useAppSettings(): UseAppSettingsReturn {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!supabase) {
      setError('Database not connected');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('app_settings')
      .select('*')
      .limit(1)
      .single();

    if (fetchError) {
      // If no settings exist yet, that's okay for new installations
      if (fetchError.code === 'PGRST116') {
        setSettings(null);
      } else {
        setError(fetchError.message);
      }
    } else {
      setSettings(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: TablesUpdate<'app_settings'>): Promise<{ error: string | null }> => {
    if (!supabase || !settings) {
      return { error: 'Settings not loaded' };
    }

    const { data, error: updateError } = await supabase
      .from('app_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', settings.id)
      .select()
      .single();

    if (updateError) {
      return { error: updateError.message };
    }

    if (data) {
      setSettings(data);
    }
    return { error: null };
  }, [settings]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetch: fetchSettings,
  };
}

/**
 * Get the legacy app_id for compatibility with existing tables
 * that reference apps.id (push_notifications, app_features, etc.)
 */
export function useLegacyAppId(): { appId: string | null; loading: boolean } {
  const { settings, loading } = useAppSettings();
  return {
    appId: settings?.legacy_app_id ?? null,
    loading,
  };
}
