import { useState, useEffect } from 'react';
import { getEvents, fetchEvidenceBlob } from '../services/api';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Image as ImageIcon, Video, Search, Download, Calendar, Loader2, ExternalLink } from 'lucide-react';

const SecureMedia = ({ filename, type = 'snapshot', alt, className }) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let url = null;
    if (filename) {
      fetchEvidenceBlob(filename, type)
        .then(blob => {
          url = URL.createObjectURL(blob);
          setBlobUrl(url);
        })
        .catch(err => {
          console.error("Failed to fetch media blob", err);
          setError(true);
        });
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [filename, type]);

  if (error) {
    if (type === 'clip') {
      return (
        <div className={`${className} flex flex-col items-center justify-center bg-slate-900`}>
          <Video className="w-12 h-12 text-slate-600 mb-2" />
          <span className="text-slate-400 text-sm">Media Not Found</span>
        </div>
      );
    }
    return <img src="https://placehold.co/600x400/1e293b/475569?text=Image+Not+Found" alt="Not found" className={className} />;
  }

  if (!blobUrl) {
    return (
      <div className={`${className} flex flex-col items-center justify-center bg-slate-900`}>
         <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
         <span className="text-xs text-slate-400 font-medium">Loading Media...</span>
      </div>
    );
  }

  if (type === 'clip') {
    return (
      <video 
        src={blobUrl} 
        controls 
        autoPlay 
        loop 
        muted 
        className={className} 
      />
    );
  }

  return <img src={blobUrl} alt={alt} className={className} />;
};

const Evidence = () => {
  const [evidenceItems, setEvidenceItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    const fetchEvidenceData = async () => {
      setIsLoading(true);
      try {
        const eventsData = await getEvents();
        const eventsWithEvidence = (eventsData.items || []).filter(e => e.evidence);
        
        // Transform to evidence items
        const items = eventsWithEvidence.map(e => {
          // If evidence is just a string filename, or an object containing filename
          const filename = typeof e.evidence === 'string' ? e.evidence : e.evidence.filename || e.evidence.url?.split('/').pop();
          return {
            id: e.event_id || e.id,
            eventId: e.event_id || e.id,
            type: e.evidence?.type || 'snapshot', // Support backend specifying type, else default to snapshot
            filename: filename,
            timestamp: e.timestamp,
            camera: e.camera_id,
            event_type: e.event_type,
            severity: e.severity
          };
        });
        setEvidenceItems(items);
      } catch (error) {
        console.error("Failed to load evidence", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEvidenceData();
  }, []);

  const filteredItems = evidenceItems.filter(item => {
    const matchesSearch = item.camera?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.event_type?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Evidence Vault</h1>
          <p className="text-slate-400 text-sm mt-1">Review and export snapshots and clips from security events.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="gap-2">
            <Calendar className="w-4 h-4" />
            Select Date
          </Button>
        </div>
      </div>

      <div className="p-4 border border-border flex flex-col sm:flex-row sm:items-center gap-4 justify-between bg-surfaceHover/30 rounded-xl shrink-0">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search by camera or event type..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded-md pl-9 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
        
        <div className="flex items-center p-1 bg-surface border border-border rounded-lg">
          <button 
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${typeFilter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            All
          </button>
          <button 
            onClick={() => setTypeFilter('snapshot')}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 ${typeFilter === 'snapshot' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            <ImageIcon className="w-4 h-4" /> Snapshots
          </button>
          <button 
            onClick={() => setTypeFilter('clip')}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 ${typeFilter === 'clip' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            <Video className="w-4 h-4" /> Clips
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto custom-scrollbar">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p>Loading evidence vault...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-6">
            {filteredItems.map(item => (
              <Card key={item.id} className="overflow-hidden group hover:border-primary/50 transition-colors">
                <div className="aspect-video relative bg-black flex items-center justify-center overflow-hidden">
                   {item.filename ? (
                     <SecureMedia 
                       filename={item.filename}
                       type={item.type}
                       alt="Evidence" 
                       className="w-full h-full object-contain bg-slate-950"
                     />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center bg-slate-900">
                       <Video className="w-12 h-12 text-slate-600" />
                     </div>
                   )}
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                     <Button variant="secondary" className="gap-2">
                       <ExternalLink className="w-4 h-4" /> View Full
                     </Button>
                     <Button variant="outline" className="gap-2 border-white/20 hover:bg-white/10 text-white">
                       <Download className="w-4 h-4" /> Save
                     </Button>
                   </div>
                   <div className="absolute top-2 left-2 flex gap-2">
                     <span className={`px-2 py-1 rounded text-xs font-bold text-white shadow-sm ${item.severity === 'critical' ? 'bg-danger' : item.severity === 'warning' ? 'bg-warning' : 'bg-primary'}`}>
                       {item.event_type}
                     </span>
                     <span className="px-2 py-1 rounded bg-black/60 text-white text-xs backdrop-blur-sm border border-white/10">
                       {item.type === 'snapshot' ? <ImageIcon className="w-3 h-3 inline" /> : <Video className="w-3 h-3 inline" />}
                     </span>
                   </div>
                </div>
                <CardContent className="p-4 bg-surfaceHover/20">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-slate-200">{item.camera || 'Unknown Camera'}</p>
                      <p className="text-xs text-slate-400 font-mono mt-1">{new Date(item.timestamp * 1000).toLocaleString()}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-primary h-8 px-2">
                       Event Detail
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
            <ImageIcon className="w-12 h-12 text-slate-700" />
            <div className="text-center">
              <p className="text-slate-300 font-medium">No evidence found</p>
              <p className="text-sm mt-1">Adjust filters or date range.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Evidence;
