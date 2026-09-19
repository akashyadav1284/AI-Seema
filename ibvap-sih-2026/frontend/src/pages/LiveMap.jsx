import React from 'react';
import { useSimulation } from '../contexts/SimulationContext';
import { useDataFusion } from '../hooks/useDataFusion';
import AnimatedMap from '../components/ui/AnimatedMap';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Target, Users, Map as MapIcon, Download } from 'lucide-react';

const LiveMap = () => {
  const { systemHealth, events: simEvents, tracks: simTracks, cameras: simCameras, isDemoMode } = useSimulation();
  const fusedCameras = useDataFusion(simCameras, 'cameras');
  const fusedEvents = useDataFusion(simEvents, 'events');
  const activeAlertEvents = fusedEvents.filter(e => e.severity === 'critical' || e.severity === 'warning' || e.severity === 'HIGH' || e.status === 'NEW');

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text flex items-center gap-2">
            <MapIcon className="w-6 h-6 text-primary" />
            Tactical Live Map
          </h1>
          <p className="text-textMuted text-sm mt-1">Real-time geographical tracking of assets and incidents.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="gap-2 bg-white shadow-sm">
            <Download className="w-4 h-4" />
            Export Data
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-slate-50 border border-border rounded-xl shadow-sm relative overflow-hidden flex flex-col">
        <AnimatedMap 
          cameras={fusedCameras} 
          activeAlerts={activeAlertEvents} 
          tracks={isDemoMode ? simTracks : []} 
          className="flex-1 rounded-none border-none"
        />
        
        {/* Overlay UI Tools */}
        <div className="absolute top-4 right-4 bg-surface/90 backdrop-blur-sm p-2 rounded-lg shadow-premium border border-border flex flex-col gap-2 z-50">
          <button className="p-2 hover:bg-slate-100 rounded-md text-textMuted hover:text-primary transition-colors tooltip-trigger" title="Center on Alerts">
            <Target className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-md text-textMuted hover:text-primary transition-colors tooltip-trigger" title="Toggle Operators">
            <Users className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
