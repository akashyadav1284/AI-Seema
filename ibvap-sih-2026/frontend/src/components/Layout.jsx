import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getHealth } from '../services/api';
import { 
  LayoutDashboard, MonitorPlay, Bell, Camera, History, 
  BarChart3, FileText, Activity, Settings, Menu, X, 
  ChevronLeft, ChevronRight, ShieldCheck, Map, 
  Crosshair, Database, Search, User, LogOut, Video
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from './ui/Badge';
import { useAuth } from '../contexts/AuthContext';
const navCategories = [
  {
    title: "Command Center",
    items: [
      { to: "/", label: "Overview", icon: LayoutDashboard },
      { to: "/live", label: "Live Monitoring", icon: MonitorPlay },
      // Mock route for Live Map and Situation Room to fit the new spec UI
      { to: "/live-map", label: "Live Map", icon: Map },
    ]
  },
  {
    title: "Surveillance",
    items: [
      { to: "/cameras", label: "Cameras", icon: Camera },
      { to: "/tracks", label: "Live Tracks", icon: Crosshair },
      { to: "/zones", label: "Zones & Fences", icon: Map },
    ]
  },
  {
    title: "Incidents",
    items: [
      { to: "/alerts", label: "Alerts", icon: Bell, badge: 3 },
      { to: "/events", label: "Events", icon: History },
      { to: "/evidence", label: "Evidence Vault", icon: Database },
    ]
  },
  {
    title: "Intelligence",
    items: [
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/reports", label: "Reports", icon: FileText },
    ]
  },
  {
    title: "System",
    items: [
      { to: "/health", label: "System Health", icon: Activity },
      { to: "/settings", label: "Settings", icon: Settings },
    ]
  }
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
          "flex items-center px-3 py-2.5 my-0.5 mx-2 rounded-md transition-all outline-none",
          isActive 
            ? "bg-primary text-white font-medium shadow-md" 
            : "text-textMuted hover:text-primary hover:bg-slate-100",
          !isExpanded && "justify-center"
        )}
      >
        <div className="relative z-10 flex items-center w-full">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className={cn("flex items-center justify-center shrink-0", isActive ? "text-white" : "")}
          >
            <item.icon className="w-5 h-5 shrink-0" />
          </motion.div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                animate={{ opacity: 1, width: 'auto', marginLeft: 12 }}
                exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 whitespace-nowrap overflow-hidden flex items-center justify-between"
              >
                <span className="text-sm">{item.label}</span>
                {item.badge && (
                  <Badge variant="danger" className="rounded-full px-1.5 py-0 min-w-[20px] text-center ml-2">
                    {item.badge}
                  </Badge>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </NavLink>

      {!isExpanded && (
        <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-surface border border-border text-text text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none shadow-premium flex items-center gap-2">
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
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    const checkHealth = async () => {
      const data = await getHealth();
      setHealth(data);
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Format date for header
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="flex h-screen bg-background text-text font-sans overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-text/20 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 bg-surface border-r border-border flex flex-col transition-all duration-300 ease-in-out shadow-soft",
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0",
          isExpanded ? "lg:w-64" : "lg:w-16"
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0 bg-primary text-white">
          <div className="flex items-center gap-3 overflow-hidden">
            <ShieldCheck className="w-6 h-6 shrink-0" />
            <AnimatePresence>
              {isExpanded && (
                <motion.span 
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-lg font-bold tracking-widest whitespace-nowrap"
                >
                  IBVAP
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <button className="lg:hidden p-1 text-white/70 hover:text-white transition-colors" onClick={() => setMobileOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Navigation Categories */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 custom-scrollbar">
          {navCategories.map((cat, idx) => (
            <div key={cat.title} className="mb-4">
              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mb-1 px-5 text-[11px] font-bold text-textMuted uppercase tracking-wider whitespace-nowrap"
                  >
                    {cat.title}
                  </motion.div>
                )}
              </AnimatePresence>
              <nav className="space-y-0.5">
                {cat.items.map((item) => (
                  <SidebarItem 
                    key={item.to} 
                    item={item} 
                    isExpanded={isExpanded} 
                    setMobileOpen={setMobileOpen} 
                  />
                ))}
              </nav>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border flex flex-col gap-2 shrink-0 bg-slate-50">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden lg:flex items-center justify-center w-full p-1.5 text-textMuted hover:text-primary hover:bg-slate-200 rounded-md transition-colors"
          >
            {isExpanded ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Top Header */}
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 lg:px-6 z-30 shadow-sm">
          <div className="flex items-center gap-4 flex-1">
            <button 
              className="lg:hidden p-2 -ml-2 text-textMuted hover:text-primary transition-colors"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            
            {/* Global Search Mock */}
            <div className="hidden md:flex items-center relative w-64 lg:w-96">
              <Search className="w-4 h-4 absolute left-3 text-textMuted" />
              <input 
                type="text" 
                placeholder="Search cameras, zones, incidents..." 
                className="w-full bg-slate-100 border-none rounded-md pl-9 pr-4 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 text-xs font-medium text-textMuted">
              <Video className="w-4 h-4" /> 
              <span>12/12 Online</span>
            </div>
            
            <div className="hidden sm:block text-xs font-medium text-textMuted border-r border-border pr-4">
              {currentDate}
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-success/10 border border-success/20">
              <span className={cn(
                "w-2 h-2 rounded-full",
                health.status === 'healthy' ? 'bg-success' : 
                health.status === 'degraded' ? 'bg-warning' : 'bg-danger'
              )}></span>
              <span className="text-[10px] font-bold tracking-wide uppercase text-success hidden sm:block">
                {health.status === 'healthy' ? 'System Online' : 
                 health.status === 'degraded' ? 'Degraded' : 'Offline'}
              </span>
            </div>

            {/* Operator Profile */}
            <div className="flex items-center gap-2 pl-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden md:flex flex-col mr-2">
                <span className="text-xs font-bold text-text">{user?.full_name || 'Admin User'}</span>
                <span className="text-[10px] text-textMuted uppercase">{user?.role || 'Operator'}</span>
              </div>
              <button 
                onClick={logout}
                className="p-1.5 text-textMuted hover:text-danger hover:bg-danger/10 rounded-md transition-colors ml-1"
                title="Secure Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-6 relative z-0 custom-scrollbar bg-background">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
