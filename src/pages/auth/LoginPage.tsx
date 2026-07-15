import { useState } from 'react';
import { Eye, EyeOff, Loader2, LogIn, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../lib/supabase';

interface LoginPageProps {
  onNavigate: (page: string) => void;
  showBackButton?: boolean;
}

export default function LoginPage({ onNavigate, showBackButton = false }: LoginPageProps) {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error, role } = await signIn(identifier, password);

    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    if (role) {
      navigateToPortal(role);
    }
    setLoading(false);
  };

  const navigateToPortal = (role: UserRole) => {
    switch (role) {
      case 'admin':
        onNavigate('admin-portal');
        break;
      case 'fan':
        onNavigate('fan-portal');
        break;
      case 'team_manager':
        onNavigate('team-portal');
        break;
      case 'media':
        onNavigate('media-portal');
        break;
      default:
        onNavigate('home');
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back Button */}
        {showBackButton && (
          <button
            onClick={() => onNavigate('home')}
            className="absolute top-8 left-8 flex items-center gap-2 text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-bold">Back to Home</span>
          </button>
        )}

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6">
            <img src="/kicklive-icon.png" alt="KickLive" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">
            Welcome Back
          </h1>
          <p className="text-white/40 text-sm mt-2">Sign in to KickLive Portal</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="glass rounded-3xl p-8 space-y-6">
          {error && (
            <div className="bg-brand-red/10 border border-brand-red/30 text-brand-red px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-white/40">
              Username or Email
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter username or email"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-brand-green/50 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-white/40">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-brand-green/50 transition-colors pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-green text-black font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <LogIn size={20} />
                Sign In
              </>
            )}
          </button>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => onNavigate('forgot-password')}
              className="text-[10px] text-brand-blue font-bold hover:underline"
            >
              Forgot Password?
            </button>
            {showBackButton && (
              <button
                type="button"
                onClick={() => window.history.back()}
                className="text-[10px] text-white/40 font-bold hover:text-white transition-colors flex items-center gap-1"
              >
                <ArrowLeft size={12} /> Back
              </button>
            )}
          </div>

          <div className="text-center pt-4 border-t border-white/10">
            <p className="text-white/40 text-sm">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => onNavigate('signup')}
                className="text-brand-green font-bold hover:underline"
              >
                Sign Up
              </button>
            </p>
          </div>
        </form>

        {/* Role Info */}
        <div className="mt-8 glass-light rounded-2xl p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">
            Portal Access
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-green"></div>
              <span className="text-white/60">Admin Portal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-blue"></div>
              <span className="text-white/60">Fan Portal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span className="text-white/60">Team Manager</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <span className="text-white/60">Media Portal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
