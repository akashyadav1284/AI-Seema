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
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">System Health</h2>
        <p className="text-slate-400 text-sm mt-1">Network Topology & Live Diagnostic Metrics</p>
      </motion.div>

      {/* 3D Topology Visualization */}
      <motion.div variants={itemVariants} className="w-full h-[400px]">
        <SecurityTopology3D />
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="py-4 pb-2 border-none">
              <CardTitle className="text-sm text-slate-400 flex items-center justify-between">
                AI Inference Engine
                <Cpu className="w-4 h-4 text-purple-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-100">Optimal</div>
              <div className="text-xs text-success mt-1">Latency: 12ms</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="py-4 pb-2 border-none">
              <CardTitle className="text-sm text-slate-400 flex items-center justify-between">
                Database Node
                <Database className="w-4 h-4 text-blue-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-100">Connected</div>
              <div className="text-xs text-success mt-1">Pool utilization: 14%</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="py-4 pb-2 border-none">
              <CardTitle className="text-sm text-slate-400 flex items-center justify-between">
                WebSocket Gateway
                <Server className="w-4 h-4 text-emerald-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-100">Active</div>
              <div className="text-xs text-success mt-1">Connections: 4</div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="py-4 pb-2 border-none">
              <CardTitle className="text-sm text-slate-400 flex items-center justify-between">
                Overall Status
                <Activity className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success uppercase tracking-wide">Online</div>
              <div className="text-xs text-slate-400 mt-1">Uptime: 99.9%</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

    </motion.div>
  );
};

export default SystemHealth;
