import React from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  History,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { AnalyzeResult, HealthData } from '../services/api';

interface DashboardProps {
  onStartUpload: () => void;
  onSelectResult: (result: AnalyzeResult) => void;
  recentInspections: AnalyzeResult[];
  health: HealthData | null;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onStartUpload,
  onSelectResult,
  recentInspections,
  health,
}) => {
  const total = recentInspections.length;
  const cracksCount = recentInspections.filter((r) => r.is_crack).length;
  const clearCount = total - cracksCount;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-900 border border-blue-900/40 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-xl">
          <span className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold bg-blue-950 px-2.5 py-1 rounded-md border border-blue-800/50">
            Phase 4: AI Inspection Workstation
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            Concrete Crack Surface Health Monitoring
          </h2>
          <p className="text-sm text-slate-400">
            Powered by a fine-tuned ResNet-18 classifier and FastAPI backend. Upload surface photographs to identify structural fractures with real-time confidence scores.
          </p>
        </div>

        <button
          onClick={onStartUpload}
          className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm flex items-center space-x-2 transition shadow-lg shadow-blue-600/25 flex-shrink-0"
        >
          <UploadCloud className="w-4 h-4" />
          <span>New Concrete Inspection</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-medium tracking-wider">Total Scanned</span>
            <History className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-100 font-mono">{total}</div>
          <p className="text-[11px] text-slate-500">Patches evaluated this session</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-medium tracking-wider">Cracks Detected</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-3xl font-extrabold text-red-400 font-mono">{cracksCount}</div>
          <p className="text-[11px] text-slate-500">Positive classification results</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-medium tracking-wider">Clear Surfaces</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono">{clearCount}</div>
          <p className="text-[11px] text-slate-500">Intact concrete without defects</p>
        </div>
      </div>

      {/* System Hardware & Model Diagnostics */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-blue-400" />
          <span>System & Hardware Acceleration</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 block">FastAPI Server:</span>
            <span className="text-slate-200 font-bold">{health ? 'Online (Port 8000)' : 'Offline'}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 block">Inference Hardware:</span>
            <span className="text-blue-400 font-bold">
              {health?.device === 'cuda' ? 'NVIDIA GPU (CUDA FP16)' : 'CPU Mode'}
            </span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 block">Classification Model:</span>
            <span className="text-emerald-400 font-bold">ResNet-18 (Phase 2 Weights)</span>
          </div>
        </div>
      </div>

      {/* Recent Inspections Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
            <History className="w-4 h-4 text-blue-400" />
            <span>Recent Inspections</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">{recentInspections.length} recorded</span>
        </div>

        {recentInspections.length === 0 ? (
          <div className="text-center py-10 space-y-2 border border-dashed border-slate-800 rounded-lg">
            <p className="text-xs text-slate-400">No inspections performed yet.</p>
            <button
              onClick={onStartUpload}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center space-x-1"
            >
              <span>Upload your first concrete image</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentInspections.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectResult(item)}
                className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex space-x-3 cursor-pointer hover:border-slate-700 transition"
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-800">
                  <img
                    src={item.image_url}
                    alt={item.filename}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold font-mono ${
                        item.is_crack
                          ? 'bg-red-950 text-red-400 border border-red-800/60'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      }`}
                    >
                      {item.is_crack ? 'CRACK' : 'CLEAR'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {(item.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-200 truncate mt-1">{item.filename}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {new Date(item.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
