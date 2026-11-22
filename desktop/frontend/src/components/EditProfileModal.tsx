import React, { useState, useEffect } from 'react';
import { X, UserCog, CheckCircle2, AlertCircle, Shield, Mail, AtSign, Loader2 } from 'lucide-react';
import { UserProfile } from '../services/api';
import { updateUserProfile } from '../services/supabase';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onProfileUpdated: (updatedUser: UserProfile) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onProfileUpdated,
}) => {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [username, setUsername] = useState(
    (user as any)?.username || user?.email?.split('@')[0] || ''
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setUsername((user as any)?.username || user.email.split('@')[0] || '');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await updateUserProfile(String(user.id), {
        full_name: fullName.trim(),
        username: username.trim(),
      });

      if (!res.success || !res.profile) {
        throw new Error(res.error || 'Failed to update profile');
      }

      const updated: UserProfile = {
        id: user.id,
        email: res.profile.email || user.email,
        full_name: res.profile.full_name,
        role: res.profile.role,
        is_active: true,
        created_at: res.profile.created_at || user.created_at,
      };

      setSuccessMsg('Profile updated successfully!');
      onProfileUpdated(updated);

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Frosted Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        className="relative z-10 w-full max-w-md p-6 sm:p-7 bg-[#0b1720]/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl animate-fade-rise text-white"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Edit Profile</h2>
              <p className="text-[11px] text-slate-400 font-mono">Syncs across Supabase & devices</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl text-xs flex items-center gap-2 bg-red-500/15 border border-red-500/30 text-red-200 animate-fade-rise">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl text-xs flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 animate-fade-rise">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Read-only Email display */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-white/60 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Email Address (Primary Account)</span>
            </label>
            <input
              type="text"
              disabled
              value={user.email}
              className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-xs font-mono text-slate-400 cursor-not-allowed select-all"
            />
          </div>

          {/* Full Name input */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-white/70">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Arsh Rana"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-11 bg-white/5 border border-white/15 focus:border-cyan-400 rounded-xl px-4 text-xs text-white placeholder:text-white/30 outline-none transition-all"
            />
          </div>

          {/* Username / Handle input */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-white/70 flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5 text-cyan-400" />
              <span>Inspector Handle / Username</span>
            </label>
            <input
              type="text"
              placeholder="e.g. arsh_rana"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-11 bg-white/5 border border-white/15 focus:border-cyan-400 rounded-xl px-4 text-xs font-mono text-white placeholder:text-white/30 outline-none transition-all"
            />
          </div>

          {/* Role badge */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-300">Account Role</span>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {user.role || 'Inspector'}
            </span>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-medium text-slate-300 hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
