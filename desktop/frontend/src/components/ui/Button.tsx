import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ElementType;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}) => {
  const sizeClasses = {
    sm: 'h-8 px-2.5 text-xs gap-1.5',
    md: 'h-9 px-3.5 text-xs font-medium gap-2',
    lg: 'h-10 px-4 text-sm font-medium gap-2.5',
  }[size];

  const variantStyles: Record<string, { className: string; style?: React.CSSProperties }> = {
    primary: {
      className: 'hover:brightness-105 active:brightness-95 font-medium shadow-sm',
      style: {
        background: 'var(--accent)',
        color: 'var(--accent-text)',
      },
    },
    secondary: {
      className: 'glass-base hover:bg-[--hover-bg] active:bg-[--active-bg] text-slate-200 hover:text-white',
      style: {
        border: '1px solid var(--glass-border)',
      },
    },
    ghost: {
      className: 'hover:bg-[--hover-bg] active:bg-[--active-bg] text-slate-400 hover:text-slate-200',
    },
    danger: {
      className: 'bg-red-500/15 hover:bg-red-500/25 active:bg-red-500/30 text-red-400 border border-red-500/30',
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.primary;

  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center select-none
        transition-all duration-150 ease-out active:scale-[0.98]
        disabled:opacity-40 disabled:pointer-events-none cursor-pointer rounded-lg
        ${sizeClasses}
        ${currentVariant.className}
        ${className}
      `}
      style={{
        borderRadius: 'var(--r-control)',
        ...currentVariant.style,
      }}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
      ) : (
        Icon && iconPosition === 'left' && <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.6} />
      )}
      {children && <span>{children}</span>}
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.6} />
      )}
    </button>
  );
};
