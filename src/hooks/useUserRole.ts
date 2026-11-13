import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/auth';

export type { UserRole } from '@/types/auth';

export interface UserPermissions {
  role: UserRole;
  canCreateApps: boolean;
  canManageAllUsers: boolean;
  canAssignAdmins: boolean;
  canAccessAdminPanel: boolean;
}

/** Current user's role and owner-level permissions. */
export function useUserRole() {
  const { role, isOwner, loading } = useAuth();

  const permissions: UserPermissions = {
    role,
    canCreateApps: isOwner,
    canManageAllUsers: isOwner,
    canAssignAdmins: isOwner,
    canAccessAdminPanel: isOwner,
  };

  return { role, permissions, loading, isOwner };
}

/** Single-tenant access check (appId kept for backward compatibility). */
export function useAppAccess(_appId?: string) {
  const { user, role, loading } = useAuth();
  const editor = role === 'owner' || role === 'editor';

  return {
    hasAccess: !!user && role !== 'none',
    accessRole: role,
    canEdit: editor,
    canManageTeam: role === 'owner',
    canSendPush: editor || role === 'sender',
    canViewAnalytics: editor,
    canViewUsers: editor,
    loading,
    refetch: () => {},
  };
}
