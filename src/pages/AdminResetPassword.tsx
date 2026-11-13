import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { supabase } from '@/integrations/supabase/client';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Lock, ArrowRight, Loader2, AlertCircle, Check } from 'lucide-react';

/**
 * Password reset page for admin users.
 */
export default function AdminResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);

  const { settings, loading: settingsLoading } = useAppSettings();
  const navigate = useNavigate();

  // Check for valid recovery token in URL hash
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    const errorCode = hashParams.get('error_code');

    if (errorCode) {
      setError('This password reset link has expired. Please request a new one.');
      setCheckingToken(false);
      return;
    }

    if (accessToken && type === 'recovery') {
      setValidToken(true);
    }
    setCheckingToken(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!supabase) {
      setError('Database not connected');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/admin/signin', { replace: true }), 2000);
    }
    setLoading(false);
  };

  if (settingsLoading || checkingToken) {
    return (
      <div data-ev-id="ev_c480afc96c" className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>);

  }

  return (
    <div data-ev-id="ev_e2fb0b4aea" className="min-h-screen bg-background flex items-center justify-center p-4">
      <div data-ev-id="ev_b2add0e3e8" className="w-full max-w-md">
        {/* Client Logo & Name */}
        <div data-ev-id="ev_9e6df16365" className="flex items-center justify-center gap-3 mb-8">
          {settings?.icon_url ?
          <img data-ev-id="ev_902921934a"
          src={settings.icon_url}
          alt={settings.app_name || 'App'}
          className="w-12 h-12 rounded-[12px] object-cover" /> :


          <div data-ev-id="ev_7027b91b2d"
          className="w-12 h-12 rounded-[12px] flex items-center justify-center text-white text-xl font-display font-bold"
          style={{ backgroundColor: settings?.primary_color ?? '#B8956B' }}>

              {(settings?.app_name ?? 'A').charAt(0).toUpperCase()}
            </div>
          }
          <span data-ev-id="ev_79bafa1a7f" className="text-2xl font-display font-bold text-text">
            {settings?.app_name || 'Admin'}
          </span>
        </div>

        {/* Card */}
        <div data-ev-id="ev_04b5448590" className="bg-card border border-border rounded-[16px] p-8">
          {success ?
          <div data-ev-id="ev_e7cfbbaffe" className="text-center">
              <div data-ev-id="ev_d4fbe16e44" className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-success" />
              </div>
              <h2 data-ev-id="ev_f4d858ad27" className="text-[22px] font-display font-bold text-text mb-2">Password Updated</h2>
              <p data-ev-id="ev_7fb897f5e2" className="text-text-secondary">Redirecting to sign in...</p>
            </div> :
          !validToken ?
          <div data-ev-id="ev_48f419aaaf" className="text-center">
              <div data-ev-id="ev_fc78e095a3" className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2 data-ev-id="ev_ed7d28c4e7" className="text-[22px] font-display font-bold text-text mb-2">Invalid Link</h2>
              <p data-ev-id="ev_dc682fa234" className="text-text-secondary mb-6">{error || 'This password reset link is invalid or has expired.'}</p>
              <Link data-ev-id="ev_2112bc961e"
            to="/admin/signin"
            className="inline-block bg-primary hover:bg-primary-hover text-white font-medium px-6 py-3 rounded-[10px] transition-colors">

                Back to Sign In
              </Link>
            </div> :

          <>
              <h2 data-ev-id="ev_e518c36ac8" className="text-[26px] font-display font-bold text-text text-center mb-2 tracking-tight">
                Reset Password
              </h2>
              <p data-ev-id="ev_6a0265136a" className="text-text-secondary text-center mb-6">
                Enter your new password
              </p>

              <form data-ev-id="ev_58efe1f42d" onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div data-ev-id="ev_2c823d5e0c">
                  <label data-ev-id="ev_d1ad2d5e42" className="block text-sm font-medium text-text mb-1.5">New Password</label>
                  <div data-ev-id="ev_b32c0da25d" className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                    <input data-ev-id="ev_f0a9ded942"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-input border border-border rounded-[10px] pl-10 pr-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                  placeholder="••••••••"
                  required
                  minLength={6} />

                  </div>
                </div>

                <div data-ev-id="ev_5a9969f348">
                  <label data-ev-id="ev_ee4ff2a95b" className="block text-sm font-medium text-text mb-1.5">Confirm Password</label>
                  <div data-ev-id="ev_d195db320b" className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                    <input data-ev-id="ev_43bcee9fcc"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-input border border-border rounded-[10px] pl-10 pr-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                  placeholder="••••••••"
                  required
                  minLength={6} />

                  </div>
                </div>

                {error &&
              <div data-ev-id="ev_c86e5c8a8b" className="bg-destructive/10 border border-destructive/20 rounded-[10px] p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <p data-ev-id="ev_4394617db2" className="text-sm text-destructive">{error}</p>
                  </div>
              }

                <button data-ev-id="ev_9a7f4e0784"
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 px-4 rounded-[10px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-2 min-h-[44px]">

                  {loading ?
                <Loader2 className="w-5 h-5 animate-spin" /> :

                <>
                      Update Password
                      <ArrowRight className="w-4 h-4" />
                    </>
                }
                </button>
              </form>
            </>
          }
        </div>
      </div>
    </div>);

}