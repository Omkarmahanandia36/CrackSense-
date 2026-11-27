import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, ArrowRight, FileImage, Camera as CameraIcon } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { HealthData, AnalyzeResult, resolveImageUrl, isNativeMobile } from '../services/api';
import { GlassPanel, Button, EmptyState } from '../components/ui';
import { CameraCaptureModal } from '../components/CameraCaptureModal';

interface DashboardProps {
  onStartUpload: () => void;
  onStartUploadWithFile?: (file: File) => void;
  onSelectResult: (result: AnalyzeResult) => void;
  recentInspections: AnalyzeResult[];
  health: HealthData | null;
}

// Subtle count-up animation for metrics
function useCountUp(target: number, durationMs: number = 300): number {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }
    const steps = 10;
    const stepDuration = durationMs / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setCount(Math.round(target * progress));
      if (step >= steps) {
        clearInterval(timer);
        setCount(target);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [target, durationMs]);

  return count;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onStartUpload,
  onStartUploadWithFile,
  onSelectResult,
  recentInspections,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalScans = recentInspections.length;
  const crackScans = recentInspections.filter((r) => r.is_crack).length;
  const latestInspection = recentInspections[0];

  const animatedTotal = useCountUp(totalScans);
  const animatedCracks = useCountUp(crackScans);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (onStartUploadWithFile) {
        onStartUploadWithFile(file);
      } else {
        onStartUpload();
      }
    } else {
      onStartUpload();
    }
  };

  const handleCapturePhoto = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isNativeMobile()) {
      try {
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera,
        });

        if (image.webPath) {
          const response = await fetch(image.webPath);
          const blob = await response.blob();
          const file = new File(
            [blob],
            `inspection_crack_${Date.now()}.${image.format || 'jpg'}`,
            { type: `image/${image.format || 'jpeg'}` }
          );
          if (onStartUploadWithFile) {
            onStartUploadWithFile(file);
          } else {
            onStartUpload();
          }
        }
      } catch (err: any) {
        if (!err?.message?.includes('User cancelled')) {
          console.warn('Camera notice:', err);
        }
      }
    } else {
      setIsCameraModalOpen(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (onStartUploadWithFile) {
        onStartUploadWithFile(file);
      } else {
        onStartUpload();
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-rise">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
            Structural Inspection Console
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time concrete surface diagnostics & defect localization
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            icon={UploadCloud}
            onClick={onStartUpload}
          >
            New inspection
          </Button>
        </div>
      </div>

      {/* ── Architectural Drop Zone & Camera Actions ── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          glass-base p-6 sm:p-8 text-center select-none transition-all duration-150 border border-dashed rounded-xl
          ${isDragging ? 'bg-white/[0.04] border-white/40' : 'hover:border-white/20 border-white/10'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.bmp,.webp"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-3">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center cursor-pointer transition-colors bg-white/[0.05] border border-white/10 text-slate-200 hover:text-white"
          >
            <UploadCloud className="w-5 h-5" strokeWidth={1.6} />
          </div>

          <div>
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
              Scan concrete surface
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Drag and drop photograph or use optical capture
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2 max-w-sm mx-auto">
            <button
              type="button"
              onClick={handleCapturePhoto}
              className="w-full sm:w-auto px-3.5 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer bg-white text-slate-900 hover:bg-slate-100 active:scale-95 shadow-sm"
            >
              <CameraIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
              <span>Capture Photo</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto px-3.5 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer glass-base text-slate-200 hover:text-white hover:bg-white/[0.06] active:scale-95"
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.6} />
              <span>Choose File</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Key Metrics Cards (Strict 3-column architectural row) ── */}
      <GlassPanel variant="base" className="p-4 sm:p-5">
        <div className="grid grid-cols-3 divide-x divide-white/[0.08] text-center sm:text-left">
          {/* Metric 1: Total Inspections */}
          <div className="px-2 sm:px-4 py-1 first:pl-0">
            <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-slate-400 block">
              Total Scans
            </span>
            <div className="mt-1 flex items-baseline justify-center sm:justify-start gap-1">
              <span className="text-xl sm:text-2xl font-mono font-semibold" style={{ color: 'var(--text-1)' }}>
                {animatedTotal}
              </span>
              <span className="hidden sm:inline text-xs text-slate-500 font-mono">
                runs
              </span>
            </div>
          </div>

          {/* Metric 2: Detected Cracks */}
          <div className="px-2 sm:px-4 py-1">
            <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-slate-400 block">
              Defects Found
            </span>
            <div className="mt-1 flex items-baseline justify-center sm:justify-start gap-1">
              <span
                className="text-xl sm:text-2xl font-mono font-semibold"
                style={{ color: animatedCracks > 0 ? 'var(--crack)' : 'var(--text-1)' }}
              >
                {animatedCracks}
              </span>
              <span className="hidden sm:inline text-xs text-slate-500 font-mono">
                fissures
              </span>
            </div>
          </div>

          {/* Metric 3: Latest Inspection */}
          <div className="px-2 sm:px-4 py-1 last:pr-0">
            <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-slate-400 block">
              Latest Scan
            </span>
            <div className="mt-1 flex items-baseline justify-center sm:justify-start gap-1 font-mono">
              <span className="text-xs sm:text-base font-semibold truncate text-slate-200">
                {latestInspection
                  ? new Date(latestInspection.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--:--'}
              </span>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* ── Recent Inspections Worklist ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Recent Inspections
          </h2>
          <span className="text-[11px] font-mono text-slate-500">
            {recentInspections.length} recorded
          </span>
        </div>

        {recentInspections.length === 0 ? (
          <EmptyState
            title="No inspection records"
            description="Upload or capture a concrete surface photograph to generate neural defect boundaries and structural integrity ratings."
            actionLabel="Start inspection"
            onAction={onStartUpload}
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div
              className="hidden md:block w-full overflow-x-auto rounded-xl"
              style={{
                background: 'var(--glass-sunken-bg)',
                border: '1px solid var(--glass-sunken-border)',
              }}
            >
              <table className="w-full text-left text-xs">
                <thead
                  className="border-b text-[11px] font-medium"
                  style={{
                    borderColor: 'var(--glass-sunken-border)',
                    color: 'var(--text-3)',
                  }}
                >
                  <tr>
                    <th className="py-2.5 px-4">Surface / File</th>
                    <th className="py-2.5 px-4">Verdict</th>
                    <th className="py-2.5 px-4">Confidence</th>
                    <th className="py-2.5 px-4">Fissures</th>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody
                  className="divide-y"
                  style={{
                    borderColor: 'var(--glass-sunken-border)',
                    color: 'var(--text-2)',
                  }}
                >
                  {recentInspections.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => onSelectResult(item)}
                      className="hover:bg-white/[0.04] cursor-pointer transition-colors duration-100 group"
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-7 h-7 rounded overflow-hidden flex items-center justify-center flex-shrink-0"
                            style={{
                              background: 'var(--glass-sunken-bg)',
                              border: '1px solid var(--glass-sunken-border)',
                            }}
                          >
                            {item.image_url ? (
                              <img
                                src={resolveImageUrl(item.image_url)}
                                alt={item.filename}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FileImage className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.5} />
                            )}
                          </div>
                          <span className="font-mono text-xs font-medium truncate max-w-xs text-slate-200">
                            {item.filename}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        {item.is_crack ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-500/10 text-red-400 border border-red-500/25">
                            Crack Detected
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                            Clear Surface
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-300">
                        {(item.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-400">
                        {item.boxes ? item.boxes.length : item.is_crack ? 1 : 0}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="text-xs inline-flex items-center gap-1 font-medium text-slate-400 group-hover:text-white transition-colors">
                          <span>Inspect</span>
                          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden space-y-2">
              {recentInspections.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectResult(item)}
                  className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-between gap-3 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-black/40 border border-white/10 flex items-center justify-center">
                      {item.image_url ? (
                        <img
                          src={resolveImageUrl(item.image_url)}
                          alt={item.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileImage className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-medium truncate max-w-[150px] text-slate-200">
                        {item.filename}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                            item.is_crack
                              ? 'bg-red-500/10 text-red-400 border border-red-500/25'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                          }`}
                        >
                          {item.is_crack ? 'Crack' : 'Clear'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {(item.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs flex-shrink-0 text-slate-400">
                    <span className="text-[10px] font-mono">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={(file) => {
          if (onStartUploadWithFile) {
            onStartUploadWithFile(file);
          } else {
            onStartUpload();
          }
        }}
      />
    </div>
  );
};
