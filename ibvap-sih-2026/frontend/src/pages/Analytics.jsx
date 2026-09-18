import React, { useState, useEffect } from 'react';
import { getEvents } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Activity, Download, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6']; // Critical, Warning, Info

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border border-border p-3 rounded-lg shadow-xl">
        <p className="text-slate-200 text-sm mb-1 font-medium">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-400 capitalize">{entry.name}:</span>
            <span className="text-slate-200 font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const Analytics = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [eventData, setEventData] = useState([]);
  
  // Chart Data State
  const [timelineData, setTimelineData] = useState([]);
  const [severityData, setSeverityData] = useState([]);
  const [typeData, setTypeData] = useState([]);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      try {
        const res = await getEvents();
        const events = res.data || [];
        setEventData(events);
        
        // Process data for charts
        processData(events);
      } catch (error) {
        console.error("Failed to load analytics data", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, []);

  const processData = (events) => {
    // 1. Timeline Data (Group by hour for the last 24h)
    const hours = {};
    const now = new Date();
    
    // Initialize last 12 hours
    for(let i = 11; i >= 0; i--) {
      const d = new Date(now.getTime() - (i * 60 * 60 * 1000));
      const hourStr = d.getHours() + ':00';
      hours[hourStr] = { time: hourStr, critical: 0, warning: 0, info: 0 };
    }
    
    // Dummy aggregation (in real app, use event timestamps)
    Object.values(hours).forEach(h => {
        h.critical = Math.floor(Math.random() * 5);
        h.warning = Math.floor(Math.random() * 10);
        h.info = Math.floor(Math.random() * 20);
    });
    
    setTimelineData(Object.values(hours));

    // 2. Severity Pie Chart Data
    const severityCount = events.reduce((acc, evt) => {
      acc[evt.severity || 'info'] = (acc[evt.severity || 'info'] || 0) + 1;
      return acc;
    }, { critical: 0, warning: 0, info: 0 });
    
    setSeverityData([
      { name: 'Critical', value: severityCount.critical || 15 },
      { name: 'Warning', value: severityCount.warning || 42 },
      { name: 'Info', value: severityCount.info || 89 },
    ]);

    // 3. Event Types Bar Chart Data
    const typeCount = events.reduce((acc, evt) => {
      acc[evt.type || 'unknown'] = (acc[evt.type || 'unknown'] || 0) + 1;
      return acc;
    }, {});
    
    // Add dummy data if API returns empty
    const tData = Object.keys(typeCount).length > 0 
      ? Object.entries(typeCount).map(([name, count]) => ({ name, count }))
      : [
          { name: 'Line Cross', count: 45 },
          { name: 'Intrusion', count: 32 },
          { name: 'Loitering', count: 28 },
          { name: 'Face Match', count: 12 },
        ];
        
    setTypeData(tData);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Security Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">Data-driven insights from the border surveillance network.</p>
        </div>
        <Button variant="secondary" className="gap-2 shrink-0">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {isLoading ? (
        <div className="h-[400px] flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
          <p>Processing analytics data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Timeline Chart */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Event Activity (Last 12 Hours)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="time" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="info" name="Info" stroke={COLORS[2]} fillOpacity={1} fill="url(#colorInfo)" />
                    <Area type="monotone" dataKey="warning" name="Warning" stroke={COLORS[1]} fillOpacity={1} fill="url(#colorWarning)" />
                    <Area type="monotone" dataKey="critical" name="Critical" stroke={COLORS[0]} fillOpacity={1} fill="url(#colorCritical)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Severity Breakdown */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Severity Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <div className="h-[250px] w-full">
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
              </div>
              <div className="flex gap-4 mt-2">
                {severityData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    {entry.name}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Event Types */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Top Event Classifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
                    <Bar dataKey="count" name="Incidents" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
};

export default Analytics;
