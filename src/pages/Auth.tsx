import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { Zap, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-ev-id="ev_7a517537fe" className="min-h-screen bg-background flex items-center justify-center p-4">
      <div data-ev-id="ev_439845e3d5" className="w-full max-w-md">
        {/* Logo */}
        <div data-ev-id="ev_4231d640d2" className="flex items-center justify-center gap-2.5 mb-8">
          <div data-ev-id="ev_98bcd98b28" className="w-10 h-10 bg-primary rounded-[10px] flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span data-ev-id="ev_299aa7981e" className="text-2xl font-display font-bold text-text">AppForge</span>
        </div>

        {/* Card */}
        <div data-ev-id="ev_d6f808adf3" className="bg-card border border-border rounded-[16px] p-8">
          <h2 data-ev-id="ev_21e319be2d" className="text-[26px] font-display font-bold text-text text-center mb-2 tracking-tight">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>
          <p data-ev-id="ev_a37c6d107d" className="text-text-secondary text-center mb-6">
            {isLogin ? 'Sign in to manage your apps' : 'Start building amazing apps today'}
          </p>

          <form data-ev-id="ev_a38408982b" onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin &&
            <div data-ev-id="ev_f799ffaa91">
                <label data-ev-id="ev_35c0eac5da" className="block text-sm font-medium text-text mb-1.5">Full Name</label>
                <div data-ev-id="ev_e163a53acb" className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                  <input data-ev-id="ev_d1a06c8358"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-input border border-border rounded-[10px] pl-10 pr-4 py-2.5 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px]"
                placeholder="John Doe" />

                </div>
              </div>
            }

            <div data-ev-id="ev_707b6092a7">
              <label data-ev-id="ev_e2806a3ff1" className="block text-sm font-medium text-text mb-1.5">Email</label>
              <div data-ev-id="ev_1bdeb6a1d4" className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input data-ev-id="ev_a7885bda2a"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-input border border-border rounded-[10px] pl-10 pr-4 py-2.5 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px]"
                placeholder="you@example.com"
                required />

              </div>
            </div>

            <div data-ev-id="ev_ceee366e47">
              <label data-ev-id="ev_05086d611e" className="block text-sm font-medium text-text mb-1.5">Password</label>
              <div data-ev-id="ev_8b7cbe50bd" className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input data-ev-id="ev_c28f2946c2"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-input border border-border rounded-[10px] pl-10 pr-4 py-2.5 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px]"
                placeholder="••••••••"
                required
                minLength={6} />

              </div>
            </div>

            {error &&
            <div data-ev-id="ev_de9caa5ebf" className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-destructive text-sm">
                {error}
              </div>
            }

            <button data-ev-id="ev_87ae3007a8"
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 px-4 rounded-[10px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2 min-h-[44px]">

              {loading ?
              <Loader2 className="w-5 h-5 animate-spin" /> :

              <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              }
            </button>
          </form>

          <div data-ev-id="ev_d751efbfb4" className="mt-6 text-center">
            <button data-ev-id="ev_792b69bf08"
            onClick={() => setIsLogin(!isLogin)}
            className="text-text-secondary hover:text-text transition-colors text-sm">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <span data-ev-id="ev_52f715738a" className="text-link font-medium">
                {isLogin ? 'Sign up' : 'Sign in'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>);

}