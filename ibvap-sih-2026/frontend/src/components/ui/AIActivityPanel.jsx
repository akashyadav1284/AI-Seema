import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';
import { socket } from '../../services/socket';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { cn } from '../../lib/utils';

export const AIActivityPanel = ({ className }) => {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const handleNewActivity = (activity) => {
      setActivities((prev) => {
        // Keep only the last 20 events for performance
        const updated = [
          { ...activity, _id: activity.id || Date.now().toString() + Math.random() },
          ...prev
        ];
        return updated.slice(0, 20);
      });
    };

    // Listen for actual backend alerts/activity
    socket.on('ai_activity', handleNewActivity);
    socket.on('new_alert', handleNewActivity);

    // [DEV ONLY] Simulate incoming AI activity if none exists, to show off the UI
    const devTimer = setInterval(() => {
      const msgs = [
        { type: "Person detected", severity: "info" },
        { type: "Vehicle detected", severity: "info" },
        { type: "Person entered zone", severity: "warning" },
        { type: "Tracking object #24", severity: "info" },
        { type: "Line crossed", severity: "danger" }
      ];
      const randMsg = msgs[Math.floor(Math.random() * msgs.length)];
      handleNewActivity({
        type: randMsg.type,
        severity: randMsg.severity,
        timestamp: new Date().toISOString()
      });
    }, Math.random() * 2000 + 1000); // Random interval between 1s and 3s

    return () => {
      socket.off('ai_activity', handleNewActivity);
      socket.off('new_alert', handleNewActivity);
      clearInterval(devTimer);
    };
  }, []);

  return (
    <Card className={cn("flex flex-col overflow-hidden h-full glass-panel", className)}>
      <CardHeader className="py-2.5 px-4 border-b border-border bg-black/40 backdrop-blur-sm shrink-0">
        <CardTitle className="text-xs flex items-center gap-2 text-primary">
          <Activity className="w-3.5 h-3.5" />
          <span className="uppercase tracking-widest font-bold">AI Activity</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0 relative">
        <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-3">
          <div className="flex flex-col gap-1">
            <AnimatePresence initial={false}>
              {activities.map((act) => {
                const date = new Date(act.timestamp || Date.now());
                const timeStr = date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                
                return (
                  <motion.div
                    key={act._id}
                    layout // This makes existing items slide down smoothly without re-animating
                    initial={{ opacity: 0, x: -10, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto', marginBottom: 4 }}
                    // We DO NOT define an `exit` animation so old items just vanish instantly if they fall off the array, keeping it snappy.
                    transition={{ type: "spring", stiffness: 500, damping: 30, opacity: { duration: 0.2 } }}
                    className="flex items-start gap-3 group px-2 py-1.5 rounded hover:bg-white/5 transition-colors"
                  >
                    <span className="text-[10px] font-mono text-slate-500 shrink-0 mt-0.5">{timeStr}</span>
                    <span className={cn(
                      "text-xs font-medium",
                      act.severity === 'danger' ? "text-danger" :
                      act.severity === 'warning' ? "text-warning" :
                      "text-slate-300"
                    )}>
                      {act.type}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {activities.length === 0 && (
              <div className="text-center text-xs text-slate-500 mt-10 font-mono">
                Awaiting telemetry...
              </div>
            )}
          </div>
        </div>
        {/* Fade overlay at bottom to make it look like a terminal feed */}
        <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-surface to-transparent pointer-events-none" />
      </CardContent>
    </Card>
  );
};
