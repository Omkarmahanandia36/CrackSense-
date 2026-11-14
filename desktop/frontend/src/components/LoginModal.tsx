import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { loginUser, registerUser, UserProfile } from '../services/api';

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-white/[0.1] rounded-xl shadow-diffuse max-w-sm w-full p-6 space-y-5 text-text-primary animate-fade-rise">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
          <h2 className="text-sm font-semibold text-text-primary">
            {isRegister ? 'Register inspector profile' : 'Field inspector sign in'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-text-tertiary hover:text-text-primary rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-accent/15 border border-accent/25 rounded-lg text-xs text-text-primary flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-accent flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-text-secondary block">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Structural Engineer Name"
                className="w-full bg-[#080B10] border border-white/[0.08] focus:border-accent rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none transition"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-text-secondary block">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="inspector@agency.gov"
              className="w-full bg-[#080B10] border border-white/[0.08] focus:border-accent rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none transition"
            />
          </div>

          <div className="space-y-1">
            <label className="text-text-secondary block">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#080B10] border border-white/[0.08] focus:border-accent rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-accent to-[#B64A34] hover:shadow-[0_0_15px_rgba(200,85,61,0.35)] disabled:opacity-50 text-white font-medium text-xs rounded-lg transition shadow-sm mt-2"
          >
            {loading ? 'Authenticating...' : isRegister ? 'Register & sign in' : 'Sign in'}
          </button>
        </form>

        <div className="pt-2 border-t border-white/[0.06] text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg(null);
            }}
            className="text-xs text-text-tertiary hover:text-text-secondary hover:underline transition"
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
