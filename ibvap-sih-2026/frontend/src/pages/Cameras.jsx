import { useState, useEffect } from 'react';
import { getCameras } from '../services/api';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Search, Plus, MoreVertical, MapPin, Video, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

const Cameras = () => {
  const [cameras, setCameras] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchCameras = async () => {
      setIsLoading(true);
      try {
        const data = await getCameras();
        setCameras(data.data || []);
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
          <h1 className="text-2xl font-semibold tracking-tight text-white">Camera Management</h1>
          <p className="text-slate-400 text-sm mt-1">Manage connected cameras, IP streams, and video sources.</p>
        </div>
        <Button className="shrink-0 gap-2">
          <Plus className="w-4 h-4" />
          Add Camera
        </Button>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-surfaceHover/30">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search cameras by name or location..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border rounded-md pl-9 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          <div className="hidden sm:flex text-sm text-slate-400">
            {cameras.length} Total Cameras
          </div>
        </div>
        
        <CardContent className="flex-1 overflow-auto p-0">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
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
                  <TableRow key={cam.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {cam.status === 'online' ? (
                          <Wifi className="w-4 h-4 text-success" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-danger" />
                        )}
                        <Badge variant={cam.status === 'online' ? 'success' : 'danger'}>
                          {cam.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-slate-400" />
                        {cam.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-400">
                        <MapPin className="w-4 h-4" />
                        {cam.location}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">
                      {cam.source || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {cam.capabilities?.map(cap => (
                          <Badge key={cap} variant="info" className="text-[10px] px-1.5 py-0">
                            {cap}
                          </Badge>
                        )) || <span className="text-slate-500 text-xs">Standard</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" className="p-2 h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 p-8">
              <Video className="w-12 h-12 text-slate-700" />
              <div className="text-center">
                <p className="text-slate-300 font-medium">No cameras found</p>
                <p className="text-sm mt-1">Try adjusting your search or add a new camera.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Cameras;
