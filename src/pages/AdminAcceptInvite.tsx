import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { supabase } from '@/integrations/supabase/client';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, User as UserIcon, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

/**
 * Landing page for team invite links. The invited person picks their name and a password.
 */
export default function AdminAcceptInvite() {
  const { settings, loading: settingsLoading } = useAppSettings();
  const { refreshRole } = useAuth();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.substring(1));
    if (hash.get('error_code')) {
      setLinkError('This invite link has expired or was already used. Ask an owner to resend it.');
      setChecking(false);
      return;
    }
    if (!supabase) {
      setChecking(false);
      return;
    }
    // The auth client reads the token from the link and signs the person in.
    const timer = setTimeout(async () => {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) {
        setLinkError('This invite link is invalid or has expired. Ask an owner to resend it.');
      } else {
        setEmail(user.email ?? null);
        setFullName(user.user_metadata?.full_name as string ?? '');
      }
      setChecking(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    if (!supabase) return;

    setSaving(true);
    const { data, error: updateError } = await supabase.auth.updateUser({
      password,
      data: fullName.trim() ? { full_name: fullName.trim() } : undefined
    });
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }
    if (fullName.trim() && data.user) {
      await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', data.user.id);
    }
    await refreshRole();
    window.history.replaceState(null, '', window.location.pathname);
    navigate('/admin', { replace: true });
  };

  if (settingsLoading || checking) {
    return (
      <div data-ev-id="invite_loading" className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>);
  }

  const inputClass =
  'w-full bg-input border border-border rounded-[10px] pl-10 pr-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]';

  return (
    <div data-ev-id="accept_invite" className="min-h-screen bg-background flex items-center justify-center p-4">
      <div data-ev-id="invite_wrap" className="w-full max-w-md">
        <div data-ev-id="invite_brand" className="flex items-center justify-center gap-3 mb-8">
          {settings?.icon_url ?
          <img data-ev-id="invite_logo" src={settings.icon_url} alt={settings.app_name || 'App'} className="w-12 h-12 rounded-[12px] object-cover" /> :
          <div data-ev-id="invite_logo_fallback" className="w-12 h-12 rounded-[12px] flex items-center justify-center text-white text-xl font-display font-bold" style={{ backgroundColor: settings?.primary_color ?? '#B8956B' }}>
              {(settings?.app_name ?? 'A').charAt(0).toUpperCase()}
            </div>
          }
          <span data-ev-id="invite_app_name" className="text-2xl font-display font-bold text-text">{settings?.app_name || 'Admin'}</span>
        </div>

        <div data-ev-id="invite_card" className="bg-card border border-border rounded-[16px] p-8">
          {linkError ?
          <div data-ev-id="invite_error" className="text-center">
              <div data-ev-id="invite_error_icon" className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2 data-ev-id="invite_error_title" className="text-[22px] font-display font-bold text-text mb-2">Invite link problem</h2>
              <p data-ev-id="invite_error_text" className="text-text-secondary mb-6 text-pretty">{linkError}</p>
              <Link data-ev-id="invite_error_signin" to="/admin/signin" className="inline-block bg-primary hover:bg-primary-hover text-white font-medium px-6 py-3 rounded-[10px] transition-colors">
                Go to sign in
              </Link>
            </div> :

          <>
              <h2 data-ev-id="invite_title" className="text-[26px] font-display font-bold text-text text-center mb-2 tracking-tight">Join the team</h2>
              <p data-ev-id="invite_subtitle" className="text-text-secondary text-center mb-6 text-pretty">
                {email ? <>Set up your account for <span data-ev-id="ev_e0e481e023" className="text-text">{email}</span></> : 'Set up your account'}
              </p>

              <form data-ev-id="invite_form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div data-ev-id="invite_name_field">
                  <label data-ev-id="invite_name_label" className="block text-sm font-medium text-text mb-1.5">Your name</label>
                  <div data-ev-id="invite_name_wrap" className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                    <input data-ev-id="invite_name_input" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="Full name" />
                  </div>
                </div>
                <div data-ev-id="invite_pw_field">
                  <label data-ev-id="invite_pw_label" className="block text-sm font-medium text-text mb-1.5">Password</label>
                  <div data-ev-id="invite_pw_wrap" className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                    <input data-ev-id="invite_pw_input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="At least 8 characters" required minLength={8} />
                  </div>
                </div>
                <div data-ev-id="invite_confirm_field">
                  <label data-ev-id="invite_confirm_label" className="block text-sm font-medium text-text mb-1.5">Confirm password</label>
                  <div data-ev-id="invite_confirm_wrap" className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                    <input data-ev-id="invite_confirm_input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} placeholder="Repeat password" required minLength={8} />
                  </div>
                </div>

                {error &&
              <div data-ev-id="invite_form_error" className="bg-destructive/10 border border-destructive/20 rounded-[10px] p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <p data-ev-id="invite_form_error_text" className="text-sm text-destructive">{error}</p>
                  </div>
              }

                <button data-ev-id="invite_submit" type="submit" disabled={saving} className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 px-4 rounded-[10px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-2 min-h-[44px]">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Finish setup <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </>
          }
        </div>
      </div>
    </div>);
}