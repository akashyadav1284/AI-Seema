import React, { useEffect, useState } from 'react';
import { getCameras } from '../services/api';
import { VideoPlayer } from '../components/ui/VideoPlayer';
import { Button } from '../components/ui/Button';
import { LayoutGrid, Square, Filter, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSimulation } from '../contexts/SimulationContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const LiveMonitoring = () => {
  const { cameras, isDemoMode } = useSimulation();
  const [viewMode, setViewMode] = useState('grid'); // 'single', 'grid' (2x2), 'large' (3x3), 'wall' (4x3)
  const [activeCameraId, setActiveCameraId] = useState(null);

  useEffect(() => {
    if (cameras.length > 0 && !activeCameraId) {
      setActiveCameraId(cameras[0].id);
    }
  }, [cameras, activeCameraId]);

  const getGridClass = () => {
    if (viewMode === 'single') return 'grid-cols-1';
    if (viewMode === 'grid') return 'grid-cols-1 md:grid-cols-2';
    if (viewMode === 'large') return 'grid-cols-2 lg:grid-cols-3';
    if (viewMode === 'wall') return 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    return 'grid-cols-1';
  };

  const visibleCameras = viewMode === 'single' 
    ? cameras.filter(c => c.id === activeCameraId)
    : cameras.slice(0, viewMode === 'grid' ? 4 : viewMode === 'large' ? 9 : 12);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Live Monitoring</h1>
          <p className="text-textMuted text-sm mt-1">Real-time surveillance feeds with AI intelligence</p>
        </div>
        
        <div className="flex items-center gap-3">
          {viewMode === 'single' && (
            <select 
              className="bg-white border border-border text-text text-sm rounded-md px-3 py-2 focus:ring-primary focus:border-primary shadow-sm"
              value={activeCameraId || ''}
              onChange={(e) => setActiveCameraId(e.target.value)}
            >
              {cameras.map(cam => (
                <option key={cam.id} value={cam.id}>{cam.name}</option>
              ))}
            </select>
          )}

          <div className="flex items-center p-1 bg-white border border-border rounded-lg shadow-sm">
            <button 
              onClick={() => setViewMode('single')}
              className={cn("p-1.5 rounded-md transition-colors text-textMuted", viewMode === 'single' && "bg-slate-100 text-primary")}
              title="Single View"
            >
              <Square className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-1.5 rounded-md transition-colors text-textMuted", viewMode === 'grid' && "bg-slate-100 text-primary")}
              title="2x2 Grid View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('large')}
              className={cn("p-1.5 rounded-md transition-colors text-textMuted", viewMode === 'large' && "bg-slate-100 text-primary")}
              title="3x3 Large Grid"
            >
              <div className="w-5 h-5 grid grid-cols-3 gap-0.5">
                {[...Array(9)].map((_, i) => <div key={i} className="bg-current rounded-[1px]" />)}
              </div>
            </button>
            <button 
              onClick={() => setViewMode('wall')}
              className={cn("p-1.5 rounded-md transition-colors text-textMuted", viewMode === 'wall' && "bg-slate-100 text-primary")}
              title="Camera Wall (All)"
            >
              <div className="w-5 h-5 grid grid-cols-4 gap-[1px]">
                {[...Array(12)].map((_, i) => <div key={i} className="bg-current rounded-[1px]" />)}
              </div>
            </button>
          </div>
          
          <Button variant="secondary" className="gap-2 hidden sm:flex bg-white">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>
      </div>
      
      <div className="flex-1 bg-slate-100 border border-border rounded-xl p-4 overflow-y-auto shadow-inner">
        {cameras.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <p>No cameras available.</p>
          </div>
        ) : (
          <div className={cn("grid gap-4 h-full auto-rows-fr", getGridClass())}>
            {visibleCameras.map((cam) => (
              <div key={cam.id} className="relative group rounded-xl overflow-hidden bg-black border border-slate-700 shadow-md flex items-center justify-center">
                {isDemoMode ? (
                  <div className="absolute inset-0 bg-slate-900 overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                    <div className="absolute top-0 left-0 w-full p-2 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start z-10">
                      <div className="flex gap-2">
                        <span className={cn("px-1.5 py-0.5 rounded-sm text-[10px] font-bold text-white uppercase", cam.status === 'ONLINE' ? 'bg-success' : cam.status === 'DEGRADED' ? 'bg-warning' : 'bg-danger')}>
                          {cam.status}
                        </span>
                        <span className="text-white text-xs font-mono font-medium drop-shadow-md">{cam.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white text-[10px] font-mono opacity-80">{new Date().toLocaleTimeString()}</div>
                        <div className="text-success text-[10px] font-mono font-bold">{cam.fps} FPS</div>
                      </div>
                    </div>
                    {cam.status === 'OFFLINE' ? (
                      <div className="h-full flex items-center justify-center text-danger text-sm font-bold tracking-widest uppercase">
                        NO SIGNAL
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center opacity-30">
                        <VideoPlayer 
                          src="" 
                          cameraName={cam.name}
                          capabilities={['YOLOv8', 'Tracking']}
                          className="w-full h-full"
                          isMock={true}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <VideoPlayer 
                    src={`${API_BASE}/stream/${cam.id}`} 
                    cameraName={`${cam.name} (${cam.sector || 'Local'})`}
                    capabilities={['YOLOv8', 'Tracking']}
                    className="w-full h-full min-h-[250px]"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveMonitoring;
