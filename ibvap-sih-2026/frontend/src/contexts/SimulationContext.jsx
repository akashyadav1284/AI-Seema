import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const SimulationContext = createContext(null);

const generatePastTimestamp = (minutesAgo) => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutesAgo);
  return d.toISOString();
};

const initialCameras = [
  { id: 'CAM-001', name: 'North Perimeter Alpha', sector: 'North Perimeter', status: 'ONLINE', health: 98, fps: 24, resolution: '4K', latency: 12, lat: 28.6139, lng: 77.2090, zone: 'ZONE-A', uptime: '99.9%' },
  { id: 'CAM-002', name: 'North Perimeter Beta', sector: 'North Perimeter', status: 'ONLINE', health: 96, fps: 30, resolution: '1080p', latency: 8, lat: 28.6145, lng: 77.2100, zone: 'ZONE-A', uptime: '99.5%' },
  { id: 'CAM-003', name: 'East Checkpoint Main', sector: 'East Checkpoint', status: 'ONLINE', health: 99, fps: 30, resolution: '4K', latency: 15, lat: 28.6120, lng: 77.2150, zone: 'ZONE-B', uptime: '99.8%' },
  { id: 'CAM-004', name: 'West Ridge View', sector: 'West Ridge', status: 'DEGRADED', health: 45, fps: 12, resolution: '720p', latency: 150, lat: 28.6150, lng: 77.2005, zone: 'ZONE-C', uptime: '94.2%' },
  { id: 'CAM-005', name: 'South Corridor Access', sector: 'South Corridor', status: 'ONLINE', health: 100, fps: 24, resolution: '1080p', latency: 10, lat: 28.6100, lng: 77.2095, zone: 'ZONE-D', uptime: '99.9%' },
  { id: 'CAM-006', name: 'River Crossing Bridge', sector: 'River Crossing', status: 'ONLINE', health: 92, fps: 24, resolution: '1080p', latency: 22, lat: 28.6170, lng: 77.2120, zone: 'ZONE-E', uptime: '98.5%' },
  { id: 'CAM-007', name: 'Mountain Pass High', sector: 'Mountain Pass', status: 'OFFLINE', health: 0, fps: 0, resolution: '1080p', latency: 0, lat: 28.6185, lng: 77.2050, zone: 'ZONE-F', uptime: '85.0%' },
  { id: 'CAM-008', name: 'Border Gate Zero', sector: 'Border Gate', status: 'ONLINE', health: 98, fps: 30, resolution: '4K', latency: 5, lat: 28.6050, lng: 77.2100, zone: 'ZONE-G', uptime: '99.9%' },
  { id: 'CAM-009', name: 'Restricted Sector Int', sector: 'Restricted Sector', status: 'ONLINE', health: 97, fps: 30, resolution: '1080p', latency: 14, lat: 28.6140, lng: 77.2110, zone: 'ZONE-H', uptime: '99.7%' },
  { id: 'CAM-010', name: 'Observation Tower 1', sector: 'Observation Tower', status: 'ONLINE', health: 100, fps: 24, resolution: '4K', latency: 11, lat: 28.6115, lng: 77.2065, zone: 'ZONE-D', uptime: '99.9%' },
  { id: 'CAM-011', name: 'Patrol Route Delta', sector: 'Patrol Route', status: 'ONLINE', health: 88, fps: 15, resolution: '1080p', latency: 45, lat: 28.6160, lng: 77.2180, zone: 'ZONE-B', uptime: '97.2%' },
  { id: 'CAM-012', name: 'High-Risk Transit', sector: 'Transit Corridor', status: 'ONLINE', health: 95, fps: 24, resolution: '1080p', latency: 18, lat: 28.6080, lng: 77.2130, zone: 'ZONE-G', uptime: '99.1%' },
];

