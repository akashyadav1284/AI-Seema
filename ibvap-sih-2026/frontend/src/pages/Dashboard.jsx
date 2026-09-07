import { useState, useEffect } from 'react';
import { getCameras, getEvents } from '../services/api';

const StatCard = ({ title, value, color }) => (
  <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg shadow-lg">
    <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
    <div className={`mt-2 text-4xl font-light ${color}`}>{value}</div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCameras: 0,
    onlineCameras: 0,
    activeAlerts: 0,
    eventsToday: 0
  });

  useEffect(() => {
    // In Phase 1, these just fetch placeholders
    const fetchDashboardData = async () => {
      try {
        const [camData, evtData] = await Promise.all([
          getCameras().catch(() => ({ total: 0 })),
          getEvents().catch(() => ({ total: 0 }))
        ]);
        
        setStats({
          totalCameras: camData.total || 0,
          onlineCameras: 0, // Placeholder
          activeAlerts: 0, // Placeholder
          eventsToday: evtData.total || 0
        });
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      }
    };
    
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-white">Command Centre</h2>
        <p className="text-slate-400 mt-1">System Overview and Real-time Analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Cameras" value={stats.totalCameras} color="text-emerald-400" />
        <StatCard title="Online Cameras" value={stats.onlineCameras} color="text-emerald-400" />
        <StatCard title="Active Alerts" value={stats.activeAlerts} color="text-red-400" />
        <StatCard title="Events Today" value={stats.eventsToday} color="text-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg min-h-[300px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-slate-500 mb-2">Live Camera Feed</div>
            <div className="text-slate-600 text-sm">No cameras connected (Phase 1)</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg min-h-[300px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-slate-500 mb-2">Recent Events Log</div>
            <div className="text-slate-600 text-sm">No recent events (Phase 1)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
