import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ApiUser as User, ApiError as AuthError } from '@/integrations/supabase/client';
import type { UserRole } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole;
  isOwner: boolean;
  // Backward compatibility alias
  isSuperAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const VALID_ROLES: UserRole[] = ['owner', 'editor', 'sender', 'none'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [role, setRole] = useState<UserRole>('none');

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthReady(true);
    });

    // Must stay synchronous: role is loaded in a separate effect.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const userId = user?.id ?? null;

  const loadRole = useCallback(async (id: string | null) => {
    if (!supabase || !id) {
      setRole('none');
      return;
    }
    setRoleLoading(true);
    const { data } = await supabase.from('profiles').select('role').eq('id', id).maybeSingle();
    const r = (data?.role ?? 'none') as UserRole;
    setRole(VALID_ROLES.includes(r) ? r : 'none');
    setRoleLoading(false);
  }, []);

  useEffect(() => {
    loadRole(userId);
  }, [userId, loadRole]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: { message: 'Database not connected' } as AuthError };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    if (!supabase) return { error: { message: 'Database not connected' } as AuthError };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    return { error };
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setRole('none');
  };

  const isOwner = role === 'owner';
  const loading = !authReady || roleLoading;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        role,
        isOwner,
        isSuperAdmin: isOwner,
        signIn,
        signUp,
        signOut,
        refreshRole: () => loadRole(userId),
      }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
