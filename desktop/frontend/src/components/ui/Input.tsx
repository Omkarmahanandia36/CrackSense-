import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ElementType;
  rightIcon?: React.ElementType;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon: LeftIcon, rightIcon: RightIcon, className = '', disabled, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-[12px] font-medium" style={{ color: 'var(--text-2)' }}>
            {label}
          </label>
        )}
        <div
          className={`
            relative flex items-center transition-all duration-150
            ${disabled ? 'opacity-50 pointer-events-none' : ''}
          `}
          style={{
            background: 'var(--glass-sunken-bg)',
            border: `1px solid ${error ? 'var(--crack)' : 'var(--glass-sunken-border)'}`,
            borderRadius: 'var(--r-control)',
          }}
        >
          {LeftIcon && (
            <div className="pl-3 pr-1 pointer-events-none" style={{ color: 'var(--text-3)' }}>
              <LeftIcon className="w-4 h-4" strokeWidth={1.5} />
            </div>
          )}
          <input
            ref={ref}
            disabled={disabled}
            className={`
              w-full h-10 bg-transparent px-3 text-xs outline-none
              placeholder:text-[--text-3] transition-colors
              ${LeftIcon ? 'pl-1' : ''}
              ${RightIcon ? 'pr-1' : ''}
              ${className}
            `}
            style={{ color: 'var(--text-1)' }}
            {...props}
          />
          {RightIcon && (
            <div className="pr-3 pl-1 pointer-events-none" style={{ color: 'var(--text-3)' }}>
              <RightIcon className="w-4 h-4" strokeWidth={1.5} />
            </div>
          )}
        </div>
        {error && (
          <span className="text-[11px]" style={{ color: 'var(--crack)' }}>
            {error}
          </span>
        )}
        {!error && hint && (
          <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
            {hint}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
