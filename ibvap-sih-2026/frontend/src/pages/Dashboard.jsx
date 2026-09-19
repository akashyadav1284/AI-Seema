import { useState, useEffect } from 'react';
import { getCameras, getEvents, getAnalyticsSummary } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Camera, AlertTriangle, ShieldCheck, Activity, Target, Crosshair, Eye, Users } from 'lucide-react';
import AnimatedMap from '../components/ui/AnimatedMap';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCameras: 0,
    onlineCameras: 0,
    activeAlerts: 0,
    eventsToday: 0,
    liveDetections: 0,
    trackedObjects: 0
  });

  const [cameras, setCameras] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [camData, evtData, summary] = await Promise.all([
          getCameras().catch(() => ({ items: [], total: 0 })),
          getEvents().catch(() => ({ items: [], total: 0 })),
          getAnalyticsSummary().catch(() => ({
             total_cameras: 0, active_cameras: 0, total_events: 0, total_alerts: 0, unresolved_alerts: 0
          }))
        ]);
        
        const camList = camData.items || [];
        setCameras(camList);
        
        setStats({
          totalCameras: summary.total_cameras || camList.length,
          onlineCameras: summary.active_cameras || camList.filter(c => c.status === 'active' || c.status === 'online').length,
          activeAlerts: summary.unresolved_alerts || 0,
          eventsToday: summary.total_events || evtData.total || 0,
          liveDetections: Math.floor(Math.random() * 50) + 10, // Mock for visual
          trackedObjects: Math.floor(Math.random() * 20) + 5 // Mock for visual
        });

        setRecentEvents((evtData.items || []).slice(0, 8));
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      }
    };
    
    fetchDashboardData();
    
    import('../services/socket').then(({ socketService }) => {
      socketService.subscribe('events');
      
      const handleNewEvent = (data) => {
        if (data.event) {
          setRecentEvents(prev => {
            const id = data.event.event_id || data.event.id;
            if (prev.some(e => (e.event_id || e.id) === id)) return prev;
            return [data.event, ...prev].slice(0, 8);
          });
          
          setStats(prev => ({ ...prev, eventsToday: prev.eventsToday + 1 }));
        }
      };
      
      const handleAlertCreated = () => {
         setStats(prev => ({ ...prev, activeAlerts: prev.activeAlerts + 1 }));
      };
      
      const handleAlertResolved = () => {
         setStats(prev => ({ ...prev, activeAlerts: Math.max(0, prev.activeAlerts - 1) }));
      };

      socketService.on('event.created', handleNewEvent);
      socketService.on('alert.created', handleAlertCreated);
      socketService.on('alert.resolved', handleAlertResolved);
      
      return () => {
        socketService.off('event.created', handleNewEvent);
        socketService.off('alert.created', handleAlertCreated);
        socketService.off('alert.resolved', handleAlertResolved);
        socketService.unsubscribe('events');
      };
    });
  }, []);

  const activeAlertEvents = recentEvents.filter(e => e.severity === 'critical' || e.severity === 'warning' || e.severity === 'HIGH');

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col h-[calc(100vh-6rem)] space-y-4"
    >
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">Intelligence Operations Center</h2>
          <p className="text-textMuted text-sm mt-1">Border Surveillance & Threat Analysis</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={stats.activeAlerts > 0 ? "danger" : "success"} className="px-3 py-1 text-sm shadow-sm">
            {stats.activeAlerts > 0 ? `${stats.activeAlerts} ACTIVE INCIDENTS` : "NO CRITICAL INCIDENTS"}
          </Badge>
        </div>
      </motion.div>

      {/* KPI Strip */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 shrink-0">
        <Card className="hover:border-primary/20 transition-colors">
          <CardContent className="p-4 flex flex-col justify-between h-full relative overflow-hidden">
            <div className="absolute right-0 top-0 p-4 opacity-10">
              <Camera className="w-16 h-16" />
            </div>
            <p className="text-xs font-semibold text-textMuted uppercase tracking-wider">Cameras</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-bold text-text">{stats.onlineCameras}</p>
              <p className="text-sm font-medium text-textMuted">/ {stats.totalCameras}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-info/20 transition-colors">
          <CardContent className="p-4 flex flex-col justify-between h-full relative overflow-hidden">
            <div className="absolute right-0 top-0 p-4 opacity-10 text-info">
              <Eye className="w-16 h-16" />
            </div>
            <p className="text-xs font-semibold text-info uppercase tracking-wider">Live Detections</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-bold text-text">{stats.liveDetections}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/20 transition-colors">
          <CardContent className="p-4 flex flex-col justify-between h-full relative overflow-hidden">
            <div className="absolute right-0 top-0 p-4 opacity-10">
              <Crosshair className="w-16 h-16" />
            </div>
            <p className="text-xs font-semibold text-textMuted uppercase tracking-wider">Tracked Objects</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-bold text-text">{stats.trackedObjects}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cn("transition-colors", stats.activeAlerts > 0 ? "border-danger/40 bg-danger/5" : "hover:border-danger/20")}>
          <CardContent className="p-4 flex flex-col justify-between h-full relative overflow-hidden">
            <div className="absolute right-0 top-0 p-4 opacity-10 text-danger">
              <AlertTriangle className="w-16 h-16" />
            </div>
            <p className="text-xs font-semibold text-danger uppercase tracking-wider">Active Alerts</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-bold text-danger">{stats.activeAlerts}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-warning/20 transition-colors">
          <CardContent className="p-4 flex flex-col justify-between h-full relative overflow-hidden">
            <div className="absolute right-0 top-0 p-4 opacity-10 text-warning">
              <Activity className="w-16 h-16" />
            </div>
            <p className="text-xs font-semibold text-textMuted uppercase tracking-wider">Events (24h)</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-bold text-text">{stats.eventsToday}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:border-success/20 transition-colors">
          <CardContent className="p-4 flex flex-col justify-between h-full relative overflow-hidden">
            <div className="absolute right-0 top-0 p-4 opacity-10 text-success">
              <ShieldCheck className="w-16 h-16" />
            </div>
            <p className="text-xs font-semibold text-success uppercase tracking-wider">System Health</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-xl font-bold text-success uppercase tracking-wide">Online</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Grid: Map + Timeline */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        
        {/* Interactive Virtual Map */}
        <motion.div variants={itemVariants} className="lg:col-span-3 flex flex-col gap-6 min-h-0 relative">
          <div className="flex-1 min-h-[400px] relative rounded-lg overflow-hidden shadow-sm border border-border bg-slate-50 flex items-center justify-center">
             <div className="absolute inset-0">
               {/* Map placeholder or component */}
               <AnimatedMap cameras={cameras} activeAlerts={activeAlertEvents} />
             </div>
             {/* Overlay UI for Map */}
             <div className="absolute top-4 right-4 bg-surface p-2 rounded-md shadow-md border border-border flex flex-col gap-2">
                <button className="p-1.5 hover:bg-slate-100 rounded text-textMuted"><Target className="w-4 h-4" /></button>
                <button className="p-1.5 hover:bg-slate-100 rounded text-textMuted"><Users className="w-4 h-4" /></button>
             </div>
          </div>
        </motion.div>

        {/* Event Timeline */}
        <motion.div variants={itemVariants} className="lg:col-span-1 h-full">
          <Card className="flex flex-col h-full overflow-hidden border-border shadow-sm">
            <CardHeader className="py-3 px-4 border-b border-border bg-slate-50 sticky top-0 z-10">
              <CardTitle className="text-sm flex items-center justify-between text-text">
                <span className="uppercase tracking-widest font-semibold text-xs text-textMuted">Live Event Feed</span>
                <Target className="w-4 h-4 text-textMuted" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-4 custom-scrollbar bg-white">
              {recentEvents.length > 0 ? (
                <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-slate-200">
                  <AnimatePresence initial={false}>
                    {recentEvents.map((evt) => (
                      <motion.div 
                        key={evt.event_id || evt._id || evt.id || (evt.timestamp + evt.event_type)} 
                        layout
                        initial={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, x: 0, height: 'auto', marginBottom: 16 }}
                        transition={{ opacity: { duration: 0.2 } }}
                        className="relative pl-8 group origin-top"
                      >
                        <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${evt.severity === 'critical' || evt.severity === 'HIGH' ? 'bg-danger' : evt.severity === 'warning' || evt.severity === 'MEDIUM' ? 'bg-warning' : 'bg-primary'}`}>
                           <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-md hover:bg-slate-100 transition-colors overflow-hidden shadow-sm">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold text-text uppercase tracking-wide">{evt.event_type || evt.type}</span>
                            <span className="text-[10px] text-textMuted font-mono">{new Date(evt.timestamp * 1000 || Date.now()).toLocaleTimeString()}</span>
                          </div>
                          <div className="text-xs text-textMuted font-medium">
                            {evt.camera_id || evt.camera_name || 'CAM_UNKNOWN'}
                          </div>
                          {(evt.severity === 'critical' || evt.severity === 'HIGH') && (
                            <div className="mt-2 text-[10px] text-danger font-bold bg-danger/10 border border-danger/20 px-2 py-1 rounded inline-block">
                              IMMEDIATE ACTION REQUIRED
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-textMuted text-center">
                  <Activity className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-sm font-medium">No recent events.</p>
                  <p className="text-xs mt-1">Monitoring all virtual sectors...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
        
      </div>
    </motion.div>
  );
};

export default Dashboard;
