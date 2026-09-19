import React, { useState, useEffect } from 'react';
import { getAnalyticsSummary, getAnalyticsTrends, getAnalyticsEvents } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Activity, Download, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useDataFusion } from '../hooks/useDataFusion';
import { useSimulation } from '../contexts/SimulationContext';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6']; // Critical, Warning, Info

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-border p-3 rounded-md shadow-premium">
        <p className="text-text text-sm mb-1 font-bold">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-textMuted capitalize">{entry.name}:</span>
            <span className="text-text font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const Analytics = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  const [rawEvents, setRawEvents] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const { analytics: simAnalytics, isDemoMode } = useSimulation();
  
  const fusedEvents = useDataFusion(rawEvents, 'events');

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      try {
        const [trendsRes, eventsRes] = await Promise.all([
          getAnalyticsTrends().catch(() => null),
          getAnalyticsEvents().catch(() => null)
        ]);

        if (trendsRes && trendsRes.hourly_trends) {
          const formattedTrends = trendsRes.hourly_trends.map(t => ({
            time: t.hour.split('T')[1].substring(0, 5), // 'HH:MM'
            critical: t.critical || 0,
            warning: t.warning || 0,
            info: t.info || 0
          }));
          setTimelineData(formattedTrends);
        }

        if (eventsRes) {
          setRawEvents(eventsRes.items || []);
        }
      } catch (error) {
        console.error("Failed to load analytics data", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, []);

  // Compute charts from fused events
  const severityCount = fusedEvents.reduce((acc, evt) => {
      let sev = 'info';
      const s = evt.severity?.toLowerCase();
      if (s === 'high' || s === 'critical') sev = 'critical';
      else if (s === 'medium' || s === 'warning') sev = 'warning';
      
      acc[sev] = (acc[sev] || 0) + 1;
      return acc;
  }, { critical: 0, warning: 0, info: 0 });
  
  const severityData = [
    { name: 'Critical', value: severityCount.critical },
    { name: 'Warning', value: severityCount.warning },
    { name: 'Info', value: severityCount.info },
  ].filter(item => item.value > 0);

  const typeCount = fusedEvents.reduce((acc, evt) => {
    const type = evt.event_type || evt.type || 'UNKNOWN';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const typeData = Object.entries(typeCount).map(([name, count]) => ({ name, count }));
  
  // Use sim history for timeline if demo mode is active
  const displayTimeline = isDemoMode 
    ? simAnalytics.history.map(h => ({
        time: h.time,
        critical: Math.floor(h.events * 0.1),
        warning: Math.floor(h.events * 0.3),
        info: Math.floor(h.events * 0.6)
      })) 
    : timelineData;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Security Analytics</h1>
          <p className="text-textMuted text-sm mt-1">Data-driven insights from the border surveillance network.</p>
        </div>
        <Button variant="secondary" className="gap-2 shrink-0 bg-white">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {isLoading ? (
        <div className="h-[400px] flex flex-col items-center justify-center text-textMuted">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
          <p>Processing analytics data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Quick Stats Grid */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-textMuted uppercase tracking-wider mb-1">Total Incidents</p>
                  <p className="text-2xl font-bold text-text">{fusedEvents.length}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Activity className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-textMuted uppercase tracking-wider mb-1">Critical Alerts</p>
                  <p className="text-2xl font-bold text-danger">{severityCount.critical || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center text-danger">
                  <Activity className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-textMuted uppercase tracking-wider mb-1">Active Tracks</p>
                  <p className="text-2xl font-bold text-warning">{simAnalytics?.activeTracks || 142}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center text-warning">
                  <Activity className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-textMuted uppercase tracking-wider mb-1">Avg Resolution</p>
                  <p className="text-2xl font-bold text-success">4.2m</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-success">
                  <Activity className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Main Timeline Chart */}
          <Card className="lg:col-span-3 border-border shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-border">
              <CardTitle className="text-sm uppercase tracking-wider text-textMuted">Event Activity Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {displayTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={displayTimeline} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorWarning" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[1]} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={COLORS[1]} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorInfo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[2]} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={COLORS[2]} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="info" name="Info" stroke={COLORS[2]} fillOpacity={1} fill="url(#colorInfo)" />
                      <Area type="monotone" dataKey="warning" name="Warning" stroke={COLORS[1]} fillOpacity={1} fill="url(#colorWarning)" />
                      <Area type="monotone" dataKey="critical" name="Critical" stroke={COLORS[0]} fillOpacity={1} fill="url(#colorCritical)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-textMuted">No trend data available</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Severity Breakdown */}
          <Card className="lg:col-span-1 border-border shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-border">
              <CardTitle className="text-sm uppercase tracking-wider text-textMuted">Severity Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <div className="h-[250px] w-full">
                {severityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {severityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-textMuted">No data</div>
                )}
              </div>
              <div className="flex gap-4 mt-2">
                {severityData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2 text-xs font-semibold text-textMuted uppercase">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    {entry.name}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Event Types */}
          <Card className="lg:col-span-2 border-border shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-border">
              <CardTitle className="text-sm uppercase tracking-wider text-textMuted">Top Event Classifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                {typeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={typeData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                      <Bar dataKey="count" name="Incidents" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-textMuted">No data</div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
};

export default Analytics;
