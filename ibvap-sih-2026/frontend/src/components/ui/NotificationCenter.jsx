import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { useSimulation } from '../../contexts/SimulationContext';
import { cn } from '../../lib/utils';

export const NotificationCenter = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useSimulation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type) => {
    switch(type) {
      case 'CRITICAL':
      case 'ERROR': return <XCircle className="w-4 h-4 text-danger" />;
      case 'WARNING':
      case 'HIGH': return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'SUCCESS': return <CheckCircle className="w-4 h-4 text-success" />;
      default: return <Info className="w-4 h-4 text-primary" />;
    }
  };

  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds/60)}m ago`;
    return `${Math.floor(seconds/3600)}h ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-textMuted hover:text-primary transition-colors focus:outline-none"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-surface shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-[400px]"
          >
            <div className="p-3 border-b border-border bg-slate-50 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-sm text-text">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllNotificationsRead}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-textMuted text-sm">
                  No notifications yet.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={cn(
                        "p-3 hover:bg-slate-50 transition-colors flex gap-3 group cursor-pointer",
                        !notif.read && "bg-primary/5"
                      )}
                      onClick={() => markNotificationRead(notif.id)}
                    >
                      <div className="shrink-0 mt-0.5">
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium truncate", !notif.read ? "text-text" : "text-textMuted")}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-textMuted mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-textMuted mt-1 font-mono">
                          {getTimeAgo(notif.timestamp)}
                        </p>
                      </div>
                      {!notif.read && (
                        <div className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
