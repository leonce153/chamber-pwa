import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TeamRole = 'owner' | 'editor' | 'sender';

export interface TeamMember {
  id: string;
  email: string | null;
  full_name: string | null;
  role: TeamRole;
  created_at: string;
  last_sign_in_at: string | null;
  invited_at: string | null;
  pending: boolean;
}

export interface InviteResult {
  error: string | null;
  emailSent?: boolean;
  inviteLink?: string | null;
}

/** Calls the owner-only team server function and returns a readable error. */
async function callTeam<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T & { success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Database not connected' } as T & { success: boolean; error?: string };
  const { data, error } = await supabase.functions.invoke('manage-team', { body });
  if (error) {
    let message = error.message || 'Request failed';
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const parsed = await ctx.json();
        message = parsed.error || message;
      } catch {
        /* keep default */
      }
    }
    return { success: false, error: message } as T & { success: boolean; error?: string };
  }
  return data;
}

export function useTeam() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await callTeam<{ members?: TeamMember[] }>({ action: 'list' });
    if (!res.success) setError(res.error ?? 'Could not load the team.');
    else setMembers(res.members ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const inviteMember = useCallback(
    async (email: string, role: TeamRole, fullName?: string): Promise<InviteResult> => {
      const res = await callTeam<{ emailSent?: boolean; inviteLink?: string | null }>({
        action: 'invite',
        email,
        role,
        fullName,
        redirectTo: `${window.location.origin}/admin/accept-invite`,
      });
      if (!res.success) return { error: res.error ?? 'Could not send the invite.' };
      await fetchMembers();
      return { error: null, emailSent: res.emailSent, inviteLink: res.inviteLink };
    },
    [fetchMembers]
  );

  const updateMemberRole = useCallback(
    async (userId: string, role: TeamRole): Promise<string | null> => {
      const res = await callTeam({ action: 'update_role', userId, role });
      if (!res.success) return res.error ?? 'Could not change the role.';
      setMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, role } : m)));
      return null;
    },
    []
  );

  const removeMember = useCallback(async (userId: string): Promise<string | null> => {
    const res = await callTeam({ action: 'remove', userId });
    if (!res.success) return res.error ?? 'Could not remove this member.';
    setMembers((prev) => prev.filter((m) => m.id !== userId));
    return null;
  }, []);

  return { members, loading, error, inviteMember, updateMemberRole, removeMember, refetch: fetchMembers };
}
