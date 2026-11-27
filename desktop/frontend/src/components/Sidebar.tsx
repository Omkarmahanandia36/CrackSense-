import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  History as HistoryIcon,
  LogIn,
  LogOut,
  Cpu,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Sparkles,
  Shield,
  UserCog,
  RefreshCw,
} from 'lucide-react';
import { HealthData, UserProfile } from '../services/api';
import { UpdateStatus } from './UpdateStatus';

interface SidebarProps {
  currentPage: 'dashboard' | 'upload' | 'result' | 'history' | 'dev' | 'admin';
  onNavigate: (page: 'dashboard' | 'upload' | 'result' | 'history' | 'dev' | 'admin') => void;
  health: HealthData | null;
  hasResult: boolean;
  user: UserProfile | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenEditProfile?: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const NAV_ITEMS: {
  key: 'dashboard' | 'upload' | 'history';
  label: string;
  icon: React.ElementType;
}[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'upload',    label: 'Analyze',   icon: UploadCloud },
  { key: 'history',   label: 'History',   icon: HistoryIcon },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  health,
  hasResult,
  user,
  onOpenLogin,
  onLogout,
  onOpenEditProfile,
  collapsed,
  onToggleCollapse,
  theme,
  onToggleTheme,
}) => {
  const isHealthy = health?.status === 'healthy' || health?.status === 'ok';
  const isWakingUp = health?.status === 'waking_up' || health?.is_waking_up;
  const deviceName = health?.device ? health.device.toUpperCase() : 'CPU';

  return (
    <aside
      className="hidden md:flex glass-base flex-col select-none flex-shrink-0 transition-[width] duration-200 ease-out overflow-hidden"
      style={{ width: collapsed ? 64 : 230, minHeight: 0 }}
    >
      {/* ── Top Wordmark & Collapse Toggle ── */}
      <div
        className="flex items-center px-3.5 h-13 border-b flex-shrink-0"
        style={{
          borderColor: 'var(--glass-sunken-border)',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        {!collapsed ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo.png"
              alt="CrackSense Logo"
              className="w-6 h-6 rounded-md object-contain flex-shrink-0 shadow-sm"
            />
            <span
              className="font-semibold text-sm tracking-tight truncate"
              style={{ color: 'var(--text-1)' }}
            >
              CrackSense
            </span>
          </div>
        ) : (
          <img
            src="/logo.png"
            alt="CrackSense Logo"
            className="w-6 h-6 rounded-md object-contain cursor-pointer"
            onClick={onToggleCollapse}
            title="Expand sidebar"
          />
        )}
        {!collapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* ── Scrollable Nav Area (Prevents overlap on landscape screens) ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 min-h-0">
        <nav className="space-y-0.5">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const active = currentPage === key;
            return (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                className={`
                  w-full h-9 flex items-center gap-2.5 rounded-lg text-xs transition-colors cursor-pointer
                  ${collapsed ? 'justify-center px-0' : 'px-2.5'}
                  ${
                    active
                      ? 'bg-white/[0.08] text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }
                `}
                title={collapsed ? label : undefined}
              >
                <Icon
                  className="w-4 h-4 flex-shrink-0"
                  strokeWidth={active ? 2 : 1.6}
                  style={{ color: active ? 'var(--text-1)' : 'var(--text-3)' }}
                />
                {!collapsed && (
                  <span className="truncate">{label}</span>
                )}
              </button>
            );
          })}

          {/* Current result link (when active) */}
          {hasResult && (
            <button
              onClick={() => onNavigate('result')}
              className={`
                w-full h-9 flex items-center gap-2.5 rounded-lg text-xs transition-colors cursor-pointer
                ${collapsed ? 'justify-center px-0' : 'px-2.5'}
                ${
                  currentPage === 'result'
                    ? 'bg-white/[0.08] text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }
              `}
              title={collapsed ? 'Inspection Result' : undefined}
            >
              <Sparkles
                className="w-4 h-4 flex-shrink-0"
                strokeWidth={currentPage === 'result' ? 2 : 1.6}
                style={{ color: currentPage === 'result' ? 'var(--text-1)' : 'var(--text-3)' }}
              />
              {!collapsed && (
                <span className="truncate">Inspection Result</span>
              )}
            </button>
          )}

          {/* Admin Console Link (for admin users) */}
          {user?.role === 'admin' && (
            <button
              onClick={() => onNavigate('admin')}
              className={`
                w-full h-9 flex items-center gap-2.5 rounded-lg text-xs transition-colors cursor-pointer
                ${collapsed ? 'justify-center px-0' : 'px-2.5'}
                ${
                  currentPage === 'admin'
                    ? 'bg-amber-500/15 text-amber-200 font-medium'
                    : 'text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/10'
                }
              `}
              title={collapsed ? 'Admin Console' : undefined}
            >
              <Shield className="w-4 h-4 flex-shrink-0 text-amber-400" strokeWidth={1.6} />
              {!collapsed && (
                <span className="truncate">Admin Console</span>
              )}
            </button>
          )}
        </nav>
      </div>

      {/* ── Bottom Section: Health, Theme, User Profile & Version ── */}
      <div
        className="p-2.5 space-y-2 border-t flex-shrink-0"
        style={{ borderColor: 'var(--glass-sunken-border)' }}
      >
        {/* System Status Row */}
        <div className="space-y-1 px-1">
          <UpdateStatus />

          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-1.5 select-none min-w-0">
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  isHealthy ? 'animate-status-pulse' : 'animate-pulse'
                }`}
                style={{ background: isHealthy ? 'var(--success)' : 'var(--crack-amber)' }}
              />
              {!collapsed && (
                <span className="text-[11px] font-mono text-slate-400 truncate">
                  {isHealthy ? 'Online' : isWakingUp ? 'Waking...' : 'Connecting...'}
                </span>
              )}
            </div>

            {!collapsed && (
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium select-none"
                style={{
                  background: 'var(--glass-sunken-bg)',
                  border: '1px solid var(--glass-sunken-border)',
                  color: 'var(--text-3)',
                }}
              >
                <Cpu className="w-3 h-3 text-slate-400" strokeWidth={1.5} />
                <span>{deviceName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className={`w-full h-8 flex items-center gap-2 rounded-lg text-xs transition-colors hover:bg-white/[0.04] text-slate-400 hover:text-slate-200 cursor-pointer ${
            collapsed ? 'justify-center px-0' : 'px-2'
          }`}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5" strokeWidth={1.5} />
          ) : (
            <Moon className="w-3.5 h-3.5" strokeWidth={1.5} />
          )}
          {!collapsed && (
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          )}
        </button>

        {/* User profile / Sign in button */}
        {user ? (
          <div
            className="flex items-center gap-1.5 p-1.5 rounded-lg"
            style={{
              background: 'var(--glass-sunken-bg)',
              border: '1px solid var(--glass-sunken-border)',
            }}
          >
            {!collapsed && (
              <button
                type="button"
                onClick={onOpenEditProfile}
                className="flex-1 min-w-0 text-left hover:opacity-85 transition-opacity cursor-pointer px-1"
                title="Click to edit profile"
              >
                <span className="block text-xs font-medium truncate" style={{ color: 'var(--text-1)' }}>
                  {user.full_name || 'Inspector'}
                </span>
                <span className="block text-[10px] font-mono text-slate-400 truncate">
                  {user.email}
                </span>
              </button>
            )}
            {!collapsed && onOpenEditProfile && (
              <button
                onClick={onOpenEditProfile}
                className="p-1 rounded hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0 cursor-pointer"
                title="Edit profile"
              >
                <UserCog className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            )}
            <button
              onClick={onLogout}
              className="p-1 rounded hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0 cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className={`w-full h-8 flex items-center gap-2 rounded-lg text-xs transition-colors cursor-pointer ${
              collapsed ? 'justify-center px-0' : 'px-2.5'
            }`}
            style={{
              background: 'var(--glass-sunken-bg)',
              border: '1px solid var(--glass-sunken-border)',
              color: 'var(--text-2)',
            }}
          >
            <LogIn className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
            {!collapsed && <span>Sign in</span>}
          </button>
        )}

        {/* Version & Update check */}
        {!collapsed && (
          <div className="pt-0.5 flex items-center justify-between text-[10px] font-mono text-slate-500 px-1 select-none">
            <span>v{import.meta.env.APP_VERSION || '1.3.6'}</span>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('cracksense:check_updates'))}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Check for application updates"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Check update</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
