import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import type { Tables, TablesUpdate } from '@/integrations/supabase/helpers';

export type App = Tables<'apps'>;
export type AppFeature = Tables<'app_features'>;

interface UseAppReturn {
  app: App | null;
  features: AppFeature[];
  loading: boolean;
  error: string | null;
  updateApp: (updates: TablesUpdate<'apps'>) => Promise<boolean>;
  refetch: () => void;
}

/**
 * Hook to fetch and manage the single app in single-tenant mode.
 * Uses the legacy_app_id from app_settings to find the app.
 */
export function useApp(): UseAppReturn {
  const [app, setApp] = useState<App | null>(null);
  const [features, setFeatures] = useState<AppFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = useAppSettings();

  const fetchApp = useCallback(async () => {
    if (!supabase || !settings?.legacy_app_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [appResult, featuresResult] = await Promise.all([
      supabase
        .from('apps')
        .select('*')
        .eq('id', settings.legacy_app_id)
        .single(),
      supabase
        .from('app_features')
        .select('*')
        .eq('app_id', settings.legacy_app_id)
        .order('position', { ascending: true }),
    ]);

    if (appResult.error) {
      setError(appResult.error.message);
    } else {
      setApp(appResult.data);
    }

    setFeatures(featuresResult.data ?? []);
    setLoading(false);
  }, [settings?.legacy_app_id]);

  useEffect(() => {
    if (!settingsLoading && settings?.legacy_app_id) {
      // Fetch app when settings are loaded (works for both authenticated and public access)
      fetchApp();
    } else if (!settingsLoading) {
      // No settings or no legacy_app_id - stop loading
      setLoading(false);
    }
  }, [settingsLoading, settings?.legacy_app_id, fetchApp]);

  const updateApp = async (updates: TablesUpdate<'apps'>): Promise<boolean> => {
    if (!supabase || !app) return false;

    const { data, error: updateError } = await supabase
      .from('apps')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', app.id)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    setApp(data);
    return true;
  };

  return {
    app,
    features,
    loading: loading || settingsLoading,
    error,
    updateApp,
    refetch: fetchApp,
  };
}

/**
 * Hook to manage features for the single app.
 * Also re-exports updateApp from useApp for convenience.
 */
export function useAppFeatures() {
  const { app, features, loading, updateApp, refetch } = useApp();
  const [saving, setSaving] = useState(false);

  const addFeature = async (featureType: string, name: string, icon: string): Promise<AppFeature | null> => {
    if (!supabase || !app) return null;
    setSaving(true);

    const position = features.length;
    const { data, error } = await supabase
      .from('app_features')
      .insert({
        app_id: app.id,
        feature_type: featureType,
        name,
        icon,
        position,
        is_enabled: true,
      })
      .select()
      .single();

    setSaving(false);
    if (error) {
      console.error('Failed to add feature:', error);
      return null;
    }

    refetch();
    return data;
  };

  const updateFeature = async (featureId: string, updates: Partial<AppFeature>): Promise<boolean> => {
    if (!supabase) return false;
    setSaving(true);

    const { error } = await supabase
      .from('app_features')
      .update(updates)
      .eq('id', featureId);

    setSaving(false);
    if (error) {
      console.error('Failed to update feature:', error);
      return false;
    }

    refetch();
    return true;
  };

  const deleteFeature = async (featureId: string): Promise<boolean> => {
    if (!supabase) return false;
    setSaving(true);

    const { error } = await supabase
      .from('app_features')
      .delete()
      .eq('id', featureId);

    setSaving(false);
    if (error) {
      console.error('Failed to delete feature:', error);
      return false;
    }

    refetch();
    return true;
  };

  return {
    app,
    features,
    loading,
    saving,
    addFeature,
    updateFeature,
    deleteFeature,
    updateApp,
    refetch,
  };
}
