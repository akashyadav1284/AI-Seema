import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getHealth } from '../services/api';
import { 
  LayoutDashboard, 
  MonitorPlay, 
  Bell, 
  Camera, 
  History, 
  BarChart3,
  FileText,
  Activity,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Map,
  Crosshair,
  Database
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from './ui/Badge';

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/live", label: "Live Monitoring", icon: MonitorPlay },
  { to: "/cameras", label: "Cameras", icon: Camera },
  { to: "/tracks", label: "Live Tracks", icon: Crosshair },
  { to: "/zones", label: "Zones & Fences", icon: Map },
  { to: "/alerts", label: "Alerts", icon: Bell, badge: 3 }, // Example badge
  { to: "/events", label: "Events", icon: History },
  { to: "/evidence", label: "Evidence Vault", icon: Database },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/health", label: "System Health", icon: Activity },
  { to: "/settings", label: "Settings", icon: Settings },
];

const SidebarItem = ({ item, isExpanded, setMobileOpen }) => {
  const location = useLocation();
  const isActive = location.pathname === item.to;

  return (
    <div className="relative group">
      <NavLink 
        to={item.to}
        onClick={() => setMobileOpen(false)}
        className={({ isActive }) => cn(
          "flex items-center px-3 py-2.5 my-1 mx-2 rounded-lg transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isActive 
            ? "text-white font-medium" 
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5",
          !isExpanded && "justify-center"
        )}
      >
        {/* Animated Active Indicator Background */}
        {isActive && (
          <motion.div
            layoutId="sidebar-active-indicator"
            className="absolute inset-0 bg-primary/20 border border-primary/50 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.2)]"
            initial={false}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}

        <div className="relative z-10 flex items-center w-full">
          {/* Animated Icon */}
          <motion.div 
            whileHover={{ scale: 1.1, rotate: isActive ? 0 : [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.3 }}
            className={cn("flex items-center justify-center", isActive ? "text-primary" : "")}
          >
            <item.icon className="w-5 h-5 shrink-0" />
          </motion.div>

          {/* Label */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                animate={{ opacity: 1, width: 'auto', marginLeft: 12 }}
                exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 whitespace-nowrap overflow-hidden flex items-center justify-between"
              >
                <span>{item.label}</span>
                {item.badge && (
                  <Badge variant="danger" className="rounded-full px-1.5 py-0 min-w-[20px] text-center ml-2 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse">
                    {item.badge}
                  </Badge>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </NavLink>

      {/* Tooltip for collapsed mode */}
      {!isExpanded && (
        <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-surface border border-border text-slate-200 text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none shadow-xl flex items-center gap-2">
          {item.label}
          {item.badge && (
             <span className="bg-danger text-white px-1.5 rounded-full text-[10px]">{item.badge}</span>
          )}
        </div>
      )}
    </div>
  );
};

const Layout = ({ children }) => {
  const [health, setHealth] = useState({ status: 'loading' });
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      const data = await getHealth();
      setHealth(data);
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-background text-slate-100 font-sans overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 glass-panel border-r border-border flex flex-col transition-all duration-300 ease-in-out",
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0",
          isExpanded ? "lg:w-64" : "lg:w-20"
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.4)]">
               <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.span 
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-lg font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 whitespace-nowrap"
                >
                  IBVAP
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          
          <button className="lg:hidden p-1 text-slate-400 hover:text-white transition-colors" onClick={() => setMobileOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 custom-scrollbar">
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-2 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap"
              >
                Main Menu
              </motion.div>
            )}
          </AnimatePresence>
          <nav className="space-y-0.5">
            {navItems.map((item) => (
              <SidebarItem 
                key={item.to} 
                item={item} 
                isExpanded={isExpanded} 
                setMobileOpen={setMobileOpen} 
              />
            ))}
          </nav>
        </div>

        {/* Sidebar Footer (Collapse Toggle & User) */}
        <div className="p-3 border-t border-white/5 flex flex-col gap-2 shrink-0">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden lg:flex items-center justify-center w-full p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isExpanded ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
          
          <div className={cn("flex items-center gap-3 p-2 rounded-lg bg-black/20 border border-white/5", !isExpanded && "justify-center")}>
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold border border-slate-600 shrink-0">
              OP
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.div 
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex flex-col overflow-hidden whitespace-nowrap"
                >
                  <span className="text-sm font-medium text-slate-200">Operator 1</span>
                  <span className="text-[10px] text-primary">Security Team A</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Top Header */}
        <header className="h-16 glass-panel border-b border-border flex items-center justify-between px-4 lg:px-6 z-30">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="text-sm text-slate-400 hidden sm:block font-medium tracking-wide">
              Intelligence Operations Center
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/10">
              <span className={cn(
                "w-2 h-2 rounded-full",
                health.status === 'healthy' ? 'bg-success shadow-[0_0_8px_#10b981]' : 
                health.status === 'degraded' ? 'bg-warning shadow-[0_0_8px_#f59e0b]' : 'bg-danger shadow-[0_0_8px_#ef4444]'
              )}></span>
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-300">
                {health.status === 'healthy' ? 'System Online' : 
                 health.status === 'degraded' ? 'Degraded' : 'System Offline'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-6 relative z-0 custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
