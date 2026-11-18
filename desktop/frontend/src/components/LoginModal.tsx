import React, { useState } from 'react';
import { X, AlertCircle, Mail, Lock, User } from 'lucide-react';
import { loginUser, registerUser, UserProfile } from '../services/api';
import { Button, Input } from './ui';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (isRegister) {
        await registerUser(email, password, fullName || undefined);
      }
      const data = await loginUser(email, password);
      localStorage.setItem('cracksense_token', data.access_token);
      onLoginSuccess(data.user);
      onClose();
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

      {/* Centred minimal glass card over full gradient */}
      <div
        className="glass-raised relative z-10 w-full max-w-sm p-6 shadow-2xl animate-fade-rise space-y-5"
        style={{ borderRadius: 'var(--r-panel)' }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--glass-sunken-border)' }}>
          <h2 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
            {isRegister ? 'Create inspector profile' : 'Sign in'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[--hover-bg]"
            style={{ color: 'var(--text-3)' }}
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

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
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <Input
              label="Full name"
              leftIcon={User}
              placeholder="Structural Engineer Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
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

          <Input
            label="Password"
            leftIcon={Lock}
            type="password"
            required
            minLength={6}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
            >
              {loading ? 'Authenticating...' : isRegister ? 'Register & sign in' : 'Sign in'}
            </Button>
          </div>
        </form>

        {/* Toggle between register & sign in */}
        <div className="pt-2 border-t text-center" style={{ borderColor: 'var(--glass-sunken-border)' }}>
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg(null);
            }}
            className="text-xs transition-colors hover:underline"
            style={{ color: 'var(--text-3)' }}
          >
            {isRegister
              ? 'Already registered? Sign in'
              : 'New inspector? Create account'}
          </button>
        </div>
      </div>
    </div>
  );
};
