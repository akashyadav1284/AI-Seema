import React from 'react';
import { cn } from '../../lib/utils';

export function Badge({ children, variant = 'default', className, ...props }) {
  const variants = {
    default: 'bg-slate-800 text-slate-300',
    success: 'bg-success/20 text-success border border-success/30',
    warning: 'bg-warning/20 text-warning border border-warning/30',
    danger: 'bg-danger/20 text-danger border border-danger/30',
    info: 'bg-primary/20 text-primary border border-primary/30',
  };

  return (
    <span
      className={cn(
        "px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
