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
    <div
      className="rounded-xl p-3.5 space-y-2.5"
      style={{
        background: 'var(--glass-sunken-bg)',
        border: '1px solid var(--glass-sunken-border)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Neural Confidence
        </span>
        <span
          className="text-xs font-semibold font-mono px-2 py-0.5 rounded"
          style={{
            background: isCrack ? 'var(--crack-tint)' : 'var(--success-tint)',
            color: isCrack ? 'var(--crack)' : 'var(--success)',
            border: `1px solid ${isCrack ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
          }}
        >
          {percent}%
        </span>
      </div>

      {/* Main Bar */}
      <div
        className="w-full h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(255, 255, 255, 0.08)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percent}%`,
            background: isCrack ? 'var(--crack)' : 'var(--success)',
          }}
        />
      </div>

      {/* Probability Split Breakdown */}
      {probabilities && (
        <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
          <div
            className="p-2 rounded-lg flex justify-between items-center"
            style={{
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
            }}
          >
            <span className="text-red-400">Defect:</span>
            <span className="font-semibold text-slate-200">{crackPercent}%</span>
          </div>
          <div
            className="p-2 rounded-lg flex justify-between items-center"
            style={{
              background: 'rgba(16, 185, 129, 0.06)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
            }}
          >
            <span className="text-emerald-400">Sound:</span>
            <span className="font-semibold text-slate-200">{clearPercent}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