const initialZones = [
  { id: 'ZONE-A', name: 'North Perimeter Fence', type: 'VIRTUAL_FENCE', riskLevel: 'HIGH', status: 'ACTIVE', cameras: ['CAM-001', 'CAM-002'] },
  { id: 'ZONE-B', name: 'East Checkpoint Area', type: 'MONITORED_AREA', riskLevel: 'MEDIUM', status: 'ACTIVE', cameras: ['CAM-003', 'CAM-011'] },
  { id: 'ZONE-C', name: 'West Ridge Buffer', type: 'BUFFER_ZONE', riskLevel: 'LOW', status: 'ACTIVE', cameras: ['CAM-004'] },
  { id: 'ZONE-D', name: 'South Access Corridor', type: 'RESTRICTED_ZONE', riskLevel: 'HIGH', status: 'ACTIVE', cameras: ['CAM-005', 'CAM-010'] },
  { id: 'ZONE-E', name: 'River Crossing Virtual', type: 'VIRTUAL_FENCE', riskLevel: 'CRITICAL', status: 'ACTIVE', cameras: ['CAM-006'] },
  { id: 'ZONE-F', name: 'Mountain Pass Monitored', type: 'MONITORED_AREA', riskLevel: 'MEDIUM', status: 'ACTIVE', cameras: ['CAM-007'] },
  { id: 'ZONE-G', name: 'Border Gate Core', type: 'RESTRICTED_ZONE', riskLevel: 'CRITICAL', status: 'ACTIVE', cameras: ['CAM-008', 'CAM-012'] },
  { id: 'ZONE-H', name: 'Internal Restricted Sec', type: 'RESTRICTED_ZONE', riskLevel: 'CRITICAL', status: 'ACTIVE', cameras: ['CAM-009'] },
];

const EVENT_TYPES = ['RESTRICTED_ZONE', 'VIRTUAL_FENCE', 'INTRUSION', 'LOITERING', 'DIRECTION_VIOLATION', 'UNAUTHORIZED_ENTRY', 'NIGHT_ACTIVITY', 'GROUP_DETECTION', 'VEHICLE_DETECTION', 'UNKNOWN_OBJECT', 'ZONE_BREACH', 'SUSPICIOUS_MOVEMENT'];
const OBJECT_TYPES = ['PERSON', 'VEHICLE', 'GROUP', 'ANIMAL', 'UNKNOWN'];

// Generate 40+ historical events
const generateHistoricalEvents = () => {
  const evts = [];
  for (let i = 0; i < 45; i++) {
    const minutesAgo = Math.floor(Math.random() * (7 * 24 * 60)); // up to 7 days
    const severity = Math.random() > 0.9 ? 'CRITICAL' : Math.random() > 0.7 ? 'HIGH' : Math.random() > 0.3 ? 'MEDIUM' : 'LOW';
    const cam = initialCameras[Math.floor(Math.random() * initialCameras.length)];
    evts.push({
      id: `EVT-100${i}`,
      timestamp: generatePastTimestamp(minutesAgo),
      type: EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)],
      severity,
      camera: cam.id,
      zone: cam.zone,
      track: `TRK-80${i}`,
      objectType: OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)],
      confidence: (75 + Math.random() * 24).toFixed(1),
      status: Math.random() > 0.5 ? 'RESOLVED' : 'ACKNOWLEDGED',
      description: `Historical simulated event for ${cam.sector}`,
      evidenceId: Math.random() > 0.5 ? `EVD-300${i}` : null
    });
  }
  return evts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

const generatedEvents = generateHistoricalEvents();

const generateHistoricalAlerts = () => {
  return generatedEvents.filter(e => e.severity === 'CRITICAL' || e.severity === 'HIGH').slice(0, 18).map((e, i) => ({
    id: `ALT-200${i}`,
    eventId: e.id,
    severity: e.severity,
    type: e.type,
    camera: e.camera,
    timestamp: e.timestamp,
    status: Math.random() > 0.4 ? 'ACKNOWLEDGED' : (Math.random() > 0.5 ? 'RESOLVED' : 'NEW')
  }));
};

const generateHistoricalEvidence = () => {
  return generatedEvents.filter(e => e.evidenceId).map((e, i) => ({
    id: e.evidenceId,
    eventId: e.id,
    camera: e.camera,
    timestamp: e.timestamp,
    type: Math.random() > 0.7 ? 'VIDEO_CLIP' : 'SNAPSHOT',
    duration: Math.random() > 0.7 ? `${Math.floor(10 + Math.random()*20)}s` : 'N/A',
    size: `${(Math.random() * 5 + 1).toFixed(1)} MB`,
    severity: e.severity,
    status: 'STORED'
  }));
};

