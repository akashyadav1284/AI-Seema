import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Server, Database, Cpu } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import SecurityTopology3D from '../components/ui/SecurityTopology3D';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const SystemHealth = () => {
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
        <motion.div variants={itemVariants}>
          <Card className="hover:border-primary/20 transition-colors shadow-sm">
            <CardHeader className="py-4 pb-2 border-none">
              <CardTitle className="text-sm text-textMuted flex items-center justify-between font-semibold uppercase tracking-wider">
                AI Inference Engine
                <Cpu className="w-4 h-4 text-purple-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-text">Optimal</div>
              <div className="text-xs text-success font-medium mt-1">Latency: 12ms</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="hover:border-info/20 transition-colors shadow-sm">
            <CardHeader className="py-4 pb-2 border-none">
              <CardTitle className="text-sm text-textMuted flex items-center justify-between font-semibold uppercase tracking-wider">
                Database Node
                <Database className="w-4 h-4 text-info" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-text">Connected</div>
              <div className="text-xs text-success font-medium mt-1">Pool utilization: 14%</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="hover:border-success/20 transition-colors shadow-sm">
            <CardHeader className="py-4 pb-2 border-none">
              <CardTitle className="text-sm text-textMuted flex items-center justify-between font-semibold uppercase tracking-wider">
                WebSocket Gateway
                <Server className="w-4 h-4 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-text">Active</div>
              <div className="text-xs text-success font-medium mt-1">Connections: 4</div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <Card className="hover:border-primary/20 transition-colors shadow-sm">
            <CardHeader className="py-4 pb-2 border-none">
              <CardTitle className="text-sm text-textMuted flex items-center justify-between font-semibold uppercase tracking-wider">
                Overall Status
                <Activity className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success uppercase tracking-wide">Online</div>
              <div className="text-xs text-textMuted font-medium mt-1">Uptime: 99.9%</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

    </motion.div>
  );
};

export default SystemHealth;
