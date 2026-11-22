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

// Count-up animation for numbers
function useCountUp(target: number, durationMs: number = 350): number {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }
    const steps = 12;
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
  health,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalScans = recentInspections.length;
  const crackScans = recentInspections.filter((r) => r.is_crack).length;
  const latestInspection = recentInspections[0];

  const animatedTotal = useCountUp(totalScans);
  const animatedCracks = useCountUp(crackScans);

  const lastRunTime = latestInspection
    ? new Date(latestInspection.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'No runs';

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
      // Desktop (Electron / Web): Open in-app live webcam viewfinder
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
    <div className="space-y-8 animate-fade-rise">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
            Inspection overview
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
            Structural health monitoring, surface defects, and neural crack localization
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            icon={UploadCloud}
            onClick={onStartUpload}
          >
            New inspection
          </Button>
        </div>
      </div>

      {/* ── Large "Start new inspection" drop zone & camera buttons ── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          glass-base p-5 sm:p-8 text-center select-none transition-all duration-200 group border border-dashed scroll-reveal scroll-card-hover
          ${isDragging ? 'scale-[1.01] shadow-2xl' : 'hover:bg-[--hover-bg]'}
        `}
        style={{
          borderColor: isDragging ? 'var(--accent)' : 'var(--glass-border)',
          background: isDragging ? 'var(--accent-tint)' : undefined,
        }}
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
            className="w-12 h-12 mx-auto rounded-full flex items-center justify-center cursor-pointer transition-transform duration-200 group-hover:scale-110"
            style={{
              background: 'var(--glass-sunken-bg)',
              border: '1px solid var(--glass-sunken-border)',
              color: 'var(--accent)',
            }}
          >
            <UploadCloud className="w-6 h-6" strokeWidth={1.5} />
          </div>

          <div>
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
              Start new inspection
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              Capture or upload concrete surface photograph
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-sm mx-auto">
            <button
              type="button"
              onClick={handleCapturePhoto}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)',
                color: '#FFFFFF',
              }}
            >
              <CameraIcon className="w-4 h-4" strokeWidth={2} />
              <span>Snap with Camera</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer border border-white/10 hover:bg-white/10 active:scale-95"
              style={{
                background: 'var(--glass-sunken-bg)',
                color: 'var(--text-1)',
              }}
            >
              <UploadCloud className="w-4 h-4 text-cyan-400" strokeWidth={1.8} />
              <span>Choose from Photos</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 3 Simple Stats (horizontal 3-col on mobile & desktop) ── */}
      <GlassPanel variant="base" className="p-3.5 sm:p-6 scroll-reveal scroll-reveal-delay-1 scroll-card-hover">
        <div className="grid grid-cols-3 divide-x divide-white/[0.08] text-center sm:text-left">
          {/* Stat 1: Total Inspections */}
          <div className="px-2 sm:px-4 py-1 first:pl-0">
            <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider block" style={{ color: 'var(--text-3)' }}>
              Scans
            </span>
            <div className="mt-1 flex items-baseline justify-center sm:justify-start gap-1">
              <span className="text-2xl sm:text-3xl font-mono font-semibold" style={{ color: 'var(--text-1)' }}>
                {animatedTotal}
              </span>
              <span className="hidden sm:inline text-xs" style={{ color: 'var(--text-3)' }}>
                recorded
              </span>
            </div>
          </div>

          {/* Stat 2: Cracks Found */}
          <div className="px-2 sm:px-4 py-1">
            <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider block" style={{ color: 'var(--text-3)' }}>
              Cracks
            </span>
            <div className="mt-1 flex items-baseline justify-center sm:justify-start gap-1">
              <span
                className="text-2xl sm:text-3xl font-mono font-semibold"
                style={{ color: animatedCracks > 0 ? 'var(--crack)' : 'var(--text-1)' }}
              >
                {animatedCracks}
              </span>
              <span className="hidden sm:inline text-xs" style={{ color: 'var(--text-3)' }}>
                positive
              </span>
            </div>
          </div>

          {/* Stat 3: Last Run */}
          <div className="px-2 sm:px-4 py-1 last:pr-0">
            <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider block" style={{ color: 'var(--text-3)' }}>
              Last Run
            </span>
            <div className="mt-1 flex items-baseline justify-center sm:justify-start gap-1 font-mono">
              <span className="text-sm sm:text-xl font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                {latestInspection
                  ? new Date(latestInspection.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--:--'}
              </span>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* ── Recent Inspections List ── */}
      <div className="space-y-3 scroll-reveal scroll-reveal-delay-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
            Recent inspections
          </h2>
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-3)' }}>
            Ordered by timestamp
          </span>
        </div>

        {recentInspections.length === 0 ? (
          <EmptyState
            title="No inspections yet"
            description="Drop a concrete photograph into the upload zone above to run automated crack classification and bounding-box segmentation."
            actionLabel="Start inspection"
            onAction={onStartUpload}
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div
              className="hidden md:block w-full overflow-x-auto"
              style={{
                background: 'var(--glass-sunken-bg)',
                border: '1px solid var(--glass-sunken-border)',
                borderRadius: 'var(--r-panel)',
              }}
            >
              <table className="w-full text-left text-xs">
                <thead
                  className="border-b"
                  style={{
                    borderColor: 'var(--glass-sunken-border)',
                    color: 'var(--text-3)',
                  }}
                >
                  <tr>
                    <th className="py-3 px-4 font-medium">Surface / File</th>
                    <th className="py-3 px-4 font-medium">Verdict</th>
                    <th className="py-3 px-4 font-medium">Confidence</th>
                    <th className="py-3 px-4 font-medium">Regions</th>
                    <th className="py-3 px-4 font-medium">Timestamp</th>
                    <th className="py-3 px-4 font-medium text-right">Action</th>
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
                      className="hover:bg-[--hover-bg] cursor-pointer transition-colors duration-150 group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
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
                              <FileImage className="w-4 h-4" style={{ color: 'var(--text-3)' }} strokeWidth={1.5} />
                            )}
                          </div>
                          <span className="font-mono text-xs font-medium truncate max-w-xs" style={{ color: 'var(--text-1)' }}>
                            {item.filename}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {item.is_crack ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                            style={{
                              background: 'var(--crack-tint)',
                              color: 'var(--crack)',
                              border: '1px solid rgba(255, 111, 97, 0.35)',
                            }}
                          >
                            Crack detected
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                            style={{
                              background: 'var(--success-tint)',
                              color: 'var(--success)',
                              border: '1px solid rgba(78, 186, 134, 0.35)',
                            }}
                          >
                            Clear surface
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs" style={{ color: 'var(--text-1)' }}>
                        {(item.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 font-mono text-xs" style={{ color: 'var(--text-3)' }}>
                        {item.boxes ? item.boxes.length : item.is_crack ? 1 : 0}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]" style={{ color: 'var(--text-3)' }}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className="text-xs inline-flex items-center gap-1 font-medium transition-colors"
                          style={{ color: 'var(--accent)' }}
                        >
                          <span>View</span>
                          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden space-y-2.5">
              {recentInspections.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectResult(item)}
                  className="p-3 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md flex items-center justify-between gap-3 active:scale-[0.98] transition-all cursor-pointer"
                  style={{
                    background: 'var(--glass-sunken-bg)',
                    borderColor: 'var(--glass-sunken-border)',
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-black/40 border border-white/10 flex items-center justify-center">
                      {item.image_url ? (
                        <img
                          src={resolveImageUrl(item.image_url)}
                          alt={item.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileImage className="w-5 h-5" style={{ color: 'var(--text-3)' }} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-medium truncate max-w-[150px]" style={{ color: 'var(--text-1)' }}>
                        {item.filename}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{
                            background: item.is_crack ? 'var(--crack-tint)' : 'var(--success-tint)',
                            color: item.is_crack ? 'var(--crack)' : 'var(--success)',
                            border: `1px solid ${item.is_crack ? 'rgba(255, 69, 58, 0.3)' : 'rgba(48, 209, 88, 0.3)'}`,
                          }}
                        >
                          {item.is_crack ? 'Crack detected' : 'Clear'}
                        </span>
                        <span className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
                          {(item.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: 'var(--text-3)' }}>
                    <span className="text-[10px] font-mono">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" style={{ color: 'var(--accent)' }} />
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
