import React from 'react';

interface ConfidenceBarProps {
  confidence: number;
  isCrack: boolean;
  probabilities?: {
    positive_crack: number;
    negative_clear: number;
  };
}

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({
  confidence,
  isCrack,
  probabilities,
}) => {
  const percent = Math.round(confidence * 100);
  const crackPercent = probabilities ? Math.round(probabilities.positive_crack * 100) : percent;
  const clearPercent = probabilities ? Math.round(probabilities.negative_clear * 100) : 100 - percent;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
          AI Model Confidence
        </span>
        <span
          className={`text-sm font-bold font-mono px-2 py-0.5 rounded ${
            isCrack
              ? 'bg-red-950 text-red-400 border border-red-800/60'
              : 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
          }`}
        >
          {percent}% Confidence
        </span>
      </div>

      {/* Main Bar */}
      <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            isCrack
              ? 'bg-gradient-to-r from-orange-500 to-red-500'
              : 'bg-gradient-to-r from-teal-500 to-emerald-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Probability Split Breakdown */}
      {probabilities && (
        <div className="grid grid-cols-2 gap-2 pt-1 text-xs font-mono">
          <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 flex justify-between items-center">
            <span className="text-red-400">Crack Prob:</span>
            <span className="text-slate-200 font-bold">{crackPercent}%</span>
          </div>
          <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 flex justify-between items-center">
            <span className="text-emerald-400">Clear Prob:</span>
            <span className="text-slate-200 font-bold">{clearPercent}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
