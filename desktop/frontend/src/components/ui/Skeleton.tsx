import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  circle = false,
  className = '',
  style,
  ...props
}) => {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius: circle ? '50%' : 'var(--r-control)',
        ...style,
      }}
      {...props}
    />
  );
};
