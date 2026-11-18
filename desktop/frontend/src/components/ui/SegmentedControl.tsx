import React, { useRef, useEffect, useState } from 'react';

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

  useEffect(() => {
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
  }, [value, options]);

  const heightClass = size === 'sm' ? 'h-8' : 'h-9';
  const paddingClass = size === 'sm' ? 'px-2.5 text-xs' : 'px-3.5 text-xs';

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center p-1 select-none ${className}`}
      style={{
        background: 'var(--glass-sunken-bg)',
        border: '1px solid var(--glass-sunken-border)',
        borderRadius: 'var(--r-pill)',
      }}
    >
      {/* Sliding indicator pill */}
      <div
        className="absolute transition-all duration-200 ease-out pointer-events-none"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
          top: 4,
          bottom: 4,
          background: 'var(--glass-raised-bg)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3)',
          borderRadius: 'var(--r-pill)',
          border: '1px solid var(--glass-border)',
        }}
      />

      {options.map((opt) => {
        const isActive = opt.id === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            data-segment
            onClick={() => onChange(opt.id)}
            className={`
              relative z-10 flex items-center justify-center gap-1.5 font-medium
              transition-colors duration-150 cursor-pointer ${heightClass} ${paddingClass}
            `}
            style={{
              borderRadius: 'var(--r-pill)',
              color: isActive ? 'var(--text-1)' : 'var(--text-2)',
            }}
          >
            {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
