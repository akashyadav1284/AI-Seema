import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export function Card({ className, ...props }) {
  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.2, ease: "easeOut" } }}
      className={cn(
        "bg-surface border border-border rounded-lg shadow-sm overflow-hidden transition-colors hover:border-primary/40 hover:shadow-[0_4px_20px_rgba(59,130,246,0.1)]", 
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn("px-6 py-4 border-b border-border flex items-center justify-between", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn("text-lg font-semibold text-slate-100", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }) {
  return (
    <div
      className={cn("p-6", className)}
      {...props}
    />
  );
}
