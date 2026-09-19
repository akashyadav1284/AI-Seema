import React, { useEffect, useState } from 'react';
import { getCameras } from '../services/api';
import { VideoPlayer } from '../components/ui/VideoPlayer';
import { Button } from '../components/ui/Button';
import { LayoutGrid, Square, Filter, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const LiveMonitoring = () => {
  const [cameras, setCameras] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'single', 'grid' (2x2), 'large' (3x3)
  const [activeCameraId, setActiveCameraId] = useState(null);

  useEffect(() => {
    const fetchCameras = async () => {
      setIsLoading(true);
      try {
        const res = await getCameras();
        const camList = res.data || [];
        setCameras(camList);
        if (camList.length > 0) {
          setActiveCameraId(camList[0].camera_id || camList[0].id);
        }
      } catch (err) {
        console.error("Failed to load cameras for live view", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCameras();
  }, []);

  const getGridClass = () => {
    if (viewMode === 'single') return 'grid-cols-1';
    if (viewMode === 'grid') return 'grid-cols-1 md:grid-cols-2';
    if (viewMode === 'large') return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
    return 'grid-cols-1';
  };

  const visibleCameras = viewMode === 'single' 
    ? cameras.filter(c => (c.camera_id || c.id) === activeCameraId)
    : cameras.slice(0, viewMode === 'grid' ? 4 : 9);

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
                <option key={cam.camera_id || cam.id} value={cam.camera_id || cam.id}>{cam.name}</option>
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
          </div>
          
          <Button variant="secondary" className="gap-2 hidden sm:flex bg-white">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>
      </div>
      
      <div className="flex-1 bg-slate-100 border border-border rounded-xl p-4 overflow-y-auto shadow-inner">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p>Connecting to camera network...</p>
          </div>
        ) : cameras.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <p>No cameras available.</p>
          </div>
        ) : (
          <div className={cn("grid gap-4 h-full auto-rows-fr", getGridClass())}>
            {visibleCameras.map((cam) => (
              <VideoPlayer 
                key={cam.camera_id || cam.id}
                src={`${API_BASE}/stream/${cam.camera_id || cam.id}`} 
                cameraName={`${cam.name} (${cam.location || 'Local'})`}
                capabilities={cam.capabilities || ['YOLOv8', 'Tracking']}
                className="w-full h-full min-h-[300px]"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveMonitoring;
