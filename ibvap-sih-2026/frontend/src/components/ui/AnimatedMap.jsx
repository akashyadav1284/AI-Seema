import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crosshair, ShieldAlert, Wifi } from 'lucide-react';
import { cn } from '../../lib/utils';

// Abstract, highly animated "Digital Twin" style radar map
const AnimatedMap = ({ cameras = [], activeAlerts = [], className }) => {
  const [scanRotation, setScanRotation] = useState(0);

  // Radar sweep animation
  useEffect(() => {
    let animationFrameId;
    const rotate = () => {
      setScanRotation((prev) => (prev + 1) % 360);
      animationFrameId = requestAnimationFrame(rotate);
    };
    rotate();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className={cn("relative w-full h-full rounded-lg overflow-hidden glass-panel z-0 bg-background/80 flex items-center justify-center", className)}>
      
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />
      
      {/* Central Radar Rings */}
      <div className="absolute flex items-center justify-center pointer-events-none">
        <motion.div 
          className="w-[300px] h-[300px] rounded-full border border-primary/30"
          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute w-[450px] h-[450px] rounded-full border border-primary/20 border-dashed"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute w-[600px] h-[600px] rounded-full border border-primary/10" />
        
        {/* Radar Sweep */}
        <div 
          className="absolute w-full h-full rounded-full"
          style={{
            background: `conic-gradient(from ${scanRotation}deg, transparent 0deg, transparent 270deg, rgba(59, 130, 246, 0.3) 360deg)`,
            transform: `rotate(${scanRotation}deg)`,
            transformOrigin: 'center center'
          }}
        />
      </div>

      {/* Nodes (Cameras) */}
      <div className="absolute inset-0">
        {cameras.map((cam, idx) => {
          // Deterministic pseudorandom placement for demo
          const top = `${30 + (idx * 17) % 40}%`;
          const left = `${20 + (idx * 23) % 60}%`;
          
          return (
            <motion.div 
              key={cam.id}
              className="absolute group"
              style={{ top, left }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.1, type: 'spring' }}
            >
              <div className="relative flex items-center justify-center w-6 h-6">
                <div className={cn("absolute w-full h-full rounded-full animate-ping opacity-75", cam.status === 'online' ? 'bg-success' : 'bg-danger')} />
                <div className={cn("relative w-3 h-3 rounded-full border-2 border-white", cam.status === 'online' ? 'bg-success shadow-[0_0_10px_#10b981]' : 'bg-danger shadow-[0_0_10px_#ef4444]')} />
              </div>
              
              {/* Hover Label */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                <div className="glass-panel px-3 py-2 rounded-lg text-xs">
                  <div className="font-bold text-slate-100">{cam.name}</div>
                  <div className="text-primary mt-1 flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    {cam.status.toUpperCase()}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Alerts */}
        {activeAlerts.map((alert, idx) => {
          const top = `${40 + (idx * 11) % 30}%`;
          const left = `${30 + (idx * 31) % 40}%`;
          
          return (
            <motion.div
              key={`alert-${idx}`}
              className="absolute"
              style={{ top, left }}
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <div className="w-32 h-32 -mt-16 -ml-16 rounded-full bg-danger/20 border border-danger/50 flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-danger animate-pulse" />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="glass-panel px-3 py-1 rounded text-primary text-xs font-mono font-bold tracking-widest flex items-center gap-2">
          <Crosshair className="w-4 h-4" />
          SYSTEM LIVE
        </div>
      </div>
    </div>
  );
};

export default AnimatedMap;
