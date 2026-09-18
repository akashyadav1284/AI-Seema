import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ShieldAlert, Video } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from './Badge';

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icon for Cameras
const createCameraIcon = (status) => {
  const color = status === 'online' ? '#10b981' : '#ef4444';
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color};"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

const BorderMap = ({ cameras = [], activeAlerts = [], className }) => {
  // Center roughly over India's north-western border (e.g., Punjab/Rajasthan sector)
  const defaultCenter = [28.6139, 74.2090];
  const defaultZoom = 5;

  return (
    <div className={cn("relative w-full h-full rounded-lg overflow-hidden border border-border z-0", className)}>
      <MapContainer 
        center={defaultCenter} 
        zoom={defaultZoom} 
        style={{ height: '100%', width: '100%', background: '#0a0a0b' }}
        zoomControl={false}
      >
        {/* Dark Tactical Map Theme (CartoDB Dark Matter) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Render Surveillance Zones (Example Polygon) */}
        <Polygon 
          positions={[
            [31.6340, 74.8723], // Amritsar border area approx
            [31.0, 74.5],
            [30.0, 73.8],
            [29.0, 73.0],
            [30.0, 74.0]
          ]} 
          color="#ef4444" 
          fillColor="#ef4444" 
          fillOpacity={0.1} 
          weight={2}
          dashArray="5, 10"
        >
          <Popup>High-Risk Border Sector A</Popup>
        </Polygon>

        {/* Render Cameras */}
        {cameras.map(cam => {
          // If camera lacks lat/lng, we assign dummy coordinates for Phase 1 demo
          const lat = cam.lat || (28 + Math.random() * 5);
          const lng = cam.lng || (70 + Math.random() * 10);
          
          return (
            <Marker 
              key={cam.id} 
              position={[lat, lng]} 
              icon={createCameraIcon(cam.status)}
            >
              <Popup className="tactical-popup">
                <div className="bg-surface text-slate-200 p-1">
                  <div className="font-bold border-b border-border pb-1 mb-1">{cam.name}</div>
                  <div className="text-xs text-slate-400 mb-2">{cam.location}</div>
                  <Badge variant={cam.status === 'online' ? 'success' : 'danger'}>
                    {cam.status}
                  </Badge>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Render Active Alerts (Pulsing Circles) */}
        {activeAlerts.map((alert, idx) => {
          const lat = alert.lat || (28 + Math.random() * 5);
          const lng = alert.lng || (70 + Math.random() * 10);
          
          return (
            <Circle 
              key={`alert-${idx}`}
              center={[lat, lng]}
              radius={50000} // 50km
              pathOptions={{
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.3,
                className: 'animate-pulse'
              }}
            />
          );
        })}
      </MapContainer>
      
      {/* Map UI Overlays */}
      <div className="absolute top-4 left-4 z-[400] pointer-events-none">
        <Badge variant="default" className="bg-black/80 backdrop-blur border border-slate-700 text-slate-300">
          LIVE SATELLITE COMMS
        </Badge>
      </div>
    </div>
  );
};

export default BorderMap;
