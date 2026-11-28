import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  DownloadCloud,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  X,
  ShieldAlert,
  Smartphone,
  Monitor,
} from 'lucide-react';
import {
  updateService,
  UpdateState,
  UpdateInfo,
  DownloadProgress,
} from '../services/updater';

export const UpdateModal: React.FC = () => {
  const [state, setState] = useState<UpdateState>(updateService.getState());
  const [info, setInfo] = useState<UpdateInfo | null>(updateService.getUpdateInfo());
  const [progress, setProgress] = useState<DownloadProgress | null>(updateService.getProgress());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [installedVersion, setInstalledVersion] = useState(updateService.getInstalledVersion());
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    updateService.init().then(() => {
      setInstalledVersion(updateService.getInstalledVersion());
    });

    const unsubscribe = updateService.subscribe((newState, newInfo, newProgress) => {
      setState(newState);
      if (newInfo !== undefined) setInfo(newInfo);
      if (newProgress !== undefined) setProgress(newProgress);
      setInstalledVersion(updateService.getInstalledVersion());

      // Prompt user with update dialog on launch if available and not dismissed in this session
      if (newState === 'available' && newInfo?.version) {
        const isDismissed = sessionStorage.getItem(`cracksense_update_dismissed_${newInfo.version}`);
        if (!isDismissed) {
          setIsModalOpen(true);
        }
      }
    });

    // Custom events from Profile / Settings / Header badge
    const handleOpenModal = () => setIsModalOpen(true);
    const handleCheckUpdates = async () => {
      setNotice('Checking for updates...');
      try {
        await updateService.checkForUpdates();
        const curState = updateService.getState();
        const curInfo = updateService.getUpdateInfo();
        if (curState === 'available' && curInfo?.version) {
          setNotice(null);
          setIsModalOpen(true);
        } else {
          setNotice(`CrackSense AI v${updateService.getInstalledVersion()} is up to date!`);
          setTimeout(() => setNotice(null), 3500);
        }
      } catch (err: any) {
        setNotice(`Unable to check for updates: ${err?.message || 'Network error'}`);
        setTimeout(() => setNotice(null), 3500);
      }
    };

    window.addEventListener('cracksense:open_update_modal', handleOpenModal);
    window.addEventListener('cracksense:check_updates', handleCheckUpdates);

    return () => {
      unsubscribe();
      window.removeEventListener('cracksense:open_update_modal', handleOpenModal);
      window.removeEventListener('cracksense:check_updates', handleCheckUpdates);
    };
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

  const isAndroid = typeof window !== 'undefined' && updateService.getPlatform() === 'android';
  const isBlocking = Boolean(info?.isBlocking);

  return (
    <>
      {/* ── Single Update Details Modal (Non-Blocking) ── */}
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
                type="button"
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
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
                    style={{ width: `${progress?.percent || 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Platform notice */}
            {isAndroid ? (
              <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 flex items-start gap-2.5 text-xs text-amber-200">
                <Smartphone className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <p className="font-medium">Android Installation Notice</p>
                  <p className="text-[10px] text-amber-300/80 mt-0.5">
                    Tapping Download downloads the APK. If prompted, permit "Install unknown apps" in Settings for your browser.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 flex items-start gap-2.5 text-xs text-cyan-200">
                <Monitor className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <p className="font-medium">Windows Setup Executable (.exe)</p>
                  <p className="text-[10px] text-cyan-300/80 mt-0.5">
                    Clicking Download will download the CrackSense-AI-Setup.exe installer. You can also run the installer directly from your Downloads folder.
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
                    setIsModalOpen(false);
                  }}
                  disabled={state === 'downloading'}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <span>{isAndroid ? 'Download APK' : 'Download Windows Setup (.exe)'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Blocking Update Required Screen (Mandatory Minimum Version Enforced) ── */}
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

            {/* Instruction by Platform */}
            {isAndroid ? (
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
            ) : (
              <div className="p-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-left text-xs text-cyan-200 space-y-1">
                <p className="font-semibold flex items-center gap-1.5 text-cyan-300">
                  <Monitor className="w-3.5 h-3.5" />
                  How to install:
                </p>
                <ol className="list-decimal list-inside text-[11px] text-cyan-200/90 space-y-0.5">
                  <li>Click <strong>Update Now</strong> below to download the latest setup installer (.exe).</li>
                  <li>Run the installer (or run <em>CrackSense-AI-Setup.exe</em> from your Downloads folder).</li>
                  <li>Relaunch CrackSense AI.</li>
                </ol>
              </div>
            )}

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

      {/* ── Up to date Toast notification ── */}
      {notice && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 backdrop-blur-xl shadow-2xl animate-fade-rise text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{notice}</span>
        </div>
      )}
    </>
  );
};
