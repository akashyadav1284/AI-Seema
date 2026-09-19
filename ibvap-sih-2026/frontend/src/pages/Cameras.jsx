import { useState, useEffect } from 'react';
import { getCameras, addCamera } from '../services/api';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Search, Plus, MoreVertical, MapPin, Video, Wifi, WifiOff, Loader2, Play, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { VideoPlayer } from '../components/ui/VideoPlayer';

const Cameras = () => {
  const [cameras, setCameras] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCamera, setNewCamera] = useState({ name: '', camera_id: '', source_type: 'rtsp', source: '' });
  const [availableDevices, setAvailableDevices] = useState([]);
  const [activeCamera, setActiveCamera] = useState(null);
  const [cameraEvents, setCameraEvents] = useState([]);

  useEffect(() => {
    let unsubscribe = () => {};
    
    if (activeCamera) {
      setCameraEvents([]); 
      const channelId = `camera:${activeCamera.camera_id || activeCamera.id}`;
      
      import('../services/socket').then(({ socketService }) => {
        socketService.subscribe(channelId);
        
        const handleCameraEvent = (data) => {
          if (data.event) {
            setCameraEvents(prev => [data.event, ...prev].slice(0, 10));
          }
        };
        
        socketService.on('event.created', handleCameraEvent);
        
        unsubscribe = () => {
          socketService.off('event.created', handleCameraEvent);
          socketService.unsubscribe(channelId);
        };
      });
    }
    
    return () => {
      unsubscribe();
    };
  }, [activeCamera]);

  const fetchDevices = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        await navigator.mediaDevices.getUserMedia({ video: true }).catch(() => {});
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setAvailableDevices(videoDevices);
      }
    } catch (e) {
      console.error("Error fetching devices", e);
    }
  };

  useEffect(() => {
    if (isModalOpen) {
      fetchDevices();
    }
  }, [isModalOpen]);

  const handleAddCamera = async () => {
    try {
      const addedCamera = await addCamera(newCamera);
      setCameras([...cameras, { ...addedCamera, status: 'online', location: 'Local', capabilities: ['Standard'] }]);
      setIsModalOpen(false);
      setNewCamera({ name: '', camera_id: '', source_type: 'rtsp', source: '' });
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to add camera");
    }
  };

  useEffect(() => {
    const fetchCameras = async () => {
      setIsLoading(true);
      try {
        const data = await getCameras();
        setCameras(data.items || []);
      } catch (error) {
        console.error("Failed to load cameras", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCameras();
  }, []);

  const filteredCameras = cameras.filter(cam => 
    cam.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    cam.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Camera Management</h1>
          <p className="text-textMuted text-sm mt-1">Manage connected cameras, IP streams, and video sources.</p>
        </div>
        <Button className="shrink-0 gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Camera
        </Button>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-sm border-border">
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
            <input 
              type="text" 
              placeholder="Search cameras by name or location..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md pl-9 pr-4 py-2 text-sm text-text placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
            />
          </div>
          <div className="hidden sm:flex text-sm font-medium text-textMuted">
            {cameras.length} Total Cameras
          </div>
        </div>
        
        <CardContent className="flex-1 overflow-auto p-0 bg-white">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-textMuted">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Loading camera network...</p>
            </div>
          ) : filteredCameras.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Camera Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>IP Address / Source</TableHead>
                  <TableHead>AI Analytics</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCameras.map((cam) => (
                  <TableRow key={cam.camera_id || cam.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {cam.status === 'online' || cam.status === 'active' ? (
                          <Wifi className="w-4 h-4 text-success" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-danger" />
                        )}
                        <Badge variant={cam.status === 'online' || cam.status === 'active' ? 'success' : 'danger'}>
                          {cam.status || 'offline'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-text">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-textMuted" />
                        {cam.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-textMuted">
                        <MapPin className="w-4 h-4" />
                        {cam.location || 'Local'}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-textMuted bg-slate-50 px-2 py-1 rounded inline-block">
                      {cam.source || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {cam.capabilities?.map(cap => (
                          <Badge key={cap} variant="info" className="text-[10px] px-1.5 py-0">
                            {cap}
                          </Badge>
                        )) || <span className="text-textMuted text-xs font-medium">Standard</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" className="p-2 h-8 w-8 text-primary hover:text-primary hover:bg-slate-100" onClick={() => setActiveCamera(cam)} title="Live Stream">
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" className="p-2 h-8 w-8 text-textMuted hover:bg-slate-100" title="Settings">
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" className="p-2 h-8 w-8 text-textMuted hover:bg-slate-100" title="More">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-textMuted space-y-4 p-8">
              <Video className="w-12 h-12 text-slate-300" />
              <div className="text-center">
                <p className="text-text font-medium">No cameras found</p>
                <p className="text-sm mt-1">Try adjusting your search or add a new camera.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Camera Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text/20 backdrop-blur-sm p-4">
          <div className="bg-white border border-border p-6 rounded-lg shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-4 text-text">Add New Camera</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Camera Name</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white shadow-sm" value={newCamera.name} onChange={e => setNewCamera({...newCamera, name: e.target.value})} placeholder="e.g. Front Gate" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Camera ID</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white shadow-sm" value={newCamera.camera_id} onChange={e => setNewCamera({...newCamera, camera_id: e.target.value})} placeholder="e.g. CAM-01" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Source Type</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white shadow-sm" value={newCamera.source_type} onChange={e => setNewCamera({...newCamera, source_type: e.target.value})}>
                  <option value="rtsp">RTSP Stream</option>
                  <option value="video">Video File</option>
                  <option value="webcam">Webcam</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  {newCamera.source_type === 'webcam' ? 'Select Webcam' : 'Source (URL/Path)'}
                </label>
                {newCamera.source_type === 'webcam' ? (
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white shadow-sm" 
                    value={newCamera.source} 
                    onChange={e => setNewCamera({...newCamera, source: e.target.value})}
                  >
                    <option value="">-- Select Device --</option>
                    {availableDevices.map((device, index) => (
                      <option key={device.deviceId || index} value={index.toString()}>
                        {device.label || `Camera ${index + 1}`}
                      </option>
                    ))}
                    {availableDevices.length === 0 && <option disabled>No cameras found</option>}
                  </select>
                ) : (
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white shadow-sm" value={newCamera.source} onChange={e => setNewCamera({...newCamera, source: e.target.value})} placeholder="rtsp://..." />
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleAddCamera}>Save Camera</Button>
            </div>
          </div>
        </div>
      )}

      {/* Stream Modal */}
      {activeCamera && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-surface border border-border p-2 rounded-lg shadow-xl w-full max-w-4xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-4 py-2 mb-2 border-b border-slate-100">
              <h2 className="text-lg font-bold text-text">Live Stream: {activeCamera.name}</h2>
              <Button variant="ghost" className="h-8 text-textMuted" onClick={() => setActiveCamera(null)}>Close</Button>
            </div>
            <div className="aspect-video w-full relative bg-black rounded-md overflow-hidden">
              <VideoPlayer 
                src={null} 
                cameraName={activeCamera.name} 
                className="w-full h-full"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <p className="bg-black/50 px-4 py-2 rounded text-white text-sm">Live stream unavailable</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cameras;
