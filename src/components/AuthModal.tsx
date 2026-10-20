import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, Mail, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { loginGoogle, loginEmail, registerEmail } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await loginGoogle();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Google sign-in was cancelled or failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide an email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (isRegistering) {
        await registerEmail(email, password, displayName);
      } else {
        await loginEmail(email, password);
      }
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 max-w-sm w-full p-6 sm:p-8 rounded-sm shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-pink-600 font-semibold">
              Paper Dreams Cebu
            </div>
            <h3 className="text-xl font-serif-display font-medium text-neutral-900 mt-0.5">
              {isRegistering ? 'Create Studio Account' : 'Sign In to Studio'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-900"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* 1-Click Google Sign-In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-white border border-neutral-300 hover:border-neutral-900 text-neutral-900 rounded-sm text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors shadow-xs disabled:opacity-50"
        >
          {/* Official Google 'G' icon */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <div className="h-px bg-neutral-200 flex-1" />
          <span>or with email</span>
          <div className="h-px bg-neutral-200 flex-1" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3.5">
          {isRegistering && (
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-neutral-700 mb-1">
                Organizer / Studio Name
              </label>
              <input
                type="text"
                placeholder="e.g. Vance Photography"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full p-2 text-xs bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-neutral-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="organizer@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 text-xs bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-neutral-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 text-xs bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-semibold uppercase tracking-wider rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isRegistering ? 'Register Studio Account' : 'Sign In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Sign-In / Register */}
        <div className="pt-2 text-center text-xs text-neutral-500">
          {isRegistering ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className="text-neutral-900 font-semibold underline"
              >
                Sign in
              </button>
            </p>
          ) : (
            <p>
              New organizer?{' '}
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className="text-neutral-900 font-semibold underline"
              >
                Create an account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
