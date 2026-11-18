import React, { useState } from 'react';

export interface TooltipProps {
  content: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom';
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={`
            absolute z-50 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap
            pointer-events-none shadow-md animate-fade-rise
            ${position === 'top' ? 'bottom-full mb-1.5 left-1/2 -translate-x-1/2' : 'top-full mt-1.5 left-1/2 -translate-x-1/2'}
          `}
          style={{
            background: 'var(--glass-raised-bg)',
            border: '1px solid var(--glass-raised-border)',
            backdropFilter: 'var(--glass-blur)',
            borderRadius: 'var(--r-control)',
            color: 'var(--text-1)',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};
