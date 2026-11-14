import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  History as HistoryIcon,
  LogIn,
  LogOut,
  Cpu,
  ChevronRight,
} from 'lucide-react';
import { HealthData, UserProfile } from '../services/api';

interface SidebarProps {
  currentPage: 'dashboard' | 'upload' | 'result' | 'history';
  onNavigate: (page: 'dashboard' | 'upload' | 'result' | 'history') => void;
  health: HealthData | null;
  hasResult: boolean;
  user: UserProfile | null;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  health,
  hasResult,
  user,
  onOpenLogin,
  onLogout,
}) => {
  const isHealthy = health?.status === 'healthy';
  const deviceName = health?.device || 'CPU';

  return (
    <aside className="w-[260px] flex-shrink-0 bg-sidebar border-r border-white/[0.06] flex flex-col justify-between h-screen sticky top-0 select-none z-30">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              {/* Hexagon crack glyph logo */}
              <div className="w-7 h-7 rounded-lg bg-surface border border-white/[0.08] flex items-center justify-center text-accent shadow-sm">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2l7.5 4.3v8.7L12 22 4.5 17V6.3L12 2z" />
                  <path d="M12 2v7" />
                  <path d="M12 9l3 2" />
                  <path d="M12 9l-3 4" />
                </svg>
              </div>
              <span className="font-semibold text-base tracking-tight text-text-primary">
                CrackSense
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-text-tertiary">
              v1.2
            </span>
          </div>
          <p className="text-[11px] text-text-tertiary mt-1.5 pl-0.5">
            Concrete inspection tool
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`w-full h-10 px-3 text-xs rounded-lg transition-all flex items-center justify-between group ${
              currentPage === 'dashboard'
                ? 'bg-accent-subtle text-text-primary font-medium border-l-2 border-accent rounded-l-none pl-2.5'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <LayoutDashboard
                className={`w-[18px] h-[18px] transition-colors ${
                  currentPage === 'dashboard' ? 'text-accent' : 'text-text-tertiary group-hover:text-text-secondary'
                }`}
              />
              <span>Dashboard</span>
            </div>
            {currentPage === 'dashboard' && (
              <ChevronRight className="w-3.5 h-3.5 text-accent opacity-80" />
            )}
          </button>

          <button
            onClick={() => onNavigate('upload')}
            className={`w-full h-10 px-3 text-xs rounded-lg transition-all flex items-center justify-between group ${
              currentPage === 'upload'
                ? 'bg-accent-subtle text-text-primary font-medium border-l-2 border-accent rounded-l-none pl-2.5'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <UploadCloud
                className={`w-[18px] h-[18px] transition-colors ${
                  currentPage === 'upload' ? 'text-accent' : 'text-text-tertiary group-hover:text-text-secondary'
                }`}
              />
              <span>Analyze</span>
            </div>
            {currentPage === 'upload' && (
              <ChevronRight className="w-3.5 h-3.5 text-accent opacity-80" />
            )}
          </button>

          <button
            onClick={() => onNavigate('history')}
            className={`w-full h-10 px-3 text-xs rounded-lg transition-all flex items-center justify-between group ${
              currentPage === 'history'
                ? 'bg-accent-subtle text-text-primary font-medium border-l-2 border-accent rounded-l-none pl-2.5'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <HistoryIcon
                className={`w-[18px] h-[18px] transition-colors ${
                  currentPage === 'history' ? 'text-accent' : 'text-text-tertiary group-hover:text-text-secondary'
                }`}
              />
              <span>History</span>
            </div>
            {currentPage === 'history' && (
              <ChevronRight className="w-3.5 h-3.5 text-accent opacity-80" />
            )}
          </button>

          {hasResult && (
            <button
              onClick={() => onNavigate('result')}
              className={`w-full h-10 px-3 text-xs rounded-lg transition-all flex items-center justify-between group ${
                currentPage === 'result'
                  ? 'bg-accent-subtle text-text-primary font-medium border-l-2 border-accent rounded-l-none pl-2.5'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <span className="w-2 h-2 rounded-full bg-accent" />
                <span>Current result</span>
              </div>
              <span className="text-[10px] font-mono text-accent bg-accent/15 px-1.5 py-0.5 rounded">
                Active
              </span>
            </button>
          )}
        </nav>
      </div>

      {/* Bottom Section: Backend Status & Inspector Profile */}
      <div className="p-4 border-t border-white/[0.06] text-xs space-y-3 bg-surface/30">
        {/* Device & Status Row */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isHealthy ? 'bg-emerald animate-status-pulse' : 'bg-amber animate-pulse'
              }`}
            />
            <span className="text-[11px] font-medium text-text-secondary">
              {health ? 'Backend online' : 'Connecting...'}
            </span>
          </div>

          <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-text-tertiary">
            <Cpu className="w-3 h-3 text-accent" />
            <span className="font-mono text-[10px] uppercase font-semibold text-text-secondary">
              {deviceName}
            </span>
          </div>
        </div>

        {/* User / Inspector Profile Button */}
        <div>
          {user ? (
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-white/[0.08] text-text-primary">
              <div className="truncate pr-1">
                <span className="block font-medium text-xs truncate">
                  {user.full_name || 'Field Inspector'}
                </span>
                <span className="block text-[10px] text-text-tertiary truncate">
                  {user.email}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="p-1 hover:bg-surface-hover rounded text-text-tertiary hover:text-accent transition"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="w-full py-2 px-3 bg-surface hover:bg-surface-hover border border-white/[0.08] hover:border-white/[0.16] text-text-primary text-xs font-medium rounded-lg flex items-center justify-between transition group"
            >
              <div className="flex items-center space-x-2">
                <LogIn className="w-3.5 h-3.5 text-text-tertiary group-hover:text-text-primary transition" />
                <span>Sign in</span>
              </div>
              <span className="text-[10px] text-text-tertiary font-mono">Inspector</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
