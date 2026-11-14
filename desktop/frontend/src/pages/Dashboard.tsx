import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Cpu,
  ArrowRight,
  FileImage,
} from 'lucide-react';
import { HealthData, AnalyzeResult, resolveImageUrl } from '../services/api';

interface DashboardProps {
  onStartUpload: () => void;
  onSelectResult: (result: AnalyzeResult) => void;
  recentInspections: AnalyzeResult[];
  health: HealthData | null;
}

// Simple count-up hook for numbers
function useCountUp(target: number, durationMs: number = 400): number {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }
    const steps = 15;
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
  onSelectResult,
  recentInspections,
  health,
}) => {
  const totalScans = recentInspections.length;
  const crackScans = recentInspections.filter((r) => r.is_crack).length;
  const clearScans = totalScans - crackScans;

  const animatedTotal = useCountUp(totalScans);
  const animatedCracks = useCountUp(crackScans);
  const animatedClear = useCountUp(clearScans);

  const deviceName = health?.device || 'CPU';

  return (
    <div className="space-y-8 animate-fade-rise">
      {/* 2. Page Header: Large title with high contrast and subtle gradient upload button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-text-primary tracking-tight">
            Inspection overview
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Structural health monitoring, surface defects, and neural crack localization
          </p>
        </div>

        <button
          onClick={onStartUpload}
          className="self-start sm:self-auto px-4 py-2.5 bg-gradient-to-r from-accent to-[#B64A34] text-white text-xs font-medium rounded-lg flex items-center space-x-2 shadow-sm hover:shadow-[0_0_20px_rgba(200,85,61,0.35)] hover:-translate-y-0.5 transition-all duration-200 group flex-shrink-0"
        >
          <UploadCloud className="w-4 h-4 transition-transform group-hover:scale-110" />
          <span>New inspection</span>
        </button>
      </div>

      {/* 3. Stats Row: Four separate layered cards in a responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Inspections */}
        <div className="card-surface p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-wider text-text-tertiary uppercase">
              Total inspections
            </span>
            <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-text-secondary">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-mono font-semibold text-text-primary">
              {animatedTotal}
            </span>
            <span className="text-xs text-text-tertiary font-sans">scans</span>
          </div>
        </div>

        {/* Card 2: Cracks Detected */}
        <div className="card-surface p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-wider text-text-tertiary uppercase">
              Cracks detected
            </span>
            <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center text-accent">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-mono font-semibold text-accent">
              {animatedCracks}
            </span>
            <span className="text-xs text-text-tertiary font-sans">positive</span>
          </div>
        </div>

        {/* Card 3: Clear Surfaces */}
        <div className="card-surface p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-wider text-text-tertiary uppercase">
              Clear surfaces
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald/15 border border-emerald/25 flex items-center justify-center text-emerald-text">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-mono font-semibold text-emerald-text">
              {animatedClear}
            </span>
            <span className="text-xs text-text-tertiary font-sans">intact</span>
          </div>
        </div>

        {/* Card 4: Inference Device */}
        <div className="card-surface p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-wider text-text-tertiary uppercase">
              Inference device
            </span>
            <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-accent">
              <Cpu className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white/[0.06] border border-white/[0.1] font-mono text-sm font-semibold uppercase text-text-primary tracking-wide">
              {deviceName}
            </span>
            <span className="text-xs text-text-tertiary font-mono">
              {health?.status === 'healthy' ? 'Active' : 'Standby'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Recent Inspections Table or 5. Empty State */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-text-primary">Recent inspections</h2>
          <span className="text-[11px] font-mono text-text-tertiary">Ordered by timestamp</span>
        </div>

        {recentInspections.length === 0 ? (
          /* 5. Minimalist Concrete Wall Crack Line-Art Empty State */
          <div className="card-surface border-dashed border-white/10 bg-surface/30 p-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-xl bg-surface-elevated/50 border border-white/[0.06] flex items-center justify-center">
              <svg
                className="w-8 h-8 text-text-tertiary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M12 3v4l2 3-3 4 2 7" stroke="#C8553D" strokeWidth="1.8" />
                <path d="M14 10l3 2" stroke="#C8553D" strokeWidth="1.4" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-text-primary">No inspections yet</p>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Upload a concrete photograph to begin high-resolution crack detection, patch tiling, and bounding-box localization.
              </p>
            </div>
            <div>
              <button
                onClick={onStartUpload}
                className="px-4 py-2 bg-surface hover:bg-surface-hover border border-white/[0.1] hover:border-white/[0.2] text-text-primary text-xs font-medium rounded-lg inline-flex items-center space-x-1.5 transition"
              >
                <span>Analyze a concrete photograph &rarr;</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="card-surface overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-elevated/40 border-b border-white/[0.06] text-text-tertiary font-medium">
                <tr>
                  <th className="py-2.5 px-4">Surface / File</th>
                  <th className="py-2.5 px-4">Verdict</th>
                  <th className="py-2.5 px-4">Confidence</th>
                  <th className="py-2.5 px-4">Regions</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-text-secondary">
                {recentInspections.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectResult(item)}
                    className="hover:bg-surface-hover/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-md bg-surface-elevated border border-white/[0.08] overflow-hidden flex items-center justify-center flex-shrink-0">
                          {item.image_url ? (
                            <img
                              src={resolveImageUrl(item.image_url)}
                              alt="Thumbnail"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileImage className="w-4 h-4 text-text-tertiary" />
                          )}
                        </div>
                        <span className="font-mono text-xs text-text-primary font-medium truncate max-w-xs">
                          {item.filename}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {item.is_crack ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent/15 text-[#E07A65] border border-accent/25">
                          Crack detected
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald/15 text-emerald-text border border-emerald/25">
                          Clear surface
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-text-primary text-xs">
                      {(item.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 font-mono text-text-tertiary">
                      {item.boxes ? item.boxes.length : item.is_crack ? 1 : 0}
                    </td>
                    <td className="py-3 px-4 font-mono text-text-tertiary text-[11px]">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-accent group-hover:text-accent-hover text-xs inline-flex items-center space-x-1 font-medium">
                        <span>View</span>
                        <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
