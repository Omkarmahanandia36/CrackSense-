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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white border border-zinc-300 rounded shadow-lg max-w-sm w-full p-5 space-y-4 text-zinc-800 animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <h2 className="text-sm font-semibold text-zinc-900">
            {isRegister ? 'Register inspector' : 'Inspector sign in'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-[#c92a2a] flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-zinc-600 block">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Engineer Name"
                className="w-full bg-white border border-zinc-300 rounded px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-zinc-600 block">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="inspector@agency.gov"
              className="w-full bg-white border border-zinc-300 rounded px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-zinc-600 block">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white border border-zinc-300 rounded px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#c92a2a] hover:bg-[#b02525] disabled:bg-zinc-300 text-white font-medium text-xs rounded transition mt-2 shadow-sm"
          >
            {loading ? 'Authenticating...' : isRegister ? 'Register & sign in' : 'Sign in'}
          </button>
        </form>

        <div className="pt-2 border-t border-zinc-100 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg(null);
            }}
            className="text-xs text-zinc-500 hover:text-zinc-800 hover:underline"
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
