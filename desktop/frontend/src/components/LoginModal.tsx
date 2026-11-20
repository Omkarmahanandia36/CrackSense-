import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle2, Mail, Lock, User, AtSign, ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react';
import { loginUser, registerUser, UserProfile } from '../services/api';
import {
  isSupabaseConfigured,
  signInWithSupabase,
  signUpWithSupabase,
  resetPasswordWithSupabase,
} from '../services/supabase';
import { Button, Input } from './ui';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

type AuthMode = 'signin' | 'register' | 'forgot';

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'forgot') {
        // --- 1. FORGOT PASSWORD FLOW (Supabase) ---
        if (!email.trim()) {
          throw new Error('Please enter your email address to receive the password reset link.');
        }

        if (isSupabaseConfigured()) {
          const res = await resetPasswordWithSupabase(email.trim());
          if (!res.success) {
            throw new Error(res.error || 'Failed to send reset link.');
          }
          setSuccessMsg(res.message || 'Password reset link sent! Check your email inbox.');
        } else {
          setSuccessMsg('If an account exists with this email, password reset instructions have been dispatched.');
        }
        return;
      }

      if (mode === 'register') {
        // --- 2. REGISTRATION FLOW ---
        let registeredUser: UserProfile | null = null;

        // Try Supabase Auth first
        if (isSupabaseConfigured()) {
          const supaRes = await signUpWithSupabase(
            email.trim(),
            password,
            fullName.trim() || 'Inspector',
            username.trim() || undefined
          );

          if (!supaRes.success) {
            throw new Error(supaRes.error || 'Registration failed in Supabase');
          }

          if (supaRes.user) {
            registeredUser = {
              id: supaRes.user.id,
              email: supaRes.user.email,
              full_name: supaRes.user.full_name,
              is_active: true,
              created_at: new Date().toISOString(),
            };
          }

          if (supaRes.message) {
            setSuccessMsg(supaRes.message);
          }
        }

        // Also register with local backend if reachable
        try {
          await registerUser(email.trim(), password, fullName.trim() || undefined);
          const data = await loginUser(email.trim(), password);
          localStorage.setItem('cracksense_token', data.access_token);
          if (!registeredUser) registeredUser = data.user;
        } catch {
          // Local fallback handled smoothly
        }

        if (registeredUser) {
          onLoginSuccess(registeredUser);
          onClose();
        }
        return;
      }

      // --- 3. SIGN IN FLOW ---
      let authenticatedUser: UserProfile | null = null;

      if (isSupabaseConfigured()) {
        const supaRes = await signInWithSupabase(email.trim(), password);
        if (supaRes.success && supaRes.user) {
          authenticatedUser = {
            id: supaRes.user.id,
            email: supaRes.user.email,
            full_name: supaRes.user.full_name || supaRes.user.username || 'Inspector',
            is_active: true,
            created_at: new Date().toISOString(),
          };
        } else if (!supaRes.success && supaRes.error) {
          throw new Error(supaRes.error);
        }
      }

      // Also authenticate with local backend
      try {
        const localData = await loginUser(email.trim(), password);
        localStorage.setItem('cracksense_token', localData.access_token);
        if (!authenticatedUser) {
          authenticatedUser = localData.user;
        }
      } catch (localErr: any) {
        if (!authenticatedUser) {
          throw new Error(localErr.message || 'Invalid email or password.');
        }
      }

      if (authenticatedUser) {
        onLoginSuccess(authenticatedUser);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Frosted Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centred minimal glass card matching 6-swatch palette */}
      <div
        className="glass-raised relative z-10 w-full max-w-sm p-6 shadow-2xl animate-fade-rise space-y-4"
        style={{ borderRadius: 'var(--r-panel)' }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--glass-sunken-border)' }}>
          <div className="flex items-center gap-2">
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => handleSwitchMode('signin')}
                className="p-1 rounded-md transition-colors hover:bg-[--hover-bg]"
                style={{ color: 'var(--text-3)' }}
                title="Back to Sign In"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              </button>
            )}
            <h2 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
              {mode === 'signin' && 'Sign in to CrackSense'}
              {mode === 'register' && 'Create inspector account'}
              {mode === 'forgot' && 'Reset your password'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[--hover-bg]"
            style={{ color: 'var(--text-3)' }}
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Informational Subtitle for Forgot Mode */}
        {mode === 'forgot' && (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Enter your account email. We will send you a password recovery link directly via Supabase.
          </p>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div
            className="p-3 rounded-xl text-xs flex items-center gap-2 animate-fade-rise"
            style={{
              background: 'var(--crack-tint)',
              border: '1px solid rgba(255, 69, 58, 0.3)',
              color: 'var(--text-1)',
            }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--crack)' }} strokeWidth={1.5} />
            <span className="leading-tight">{errorMsg}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div
            className="p-3 rounded-xl text-xs flex items-center gap-2 animate-fade-rise"
            style={{
              background: 'rgba(48, 209, 88, 0.12)',
              border: '1px solid rgba(48, 209, 88, 0.35)',
              color: 'var(--text-1)',
            }}
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" strokeWidth={1.5} />
            <span className="leading-tight">{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <>
              <Input
                label="Full name"
                leftIcon={User}
                placeholder="Dr. Structural Engineer"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <Input
                label="Username / Handle (optional)"
                leftIcon={AtSign}
                placeholder="inspector_arsh"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </>
          )}

          <Input
            label="Email address"
            leftIcon={Mail}
            type="email"
            required
            placeholder="inspector@agency.gov"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {mode !== 'forgot' && (
            <div className="space-y-1">
              <div className="relative">
                <Input
                  label="Password"
                  leftIcon={Lock}
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-[34px] transition-colors hover:text-white"
                  style={{ color: 'var(--text-3)' }}
                  tabIndex={-1}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                  ) : (
                    <Eye className="w-4 h-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>

              {/* Forgot password link on sign-in */}
              {mode === 'signin' && (
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('forgot')}
                    className="text-[11px] transition-colors hover:underline"
                    style={{ color: 'var(--text-2)' }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full flex items-center justify-center gap-2"
              loading={loading}
            >
              {mode === 'forgot' && <KeyRound className="w-4 h-4" />}
              {loading
                ? mode === 'forgot'
                  ? 'Sending reset email...'
                  : 'Authenticating...'
                : mode === 'register'
                ? 'Create Account & Sign In'
                : mode === 'forgot'
                ? 'Send Password Reset Link'
                : 'Sign in'}
            </Button>
          </div>
        </form>

        {/* Bottom Mode Switchers */}
        <div className="pt-2 border-t text-center space-y-1.5" style={{ borderColor: 'var(--glass-sunken-border)' }}>
          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => handleSwitchMode('register')}
              className="text-xs transition-colors hover:underline"
              style={{ color: 'var(--text-2)' }}
            >
              Don't have an account? <span className="font-semibold" style={{ color: 'var(--text-1)' }}>Create one</span>
            </button>
          )}

          {mode === 'register' && (
            <button
              type="button"
              onClick={() => handleSwitchMode('signin')}
              className="text-xs transition-colors hover:underline"
              style={{ color: 'var(--text-2)' }}
            >
              Already registered? <span className="font-semibold" style={{ color: 'var(--text-1)' }}>Sign in</span>
            </button>
          )}

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => handleSwitchMode('signin')}
              className="text-xs transition-colors hover:underline"
              style={{ color: 'var(--text-2)' }}
            >
              Remember your password? <span className="font-semibold" style={{ color: 'var(--text-1)' }}>Back to sign in</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
