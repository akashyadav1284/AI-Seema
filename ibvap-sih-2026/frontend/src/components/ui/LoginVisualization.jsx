import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/utils';

const LoginVisualization = ({ mousePosition }) => {
  const prefersReducedMotion = useReducedMotion();
  const [nodes, setNodes] = useState([]);
  
  // Parallax calculations based on mouse position
  const parallaxX = mousePosition ? (mousePosition.x / window.innerWidth - 0.5) * 20 : 0;
  const parallaxY = mousePosition ? (mousePosition.y / window.innerHeight - 0.5) * 20 : 0;

  // Generate random stable nodes
  useEffect(() => {
    const newNodes = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      x: 10 + Math.random() * 80, // percentage
      y: 10 + Math.random() * 80,
      pulseDelay: Math.random() * 5,
      active: Math.random() > 0.5
    }));
    setNodes(newNodes);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-50 flex items-center justify-center">
      {/* Base Grid Texture */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(#e2e8f0_1px,transparent_1px),linear-gradient(90deg,#e2e8f0_1px,transparent_1px)] bg-[size:40px_40px] opacity-70"
        style={{
          transform: !prefersReducedMotion ? `translate(${parallaxX * -0.5}px, ${parallaxY * -0.5}px)` : 'none',
          transition: 'transform 0.2s ease-out'
        }}
      />

      {/* Topographic Lines (Abstract SVG) */}
      <svg 
        className="absolute inset-0 w-full h-full opacity-30 stroke-slate-300 fill-none" 
        style={{
          transform: !prefersReducedMotion ? `translate(${parallaxX * 0.8}px, ${parallaxY * 0.8}px) scale(1.05)` : 'none',
          transition: 'transform 0.2s ease-out'
        }}
      >
        <path d="M-100,300 C200,200 400,400 800,200 S1200,300 1500,100" strokeWidth="1" />
        <path d="M-100,400 C150,300 350,500 700,350 S1100,450 1500,250" strokeWidth="1" strokeDasharray="4 4" />
        <path d="M-100,500 C250,450 450,300 850,500 S1300,400 1500,550" strokeWidth="1" />
      </svg>

      {/* Central Radar Sweep */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          transform: !prefersReducedMotion ? `translate(calc(-50% + ${parallaxX * 1.5}px), calc(-50% + ${parallaxY * 1.5}px))` : 'translate(-50%, -50%)',
          transition: 'transform 0.2s ease-out'
        }}
      >
        <div className="relative w-[600px] h-[600px]">
          {/* Static Rings */}
          <div className="absolute inset-0 rounded-full border border-slate-200" />
          <div className="absolute inset-12 rounded-full border border-slate-200 border-dashed opacity-50" />
          <div className="absolute inset-32 rounded-full border border-slate-300" />
          <div className="absolute inset-48 rounded-full border border-slate-200 border-dashed" />
          
          {/* Animated Sweep */}
          {!prefersReducedMotion && (
            <motion.div 
              className="absolute inset-0 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(30, 58, 138, 0.05) 360deg)'
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            />
          )}

          {/* Crosshairs */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-200" />
        </div>
      </div>

      {/* Interactive Nodes */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: !prefersReducedMotion ? `translate(${parallaxX * 2}px, ${parallaxY * 2}px)` : 'none',
          transition: 'transform 0.2s ease-out'
        }}
      >
        {nodes.map(node => (
          <div 
            key={node.id} 
            className="absolute" 
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            {/* Node Dot */}
            <div className={cn(
              "w-2 h-2 rounded-full border border-white shadow-sm relative z-10",
              node.active ? "bg-primary" : "bg-slate-400"
            )} />
            
            {/* Ping Animation */}
            {!prefersReducedMotion && node.active && (
              <motion.div 
                className="absolute -inset-2 rounded-full bg-primary/20 z-0"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  delay: node.pulseDelay,
                  ease: "easeOut"
                }}
              />
            )}
            
            {/* Technical Label */}
            <div className="absolute left-4 top-0 text-[9px] font-mono font-semibold text-slate-400 whitespace-nowrap">
              {node.active ? `NODE_${node.id.toString().padStart(2, '0')} [ACT]` : `NODE_${node.id.toString().padStart(2, '0')} [IDLE]`}
              <br />
              {node.x.toFixed(2)}, {node.y.toFixed(2)}
            </div>
          </div>
        ))}

        {/* Data Lines (connecting some active nodes) */}
        {!prefersReducedMotion && (
           <svg className="absolute inset-0 w-full h-full stroke-primary/20 fill-none z-0">
              {nodes.filter(n => n.active).map((node, i, arr) => {
                if (i === 0) return null;
                const prev = arr[i - 1];
                return (
                  <path 
                    key={`line-${i}`} 
                    d={`M${prev.x}%,${prev.y}% L${node.x}%,${node.y}%`} 
                    strokeWidth="1" 
                    strokeDasharray="4 4" 
                  />
                );
              })}
           </svg>
        )}
      </div>

      {/* Overlay Status Block */}
      <div className="absolute top-8 left-8 flex flex-col gap-1 pointer-events-none">
        <div className="flex items-center gap-3 mb-2">
           <div className="w-3 h-3 rounded-full bg-success shadow-sm animate-pulse" />
           <div className="text-sm font-bold tracking-widest text-text uppercase">Secure Network</div>
        </div>
        <div className="text-[10px] font-mono font-semibold text-textMuted uppercase">System Operational</div>
        <div className="text-[10px] font-mono font-semibold text-textMuted uppercase mt-4">
          LAT: {new Date().getTime().toString().slice(-6, -2)} | LNG: 00.412
        </div>
        <div className="text-[10px] font-mono font-semibold text-textMuted uppercase">
          SECURE CHANNEL 256-BIT
        </div>
      </div>
      
    </div>
  );
};

export default LoginVisualization;
