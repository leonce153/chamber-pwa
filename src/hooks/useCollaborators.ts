import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/helpers';

type AppCollaborator = Tables<'app_collaborators'>;
type Profile = Tables<'profiles'>;

export interface CollaboratorWithProfile extends AppCollaborator {
  profile?: Pick<Profile, 'email' | 'full_name' | 'avatar_url'>;
}

export function useCollaborators(appId: string | undefined) {
  const [collaborators, setCollaborators] = useState<CollaboratorWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCollaborators = useCallback(async () => {
    if (!supabase || !appId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Fetch collaborators
    const { data: collabData, error: collabError } = await supabase
      .from('app_collaborators')
      .select('*')
      .eq('app_id', appId)
      .order('created_at', { ascending: false });

    if (collabError) {
      setError(collabError.message);
      setLoading(false);
      return;
    }

    // Fetch profiles for collaborators
    if (collabData && collabData.length > 0) {
      const userIds = collabData.map(c => c.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profilesData?.map(p => [p.id, p]) ?? []);
      
      const withProfiles: CollaboratorWithProfile[] = collabData.map(c => ({
        ...c,
        profile: profileMap.get(c.user_id),
      }));

      setCollaborators(withProfiles);
    } else {
      setCollaborators([]);
    }

    setLoading(false);
  }, [appId]);

  useEffect(() => {
    fetchCollaborators();
  }, [fetchCollaborators]);

  const addCollaborator = async (userId: string, role: 'admin' | 'editor') => {
    if (!supabase || !appId || !user) return null;

    const { data, error: insertError } = await supabase
      .from('app_collaborators')
      .insert({
        app_id: appId,
        user_id: userId,
        role,
        assigned_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      return null;
    }

    await fetchCollaborators();
    return data;
  };

  const updateCollaboratorRole = async (collaboratorId: string, role: 'admin' | 'editor') => {
    if (!supabase) return null;

    const { data, error: updateError } = await supabase
      .from('app_collaborators')
      .update({ role })
      .eq('id', collaboratorId)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      return null;
    }

    setCollaborators(prev =>
      prev.map(c => c.id === collaboratorId ? { ...c, role } : c)
    );

    return data;
  };

  const removeCollaborator = async (collaboratorId: string) => {
    if (!supabase) return false;

    const { error: deleteError } = await supabase
      .from('app_collaborators')
      .delete()
      .eq('id', collaboratorId);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }

    setCollaborators(prev => prev.filter(c => c.id !== collaboratorId));
    return true;
  };

  return {
    collaborators,
    loading,
    error,
    addCollaborator,
    updateCollaboratorRole,
    removeCollaborator,
    refetch: fetchCollaborators,
  };
}

// Hook to get all users that can be added as collaborators
export function useAvailableUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('email');

      setUsers((data as Profile[]) ?? []);
      setLoading(false);
    };

    fetchUsers();
  }, []);

  return { users, loading };
}
