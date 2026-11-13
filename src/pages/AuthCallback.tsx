import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (!supabase) {
      navigate('/admin/signin', { replace: true });
      return;
    }

    // Keep the hash so the next page can read the token type
    if (hash.includes('type=recovery')) {
      navigate(`/admin/reset-password${hash}`, { replace: true });
      return;
    }
    if (hash.includes('type=invite') || hash.includes('type=magiclink')) {
      navigate(`/admin/accept-invite${hash}`, { replace: true });
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      navigate(session ? '/admin' : '/admin/signin', { replace: true });
    });
  }, [navigate]);

  return (
    <div data-ev-id="ev_894e8316c7" className="min-h-screen bg-background flex items-center justify-center">
      <div data-ev-id="ev_3290595281" className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p data-ev-id="ev_a65917732f" className="text-muted">Authenticating...</p>
      </div>
    </div>);

}