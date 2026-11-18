import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
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
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-xs font-medium gap-2',
    lg: 'h-11 px-5 text-sm font-medium gap-2.5',
  }[size];

  const variantStyles: Record<string, { className: string; style?: React.CSSProperties }> = {
    primary: {
      className: 'shadow-md hover:brightness-105 active:brightness-95 font-semibold',
      style: {
        background: 'var(--accent)',
        color: 'var(--accent-text)',
        boxShadow: '0 4px 14px var(--accent-glow)',
      },
    },
    secondary: {
      className: 'glass-base hover:bg-[--hover-bg] active:bg-[--active-bg]',
      style: { color: 'var(--text-1)' },
    },
    ghost: {
      className: 'hover:bg-[--hover-bg] active:bg-[--active-bg]',
      style: { color: 'var(--text-2)' },
    },
  };

  const currentVariant = variantStyles[variant];

  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center select-none
        transition-all duration-150 ease-out active:scale-[0.98]
        disabled:opacity-40 disabled:pointer-events-none cursor-pointer
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
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        Icon && iconPosition === 'left' && <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
      )}
      {children && <span>{children}</span>}
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
      )}
    </button>
  );
};
