import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

/**
 * Admin sign-in page with client branding.
 * No public sign-up - access is invite-only.
 * First-owner setup when no users exist.
 */
export default function AdminSignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [fullName, setFullName] = useState('');

  const { user, signIn, signUp } = useAuth();
  const { settings, loading: settingsLoading } = useAppSettings();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the intended destination (for deep links)
  const from = (location.state as {from?: string;})?.from || '/admin';

  // Redirect if already signed in
  useEffect(() => {
    if (user && !loading) {
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, from]);

  // Check if this is first-time setup (no users exist)
  useEffect(() => {
    const checkFirstSetup = async () => {
      if (!supabase) {
        setCheckingSetup(false);
        return;
      }

      // Setup is done once the app record exists (profiles are no longer publicly readable)
      const { count } = await supabase.
      from('apps').
      select('id', { count: 'exact', head: true });

      setIsFirstSetup(count === 0);
      setCheckingSetup(false);
    };

    checkFirstSetup();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isFirstSetup) {
        // First owner setup - the server makes the very first account the owner
        const { error: signUpError } = await signUp(email, password, fullName);
        if (signUpError) throw signUpError;

        navigate('/admin', { replace: true });
      } else {
        // Normal sign in
        const { error: signInError } = await signIn(email, password);
        if (signInError) throw signInError;
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      if (message.includes('Invalid login credentials')) {
        setError('Invalid email or password');
      } else if (message.includes('Email not confirmed')) {
        setError('Please check your email to confirm your account');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }
    if (!supabase) return;

    setLoading(true);
    setError('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setError('');
      alert('Password reset email sent. Please check your inbox.');
    }
    setLoading(false);
  };

  if (settingsLoading || checkingSetup) {
    return (
      <div data-ev-id="ev_ab9b2e5821" className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>);

  }

  return (
    <div data-ev-id="admin_signin" className="min-h-screen bg-background flex items-center justify-center p-4">
      <div data-ev-id="ev_a234da63e9" className="w-full max-w-md">
        {/* Client Logo & Name */}
        <div data-ev-id="ev_b079ec0545" className="flex items-center justify-center gap-3 mb-8">
          {settings?.icon_url ?
          <img data-ev-id="ev_79794894a8"
          src={settings.icon_url}
          alt={settings.app_name || 'App'}
          className="w-12 h-12 rounded-[12px] object-cover" /> :


          <div data-ev-id="ev_905c6090c9"
          className="w-12 h-12 rounded-[12px] flex items-center justify-center text-white text-xl font-display font-bold"
          style={{ backgroundColor: settings?.primary_color ?? '#B8956B' }}>

              {(settings?.app_name ?? 'A').charAt(0).toUpperCase()}
            </div>
          }
          <span data-ev-id="ev_e0048201d0" className="text-2xl font-display font-bold text-text">
            {settings?.app_name || 'Admin'}
          </span>
        </div>

        {/* Card */}
        <div data-ev-id="ev_b193d51949" className="bg-card border border-border rounded-[16px] p-8">
          <h2 data-ev-id="ev_b256b723a3" className="text-[26px] font-display font-bold text-text text-center mb-2 tracking-tight">
            {isFirstSetup ? 'Create Owner Account' : 'Sign In'}
          </h2>
          <p data-ev-id="ev_61bca4ab63" className="text-text-secondary text-center mb-6">
            {isFirstSetup ?
            'Set up the first owner account for this app' :
            'Access the management dashboard'
            }
          </p>

          <form data-ev-id="ev_4046386431" onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isFirstSetup &&
            <div data-ev-id="ev_e0880ab48b">
                <label data-ev-id="ev_fb671c405d" className="block text-sm font-medium text-text mb-1.5">Full Name</label>
                <input data-ev-id="ev_c0061dbf01"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-input border border-border rounded-[10px] px-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
              placeholder="Your name"
              required />

              </div>
            }

            <div data-ev-id="ev_e82aa5b44d">
              <label data-ev-id="ev_3facbfb4f4" className="block text-sm font-medium text-text mb-1.5">Email</label>
              <div data-ev-id="ev_7df291deb2" className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input data-ev-id="ev_4ddf416cce"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-input border border-border rounded-[10px] pl-10 pr-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                placeholder="you@example.com"
                required />

              </div>
            </div>

            <div data-ev-id="ev_1a4ebe6fff">
              <label data-ev-id="ev_0d55c54d2f" className="block text-sm font-medium text-text mb-1.5">Password</label>
              <div data-ev-id="ev_84caa69f70" className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input data-ev-id="ev_2baf00329c"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-input border border-border rounded-[10px] pl-10 pr-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                placeholder="••••••••"
                required
                minLength={6} />

              </div>
            </div>

            {error &&
            <div data-ev-id="ev_212da46400" className="bg-destructive/10 border border-destructive/20 rounded-[10px] p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p data-ev-id="ev_54dfa9ad02" className="text-sm text-destructive">{error}</p>
              </div>
            }

            <button data-ev-id="ev_648d6431cc"
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 px-4 rounded-[10px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-2 min-h-[44px]">

              {loading ?
              <Loader2 className="w-5 h-5 animate-spin" /> :

              <>
                  {isFirstSetup ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </>
              }
            </button>
          </form>

          {!isFirstSetup &&
          <div data-ev-id="ev_cfc3b007a8" className="mt-6 text-center">
              <button data-ev-id="ev_0569312b7d"
            onClick={handleForgotPassword}
            disabled={loading}
            className="text-text-secondary hover:text-link transition-colors text-sm">

                Forgot password?
              </button>
            </div>
          }
        </div>

        {/* Back to app link */}
        <div data-ev-id="ev_fd7672f950" className="mt-6 text-center">
          <Link data-ev-id="ev_f2edf98000"
          to="/"
          className="text-text-secondary hover:text-text transition-colors text-sm">

            ← Back to app
          </Link>
        </div>
      </div>
    </div>);

}