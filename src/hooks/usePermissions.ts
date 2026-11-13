import { useAuth } from '@/contexts/AuthContext';

export interface Permissions {
  canEditSettings: boolean;
  canManageTeam: boolean;
  canPublish: boolean;
  canManageBilling: boolean;
  canEditContent: boolean;
  canSendNotifications: boolean;
  canViewAnalytics: boolean;
  canViewAudience: boolean;
}

/**
 * UI permissions by role. The server enforces the same rules;
 * this only decides what to show.
 */
export function usePermissions(): Permissions {
  const { role } = useAuth();
  const owner = role === 'owner';
  const editor = owner || role === 'editor';
  const sender = editor || role === 'sender';

  return {
    canEditSettings: owner,
    canManageTeam: owner,
    canPublish: owner,
    canManageBilling: owner,
    canEditContent: editor,
    canSendNotifications: sender,
    canViewAnalytics: editor,
    canViewAudience: editor,
  };
}
