import { useState, useEffect } from 'react';
import { socket, connectSocket, disconnectSocket } from '../services/socket';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { AlertTriangle, MapPin, Target, ShieldAlert, CheckCircle2, Activity, ShieldCheck, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getEvents } from '../services/api';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Initial fetch
    const fetchInitialAlerts = async () => {
      try {
        const data = await getEvents();
        setAlerts(data.data || []);
      } catch (err) {
        console.error('Failed to load initial alerts', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInitialAlerts();

    // Connect to real-time feed
    connectSocket();
    
    socket.on('new_alert', (alert) => {
      setAlerts(prev => [alert, ...prev]);
    });

    return () => {
      socket.off('new_alert');
      disconnectSocket();
    };
  }, []);

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'all') return true;
    return a.severity === filter;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="text-danger w-6 h-6" /> 
            Real-time Alerts Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">Live incident feed from all virtual border sectors.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setFilter('all')} 
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === 'all' ? 'bg-primary text-white' : 'bg-surface border border-border text-slate-400 hover:text-white'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('critical')} 
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === 'critical' ? 'bg-danger text-white shadow-[0_0_10px_#ef4444]' : 'bg-surface border border-border text-slate-400 hover:text-danger'}`}
          >
            Critical
          </button>
          <button 
            onClick={() => setFilter('warning')} 
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === 'warning' ? 'bg-warning text-black shadow-[0_0_10px_#f59e0b]' : 'bg-surface border border-border text-slate-400 hover:text-warning'}`}
          >
            Warning
          </button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden glass-panel border-primary/20 shadow-xl shadow-primary/5">
        <CardContent className="flex-1 overflow-auto p-0 custom-scrollbar">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <Activity className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Connecting to alert stream...</p>
            </div>
          ) : filteredAlerts.length > 0 ? (
            <Table>
              <TableHeader className="bg-surface/50 sticky top-0 backdrop-blur-md z-10 border-b border-primary/20">
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Location / Camera</TableHead>
                  <TableHead>Track/Zone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Evidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredAlerts.map((alert) => (
                    <motion.tr 
                      key={alert.event_id || alert._id || Math.random()}
                      initial={{ opacity: 0, backgroundColor: 'rgba(59, 130, 246, 0.2)' }}
                      animate={{ opacity: 1, backgroundColor: 'transparent' }}
                      layout
                      className="group hover:bg-surfaceHover border-b border-border transition-colors"
                    >
                      <TableCell>
                        <div className={`w-2 h-2 rounded-full ${alert.severity === 'critical' ? 'bg-danger animate-pulse shadow-[0_0_8px_#ef4444]' : alert.severity === 'warning' ? 'bg-warning' : 'bg-primary'}`}></div>
                      </TableCell>
                      <TableCell className="text-slate-300 font-mono text-sm">
                        {new Date(alert.timestamp || Date.now()).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="font-semibold text-white tracking-wide uppercase text-xs">
                        {alert.type || alert.event_type || 'Unknown Event'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'info'}>
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <Camera className="w-4 h-4 text-slate-500" />
                          {alert.camera_name || alert.camera_id || 'Global'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {alert.track_id && <span className="text-xs text-slate-400 font-mono">ID: #{alert.track_id}</span>}
                          {alert.zone_id && <Badge variant="warning" className="text-[10px] w-fit px-1.5 py-0 bg-warning/20 text-warning border-warning/30">{alert.zone_id}</Badge>}
                          {!alert.track_id && !alert.zone_id && <span className="text-slate-600 text-xs">-</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-bold tracking-wider">
                          <CheckCircle2 className="w-4 h-4" />
                          Pending Review
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {alert.evidence ? (
                          <button onClick={() => window.location.href = '/evidence'} className="text-xs text-primary hover:underline">
                            View Snapshot
                          </button>
                        ) : (
                          <span className="text-slate-600 text-xs">-</span>
                        )}
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <ShieldCheck className="w-16 h-16 text-success/40 mb-4" />
              <p className="text-lg font-medium text-slate-300">All Sectors Secure</p>
              <p className="text-sm mt-1">No alerts matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Alerts;
