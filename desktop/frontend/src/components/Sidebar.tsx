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
} from 'lucide-react';
import { HealthData, UserProfile } from '../services/api';

interface SidebarProps {
  currentPage: 'dashboard' | 'upload' | 'result' | 'history' | 'dev' | 'admin';
  onNavigate: (page: 'dashboard' | 'upload' | 'result' | 'history' | 'dev' | 'admin') => void;
  health: HealthData | null;
  hasResult: boolean;
  user: UserProfile | null;
  onOpenLogin: () => void;
  onLogout: () => void;
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
  collapsed,
  onToggleCollapse,
  theme,
  onToggleTheme,
}) => {
  const isHealthy = health?.status === 'healthy';
  const deviceName = health?.device || 'CPU';

  return (
    <aside
      className="glass-base flex flex-col justify-between select-none flex-shrink-0 transition-[width] duration-200 ease-out overflow-hidden"
      style={{ width: collapsed ? 64 : 240, minHeight: 0 }}
    >
      {/* ── Top: Wordmark + Real App Nav ── */}
      <div className="flex flex-col min-h-0">
        {/* Brand Wordmark */}
        <div
          className="flex items-center px-5 h-14 border-b flex-shrink-0"
          style={{
            borderColor: 'var(--glass-sunken-border)',
            justifyContent: collapsed ? 'center' : 'space-between',
          }}
        >
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: 'var(--accent)' }}
              />
              <span
                className="font-semibold text-[15px] tracking-tight whitespace-nowrap"
                style={{ color: 'var(--text-1)' }}
              >
                CrackSense
              </span>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg transition-colors hover:bg-[--hover-bg] cursor-pointer"
            style={{ color: 'var(--text-3)' }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-[18px] h-[18px]" strokeWidth={1.5} />
            ) : (
              <PanelLeftClose className="w-[18px] h-[18px]" strokeWidth={1.5} />
            )}
          </button>
        </div>

        {/* Primary Navigation */}
        <nav className="p-2 space-y-1 flex-1 min-h-0">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const active = currentPage === key;
            return (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                className={`
                  w-full h-10 flex items-center gap-2.5 rounded-xl transition-all duration-150 cursor-pointer
                  ${collapsed ? 'justify-center px-0' : 'px-3'}
                  ${active ? 'font-medium' : 'hover:bg-[--hover-bg]'}
                `}
                style={{
                  background: active ? 'var(--accent-tint)' : undefined,
                }}
                title={collapsed ? label : undefined}
              >
                {/* Accent bar for active */}
                {active && !collapsed && (
                  <span
                    className="w-[2.5px] h-5 rounded-full flex-shrink-0"
                    style={{ background: 'var(--accent)' }}
                  />
                )}
                <Icon
                  className="w-[18px] h-[18px] flex-shrink-0"
                  strokeWidth={1.5}
                  style={{ color: active ? 'var(--accent)' : 'var(--text-3)' }}
                />
                {!collapsed && (
                  <span
                    className="text-[13px] whitespace-nowrap"
                    style={{ color: active ? 'var(--text-1)' : 'var(--text-2)' }}
                  >
                    {label}
                  </span>
                )}
              </button>
            );
          })}

          {/* Current result link (when active) */}
          {hasResult && (
            <button
              onClick={() => onNavigate('result')}
              className={`
                w-full h-10 flex items-center gap-2.5 rounded-xl transition-all duration-150 cursor-pointer
                ${collapsed ? 'justify-center px-0' : 'px-3'}
                ${currentPage === 'result' ? 'font-medium' : 'hover:bg-[--hover-bg]'}
              `}
              style={{
                background: currentPage === 'result' ? 'var(--accent-tint)' : undefined,
              }}
              title={collapsed ? 'Current result' : undefined}
            >
              {currentPage === 'result' && !collapsed && (
                <span
                  className="w-[2.5px] h-5 rounded-full flex-shrink-0"
                  style={{ background: 'var(--accent)' }}
                />
              )}
              <Sparkles
                className="w-[18px] h-[18px] flex-shrink-0"
                strokeWidth={1.5}
                style={{ color: 'var(--accent)' }}
              />
              {!collapsed && (
                <span
                  className="text-[13px] whitespace-nowrap"
                  style={{ color: currentPage === 'result' ? 'var(--text-1)' : 'var(--text-2)' }}
                >
                  Inspection result
                </span>
              )}
            </button>
          )}

          {/* Admin Console Link (Visible only to role = 'admin') */}
          {user?.role === 'admin' && (
            <button
              onClick={() => onNavigate('admin')}
              className={`
                w-full h-10 flex items-center gap-2.5 rounded-xl transition-all duration-150 cursor-pointer
                ${collapsed ? 'justify-center px-0' : 'px-3'}
                ${currentPage === 'admin' ? 'font-medium' : 'hover:bg-[--hover-bg]'}
              `}
              style={{
                background: currentPage === 'admin' ? 'rgba(245, 158, 11, 0.15)' : undefined,
              }}
              title={collapsed ? 'Admin Console' : undefined}
            >
              {currentPage === 'admin' && !collapsed && (
                <span
                  className="w-[2.5px] h-5 rounded-full flex-shrink-0"
                  style={{ background: '#f59e0b' }}
                />
              )}
              <Shield
                className="w-[18px] h-[18px] flex-shrink-0 text-amber-400"
                strokeWidth={1.5}
              />
              {!collapsed && (
                <span
                  className="text-[13px] whitespace-nowrap text-amber-200"
                >
                  Admin Console
                </span>
              )}
            </button>
          )}
        </nav>
      </div>

      {/* ── Bottom: Status + Theme + Inspector Profile ── */}
      <div
        className="p-3 space-y-2 border-t flex-shrink-0"
        style={{ borderColor: 'var(--glass-sunken-border)' }}
      >
        {/* Status row */}
        <div
          className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-1`}
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isHealthy ? 'animate-status-pulse' : 'animate-pulse'
              }`}
              style={{ background: isHealthy ? 'var(--success)' : 'var(--crack-amber)' }}
            />
            {!collapsed && (
              <span className="text-[11px]" style={{ color: 'var(--text-2)' }}>
                {health ? 'Online' : 'Connecting…'}
              </span>
            )}
          </div>

          {!collapsed && (
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono uppercase font-semibold"
              style={{
                background: 'var(--glass-sunken-bg)',
                border: '1px solid var(--glass-sunken-border)',
                color: 'var(--text-2)',
              }}
            >
              <Cpu className="w-3 h-3" style={{ color: 'var(--text-2)' }} strokeWidth={1.5} />
              {deviceName}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className={`w-full h-9 flex items-center gap-2 rounded-xl transition-colors duration-150 hover:bg-[--hover-bg] cursor-pointer ${
            collapsed ? 'justify-center px-0' : 'px-3'
          }`}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-[16px] h-[16px]" style={{ color: 'var(--text-2)' }} strokeWidth={1.5} />
          ) : (
            <Moon className="w-[16px] h-[16px]" style={{ color: 'var(--text-2)' }} strokeWidth={1.5} />
          )}
          {!collapsed && (
            <span className="text-[12px]" style={{ color: 'var(--text-2)' }}>
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </span>
          )}
        </button>

        {/* User profile / Sign in button */}
        {user ? (
          <div
            className="flex items-center gap-2 p-2 rounded-xl"
            style={{
              background: 'var(--glass-sunken-bg)',
              border: '1px solid var(--glass-sunken-border)',
            }}
          >
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <span className="block text-[12px] font-medium truncate" style={{ color: 'var(--text-1)' }}>
                  {user.full_name || 'Field Inspector'}
                </span>
                <span className="block text-[10px] truncate" style={{ color: 'var(--text-3)' }}>
                  {user.email}
                </span>
              </div>
            )}
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg transition-colors hover:bg-[--hover-bg] flex-shrink-0 cursor-pointer"
              style={{ color: 'var(--text-3)' }}
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className={`w-full h-9 flex items-center gap-2 rounded-xl transition-colors duration-150 cursor-pointer ${
              collapsed ? 'justify-center px-0' : 'px-3'
            }`}
            style={{
              background: 'var(--glass-sunken-bg)',
              border: '1px solid var(--glass-sunken-border)',
              color: 'var(--text-2)',
            }}
          >
            <LogIn className="w-[16px] h-[16px] flex-shrink-0" strokeWidth={1.5} />
            {!collapsed && <span className="text-[12px]">Sign in</span>}
          </button>
        )}
      </div>
    </aside>
  );
};
