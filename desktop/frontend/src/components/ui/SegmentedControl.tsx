import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';

export interface SegmentOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ElementType;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  const updateIndicator = () => {
    if (!containerRef.current) return;
    const activeIndex = options.findIndex((opt) => opt.id === value);
    if (activeIndex === -1) return;

    const buttons = containerRef.current.querySelectorAll<HTMLButtonElement>('button[data-segment]');
    const targetButton = buttons[activeIndex];
    if (targetButton) {
      setIndicatorStyle({
        left: targetButton.offsetLeft,
        width: targetButton.offsetWidth,
      });
    }
  };

  useLayoutEffect(() => {
    updateIndicator();
  }, [value, options]);

  useEffect(() => {
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [value, options]);

  const heightClass = size === 'sm' ? 'h-7' : 'h-8';
  const paddingClass = size === 'sm' ? 'px-2.5 text-[11px]' : 'px-3 text-xs';

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center p-1 rounded-lg select-none ${className}`}
      style={{
        background: 'var(--glass-sunken-bg)',
        border: '1px solid var(--glass-sunken-border)',
      }}
    >
      {/* Precision indicator chip */}
      {indicatorStyle.width > 0 && (
        <div
          className="absolute transition-all duration-150 ease-out pointer-events-none rounded-md"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
            top: 3,
            bottom: 3,
            background: 'rgba(255, 255, 255, 0.10)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
          }}
        />
      )}

      {options.map((opt) => {
        const isActive = opt.id === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            data-segment
            onClick={() => onChange(opt.id)}
            className={`
              relative z-10 flex items-center justify-center gap-1.5 font-medium rounded-md
              transition-colors duration-150 cursor-pointer ${heightClass} ${paddingClass}
              ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}
            `}
          >
            {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
