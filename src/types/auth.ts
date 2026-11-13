/**
 * Team roles. Enforced on the server (database policies + server functions).
 * - owner: everything, including team and settings
 * - editor: app content + notifications + stats
 * - sender: notifications only
 * - none: signed in but no admin access
 */
export type UserRole = 'owner' | 'editor' | 'sender' | 'none';

/** Where a role lands when it opens a page it can't use. */
export function homeForRole(role: UserRole): string {
  return role === 'sender' ? '/admin/notify' : '/admin/home';
}

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  sender: 'Sender',
  none: 'No access',
};
