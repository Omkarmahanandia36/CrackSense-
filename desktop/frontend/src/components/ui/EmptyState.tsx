import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`glass-sunken flex flex-col items-center justify-center text-center p-12 border-dashed ${className}`}
      style={{ borderRadius: 'var(--r-panel)' }}
    >
      {Icon && (
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{
            background: 'var(--hover-bg)',
            border: '1px solid var(--glass-sunken-border)',
            color: 'var(--text-3)',
          }}
        >
          <Icon className="w-6 h-6" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
        {title}
      </h3>
      {description && (
        <p className="text-xs max-w-sm mt-1.5 leading-relaxed" style={{ color: 'var(--text-2)' }}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant="secondary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
