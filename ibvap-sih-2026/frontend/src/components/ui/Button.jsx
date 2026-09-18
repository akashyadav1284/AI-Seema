import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export function Button({ children, variant = 'primary', className, ...props }) {
  const baseStyles = "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-primary text-white hover:bg-primaryHover focus:ring-primary shadow-[0_0_10px_rgba(59,130,246,0.3)] hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]",
    secondary: "bg-surfaceHover text-slate-200 border border-border hover:bg-white/10 focus:ring-slate-700",
    danger: "bg-danger text-white hover:bg-dangerHover focus:ring-danger shadow-[0_0_10px_rgba(244,63,94,0.3)]",
    ghost: "bg-transparent text-slate-300 hover:bg-white/10 hover:text-white focus:ring-slate-700"
  };

  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cn(baseStyles, variants[variant] || variants.primary, className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}
