import React from 'react';
import { LayoutDashboard, UploadCloud, History as HistoryIcon, User as UserIcon, LogIn, LogOut } from 'lucide-react';
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
  return (
    <aside className="w-56 flex-shrink-0 bg-zinc-50 border-r border-zinc-200 flex flex-col justify-between h-screen sticky top-0 select-none">
      <div>
        {/* Text-only logo */}
        <div className="px-5 py-4 border-b border-zinc-200">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm tracking-tight text-zinc-900">CrackSense</span>
            <span className="text-[10px] font-mono text-zinc-400">v1.2</span>
          </div>
          <span className="block text-[11px] text-zinc-500 mt-0.5">Concrete inspection tool</span>
        </div>

        {/* Navigation items */}
        <nav className="p-3 space-y-1">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`w-full text-left px-3 py-2 text-xs rounded transition flex items-center space-x-2 ${
              currentPage === 'dashboard'
                ? 'bg-zinc-200/80 text-zinc-900 font-medium border-l-2 border-[#c92a2a]'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-zinc-500" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onNavigate('upload')}
            className={`w-full text-left px-3 py-2 text-xs rounded transition flex items-center space-x-2 ${
              currentPage === 'upload'
                ? 'bg-zinc-200/80 text-zinc-900 font-medium border-l-2 border-[#c92a2a]'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5 text-zinc-500" />
            <span>Analyze</span>
          </button>

          <button
            onClick={() => onNavigate('history')}
            className={`w-full text-left px-3 py-2 text-xs rounded transition flex items-center space-x-2 ${
              currentPage === 'history'
                ? 'bg-zinc-200/80 text-zinc-900 font-medium border-l-2 border-[#c92a2a]'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <HistoryIcon className="w-3.5 h-3.5 text-zinc-500" />
            <span>History</span>
          </button>

          {hasResult && (
            <button
              onClick={() => onNavigate('result')}
              className={`w-full text-left px-3 py-2 text-xs rounded transition flex items-center space-x-2 ${
                currentPage === 'result'
                  ? 'bg-zinc-200/80 text-zinc-900 font-medium border-l-2 border-[#c92a2a]'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#c92a2a]" />
              <span>Current result</span>
            </button>
          )}
        </nav>
      </div>

      {/* Footer / System Status & Inspector */}
      <div className="p-3 border-t border-zinc-200 text-xs space-y-3">
        {/* Device Status */}
        <div className="flex items-center justify-between text-[11px] text-zinc-500 px-2">
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                health?.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span>{health ? 'Backend online' : 'Connecting...'}</span>
          </div>
          <span className="font-mono text-[10px] text-zinc-600 uppercase">
            {health?.device || 'CPU'}
          </span>
        </div>

        {/* User / Inspector Profile */}
        <div className="pt-2 border-t border-zinc-200/80">
          {user ? (
            <div className="flex items-center justify-between px-2 py-1 bg-zinc-100 rounded text-zinc-700 text-[11px]">
              <div className="truncate pr-1">
                <span className="block font-medium truncate text-zinc-900">
                  {user.full_name || 'Inspector'}
                </span>
                <span className="block text-[10px] text-zinc-500 truncate">{user.email}</span>
              </div>
              <button
                onClick={onLogout}
                className="text-zinc-400 hover:text-zinc-700 transition"
                title="Sign out"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="w-full py-1.5 px-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs rounded text-left flex items-center justify-between transition"
            >
              <span>Sign in</span>
              <LogIn className="w-3 h-3 text-zinc-500" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
