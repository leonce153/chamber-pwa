import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldOff, LogOut } from 'lucide-react';
import { homeForRole, type UserRole } from '@/types/auth';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  /** Roles allowed on this page. Defaults to any team role. */
  allow?: UserRole[];
}

const ANY_TEAM_ROLE: UserRole[] = ['owner', 'editor', 'sender'];

/**
 * Protected route wrapper for admin pages.
 * Signed-out → sign in. No team role → no-access screen. Wrong role → their home page.
 * (Navigation only; the server enforces the same rules.)
 */
export function AdminProtectedRoute({ children, allow = ANY_TEAM_ROLE }: AdminProtectedRouteProps) {
  const { user, role, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div data-ev-id="ev_cfef7a00ae" className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>);
  }

  if (!user) {
    return <Navigate to="/admin/signin" state={{ from: location.pathname }} replace />;
  }

  if (role === 'none') {
    return (
      <div data-ev-id="no_access" className="min-h-screen bg-background flex items-center justify-center p-4">
        <div data-ev-id="no_access_card" className="w-full max-w-md bg-card border border-border rounded-[16px] p-8 text-center">
          <div data-ev-id="no_access_icon" className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <ShieldOff className="w-7 h-7 text-destructive" />
          </div>
          <h1 data-ev-id="no_access_title" className="text-[22px] font-display font-bold text-text mb-2 text-balance">No admin access</h1>
          <p data-ev-id="no_access_text" className="text-text-secondary mb-6 text-pretty">
            You're signed in as {user.email}, but this account hasn't been added to the team. Ask an owner to invite you.
          </p>
          <button data-ev-id="no_access_signout"
            onClick={() => signOut()}
            className="w-full bg-surface-raised hover:bg-border-strong text-text font-medium py-2.5 px-4 rounded-[10px] border border-border flex items-center justify-center gap-2 min-h-[44px]">
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>);
  }

  if (!allow.includes(role)) {
    return <Navigate to={homeForRole(role)} replace />;
  }

  return <>{children}</>;
}
