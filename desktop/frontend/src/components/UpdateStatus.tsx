import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  DownloadCloud,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import {
  updateService,
  UpdateState,
  UpdateInfo,
  DownloadProgress,
} from '../services/updater';

export const UpdateStatus: React.FC = () => {
  const [state, setState] = useState<UpdateState>(updateService.getState());
  const [info, setInfo] = useState<UpdateInfo | null>(updateService.getUpdateInfo());
  const [progress, setProgress] = useState<DownloadProgress | null>(updateService.getProgress());
  const [error, setError] = useState<string | null>(updateService.getError());
  const [installedVersion, setInstalledVersion] = useState(updateService.getInstalledVersion());

  useEffect(() => {
    updateService.init().then(() => {
      setInstalledVersion(updateService.getInstalledVersion());
    });

    const unsubscribe = updateService.subscribe((newState, newInfo, newProgress, newError) => {
      setState(newState);
      if (newInfo !== undefined) setInfo(newInfo);
      if (newProgress !== undefined) setProgress(newProgress);
      if (newError !== undefined) setError(newError);
      setInstalledVersion(updateService.getInstalledVersion());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const openUpdateModal = () => {
    window.dispatchEvent(new CustomEvent('cracksense:open_update_modal'));
  };

  const triggerCheck = () => {
    window.dispatchEvent(new CustomEvent('cracksense:check_updates'));
  };

  return (
    <div className="flex items-center">
      {state === 'checking' && (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 animate-pulse select-none"
          title="Checking for application updates..."
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span className="hidden sm:inline text-[11px]">Checking...</span>
        </div>
      )}

      {state === 'available' && (
        <button
          type="button"
          onClick={openUpdateModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border border-cyan-400/30 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 hover:border-cyan-400 transition-all active:scale-95 shadow-sm animate-fade-rise"
          title="Click to view update details"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-[11px]">v{info?.version} Update</span>
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        </button>
      )}

      {state === 'downloading' && (
        <div
          onClick={openUpdateModal}
          className="flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs font-mono border border-blue-500/30 bg-blue-500/10 text-blue-300 cursor-pointer select-none"
          title="Update is downloading... Click for details"
        >
          <DownloadCloud className="w-3.5 h-3.5 animate-bounce" />
          <span className="text-[11px] font-semibold">{progress ? `${progress.percent}%` : 'Downloading'}</span>
        </div>
      )}

      {state === 'downloaded' && (
        <button
          type="button"
          onClick={() => updateService.installUpdate()}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border border-emerald-400/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all active:scale-95 shadow-sm animate-fade-rise"
          title="Click to restart and install update"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px]">Restart to update</span>
        </button>
      )}

      {state === 'error' && (
        <button
          type="button"
          onClick={triggerCheck}
          className="flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-mono border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-all"
          title={error || 'Update check failed. Click to retry.'}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">Retry</span>
        </button>
      )}

      {state === 'not-available' && (
        <button
          type="button"
          onClick={triggerCheck}
          className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono text-slate-400 hover:text-slate-200 transition-colors"
          title={`Installed v${installedVersion}. Click to check again.`}
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>v{installedVersion} (up to date)</span>
        </button>
      )}
    </div>
  );
};
