import { useState, useEffect } from 'react';
import { socketService } from '../services/socket';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Crosshair, MoveRight, Loader2, Activity } from 'lucide-react';

const Tracks = () => {
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen for tracks_update event
    const handleTracksUpdate = (data) => {
      // Assuming data is an array of active tracks or an object containing them
      const updatedTracks = Array.isArray(data) ? data : data.tracks || [];
      setTracks(updatedTracks);
      setIsLoading(false);
    };

    socketService.on('tracks_update', handleTracksUpdate);

    // Timeout to clear loading state if no data
    const timeout = setTimeout(() => setIsLoading(false), 2000);

    return () => {
      socketService.off('tracks_update', handleTracksUpdate);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Live Tracks & Detections</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time object tracking and movement analysis across all cameras.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="animate-pulse px-3 py-1 text-sm shadow-[0_0_15px_currentColor]">
            <Activity className="w-4 h-4 mr-2 inline" />
            LIVE DATA
          </Badge>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="py-4 px-5 border-b border-border bg-surfaceHover/30 flex flex-row items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-widest font-bold text-primary flex items-center">
            <Crosshair className="w-4 h-4 mr-2" />
            Active Tracked Objects ({tracks.length})
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-auto p-0 custom-scrollbar">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Waiting for tracker stream...</p>
            </div>
          ) : tracks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Track ID</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Camera</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Active Zones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tracks.map((track) => (
                  <TableRow key={track.track_id || track.id}>
                    <TableCell className="font-mono text-sm text-slate-300">
                      #{track.track_id || track.id || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="info" className="uppercase text-[10px]">
                        {track.class_label || track.class || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {Math.round((track.confidence || 0) * 100)}%
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {track.camera_name || track.camera_id || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-400">
                        <MoveRight className="w-4 h-4" />
                        <span className="capitalize">{track.direction || 'Stationary'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {track.zones && track.zones.length > 0 ? (
                           track.zones.map(z => (
                             <Badge key={z} variant="warning" className="text-[10px] px-1.5 py-0 bg-warning/20 text-warning border-warning/30">
                               {z}
                             </Badge>
                           ))
                        ) : (
                          <span className="text-slate-500 text-xs">-</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 p-8">
              <Crosshair className="w-12 h-12 text-slate-700" />
              <div className="text-center">
                <p className="text-slate-300 font-medium">No objects currently tracked</p>
                <p className="text-sm mt-1">Waiting for movement in camera feeds...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Tracks;
