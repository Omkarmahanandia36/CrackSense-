import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import { UserProfile } from '../services/api';
import {
  isSupabaseConfigured,
  signInWithSupabase,
  signUpWithSupabase,
  resetPasswordWithSupabase,
} from '../services/supabase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot';

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [identifier, setIdentifier] = useState(''); // Email or Phone Number
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const resetState = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setPassword('');
    setShowPassword(false);
  };

  const handleSwitchMode = (newMode: AuthMode) => {
    resetState();
    setMode(newMode);
  };

  // Convert identifier (handles phone numbers or emails)
  const getEmailOrFormattedIdentifier = (val: string): string => {
    const trimmed = val.trim();
    if (trimmed.includes('@')) return trimmed;
    // If phone number or numeric handle, format cleanly
    const digits = trimmed.replace(/[^0-9]/g, '');
    if (digits.length >= 7) {
      return `${digits}@phone.cracksense.internal`;
    }
    return `${trimmed.toLowerCase()}@cracksense.internal`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const emailToUse = getEmailOrFormattedIdentifier(identifier);

    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured. Please verify environment credentials.');
      }

      if (mode === 'forgot') {
        if (!identifier.trim()) {
          throw new Error('Please enter your email or account identifier.');
        }

        const res = await resetPasswordWithSupabase(emailToUse);
        if (!res.success) throw new Error(res.error || 'Failed to dispatch password reset link.');
        setSuccessMsg(res.message || 'Password reset link sent! Check your inbox.');
        return;
      }

      if (mode === 'signup') {
        const supaRes = await signUpWithSupabase(
          emailToUse,
          password,
          fullName.trim() || 'Inspector',
          identifier.trim()
        );

        if (!supaRes.success) throw new Error(supaRes.error || 'Registration failed in Supabase');

        if (supaRes.user) {
          const newUser: UserProfile = {
            id: supaRes.user.id,
            email: supaRes.user.email,
            full_name: supaRes.user.full_name || fullName.trim() || 'Inspector',
            role: supaRes.user.role || 'user',
            is_active: true,
            created_at: new Date().toISOString(),
          };

          if (supaRes.message) {
            setSuccessMsg(supaRes.message);
          } else {
            onLoginSuccess(newUser);
            onClose();
          }
        }
        return;
      }

      // --- SIGN IN FLOW ---
      const supaRes = await signInWithSupabase(emailToUse, password);
      if (!supaRes.success || !supaRes.user) {
        throw new Error(supaRes.error || 'Invalid credentials or user not found');
      }

      const authUser: UserProfile = {
        id: supaRes.user.id,
        email: supaRes.user.email,
        full_name: supaRes.user.full_name || 'Inspector',
        role: supaRes.user.role || 'user',
        is_active: true,
        created_at: new Date().toISOString(),
      };

      onLoginSuccess(authUser);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Frosted Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile Bottom Sheet / Desktop Centered Card matching Screenshot */}
      <div
        className="relative z-10 w-full max-w-md p-6 sm:p-8 bg-[#0b1720]/95 backdrop-blur-xl border border-white/10 shadow-2xl animate-fade-rise rounded-t-[28px] sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Sheet Grab Handle (Mobile UX) */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4" />

        {/* Top Header Row with Close / Back */}
        <div className="flex items-center justify-between mb-4">
          {mode === 'forgot' ? (
            <button
              type="button"
              onClick={() => handleSwitchMode('signin')}
              className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Sign In</span>
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Big Bold Title */}
        <h1 className="text-2xl font-bold tracking-tight text-white mb-6">
          {mode === 'signin' && 'Sign In'}
          {mode === 'signup' && 'Sign Up'}
          {mode === 'forgot' && 'Reset Password'}
        </h1>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl text-xs flex items-center gap-2 bg-red-500/15 border border-red-500/30 text-red-200 animate-fade-rise">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl text-xs flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 animate-fade-rise">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Fields matching the screenshot */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-white/60">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Inspector Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-12 bg-white/5 border border-white/15 focus:border-cyan-400 rounded-xl px-4 text-sm text-white placeholder:text-white/30 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Email / Phone Number field */}
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-white/60">
              Email/Phone Number
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="0942118181 or inspector@agency.gov"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full h-12 bg-white/5 border border-white/15 focus:border-cyan-400 rounded-xl px-4 text-sm text-white placeholder:text-white/30 outline-none transition-all"
              />
            </div>
          </div>

          {/* Password field with Eye Toggle */}
          {mode !== 'forgot' && (
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-white/60">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 bg-white/5 border border-white/15 focus:border-cyan-400 rounded-xl px-4 pr-11 text-sm text-white placeholder:text-white/30 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" strokeWidth={1.75} />
                  ) : (
                    <Eye className="w-5 h-5" strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Big Solid Cyan Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-semibold text-sm text-white bg-[#00A8CC] hover:bg-[#0092B3] active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              {loading
                ? 'Processing...'
                : mode === 'signin'
                ? 'Sign In'
                : mode === 'signup'
                ? 'Sign Up'
                : 'Send Reset Link'}
            </button>
          </div>

          {/* Forgot Password Link directly below the button */}
          {mode === 'signin' && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => handleSwitchMode('forgot')}
                className="text-sm font-medium text-[#00A8CC] hover:underline transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}
        </form>

        {/* Bottom Switcher: Don't have account yet? Sign Up */}
        <div className="mt-8 text-center text-xs text-white/60">
          {mode === 'signin' && (
            <span>
              Don't have account yet?{' '}
              <button
                type="button"
                onClick={() => handleSwitchMode('signup')}
                className="font-bold text-[#00A8CC] hover:underline"
              >
                Sign Up
              </button>
            </span>
          )}

          {mode === 'signup' && (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => handleSwitchMode('signin')}
                className="font-bold text-[#00A8CC] hover:underline"
              >
                Sign In
              </button>
            </span>
          )}

          {mode === 'forgot' && (
            <span>
              Remember password?{' '}
              <button
                type="button"
                onClick={() => handleSwitchMode('signin')}
                className="font-bold text-[#00A8CC] hover:underline"
              >
                Sign In
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