const generateHistoricalAudit = () => {
  const logs = [];
  for(let i=0; i<25; i++) {
    logs.push({
      id: `AUD-500${i}`,
      timestamp: generatePastTimestamp(Math.floor(Math.random() * 24 * 60)),
      user: 'admin@gov.in',
      action: ['LOGIN', 'ALERT_ACKNOWLEDGED', 'ALERT_RESOLVED', 'REPORT_GENERATED', 'SETTINGS_UPDATED'][Math.floor(Math.random() * 5)],
      resource: 'SYSTEM',
      status: 'SUCCESS',
      details: 'Historical audit action performed.'
    });
  }
  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

const initialHealth = {
  api: 99.98,
  mongodb: 'CONNECTED',
  websocket: 'CONNECTED',
  aiEngine: 'RUNNING',
  detectionFps: 28.4,
  latency: 42,
  clients: 18,
  cpu: 38,
  memory: 54,
  network: 12,
  uptime: '14d 6h'
};

export const SimulationProvider = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);
  
  const [cameras, setCameras] = useState(initialCameras);
  const [zones, setZones] = useState(initialZones);
  const [events, setEvents] = useState(generatedEvents);
  const [alerts, setAlerts] = useState(generateHistoricalAlerts());
  const [evidence, setEvidence] = useState(generateHistoricalEvidence());
  const [auditLogs, setAuditLogs] = useState(generateHistoricalAudit());
  const [reports, setReports] = useState([
    { id: 'RPT-001', name: 'Daily Operations - North', type: 'DAILY OPERATIONS', period: 'Last 24h', created: generatePastTimestamp(120), status: 'READY', records: 45, author: 'System' },
    { id: 'RPT-002', name: 'Critical Incidents Weekly', type: 'SECURITY INCIDENT', period: 'Last 7 Days', created: generatePastTimestamp(2400), status: 'READY', records: 12, author: 'admin@gov.in' }
  ]);
  const [notifications, setNotifications] = useState([]);
  
  // Create 15 initial live tracks
  const [tracks, setTracks] = useState(Array.from({length: 15}).map((_, i) => {
    const cam = initialCameras[Math.floor(Math.random() * initialCameras.length)];
    return {
      id: `TRK-900${i}`,
      type: OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)],
      camera: cam.id,
      zone: cam.zone,
      lat: cam.lat + (Math.random() * 0.002 - 0.001),
      lng: cam.lng + (Math.random() * 0.002 - 0.001),
      direction: ['NORTH', 'SOUTH', 'EAST', 'WEST'][Math.floor(Math.random() * 4)],
      speed: ['STATIONARY', 'WALKING', 'RUNNING', 'VEHICLE_MOVING'][Math.floor(Math.random() * 4)],
      duration: Math.floor(Math.random() * 60),
      confidence: (85 + Math.random() * 14).toFixed(1),
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    };
  }));

  const [systemHealth, setSystemHealth] = useState(initialHealth);
  const [analytics, setAnalytics] = useState({
    history: Array.from({length: 24}, (_, i) => ({ time: `${i}:00`, events: Math.floor(Math.random() * 50) }))
  });

  const trackIdCounter = useRef(9015);
  const eventIdCounter = useRef(1045);
  const alertIdCounter = useRef(2018);
  const notifIdCounter = useRef(1);

  const addNotification = useCallback((notif) => {
    setNotifications(prev => [{ id: `NOT-${notifIdCounter.current++}`, timestamp: new Date().toISOString(), read: false, ...notif }, ...prev].slice(0, 30));
  }, []);

  const addAuditLog = useCallback((action, resource, details) => {
    setAuditLogs(prev => [{
      id: `AUD-500${prev.length + 1}`,
      timestamp: new Date().toISOString(),
      user: 'admin@gov.in',
      action,
      resource,
      status: 'SUCCESS',
      details
    }, ...prev].slice(0, 100));
  }, []);

  // API exposed to UI components
  const acknowledgeAlert = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'ACKNOWLEDGED' } : a));
    addAuditLog('ALERT_ACKNOWLEDGED', id, `Acknowledged alert ${id}`);
  };

  const resolveAlert = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'RESOLVED' } : a));
    addAuditLog('ALERT_RESOLVED', id, `Resolved alert ${id}`);
  };

  const generateReport = (data) => {
    const newReport = {
      id: `RPT-00${reports.length + 1}`,
      name: `Custom ${data.type} Report`,
      type: data.type,
      period: data.period,
      created: new Date().toISOString(),
      status: 'GENERATING',
      records: Math.floor(Math.random() * 100),
      author: 'admin@gov.in'
    };
    setReports(prev => [newReport, ...prev]);
    addAuditLog('REPORT_GENERATED', newReport.id, `Started generating report ${data.type}`);
    
    setTimeout(() => {
      setReports(prev => prev.map(r => r.id === newReport.id ? { ...r, status: 'READY' } : r));
      addNotification({ type: 'INFO', title: 'Report Ready', message: `Report ${newReport.name} has been generated.` });
    }, 3000);
  };

  const markNotificationRead = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllNotificationsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  // The main simulation loop
  useEffect(() => {
    if (!isDemoMode || isPaused) return;

    const interval = setInterval(() => {
      // 1. Update System Health subtly
      setSystemHealth(prev => ({
        ...prev,
        cpu: Math.max(10, Math.min(95, prev.cpu + (Math.random() * 4 - 2))),
        memory: Math.max(20, Math.min(90, prev.memory + (Math.random() * 2 - 1))),
        detectionFps: Math.max(15, Math.min(60, prev.detectionFps + (Math.random() * 2 - 1))),
        latency: Math.max(10, Math.min(100, prev.latency + (Math.random() * 10 - 5)))
      }));

      // 2. Update Camera metrics
      setCameras(prev => {
        let changed = false;
        const newCams = prev.map(cam => {
          if (cam.status === 'OFFLINE') {
            if (Math.random() < 0.05) { // 5% chance to recover per tick
              changed = true;
              addNotification({ type: 'SUCCESS', title: 'Camera Recovered', message: `${cam.name} is back online.` });
              return { ...cam, status: 'ONLINE', health: 80, fps: 24, latency: 45 };
            }
            return cam;
          }
          
          let newHealth = cam.health + (Math.random() * 2 - 1);
          newHealth = Math.max(20, Math.min(100, newHealth));
          
          let newStatus = cam.status;
          if (newHealth < 40 && newStatus !== 'DEGRADED') {
            newStatus = 'DEGRADED';
            changed = true;
          }
          else if (newHealth > 60 && newStatus !== 'ONLINE') newStatus = 'ONLINE';
          
          if (Math.random() < 0.002) { // very rare offline event
            newStatus = 'OFFLINE';
            newHealth = 0;
            changed = true;
            addNotification({ type: 'ERROR', title: 'Camera Offline', message: `${cam.name} lost connection.` });
          }

          return {
            ...cam,
            health: newHealth,
            status: newStatus,
            fps: newStatus === 'ONLINE' ? Math.round(24 + (Math.random() * 6 - 3)) : newStatus === 'DEGRADED' ? 12 : 0,
            latency: newStatus === 'ONLINE' ? Math.round(15 + (Math.random() * 10)) : newStatus === 'DEGRADED' ? 150 : 0
          };
        });
        return newCams;
      });

      // 3. Move/Update Tracks
      setTracks(prev => {
        let newTracks = prev.map(t => {
          const latMove = t.direction.includes('NORTH') ? 0.00005 : t.direction.includes('SOUTH') ? -0.00005 : 0;
          const lngMove = t.direction.includes('EAST') ? 0.00005 : t.direction.includes('WEST') ? -0.00005 : 0;
          
          return {
            ...t,
            lat: t.lat + (Math.random() * latMove),
            lng: t.lng + (Math.random() * lngMove),
            duration: t.duration + 1,
            lastSeen: new Date().toISOString()
          };
        }).filter(t => t.duration < 180); // tracks live for ~180 ticks

        // Maintain 12-15 tracks
        if (newTracks.length < 15 && Math.random() < 0.3) {
          const onlineCameras = cameras.filter(c => c.status === 'ONLINE');
          if (onlineCameras.length > 0) {
            const cam = onlineCameras[Math.floor(Math.random() * onlineCameras.length)];
            newTracks.push({
              id: `TRK-${trackIdCounter.current++}`,
              type: OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)],
              camera: cam.id,
              zone: cam.zone,
              lat: cam.lat + (Math.random() * 0.002 - 0.001),
              lng: cam.lng + (Math.random() * 0.002 - 0.001),
              direction: ['NORTH', 'SOUTH', 'EAST', 'WEST'][Math.floor(Math.random() * 4)],
              speed: ['STATIONARY', 'WALKING', 'RUNNING', 'VEHICLE_MOVING'][Math.floor(Math.random() * 4)],
              duration: 0,
              confidence: (85 + Math.random() * 14).toFixed(1),
              firstSeen: new Date().toISOString(),
              lastSeen: new Date().toISOString()
            });
          }
        }
        return newTracks;
      });

      // 4. Generate Events and flowing Alerts/Evidence
      if (Math.random() < 0.15) { // 15% chance per tick to generate an event
        setEvents(prev => {
          const cam = cameras[Math.floor(Math.random() * cameras.length)];
          const hasEvidence = Math.random() > 0.5;
          const evidenceId = hasEvidence ? `EVD-${eventIdCounter.current}` : null;
          
          const newEvent = {
            id: `EVT-${eventIdCounter.current++}`,
            type: EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)],
            severity: Math.random() > 0.9 ? 'CRITICAL' : Math.random() > 0.7 ? 'HIGH' : Math.random() > 0.3 ? 'MEDIUM' : 'LOW',
            camera: cam?.id || 'CAM-001',
            zone: cam?.zone || 'ZONE-A',
            track: `TRK-${trackIdCounter.current - 1}`,
            objectType: OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)],
            confidence: (75 + Math.random() * 24).toFixed(1),
            timestamp: new Date().toISOString(),
            status: 'NEW',
            description: `Live simulated detection in ${cam.sector}`,
            evidenceId
          };
          
          // Generate Alert for Critical/High
          if (newEvent.severity === 'CRITICAL' || newEvent.severity === 'HIGH') {
            setAlerts(al => [{
              id: `ALT-${alertIdCounter.current++}`,
              eventId: newEvent.id,
              severity: newEvent.severity,
              type: newEvent.type,
              camera: newEvent.camera,
              timestamp: newEvent.timestamp,
              status: 'NEW'
            }, ...al].slice(0, 100));

            addNotification({ 
              type: newEvent.severity === 'CRITICAL' ? 'ERROR' : 'WARNING', 
              title: 'New Alert Generated', 
              message: `${newEvent.type} at ${cam.name}` 
            });
          }

          // Generate Evidence
          if (hasEvidence) {
            setEvidence(ev => [{
              id: evidenceId,
              eventId: newEvent.id,
              camera: newEvent.camera,
              timestamp: newEvent.timestamp,
              type: Math.random() > 0.7 ? 'VIDEO_CLIP' : 'SNAPSHOT',
              duration: Math.random() > 0.7 ? `${Math.floor(10 + Math.random()*20)}s` : 'N/A',
              size: `${(Math.random() * 5 + 1).toFixed(1)} MB`,
              severity: newEvent.severity,
              status: 'STORED'
            }, ...ev].slice(0, 100));
          }
          
          return [newEvent, ...prev].slice(0, 200); // keep last 200
        });
      }

    }, 2000 / simSpeed);

    return () => clearInterval(interval);
  }, [isDemoMode, isPaused, simSpeed, cameras, addNotification]);

  const toggleSimulation = () => setIsPaused(!isPaused);
  const toggleDemoMode = () => setIsDemoMode(!isDemoMode);
  
  const resetDemoData = () => {
    setCameras(initialCameras);
    setZones(initialZones);
    setEvents(generatedEvents);
    setAlerts(generateHistoricalAlerts());
    setTracks([]);
    setEvidence(generateHistoricalEvidence());
    setAuditLogs(generateHistoricalAudit());
    setNotifications([]);
  };

  return (
    <SimulationContext.Provider value={{
      isDemoMode, setIsDemoMode, toggleDemoMode,
      isPaused, setIsPaused, toggleSimulation,
      simSpeed, setSimSpeed, resetDemoData,
      cameras, setCameras, 
      zones, setZones, 
      events, alerts, acknowledgeAlert, resolveAlert, 
      evidence,
      tracks, systemHealth, analytics,
      auditLogs, addAuditLog,
      reports, generateReport,
      notifications, addNotification, markNotificationRead, markAllNotificationsRead
    }}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => useContext(SimulationContext);
