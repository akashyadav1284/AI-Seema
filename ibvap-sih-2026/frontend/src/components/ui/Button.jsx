import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export function Button({ children, variant = 'primary', className, ...props }) {
  const baseStyles = "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-primary text-white hover:bg-primaryHover focus:ring-primary shadow-sm",
    secondary: "bg-surfaceHover text-text border border-border hover:bg-slate-200 focus:ring-slate-300",
    danger: "bg-danger text-white hover:bg-dangerHover focus:ring-danger shadow-sm",
    ghost: "bg-transparent text-textMuted hover:bg-slate-100 hover:text-text focus:ring-slate-200"
  };

  return (
    <button
      className={cn(baseStyles, variants[variant] || variants.primary, className)}
      {...props}
    >
      {children}
    </button>
  );
}
