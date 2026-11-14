import React from 'react';
import {
  Activity,
  LayoutDashboard,
  UploadCloud,
  Eye,
  History as HistoryIcon,
  User as UserIcon,
  LogOut,
  LogIn,
} from 'lucide-react';
import { HealthData, UserProfile } from '../services/api';

interface NavbarProps {
  currentPage: 'dashboard' | 'upload' | 'result' | 'history';
  onNavigate: (page: 'dashboard' | 'upload' | 'result' | 'history') => void;
  health: HealthData | null;
  hasResult: boolean;
  user: UserProfile | null;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  health,
  hasResult,
  user,
  onOpenLogin,
  onLogout,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => onNavigate('dashboard')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight flex items-center space-x-2">
              <span>CrackSense AI</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                Desktop
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Concrete Surface Health Inspection</p>
          </div>
        </div>

        {/* Center Navigation Links */}
        <nav className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center space-x-1.5 transition ${
              currentPage === 'dashboard'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onNavigate('upload')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center space-x-1.5 transition ${
              currentPage === 'upload'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload & Analyze</span>
          </button>

          <button
            onClick={() => onNavigate('history')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center space-x-1.5 transition ${
              currentPage === 'history'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HistoryIcon className="w-3.5 h-3.5" />
            <span>History</span>
          </button>

          {hasResult && (
            <button
              onClick={() => onNavigate('result')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center space-x-1.5 transition ${
                currentPage === 'result'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Inspection Result</span>
            </button>
          )}
        </nav>

        {/* Backend / Device Status & Auth */}
        <div className="flex items-center space-x-3 text-xs">
          {health ? (
            <div className="hidden sm:flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-300">FastAPI</span>
              <span className="text-slate-600">|</span>
              <span className="text-blue-400">{health.device.toUpperCase()}</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-amber-300">Connecting...</span>
            </div>
          )}

          {/* User Sign In / Profile */}
          {user ? (
            <div className="flex items-center space-x-2 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
              <div className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium text-slate-200 text-xs max-w-[100px] truncate">
                {user.full_name || user.email.split('@')[0]}
              </span>
              <button
                onClick={onLogout}
                className="text-slate-500 hover:text-red-400 transition p-1"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl flex items-center space-x-1.5 transition shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
