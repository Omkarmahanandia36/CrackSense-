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
  UserCog,
  RefreshCw,
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
  onOpenEditProfile?: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isScrolled?: boolean;
  scrollProgress?: number;
}

export const MobileHeader: React.FC<MobileNavProps> = ({
  health,
  user,
  onOpenLogin,
  onLogout,
  onOpenEditProfile,
  theme,
  onToggleTheme,
  onNavigate,
  isScrolled = false,
  scrollProgress = 0,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const isHealthy = health?.status === 'healthy' || health?.status === 'ok';
  const isWakingUp = health?.status === 'waking_up' || health?.is_waking_up;

  return (
    <>
      <header
        className={`md:hidden sticky top-0 z-40 w-full pt-safe px-3.5 py-2 transition-all duration-200 flex items-center justify-between ${
          isScrolled
            ? 'bg-[#080D12]/95 backdrop-blur-xl border-b border-white/[0.08] shadow-md shadow-black/40'
            : 'bg-[#080D12]/85 backdrop-blur-md border-b border-white/[0.06]'
        }`}
      >
        {/* Scroll Progress Micro-line */}
        {scrollProgress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-transparent overflow-hidden pointer-events-none">
            <div
              className="h-full bg-slate-300 dark:bg-slate-400 opacity-60 transition-all duration-150 ease-out"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
        )}

        {/* Brand Logo & Name */}
        <div
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 cursor-pointer active:opacity-80"
        >
          <img
            src="/logo.png"
            alt="CrackSense Logo"
            className="w-5 h-5 rounded object-contain shadow-sm flex-shrink-0"
          />
          <span
            className="font-semibold text-sm tracking-tight"
            style={{ color: 'var(--text-1)' }}
          >
            CrackSense
          </span>

          {/* Engine status indicator */}
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono ml-1 select-none pointer-events-none"
            style={{
              background: isHealthy ? 'var(--success-tint)' : 'rgba(245, 158, 11, 0.12)',
              color: isHealthy ? 'var(--success)' : 'var(--crack-amber)',
              border: `1px solid ${isHealthy ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
            }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'animate-status-pulse' : ''}`}
              style={{ background: isHealthy ? 'var(--success)' : 'var(--crack-amber)' }}
            />
            <span>{isHealthy ? 'Online' : isWakingUp ? 'Waking...' : 'Connecting...'}</span>
          </div>
        </div>

        {/* Action Buttons: Update Indicator, Theme Toggle & User Auth */}
        <div className="flex items-center gap-1">
          <UpdateStatus />

          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu((p) => !p)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border border-white/10 transition-colors hover:bg-white/[0.04]"
                style={{ background: 'var(--glass-sunken-bg)', color: 'var(--text-1)' }}
              >
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
                >
                  {(user.full_name || user.email)[0].toUpperCase()}
                </div>
                <span className="max-w-[64px] truncate text-[11px]">
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
                    className="absolute right-0 mt-1.5 w-48 py-1.5 px-1 rounded-xl border border-white/10 shadow-2xl z-50 animate-fade-rise"
                    style={{ background: '#0E1620', backdropFilter: 'blur(20px)' }}
                  >
                    <div className="px-3 py-2 border-b border-white/[0.08]">
                      <p className="text-xs font-medium text-white truncate">{user.full_name || 'Inspector'}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{user.email}</p>
                      {user.role === 'admin' && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-300">
                          ADMIN
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onOpenEditProfile?.();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors text-left cursor-pointer"
                    >
                      <UserCog className="w-3.5 h-3.5 text-slate-400" />
                      <span>Edit Profile</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        window.dispatchEvent(new CustomEvent('cracksense:check_updates'));
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors text-left cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                      <span>Check for Updates</span>
                    </button>

                    {user.role === 'admin' && (
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onNavigate('admin');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors text-left"
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
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left cursor-pointer"
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
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-text)',
              }}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>
    </>
  );
};

export const MobileBottomBar: React.FC<MobileNavProps> = ({
  currentPage,
  onNavigate,
  hasResult,
  user,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080D12]/92 backdrop-blur-xl border-t border-white/[0.08] pb-safe px-4 pt-1.5 flex items-center justify-around shadow-2xl">
      {/* 1. Overview Tab */}
      <button
        onClick={() => onNavigate('dashboard')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors cursor-pointer ${
          currentPage === 'dashboard'
            ? 'text-white font-medium'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <LayoutDashboard className="w-4.5 h-4.5" strokeWidth={currentPage === 'dashboard' ? 2 : 1.6} />
        <span className="text-[10px] mt-0.5">Overview</span>
      </button>

      {/* 2. Primary Tactile Scan Pill */}
      <button
        onClick={() => onNavigate('upload')}
        className="flex flex-col items-center justify-center -mt-4 cursor-pointer group"
      >
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg transition-all active:scale-95 ${
            currentPage === 'upload'
              ? 'bg-white text-slate-900 ring-2 ring-white/40'
              : 'bg-slate-100 text-slate-900 dark:bg-white dark:text-slate-900'
          }`}
        >
          <Camera className="w-5 h-5" strokeWidth={2} />
        </div>
        <span
          className="text-[10px] font-medium mt-1"
          style={{ color: currentPage === 'upload' ? 'var(--text-1)' : 'var(--text-3)' }}
        >
          Scan
        </span>
      </button>

      {/* 3. History Tab */}
      <button
        onClick={() => onNavigate('history')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors cursor-pointer ${
          currentPage === 'history'
            ? 'text-white font-medium'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <HistoryIcon className="w-4.5 h-4.5" strokeWidth={currentPage === 'history' ? 2 : 1.6} />
        <span className="text-[10px] mt-0.5">History</span>
      </button>

      {/* 4. Result Tab (only if result exists) or Admin */}
      {hasResult && (
        <button
          onClick={() => onNavigate('result')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors cursor-pointer ${
            currentPage === 'result'
              ? 'text-white font-medium'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Eye className="w-4.5 h-4.5" strokeWidth={currentPage === 'result' ? 2 : 1.6} />
          <span className="text-[10px] mt-0.5">Result</span>
        </button>
      )}

      {user?.role === 'admin' && !hasResult && (
        <button
          onClick={() => onNavigate('admin')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors cursor-pointer ${
            currentPage === 'admin'
              ? 'text-amber-300 font-medium'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4.5 h-4.5" strokeWidth={currentPage === 'admin' ? 2 : 1.6} />
          <span className="text-[10px] mt-0.5">Admin</span>
        </button>
      )}
    </nav>
  );
};
