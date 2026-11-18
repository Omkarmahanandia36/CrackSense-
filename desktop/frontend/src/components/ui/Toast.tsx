import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastProps {
  id?: string;
  type?: ToastType;
  title: string;
  message?: string;
  onClose?: () => void;
  durationMs?: number;
}

const icons: Record<ToastType, React.ElementType> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

const iconColors: Record<ToastType, string> = {
  info: 'var(--accent)',
  success: 'var(--success)',
  warning: 'var(--crack-amber)',
  error: 'var(--crack)',
};

export const Toast: React.FC<ToastProps> = ({
  type = 'info',
  title,
  message,
  onClose,
  durationMs,
}) => {
  const Icon = icons[type];
  const color = iconColors[type];

  useEffect(() => {
    if (!durationMs || !onClose) return;
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onClose]);

  return (
    <div
      className="glass-raised flex items-start gap-3 p-3.5 shadow-xl select-none animate-fade-rise"
      style={{
        borderRadius: 'var(--r-control)',
        maxWidth: 360,
      }}
    >
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} style={{ color }} />
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-medium" style={{ color: 'var(--text-1)' }}>
          {title}
        </h4>
        {message && (
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-2)' }}>
            {message}
          </p>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-md transition-colors hover:bg-[--hover-bg]"
          style={{ color: 'var(--text-3)' }}
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
};
