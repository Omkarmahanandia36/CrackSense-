import React, { useState } from 'react';
import {
  LayoutDashboard,
  Camera,
  History as HistoryIcon,
  Eye,
  Shield,
  Sun,
  Moon,
  LogIn,
  LogOut,
  User,
  Sparkles,
} from 'lucide-react';
import { HealthData, UserProfile } from '../services/api';
import { UpdateStatus } from './UpdateStatus';

interface MobileNavProps {
  currentPage: 'dashboard' | 'upload' | 'result' | 'history' | 'dev' | 'admin';
  onNavigate: (page: 'dashboard' | 'upload' | 'result' | 'history' | 'dev' | 'admin') => void;
  health: HealthData | null;
  hasResult: boolean;
  user: UserProfile | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const MobileHeader: React.FC<MobileNavProps> = ({
  health,
  user,
  onOpenLogin,
  onLogout,
  theme,
  onToggleTheme,
  onNavigate,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const isHealthy = health?.status === 'healthy';
  const deviceName = health?.device ? health.device.toUpperCase() : 'CPU';

  return (
    <header className="md:hidden sticky top-0 z-40 w-full pt-safe px-4 py-2.5 bg-[#06141B]/85 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
      {/* Brand Logo & Name */}
      <div
        onClick={() => onNavigate('dashboard')}
        className="flex items-center gap-2 cursor-pointer active:opacity-80"
      >
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: 'var(--accent)' }}
        />
        <span
          className="font-semibold text-base tracking-tight"
          style={{ color: 'var(--text-1)' }}
        >
          CrackSense
        </span>

        {/* Backend health pill */}
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono ml-1"
          style={{
            background: isHealthy ? 'var(--success-tint)' : 'rgba(255, 159, 10, 0.12)',
            color: isHealthy ? 'var(--success)' : 'var(--warning)',
            border: `1px solid ${isHealthy ? 'rgba(48, 209, 88, 0.25)' : 'rgba(255, 159, 10, 0.25)'}`,
          }}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'animate-status-pulse' : ''}`}
            style={{ background: isHealthy ? 'var(--success)' : 'var(--warning)' }}
          />
          <span>{isHealthy ? deviceName : 'Connecting'}</span>
        </div>
      </div>

      {/* Action Buttons: Update Indicator, Theme Toggle & User Auth */}
      <div className="flex items-center gap-1.5">
        <UpdateStatus />

        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl text-xs transition-colors hover:bg-white/10 active:scale-95"
          style={{ color: 'var(--text-2)' }}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu((p) => !p)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border border-white/10 transition-all active:scale-95"
              style={{ background: 'var(--glass-sunken-bg)', color: 'var(--text-1)' }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {(user.full_name || user.email)[0].toUpperCase()}
              </div>
              <span className="max-w-[70px] truncate text-[11px]">
                {user.full_name?.split(' ')[0] || user.email.split('@')[0]}
              </span>
            </button>

            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div
                  className="absolute right-0 mt-2 w-48 py-1.5 px-1 rounded-2xl border border-white/15 shadow-2xl z-50 animate-fade-rise"
                  style={{ background: '#0B1720', backdropFilter: 'blur(20px)' }}
                >
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="text-xs font-medium text-white truncate">{user.full_name || 'Inspector'}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{user.email}</p>
                    {user.role === 'admin' && (
                      <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-300">
                        ADMIN
                      </span>
                    )}
                  </div>

                  {user.role === 'admin' && (
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onNavigate('admin');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-left"
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>Admin Console</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-transform active:scale-95 shadow-sm"
            style={{
              background: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
            }}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};

export const MobileBottomBar: React.FC<MobileNavProps> = ({
  currentPage,
  onNavigate,
  hasResult,
  user,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#06141B]/90 backdrop-blur-2xl border-t border-white/10 pb-safe px-3 pt-1.5 flex items-center justify-around shadow-2xl">
      {/* 1. Dashboard Tab */}
      <button
        onClick={() => onNavigate('dashboard')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
          currentPage === 'dashboard'
            ? 'text-cyan-400'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <LayoutDashboard className="w-5 h-5" strokeWidth={currentPage === 'dashboard' ? 2.2 : 1.7} />
        <span className="text-[10px] font-medium mt-0.5">Overview</span>
      </button>

      {/* 2. Primary Scan / Camera Center Pill */}
      <button
        onClick={() => onNavigate('upload')}
        className="flex flex-col items-center justify-center -mt-5 group"
      >
        <div
          className="w-13 h-13 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-90"
          style={{
            background: currentPage === 'upload'
              ? 'var(--accent)'
              : 'linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)',
            boxShadow: '0 4px 16px rgba(10, 132, 255, 0.4)',
            color: '#FFFFFF',
          }}
        >
          <Camera className="w-6 h-6" strokeWidth={2.2} />
        </div>
        <span
          className="text-[10px] font-semibold mt-1"
          style={{ color: currentPage === 'upload' ? 'var(--accent)' : 'var(--text-1)' }}
        >
          Scan
        </span>
      </button>

      {/* 3. History Tab */}
      <button
        onClick={() => onNavigate('history')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
          currentPage === 'history'
            ? 'text-cyan-400'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <HistoryIcon className="w-5 h-5" strokeWidth={currentPage === 'history' ? 2.2 : 1.7} />
        <span className="text-[10px] font-medium mt-0.5">History</span>
      </button>

      {/* 4. Result Tab (only if inspection result exists) or Admin */}
      {hasResult && (
        <button
          onClick={() => onNavigate('result')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            currentPage === 'result'
              ? 'text-cyan-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Eye className="w-5 h-5" strokeWidth={currentPage === 'result' ? 2.2 : 1.7} />
          <span className="text-[10px] font-medium mt-0.5">Result</span>
        </button>
      )}

      {user?.role === 'admin' && !hasResult && (
        <button
          onClick={() => onNavigate('admin')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            currentPage === 'admin'
              ? 'text-amber-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-5 h-5" strokeWidth={currentPage === 'admin' ? 2.2 : 1.7} />
          <span className="text-[10px] font-medium mt-0.5">Admin</span>
        </button>
      )}
    </nav>
  );
};
