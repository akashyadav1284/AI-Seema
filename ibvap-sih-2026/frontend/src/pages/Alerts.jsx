import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { AlertTriangle, ShieldAlert, CheckCircle2, Activity, ShieldCheck, Camera, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAlerts, acknowledgeAlert, resolveAlert } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { user } = useAuth();

  const fetchAlertsData = async () => {
    setIsLoading(true);
    try {
      const data = await getAlerts();
      setAlerts(data.items || []);
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertsData();
    
    // Polling as a fallback since WebSockets are excluded in Phase 11B
    const interval = setInterval(fetchAlertsData, 10000);
    
    // Subscribe to real-time events via WebSocket
    let unsubscribe = () => {};
    import('../services/socket').then(({ socketService }) => {
      socketService.subscribe('events');
      
      const handleAlertCreated = (data) => {
        if (data.alert) {
          setAlerts(prev => {
            const id = data.alert.alert_id;
            if (prev.some(a => a.alert_id === id)) return prev;
            return [data.alert, ...prev];
          });
        }
      };
      
      const handleAlertUpdated = (data) => {
        if (data.alert) {
          setAlerts(prev => prev.map(a => a.alert_id === data.alert.alert_id ? data.alert : a));
        }
      };

      socketService.on('alert.created', handleAlertCreated);
      socketService.on('alert.acknowledged', handleAlertUpdated);
      socketService.on('alert.resolved', handleAlertUpdated);
      
      unsubscribe = () => {
        socketService.off('alert.created', handleAlertCreated);
        socketService.off('alert.acknowledged', handleAlertUpdated);
        socketService.off('alert.resolved', handleAlertUpdated);
        socketService.unsubscribe('events');
      };
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const handleAcknowledge = async (alertId) => {
    try {
      await acknowledgeAlert(alertId);
      await fetchAlertsData();
    } catch (err) {
      console.error('Failed to acknowledge alert', err);
      alert('Error acknowledging alert: ' + err.message);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      await resolveAlert(alertId, "Resolved by user");
      await fetchAlertsData();
    } catch (err) {
      console.error('Failed to resolve alert', err);
      alert('Error resolving alert: ' + err.message);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'all') return true;
    return a.severity === filter;
  });

  const canActionAlert = user?.role === 'admin' || user?.role === 'operator';

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="text-danger w-6 h-6" /> 
            Alerts Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">Incident feed from all virtual border sectors.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setFilter('all')} 
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === 'all' ? 'bg-primary text-white' : 'bg-surface border border-border text-slate-400 hover:text-white'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('HIGH')} 
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === 'HIGH' ? 'bg-danger text-white shadow-[0_0_10px_#ef4444]' : 'bg-surface border border-border text-slate-400 hover:text-danger'}`}
          >
            High
          </button>
          <button 
            onClick={() => setFilter('MEDIUM')} 
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === 'MEDIUM' ? 'bg-warning text-black shadow-[0_0_10px_#f59e0b]' : 'bg-surface border border-border text-slate-400 hover:text-warning'}`}
          >
            Medium
          </button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden glass-panel border-primary/20 shadow-xl shadow-primary/5">
        <CardContent className="flex-1 overflow-auto p-0 custom-scrollbar">
          {isLoading && alerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <Activity className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Loading alert stream...</p>
            </div>
          ) : filteredAlerts.length > 0 ? (
            <Table>
              <TableHeader className="bg-surface/50 sticky top-0 backdrop-blur-md z-10 border-b border-primary/20">
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Alert Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Camera ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredAlerts.map((alert) => (
                    <motion.tr 
                      key={alert.alert_id}
                      initial={{ opacity: 0, backgroundColor: 'rgba(59, 130, 246, 0.2)' }}
                      animate={{ opacity: 1, backgroundColor: 'transparent' }}
                      layout
                      className="group hover:bg-surfaceHover border-b border-border transition-colors"
                    >
                      <TableCell>
                        <div className={`w-2 h-2 rounded-full ${alert.severity === 'HIGH' ? 'bg-danger animate-pulse shadow-[0_0_8px_#ef4444]' : alert.severity === 'MEDIUM' ? 'bg-warning' : 'bg-primary'}`}></div>
                      </TableCell>
                      <TableCell className="text-slate-300 font-mono text-sm">
                        {new Date(alert.created_at * 1000).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-semibold text-white tracking-wide uppercase text-xs">
                        {alert.alert_type}
                      </TableCell>
                      <TableCell>
                        <Badge variant={alert.severity === 'HIGH' ? 'danger' : alert.severity === 'MEDIUM' ? 'warning' : 'info'}>
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <Camera className="w-4 h-4 text-slate-500" />
                          {alert.camera_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-bold tracking-wider">
                          {alert.status === 'RESOLVED' ? (
                            <><CheckCircle2 className="w-4 h-4 text-success" /> Resolved</>
                          ) : alert.status === 'ACKNOWLEDGED' ? (
                            <><Activity className="w-4 h-4 text-warning" /> Acknowledged</>
                          ) : (
                            <><AlertTriangle className="w-4 h-4 text-danger" /> New</>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {alert.status === 'NEW' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleAcknowledge(alert.alert_id)}
                              disabled={!canActionAlert}
                            >
                              <Check className="w-4 h-4 mr-1" /> Ack
                            </Button>
                          )}
                          {(alert.status === 'NEW' || alert.status === 'ACKNOWLEDGED') && (
                            <Button 
                              size="sm" 
                              variant="default"
                              className="bg-success hover:bg-success/90"
                              onClick={() => handleResolve(alert.alert_id)}
                              disabled={!canActionAlert}
                            >
                              <X className="w-4 h-4 mr-1" /> Resolve
                            </Button>
                          )}
                        </div>
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
