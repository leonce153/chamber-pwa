import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/helpers';

type App = Tables<'apps'>;
type AppFeature = Tables<'app_features'>;
type AppCollaborator = Tables<'app_collaborators'>;

export interface AppWithAccess extends App {
  accessRole: 'owner' | 'admin' | 'editor' | 'super_admin';
}

export function useApps() {
  const [apps, setApps] = useState<AppWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, role } = useAuth();

  useEffect(() => {
    if (!user) {
      setApps([]);
      setLoading(false);
      return;
    }

    fetchApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchApps = async () => {
    if (!supabase || !user) return;

    setLoading(true);
    setError(null);

    // Owners see all apps (single-tenant: everyone sees the app)
    if (role === 'owner') {
      const { data, error: fetchError } = await supabase
        .from('apps')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        const appsWithAccess: AppWithAccess[] = (data ?? []).map(app => ({
          ...app,
          accessRole: app.user_id === user.id ? 'owner' : 'editor',
        }));
        setApps(appsWithAccess);
      }
      setLoading(false);
      return;
    }

    // For other roles, fetch owned apps and collaborative apps
    const [ownedResult, collabResult] = await Promise.all([
      supabase
        .from('apps')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('app_collaborators')
        .select('app_id, role')
        .eq('user_id', user.id),
    ]);

    if (ownedResult.error) {
      setError(ownedResult.error.message);
      setLoading(false);
      return;
    }

    // Create map of collaborative apps
    const collabMap = new Map<string, 'admin' | 'editor'>();
    (collabResult.data ?? []).forEach(c => {
      collabMap.set(c.app_id, c.role as 'admin' | 'editor');
    });

    // Fetch collaborative apps if any
    let collabApps: App[] = [];
    if (collabMap.size > 0) {
      const { data: collabAppsData } = await supabase
        .from('apps')
        .select('*')
        .in('id', Array.from(collabMap.keys()));
      collabApps = collabAppsData ?? [];
    }

    // Combine owned and collaborative apps
    const ownedWithAccess: AppWithAccess[] = (ownedResult.data ?? []).map(app => ({
      ...app,
      accessRole: 'owner' as const,
    }));

    const collabWithAccess: AppWithAccess[] = collabApps.map(app => ({
      ...app,
      accessRole: collabMap.get(app.id) ?? 'editor',
    }));

    // Merge and dedupe (owned takes precedence)
    const ownedIds = new Set(ownedWithAccess.map(a => a.id));
    const merged = [
      ...ownedWithAccess,
      ...collabWithAccess.filter(a => !ownedIds.has(a.id)),
    ];

    // Sort by created_at descending
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setApps(merged);
    setLoading(false);
  };

  const createApp = async (name: string) => {
    if (!supabase || !user) return null;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const { data, error: createError } = await supabase
      .from('apps')
      .insert({
        user_id: user.id,
        name,
        slug,
        status: 'draft',
      })
      .select()
      .single();

    if (createError) {
      setError(createError.message);
      return null;
    }

    if (data) {
      const appWithAccess: AppWithAccess = { ...data, accessRole: 'owner' };
      setApps([appWithAccess, ...apps]);
    }

    return data;
  };

  const updateApp = async (id: string, updates: Partial<App>) => {
    if (!supabase) return null;

    const { data, error: updateError } = await supabase
      .from('apps')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      return null;
    }

    if (data) {
      setApps(apps.map(app => app.id === id ? { ...data, accessRole: app.accessRole } : app));
    }

    return data;
  };

  const deleteApp = async (id: string) => {
    if (!supabase) return false;

    const { error: deleteError } = await supabase
      .from('apps')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }

    setApps(apps.filter(app => app.id !== id));
    return true;
  };

  return {
    apps,
    loading,
    error,
    createApp,
    updateApp,
    deleteApp,
    refetch: fetchApps,
  };
}

export function useApp(appId: string | undefined) {
  const [app, setApp] = useState<App | null>(null);
  const [features, setFeatures] = useState<AppFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appId) {
      setLoading(false);
      return;
    }

    fetchApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  const fetchApp = async () => {
    if (!supabase || !appId) return;

    setLoading(true);
    setError(null);

    const [appResult, featuresResult] = await Promise.all([
      supabase.from('apps').select('*').eq('id', appId).single(),
      supabase.from('app_features').select('*').eq('app_id', appId).order('position'),
    ]);

    if (appResult.error) {
      setError(appResult.error.message);
    } else {
      setApp(appResult.data);
    }

    setFeatures(featuresResult.data ?? []);
    setLoading(false);
  };

  const updateApp = async (updates: Partial<App>) => {
    if (!supabase || !app) return null;

    const { data, error: updateError } = await supabase
      .from('apps')
      .update(updates)
      .eq('id', app.id)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      return null;
    }

    if (data) {
      setApp(data);
    }

    return data;
  };

  const addFeature = async (feature: Omit<AppFeature, 'id' | 'app_id' | 'created_at' | 'updated_at'>) => {
    if (!supabase || !app) return null;

    const { data, error: createError } = await supabase
      .from('app_features')
      .insert({
        app_id: app.id,
        ...feature,
        position: features.length,
      })
      .select()
      .single();

    if (createError) {
      setError(createError.message);
      return null;
    }

    if (data) {
      setFeatures([...features, data]);
    }

    return data;
  };

  const updateFeature = async (featureId: string, updates: Partial<AppFeature>) => {
    if (!supabase) return null;

    const { data, error: updateError } = await supabase
      .from('app_features')
      .update(updates)
      .eq('id', featureId)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      return null;
    }

    if (data) {
      setFeatures(features.map(f => f.id === featureId ? data : f));
    }

    return data;
  };

  const removeFeature = async (featureId: string) => {
    if (!supabase) return false;

    const { error: deleteError } = await supabase
      .from('app_features')
      .delete()
      .eq('id', featureId);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }

    setFeatures(features.filter(f => f.id !== featureId));
    return true;
  };

  return {
    app,
    features,
    loading,
    error,
    updateApp,
    addFeature,
    updateFeature,
    removeFeature,
    refetch: fetchApp,
  };
}
