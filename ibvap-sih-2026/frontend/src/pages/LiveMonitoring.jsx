import React, { useEffect, useState } from 'react';
import { getCameras } from '../services/api';
import { VideoPlayer } from '../components/ui/VideoPlayer';
import { Button } from '../components/ui/Button';
import { LayoutGrid, Square, Filter, Loader2, Info, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { socketService } from '../services/socket';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const LiveMonitoring = () => {
  const [cameras, setCameras] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [activeCameraId, setActiveCameraId] = useState(null);
  
  // State for AI Information Panel
  const [cameraStats, setCameraStats] = useState({});

  useEffect(() => {
    const fetchCameras = async () => {
      setIsLoading(true);
      try {
        const res = await getCameras();
        // Fix camera discovery: API returns { items: [...], total: ... }
        const camList = res.items || res.data || [];
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

  // Subscribe to WebSocket for active camera (or global)
  useEffect(() => {
    const handleEvent = (data) => {
      if (!data.camera_id) return;
      setCameraStats(prev => ({
        ...prev,
        [data.camera_id]: {
          ...prev[data.camera_id],
          latestEvent: data.event,
        }
      }));
    };

    const handleAlert = (data) => {
      if (!data.camera_id) return;
      setCameraStats(prev => ({
        ...prev,
        [data.camera_id]: {
          ...prev[data.camera_id],
          latestAlert: data.alert,
        }
      }));
    };

    socketService.on('event.created', handleEvent);
    socketService.on('alert.created', handleAlert);

    // Subscribe to channels based on visible cameras
    const visibleCamIds = cameras.map(c => c.camera_id || c.id);
    visibleCamIds.forEach(id => socketService.subscribe(`camera:${id}`));

    return () => {
      socketService.off('event.created', handleEvent);
      socketService.off('alert.created', handleAlert);
      visibleCamIds.forEach(id => socketService.unsubscribe(`camera:${id}`));
    };
  }, [cameras]);

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

  const activeCam = viewMode === 'single' ? visibleCameras[0] : null;
  const activeStats = activeCam ? cameraStats[activeCam.camera_id || activeCam.id] : null;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500 space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Live Monitoring</h1>
          <p className="text-textMuted text-sm mt-1">Real-time surveillance feeds with AI intelligence</p>
        </div>
        
        <div className="flex items-center gap-3">
          {viewMode === 'single' && cameras.length > 0 && (
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
      
      {/* Main Content Area */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Video Grid */}
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
              {visibleCameras.map((cam) => {
                const camId = cam.camera_id || cam.id;
                const stats = cameraStats[camId];
                return (
                  <div key={camId} className="relative flex flex-col bg-black rounded-xl overflow-hidden border border-slate-800 h-full">
                    <VideoPlayer 
                      src={`${API_BASE}/stream/${camId}`} 
                      cameraName={`${cam.name} (${cam.location || 'Local'})`}
                      capabilities={cam.capabilities || ['YOLOv8', 'Tracking']}
                      className="w-full h-full"
                    />
                    {/* Small overlay indicators on grid items */}
                    {viewMode !== 'single' && stats && (
                      <div className="absolute top-12 left-3 flex flex-col gap-1 z-20">
                        {stats.latestAlert && (
                          <span className="bg-danger/80 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase backdrop-blur-sm shadow-sm flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3"/> Alert
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Information Panel - Only in Single View */}
        {viewMode === 'single' && activeCam && (
          <div className="w-80 flex flex-col shrink-0 bg-white border border-border rounded-xl shadow-sm overflow-hidden animate-in slide-in-from-right-4 duration-300 h-full">
            <div className="p-4 border-b border-border bg-slate-50/50">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                <h2 className="font-semibold text-text">Camera Info</h2>
              </div>
              <p className="text-sm font-medium text-text">{activeCam.name}</p>
              <p className="text-xs text-textMuted font-mono mt-1">{activeCam.camera_id || activeCam.id}</p>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto space-y-6">
              {/* Telemetry placeholder */}
              <div>
                <h3 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3">Live Telemetry</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-border">
                    <p className="text-xs text-textMuted mb-1">Detection Count</p>
                    <p className="text-lg font-semibold text-text">N/A</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-border">
                    <p className="text-xs text-textMuted mb-1">Active Tracks</p>
                    <p className="text-lg font-semibold text-text">N/A</p>
                  </div>
                </div>
              </div>

              {/* Latest Event */}
              <div>
                <h3 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3">Latest Event</h3>
                {activeStats?.latestEvent ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-blue-700 font-medium text-sm mb-1">
                      <Info className="w-4 h-4" />
                      {activeStats.latestEvent.event_type}
                    </div>
                    <div className="text-xs text-slate-600 mb-2">
                      Confidence: {Math.round((activeStats.latestEvent.confidence || 0) * 100)}%
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Clock className="w-3 h-3" />
                      {new Date(activeStats.latestEvent.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-textMuted italic">Waiting for events...</p>
                )}
              </div>

              {/* Latest Alert */}
              <div>
                <h3 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3">Latest Alert</h3>
                {activeStats?.latestAlert ? (
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-700 font-medium text-sm mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      {activeStats.latestAlert.alert_type}
                    </div>
                    <div className="text-xs text-slate-600 mb-2">
                      Priority: <span className="font-bold">{activeStats.latestAlert.priority}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Clock className="w-3 h-3" />
                      {new Date(activeStats.latestAlert.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-textMuted italic">No alerts.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveMonitoring;

