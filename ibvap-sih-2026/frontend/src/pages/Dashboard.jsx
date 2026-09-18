import { useState, useEffect } from 'react';
import { getCameras, getEvents } from '../services/api';
import { socket, connectSocket, disconnectSocket } from '../services/socket';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Camera, AlertTriangle, ShieldCheck, Activity, Target, Crosshair, Eye } from 'lucide-react';
import AnimatedMap from '../components/ui/AnimatedMap';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
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
        const [camData, evtData] = await Promise.all([
          getCameras().catch(() => ({ data: [], total: 0 })),
          getEvents().catch(() => ({ data: [], total: 0 }))
        ]);
        
        const camList = camData.data || [];
        setCameras(camList);
        
        setStats(prev => ({
          ...prev,
          totalCameras: camData.total || 0,
          onlineCameras: camList.filter(c => c.status === 'online').length || 0,
          eventsToday: evtData.total || 0
        }));

        setRecentEvents((evtData.data || []).slice(0, 8));
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      }
    };
    
    fetchDashboardData();

    connectSocket();
    
    socket.on('stats_update', (newStats) => {
      setStats(prev => ({ ...prev, ...newStats }));
    });
    
    socket.on('new_alert', (alert) => {
      setStats(prev => ({ ...prev, activeAlerts: prev.activeAlerts + 1 }));
      setRecentEvents(prev => [alert, ...prev].slice(0, 8));
    });

    return () => {
      socket.off('stats_update');
      socket.off('new_alert');
      disconnectSocket();
    };
  }, []);

  const activeAlertEvents = recentEvents.filter(e => e.severity === 'critical' || e.severity === 'warning');

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col h-[calc(100vh-6rem)] space-y-4"
    >
      {/* Top Bar */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">National Security Core</h2>
          <p className="text-slate-400 text-sm mt-1">AI-Powered Virtual Border Display</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={stats.activeAlerts > 0 ? "warning" : "success"} className="animate-pulse px-3 py-1 text-sm shadow-[0_0_15px_currentColor]">
            {stats.activeAlerts > 0 ? `${stats.activeAlerts} ACTIVE ALERTS` : "SYSTEM SECURE"}
          </Badge>
        </div>
      </motion.div>

      {/* Main Grid: Map + Timeline */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        
        {/* Centerpiece: Interactive Virtual Map (Spans 3 cols) */}
        <motion.div variants={itemVariants} className="lg:col-span-3 flex flex-col gap-6 min-h-0">
          
          {/* Top KPIs above map */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 shrink-0">
            <Card className="glass-panel hover:bg-surfaceHover transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase">Cameras</p>
                  <p className="text-2xl font-light text-slate-100 mt-1">{stats.onlineCameras} <span className="text-xs text-slate-500">/{stats.totalCameras}</span></p>
                </div>
                <div className="p-2 bg-primary/20 rounded-full">
                  <Camera className="w-5 h-5 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-info/30 hover:bg-surfaceHover transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-info uppercase">Live Detections</p>
                  <p className="text-2xl font-light text-info mt-1">{stats.liveDetections}</p>
                </div>
                <div className="p-2 bg-info/20 rounded-full">
                  <Eye className="w-5 h-5 text-info" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel hover:bg-surfaceHover transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-slate-300 uppercase">Tracked Objects</p>
                  <p className="text-2xl font-light text-slate-100 mt-1">{stats.trackedObjects}</p>
                </div>
                <div className="p-2 bg-slate-700 rounded-full">
                  <Crosshair className="w-5 h-5 text-slate-300" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-panel border-danger/30 shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:bg-surfaceHover transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-danger uppercase">Active Incidents</p>
                  <p className="text-2xl font-light text-danger mt-1">{stats.activeAlerts}</p>
                </div>
                <div className="p-2 bg-danger/20 rounded-full">
                  <AlertTriangle className="w-5 h-5 text-danger" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel hover:bg-surfaceHover transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase">Events (24h)</p>
                  <p className="text-2xl font-light text-slate-100 mt-1">{stats.eventsToday}</p>
                </div>
                <div className="p-2 bg-warning/20 rounded-full">
                  <Activity className="w-5 h-5 text-warning" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-panel border-success/30 hover:bg-surfaceHover transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-success uppercase">System</p>
                  <p className="text-lg font-bold text-success mt-1 tracking-wider uppercase">Online</p>
                </div>
                <div className="p-2 bg-success/20 rounded-full">
                  <ShieldCheck className="w-5 h-5 text-success" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Virtual Map Container */}
          <div className="flex-1 min-h-[400px] relative rounded-xl overflow-hidden shadow-2xl shadow-primary/10 border border-primary/20">
             <AnimatedMap cameras={cameras} activeAlerts={activeAlertEvents} />
          </div>
        </motion.div>

        {/* Side Panel: Event Timeline */}
        <motion.div variants={itemVariants} className="lg:col-span-1 h-full">
          <Card className="flex flex-col h-full overflow-hidden glass-panel">
            <CardHeader className="py-4 px-5 border-b border-border bg-surface/50 sticky top-0 z-10 backdrop-blur-md">
              <CardTitle className="text-sm flex items-center justify-between text-primary">
                <span className="uppercase tracking-widest font-bold">Event Feed</span>
                <Target className="w-4 h-4" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-5 custom-scrollbar">
              {recentEvents.length > 0 ? (
                <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-primary/20">
                  <AnimatePresence initial={false}>
                    {recentEvents.map((evt) => (
                      <motion.div 
                        key={evt._id || evt.id || (evt.timestamp + evt.type)} 
                        layout
                        initial={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, x: 0, height: 'auto', marginBottom: 16 }}
                        transition={{ opacity: { duration: 0.2 }, layout: { type: "spring", stiffness: 300, damping: 30 } }}
                        className="relative pl-8 group origin-top"
                      >
                        <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-surface flex items-center justify-center transition-transform group-hover:scale-125 ${evt.severity === 'critical' ? 'bg-danger shadow-[0_0_10px_#ef4444]' : evt.severity === 'warning' ? 'bg-warning' : 'bg-primary shadow-[0_0_10px_#3b82f6]'}`}>
                           <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                        </div>
                        <div className="glass-panel p-3 rounded-lg hover:bg-surfaceHover transition-colors overflow-hidden">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold text-slate-100 uppercase tracking-wide">{evt.type}</span>
                            <span className="text-[10px] text-primary font-mono">{new Date(evt.timestamp || Date.now()).toLocaleTimeString()}</span>
                          </div>
                          <div className="text-xs text-slate-400">
                            {evt.camera_name || 'CAM_UNKNOWN'}
                          </div>
                          {evt.severity === 'critical' && (
                            <div className="mt-2 text-[10px] text-white font-bold bg-danger/80 px-2 py-1 rounded inline-block shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                              IMMEDIATE ACTION REQUIRED
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center">
                  <Activity className="w-12 h-12 text-primary/40 mb-3" />
                  <p className="text-sm font-medium text-slate-300">No recent events.</p>
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
