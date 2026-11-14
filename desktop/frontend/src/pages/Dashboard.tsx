import React from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { HealthData, AnalyzeResult } from '../services/api';

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
  const totalScans = recentInspections.length;
  const crackScans = recentInspections.filter((r) => r.is_crack).length;
  const clearScans = totalScans - crackScans;

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-zinc-800">
      {/* Title & Primary Action */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Inspection overview</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Surface health inspection and defect localization status
          </p>
        </div>

        <button
          onClick={onStartUpload}
          className="px-3.5 py-2 bg-[#c92a2a] hover:bg-[#b02525] text-white text-xs font-medium rounded transition flex items-center space-x-1.5 shadow-sm"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>New inspection</span>
        </button>
      </div>

      {/* Practical Summary Strip (Not cards, just a clean horizontal data strip) */}
      <div className="flex items-center space-x-8 py-3 px-4 bg-white border border-zinc-200 rounded text-xs">
        <div>
          <span className="text-zinc-500 block text-[11px]">Total inspections</span>
          <span className="font-mono text-base font-semibold text-zinc-900">{totalScans}</span>
        </div>
        <div className="border-l border-zinc-200 h-8" />
        <div>
          <span className="text-zinc-500 block text-[11px]">Cracks detected</span>
          <span className="font-mono text-base font-semibold text-[#c92a2a]">{crackScans}</span>
        </div>
        <div className="border-l border-zinc-200 h-8" />
        <div>
          <span className="text-zinc-500 block text-[11px]">Clear surfaces</span>
          <span className="font-mono text-base font-semibold text-zinc-700">{clearScans}</span>
        </div>
        <div className="border-l border-zinc-200 h-8" />
        <div>
          <span className="text-zinc-500 block text-[11px]">Inference device</span>
          <span className="font-mono text-xs text-zinc-700 uppercase">
            {health?.device || 'CPU'}
          </span>
        </div>
      </div>

      {/* Recent Inspections Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium text-zinc-700">Recent inspections</h2>
          <span className="text-[11px] font-mono text-zinc-400">Ordered by timestamp</span>
        </div>

        {recentInspections.length === 0 ? (
          <div className="p-8 border border-zinc-200 rounded bg-white text-center space-y-2">
            <p className="text-xs text-zinc-500">No recent inspections in current session.</p>
            <button
              onClick={onStartUpload}
              className="text-xs text-[#c92a2a] hover:underline font-medium"
            >
              Analyze a concrete photograph &rarr;
            </button>
          </div>
        ) : (
          <div className="border border-zinc-200 rounded overflow-hidden bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-medium">
                <tr>
                  <th className="py-2 px-3">File</th>
                  <th className="py-2 px-3">Verdict</th>
                  <th className="py-2 px-3">Confidence</th>
                  <th className="py-2 px-3">Regions</th>
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-zinc-700">
                {recentInspections.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectResult(item)}
                    className="hover:bg-zinc-50 cursor-pointer transition"
                  >
                    <td className="py-2.5 px-3 font-mono text-zinc-900 truncate max-w-xs font-medium">
                      {item.filename}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={
                          item.is_crack
                            ? 'text-[#c92a2a] font-medium'
                            : 'text-zinc-600'
                        }
                      >
                        {item.predicted_class}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {(item.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-500">
                      {item.boxes ? item.boxes.length : item.is_crack ? 1 : 0}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-500 text-[11px]">
                      {new Date(item.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-[#c92a2a] hover:underline text-xs inline-flex items-center space-x-0.5">
                        <span>View</span>
                        <ArrowRight className="w-3 h-3" />
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
