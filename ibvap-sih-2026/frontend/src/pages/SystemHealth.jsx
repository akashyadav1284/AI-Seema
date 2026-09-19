import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Server, Database, Cpu } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import SecurityTopology3D from '../components/ui/SecurityTopology3D';
import { useSimulation } from '../contexts/SimulationContext';
import { cn } from '../lib/utils';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const SystemHealth = () => {
  const { systemHealth } = useSimulation();

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.1 } } }}
      className="flex flex-col h-full space-y-6"
    >
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-bold tracking-tight text-text">System Health</h2>
        <p className="text-textMuted text-sm mt-1">Network Topology & Live Diagnostic Metrics</p>
      </motion.div>

      {/* 3D Topology Visualization */}
      <motion.div variants={itemVariants} className="w-full h-[400px] border border-border rounded-xl overflow-hidden bg-slate-50 shadow-sm relative">
        <SecurityTopology3D />
        <div className="absolute top-4 left-4 pointer-events-none bg-white/80 backdrop-blur-sm p-3 rounded shadow-sm border border-border">
          <p className="text-xs font-bold text-text uppercase tracking-wider">Topology Map</p>
          <p className="text-[10px] text-textMuted">Interactive real-time node rendering</p>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Core Infrastructure */}
        <motion.div variants={itemVariants}>
          <Card className="hover:border-primary/20 transition-colors shadow-sm bg-white border-border">
            <CardHeader className="py-4 pb-2 border-none">
              <CardTitle className="text-sm text-textMuted flex items-center justify-between font-semibold uppercase tracking-wider">
                System CPU
                <Cpu className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <div className="text-3xl font-bold text-text">{systemHealth.cpu?.toFixed(1) || '0'}%</div>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-1000", systemHealth.cpu > 80 ? 'bg-danger' : systemHealth.cpu > 60 ? 'bg-warning' : 'bg-primary')} style={{ width: `${systemHealth.cpu}%` }}></div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="hover:border-info/20 transition-colors shadow-sm bg-white border-border">
            <CardHeader className="py-4 pb-2 border-none">
              <CardTitle className="text-sm text-textMuted flex items-center justify-between font-semibold uppercase tracking-wider">
                System Memory
                <Database className="w-4 h-4 text-info" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <div className="text-3xl font-bold text-text">{systemHealth.memory?.toFixed(1) || '0'}%</div>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-1000", systemHealth.memory > 85 ? 'bg-danger' : 'bg-info')} style={{ width: `${systemHealth.memory}%` }}></div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="hover:border-purple-500/20 transition-colors shadow-sm bg-white border-border">
            <CardHeader className="py-4 pb-2 border-none">
              <CardTitle className="text-sm text-textMuted flex items-center justify-between font-semibold uppercase tracking-wider">
                Detection FPS (Avg)
                <Activity className="w-4 h-4 text-purple-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-text">{systemHealth.detectionFps?.toFixed(1) || '0.0'}</div>
              <div className="text-xs text-textMuted font-medium mt-1">Across all inference nodes</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="hover:border-success/20 transition-colors shadow-sm bg-white border-border">
            <CardHeader className="py-4 pb-2 border-none">
              <CardTitle className="text-sm text-textMuted flex items-center justify-between font-semibold uppercase tracking-wider">
                Network Latency
                <Server className="w-4 h-4 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-text">{systemHealth.latency?.toFixed(0) || '0'} <span className="text-sm text-textMuted">ms</span></div>
              <div className="text-xs text-textMuted font-medium mt-1">WebSocket Gateway</div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Services Status */}
        <motion.div variants={itemVariants} className="lg:col-span-4 mt-2">
          <div className="bg-white border border-border rounded-xl p-4 shadow-sm flex flex-wrap gap-6 justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
              <div>
                <div className="text-xs text-textMuted uppercase font-bold tracking-wider">API Core</div>
                <div className="text-sm font-semibold text-text">Online (99.98%)</div>
              </div>
            </div>
            <div className="w-px h-8 bg-border hidden sm:block"></div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
              <div>
                <div className="text-xs text-textMuted uppercase font-bold tracking-wider">Database Node</div>
                <div className="text-sm font-semibold text-text">Connected</div>
              </div>
            </div>
            <div className="w-px h-8 bg-border hidden sm:block"></div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
              <div>
                <div className="text-xs text-textMuted uppercase font-bold tracking-wider">Active Clients</div>
                <div className="text-sm font-semibold text-text">{systemHealth.clients} Sessions</div>
              </div>
            </div>
            <div className="w-px h-8 bg-border hidden sm:block"></div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary/50"></div>
              <div>
                <div className="text-xs text-textMuted uppercase font-bold tracking-wider">Uptime</div>
                <div className="text-sm font-semibold text-text font-mono">{systemHealth.uptime || '14d 6h'}</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

    </motion.div>
  );
};

export default SystemHealth;
