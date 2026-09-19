import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, ShieldAlert, Wifi, Map as MapIcon, Layers, EyeOff, Eye } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from './Badge';

// Helper to map lat/lng to percentages (approximate bounds for New Delhi demo area)
const MIN_LAT = 28.6000;
const MAX_LAT = 28.6200;
const MIN_LNG = 77.1950;
const MAX_LNG = 77.2250;

const latToY = (lat) => `${100 - (((lat - MIN_LAT) / (MAX_LAT - MIN_LAT)) * 80 + 10)}%`; // Invert Y for lat
const lngToX = (lng) => `${((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * 80 + 10}%`;

export const AnimatedMap = ({ cameras = [], activeAlerts = [], tracks = [], zones = [], className }) => {
  const [scanRotation, setScanRotation] = useState(0);
  const [layers, setLayers] = useState({
    cameras: true,
    tracks: true,
    alerts: true,
    zones: true
  });

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

  const toggleLayer = (layer) => setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));

  return (
    <div className={cn("relative w-full h-full rounded-lg overflow-hidden bg-slate-100 border border-border z-0 flex items-center justify-center", className)}>
      
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(#cbd5e1_1px,transparent_1px),linear-gradient(90deg,#cbd5e1_1px,transparent_1px)] bg-[size:40px_40px] opacity-40" />
      
      {/* Central Radar Rings */}
      <div className="absolute flex items-center justify-center pointer-events-none">
        <motion.div 
          className="w-[300px] h-[300px] rounded-full border border-slate-300"
          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute w-[450px] h-[450px] rounded-full border border-slate-300 border-dashed"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute w-[600px] h-[600px] rounded-full border border-slate-200" />
        
        {/* Radar Sweep */}
        <div 
          className="absolute w-full h-full rounded-full"
          style={{
            background: `conic-gradient(from ${scanRotation}deg, transparent 0deg, transparent 270deg, rgba(59, 130, 246, 0.05) 360deg)`,
            transform: `rotate(${scanRotation}deg)`,
            transformOrigin: 'center center'
          }}
        />
      </div>

      {/* Map Content Container */}
      <div className="absolute inset-0">
        
        {/* Zones */}
        <AnimatePresence>
          {layers.zones && zones.map((zone) => {
            // Simplified zone rendering (circles for demo)
            const zoneCameras = cameras.filter(c => zone.cameras?.includes(c.id));
            if (zoneCameras.length === 0) return null;
            
            // Average lat/lng for center
            const centerLat = zoneCameras.reduce((acc, c) => acc + c.lat, 0) / zoneCameras.length;
            const centerLng = zoneCameras.reduce((acc, c) => acc + c.lng, 0) / zoneCameras.length;
            
            const top = latToY(centerLat);
            const left = lngToX(centerLng);
            const color = zone.riskLevel === 'CRITICAL' ? 'border-danger bg-danger/5' : 
                          zone.riskLevel === 'HIGH' ? 'border-danger/60 bg-danger/5' : 
                          zone.riskLevel === 'MEDIUM' ? 'border-warning bg-warning/5' : 'border-primary/50 bg-primary/5';
            
            return (
              <motion.div
                key={zone.id}
                className={cn("absolute rounded-full border-2 border-dashed flex items-center justify-center -translate-x-1/2 -translate-y-1/2", color)}
                style={{ top, left, width: '200px', height: '200px' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-50 absolute bottom-4">
                  {zone.name}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Nodes (Cameras) */}
        <AnimatePresence>
          {layers.cameras && cameras.map((cam, idx) => {
            const top = latToY(cam.lat);
            const left = lngToX(cam.lng);
            const isOnline = cam.status === 'ONLINE';
            const isDegraded = cam.status === 'DEGRADED';
            
            return (
              <motion.div 
                key={cam.id}
                className="absolute group z-20"
                style={{ top, left }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ delay: idx * 0.05, type: 'spring' }}
              >
                <div className="relative flex items-center justify-center w-6 h-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer">
                  <div className={cn("absolute w-full h-full rounded-full animate-ping opacity-50", isOnline ? 'bg-success' : isDegraded ? 'bg-warning' : 'bg-danger')} />
                  <div className={cn("relative w-3 h-3 rounded-full border-2 border-white", isOnline ? 'bg-success' : isDegraded ? 'bg-warning' : 'bg-danger shadow-sm')} />
                </div>
                
                {/* Hover Label */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  <div className="bg-white border border-border shadow-md px-3 py-2 rounded-md text-xs">
                    <div className="font-bold text-text">{cam.name}</div>
                    <div className="text-textMuted mt-1 flex items-center gap-2 font-medium">
                      <span className={isOnline ? 'text-success' : isDegraded ? 'text-warning' : 'text-danger'}>
                        {cam.status}
                      </span>
                      {cam.fps > 0 && <span className="text-slate-400">| {cam.fps} FPS</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Alerts */}
        <AnimatePresence>
          {layers.alerts && activeAlerts.filter(a => a.status === 'NEW').map((alert, idx) => {
            const cam = cameras.find(c => c.id === alert.camera);
            if (!cam) return null;
            const top = latToY(cam.lat);
            const left = lngToX(cam.lng);
            
            return (
              <motion.div
                key={`alert-${alert.id}`}
                className="absolute z-10 pointer-events-none"
                style={{ top, left }}
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.2, 1] }}
                exit={{ scale: 0 }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <div className="w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-danger/10 border border-danger/30 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-danger" />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Tracks */}
        <AnimatePresence>
          {layers.tracks && tracks.map((track) => {
            const top = latToY(track.lat);
            const left = lngToX(track.lng);
            
            return (
              <motion.div
                key={track.id}
                className="absolute z-30 group cursor-pointer"
                animate={{ top, left }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ type: 'tween', ease: 'linear', duration: 1 }} // Smooth animation
              >
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full border border-white shadow-sm -translate-x-1/2 -translate-y-1/2", 
                  track.type === 'PERSON' ? 'bg-primary' : track.type === 'VEHICLE' ? 'bg-warning' : 'bg-info'
                )} />
                
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  <div className="bg-surface border border-border shadow-md px-2 py-1 rounded text-[10px]">
                    <div className="font-bold text-text uppercase">{track.type}</div>
                    <div className="text-textMuted font-mono">ID: {track.id}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Controls Overlay */}
      <div className="absolute top-4 left-4 z-40 flex flex-col gap-2">
        <div className="bg-white border border-border shadow-sm px-3 py-2 rounded-md text-primary text-xs font-mono font-bold tracking-widest flex items-center gap-2">
          <Crosshair className="w-4 h-4" />
          TACTICAL MAP
        </div>
      </div>

      <div className="absolute top-4 right-4 z-40 bg-white border border-border shadow-sm rounded-lg p-2 flex flex-col gap-1 w-40">
        <div className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-1 px-1">Layers</div>
        <button onClick={() => toggleLayer('cameras')} className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded text-xs text-text transition-colors">
          <div className="flex items-center gap-2"><Wifi className="w-3.5 h-3.5 text-primary" /> Cameras</div>
          {layers.cameras ? <Eye className="w-3.5 h-3.5 text-slate-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-300" />}
        </button>
        <button onClick={() => toggleLayer('zones')} className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded text-xs text-text transition-colors">
          <div className="flex items-center gap-2"><MapIcon className="w-3.5 h-3.5 text-slate-500" /> Zones</div>
          {layers.zones ? <Eye className="w-3.5 h-3.5 text-slate-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-300" />}
        </button>
        <button onClick={() => toggleLayer('tracks')} className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded text-xs text-text transition-colors">
          <div className="flex items-center gap-2"><Crosshair className="w-3.5 h-3.5 text-warning" /> Live Tracks</div>
          {layers.tracks ? <Eye className="w-3.5 h-3.5 text-slate-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-300" />}
        </button>
        <button onClick={() => toggleLayer('alerts')} className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded text-xs text-text transition-colors">
          <div className="flex items-center gap-2"><ShieldAlert className="w-3.5 h-3.5 text-danger" /> Alerts</div>
          {layers.alerts ? <Eye className="w-3.5 h-3.5 text-slate-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-300" />}
        </button>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-40 bg-white/90 backdrop-blur border border-border shadow-sm rounded-lg p-3">
        <div className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-2">Legend</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px]">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-success"></div> Camera Online</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-danger"></div> Camera Offline</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary"></div> Person Track</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-warning"></div> Vehicle Track</div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedMap;
