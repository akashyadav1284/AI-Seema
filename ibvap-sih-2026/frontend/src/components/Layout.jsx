import { useState, useEffect } from 'react';
import { getHealth } from '../services/api';

const Layout = ({ children }) => {
  const [health, setHealth] = useState({ status: 'loading' });

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
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-widest text-emerald-400">IBVAP</h1>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-2">
          <a href="/" className="block px-4 py-2 rounded bg-slate-800 text-slate-100">Dashboard</a>
          <a href="#" className="block px-4 py-2 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">Live Monitoring</a>
          <a href="#" className="block px-4 py-2 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">Alerts</a>
          <a href="#" className="block px-4 py-2 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">Cameras</a>
          <a href="#" className="block px-4 py-2 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">Virtual Zones</a>
          <a href="#" className="block px-4 py-2 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">ANPR Search</a>
          <a href="#" className="block px-4 py-2 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">Events</a>
          <a href="#" className="block px-4 py-2 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">Camera Health</a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8">
          <div className="text-sm text-slate-400">Intelligent Border Video Analytics Platform</div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${health.status === 'healthy' ? 'bg-emerald-500' : health.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
              <span className="text-sm font-medium">
                {health.status === 'healthy' ? 'Backend Online' : health.status === 'degraded' ? 'Database Degraded' : 'Backend Offline'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
