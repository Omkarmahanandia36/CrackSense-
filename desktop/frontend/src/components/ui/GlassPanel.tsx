import React from 'react';

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'base' | 'raised' | 'sunken';
  children?: React.ReactNode;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  variant = 'base',
  className = '',
  style,
  children,
  ...props
}) => {
  const variantClass =
    variant === 'raised'
      ? 'glass-raised'
      : variant === 'sunken'
      ? 'glass-sunken'
      : 'glass-base';

  return (
    <div className={`${variantClass} ${className}`} style={style} {...props}>
      {children}
    </div>
  );
};
