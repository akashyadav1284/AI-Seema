import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Image as ImageIcon, Video, Search, Download, Calendar, Loader2, ExternalLink, Camera } from 'lucide-react';
import { useSimulation } from '../contexts/SimulationContext';
import { cn } from '../lib/utils';
import { EventDrawer } from '../components/ui/EventDrawer';

const Evidence = () => {
  const { evidence, events, cameras, isDemoMode } = useSimulation();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const filteredItems = evidence.filter(item => {
    const cam = cameras.find(c => c.id === item.camera);
    const evt = events.find(e => (e.id || e.event_id) === item.eventId);
    const matchStr = `${item.camera} ${cam?.name || ''} ${evt?.type || ''}`.toLowerCase();
    
    const matchesSearch = matchStr.includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || item.type.toLowerCase().includes(typeFilter);
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Evidence Vault</h1>
          <p className="text-textMuted text-sm mt-1">Review and export snapshots and clips from security events.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="gap-2 bg-white">
            <Calendar className="w-4 h-4" />
            Select Date
          </Button>
        </div>
      </div>

      <div className="p-4 border border-border flex flex-col sm:flex-row sm:items-center gap-4 justify-between bg-white rounded-xl shrink-0 shadow-sm">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
          <input 
            type="text" 
            placeholder="Search by camera or event type..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-4 py-2 text-sm text-text placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all shadow-sm"
          />
        </div>
        
        <div className="flex items-center p-1 bg-slate-100 border border-border rounded-lg shadow-sm">
          <button 
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors font-medium ${typeFilter === 'all' ? 'bg-white text-primary shadow-sm' : 'text-textMuted hover:text-text'}`}
          >
            All
          </button>
          <button 
            onClick={() => setTypeFilter('snapshot')}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 font-medium ${typeFilter === 'snapshot' ? 'bg-white text-primary shadow-sm' : 'text-textMuted hover:text-text'}`}
          >
            <ImageIcon className="w-4 h-4" /> Snapshots
          </button>
          <button 
            onClick={() => setTypeFilter('video')}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 font-medium ${typeFilter === 'video' ? 'bg-white text-primary shadow-sm' : 'text-textMuted hover:text-text'}`}
          >
            <Video className="w-4 h-4" /> Clips
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto custom-scrollbar">
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
            {filteredItems.map(item => {
              const cam = cameras.find(c => c.id === item.camera);
              const evt = events.find(e => (e.id || e.event_id) === item.eventId);
              const e_timestamp = new Date(item.timestamp);
              const isVideo = item.type === 'VIDEO_CLIP';

              return (
                <Card key={item.id} className="overflow-hidden group hover:border-primary/50 transition-colors shadow-sm bg-white border-border">
                  <div className="aspect-video relative bg-slate-100 flex items-center justify-center overflow-hidden border-b border-border">
                    {/* Mock Media Display */}
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center relative overflow-hidden">
                      {isDemoMode ? (
                        <>
                          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                          <div className="absolute top-2 right-2 flex gap-1">
                            <span className="text-[9px] font-mono text-white/70 bg-black/50 px-1 rounded">{e_timestamp.toLocaleTimeString()}</span>
                            <span className="text-[9px] font-mono text-white/70 bg-black/50 px-1 rounded">{cam?.name}</span>
                          </div>
                          {isVideo ? (
                            <Video className="w-12 h-12 text-slate-500" />
                          ) : (
                            <ImageIcon className="w-12 h-12 text-slate-500" />
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100">
                           <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                        </div>
                      )}
                    </div>
                    
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <Button variant="secondary" className="gap-2 bg-white text-text hover:bg-slate-100" onClick={() => setSelectedEvent(evt)}>
                        <ExternalLink className="w-4 h-4" /> View Details
                      </Button>
                      <Button variant="primary" className="gap-2">
                        <Download className="w-4 h-4" /> Save
                      </Button>
                    </div>
                    
                    <div className="absolute top-2 left-2 flex gap-2">
                      <span className={cn(
                        "px-2 py-1 rounded text-[10px] font-bold text-white shadow-sm tracking-wider uppercase",
                        item.severity === 'CRITICAL' ? 'bg-danger' : item.severity === 'HIGH' ? 'bg-danger/90' : item.severity === 'MEDIUM' ? 'bg-warning' : 'bg-info'
                      )}>
                        {evt?.type || 'EVENT'}
                      </span>
                      <span className="px-2 py-1 rounded bg-black/50 text-white text-xs shadow-sm border border-white/10 font-medium">
                        {!isVideo ? <ImageIcon className="w-3 h-3 inline" /> : <Video className="w-3 h-3 inline" />}
                      </span>
                    </div>

                    {isVideo && (
                      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-mono px-1.5 rounded">
                        {item.duration || '00:15'}
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-text">
                          <Camera className="w-4 h-4 text-textMuted" />
                          {cam?.name || item.camera}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-textMuted font-mono">{e_timestamp.toLocaleString()}</span>
                          <span className="text-[10px] text-textMuted bg-slate-100 px-1.5 py-0.5 rounded font-mono">{item.size || '2.4 MB'}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-primary h-8 px-2 font-medium hover:bg-slate-50" onClick={() => setSelectedEvent(evt)}>
                         Event Info
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-textMuted space-y-4">
            <ImageIcon className="w-12 h-12 text-slate-300" />
            <div className="text-center">
              <p className="text-text font-semibold">No evidence found</p>
              <p className="text-sm mt-1">Adjust filters or search query.</p>
            </div>
          </div>
        )}
      </div>

      <EventDrawer 
        event={selectedEvent} 
        isOpen={!!selectedEvent} 
        onClose={() => setSelectedEvent(null)} 
      />
    </div>
  );
};

export default Evidence;
