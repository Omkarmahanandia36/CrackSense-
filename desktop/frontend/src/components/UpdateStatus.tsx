import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  DownloadCloud,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  X,
  ShieldAlert,
  Smartphone,
  Laptop,
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
  const [isModalOpen, setIsModalOpen] = useState(false);
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

      // Prompt user with update dialog on app launch if an update is available
      if (newState === 'available' && newInfo?.version) {
        const dismissed = sessionStorage.getItem(`cracksense_update_dismissed_${newInfo.version}`);
        if (!dismissed) {
          setIsModalOpen(true);
        }
      }
    });

    return unsubscribe;
  }, []);

  const handleAction = async () => {
    if (state === 'available') {
      await updateService.downloadOrOpenUpdate();
    } else if (state === 'downloaded') {
      updateService.installUpdate();
    } else if (state === 'error' || state === 'idle' || state === 'not-available') {
      await updateService.checkForUpdates();
    }
  };

  const isElectron = typeof window !== 'undefined' && Boolean((window as any).electronAPI?.updater);
  const isBlocking = Boolean(info?.isBlocking);

  return (
    <>
      {/* ── Compact Header Indicator ── */}
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
            onClick={() => setIsModalOpen(true)}
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
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs font-mono border border-blue-500/30 bg-blue-500/10 text-blue-300 cursor-pointer select-none"
            title="Update is downloading..."
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
            onClick={() => updateService.checkForUpdates()}
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
            onClick={() => updateService.checkForUpdates()}
            className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono text-slate-400 hover:text-slate-200 transition-colors"
            title={`Installed v${installedVersion}. Click to check again.`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>v{installedVersion} (up to date)</span>
          </button>
        )}
      </div>

      {/* ── Update Details Modal (Non-Blocking) ── */}
      {isModalOpen && !isBlocking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-rise">
          <div
            className="relative w-full max-w-md p-6 rounded-3xl border border-white/10 shadow-2xl space-y-4"
            style={{ background: '#0B1720' }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">CrackSense AI Update Available</h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    Current: v{installedVersion} &bull; New: v{info?.version}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (info?.version) {
                    sessionStorage.setItem(`cracksense_update_dismissed_${info.version}`, 'true');
                  }
                  setIsModalOpen(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Release notes */}
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                What's New
              </span>
              <div
                className="p-3 rounded-xl border border-white/10 max-h-40 overflow-y-auto text-xs text-slate-300 font-sans leading-relaxed"
                style={{ background: 'var(--glass-sunken-bg)' }}
              >
                {info?.releaseNotes ? (
                  <p className="whitespace-pre-wrap">{info.releaseNotes}</p>
                ) : (
                  <p className="italic text-slate-400">Includes defect inspection engine optimizations and bug fixes.</p>
                )}
              </div>
            </div>

            {/* Download Progress if downloading */}
            {state === 'downloading' && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono text-slate-300">
                  <span>Downloading update...</span>
                  <span>{progress ? `${progress.percent}%` : ''}</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 rounded-full transition-all duration-200"
                    style={{ width: `${progress?.percent || 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Android Notice */}
            {!isElectron && (
              <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-[11px] text-amber-200 flex items-start gap-2">
                <Smartphone className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <p className="font-medium">Android Installation Notice</p>
                  <p className="text-[10px] text-amber-300/80 mt-0.5">
                    Tapping Update downloads the APK. If prompted, permit "Install unknown apps" in Settings for your browser.
                  </p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (info?.version) {
                    sessionStorage.setItem(`cracksense_update_dismissed_${info.version}`, 'true');
                  }
                  setIsModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10"
              >
                Remind me later
              </button>

              {state === 'downloaded' ? (
                <button
                  type="button"
                  onClick={() => updateService.installUpdate()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg active:scale-95"
                >
                  Restart to update
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    await handleAction();
                    if (!isElectron) setIsModalOpen(false);
                  }}
                  disabled={state === 'downloading'}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <span>{isElectron ? 'Download update' : 'Download APK'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Blocking Update Required Screen (Android / Minimum Version Enforced) ── */}
      {isBlocking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div
            className="w-full max-w-md p-6 sm:p-8 rounded-3xl border border-red-500/30 shadow-2xl space-y-5 text-center"
            style={{ background: '#0B1720' }}
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shadow-lg">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Update Required</h2>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Your installed version (v{installedVersion}) is no longer supported. Minimum version required is{' '}
                <span className="font-mono font-semibold text-white">v{info?.minSupportedVersion}</span>.
              </p>
            </div>

            {info?.releaseNotes && (
              <div
                className="p-3 rounded-2xl border border-white/10 text-left text-xs text-slate-300 max-h-32 overflow-y-auto"
                style={{ background: 'var(--glass-sunken-bg)' }}
              >
                <p className="font-semibold text-white text-[11px] uppercase tracking-wider mb-1">Update Details</p>
                <p className="whitespace-pre-wrap">{info.releaseNotes}</p>
              </div>
            )}

            {/* Android Unknown Apps Instruction */}
            <div className="p-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-left text-xs text-amber-200 space-y-1">
              <p className="font-semibold flex items-center gap-1.5 text-amber-300">
                <Smartphone className="w-3.5 h-3.5" />
                How to install:
              </p>
              <ol className="list-decimal list-inside text-[11px] text-amber-200/90 space-y-0.5">
                <li>Tap <strong>Update Now</strong> below to download the APK.</li>
                <li>When prompted, allow <em>"Install unknown apps"</em> for your browser.</li>
                <li>Open the downloaded APK from Notifications to complete installation.</li>
              </ol>
            </div>

            <button
              type="button"
              onClick={handleAction}
              className="w-full py-3 px-5 rounded-2xl text-sm font-semibold bg-gradient-to-r from-red-500 via-rose-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-xl shadow-red-500/20 flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <span>Update Now to v{info?.version}</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
