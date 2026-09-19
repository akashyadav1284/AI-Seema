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
        <div className={`${className} flex flex-col items-center justify-center bg-slate-100`}>
          <Video className="w-12 h-12 text-slate-300 mb-2" />
          <span className="text-textMuted text-sm font-medium">Media Not Found</span>
        </div>
      );
    }
    return <div className={`${className} flex flex-col items-center justify-center bg-slate-100`}>
       <ImageIcon className="w-12 h-12 text-slate-300 mb-2" />
       <span className="text-textMuted text-sm font-medium">Image Not Found</span>
    </div>;
  }

  if (!blobUrl) {
    return (
      <div className={`${className} flex flex-col items-center justify-center bg-slate-50`}>
         <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
         <span className="text-xs text-textMuted font-medium">Loading Media...</span>
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
        
        const items = eventsWithEvidence.map(e => {
          const filename = typeof e.evidence === 'string' ? e.evidence : e.evidence.filename || e.evidence.url?.split('/').pop();
          return {
            id: e.event_id || e.id,
            eventId: e.event_id || e.id,
            type: e.evidence?.type || 'snapshot',
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
            onClick={() => setTypeFilter('clip')}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 font-medium ${typeFilter === 'clip' ? 'bg-white text-primary shadow-sm' : 'text-textMuted hover:text-text'}`}
          >
            <Video className="w-4 h-4" /> Clips
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto custom-scrollbar">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-textMuted">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p>Loading evidence vault...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-6">
            {filteredItems.map(item => (
              <Card key={item.id} className="overflow-hidden group hover:border-primary/50 transition-colors shadow-sm bg-white border-border">
                <div className="aspect-video relative bg-slate-100 flex items-center justify-center overflow-hidden border-b border-border">
                   {item.filename ? (
                     <SecureMedia 
                       filename={item.filename}
                       type={item.type}
                       alt="Evidence" 
                       className="w-full h-full object-contain"
                     />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center bg-slate-100">
                       <Video className="w-12 h-12 text-slate-300" />
                     </div>
                   )}
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                     <Button variant="secondary" className="gap-2 bg-white text-text hover:bg-slate-100">
                       <ExternalLink className="w-4 h-4" /> View Full
                     </Button>
                     <Button variant="primary" className="gap-2">
                       <Download className="w-4 h-4" /> Save
                     </Button>
                   </div>
                   <div className="absolute top-2 left-2 flex gap-2">
                     <span className={`px-2 py-1 rounded text-xs font-bold text-white shadow-sm ${item.severity === 'critical' ? 'bg-danger' : item.severity === 'warning' ? 'bg-warning' : 'bg-primary'}`}>
                       {item.event_type}
                     </span>
                     <span className="px-2 py-1 rounded bg-white text-textMuted text-xs shadow-sm border border-border font-medium">
                       {item.type === 'snapshot' ? <ImageIcon className="w-3 h-3 inline" /> : <Video className="w-3 h-3 inline" />}
                     </span>
                   </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-text">{item.camera || 'Unknown Camera'}</p>
                      <p className="text-xs text-textMuted font-mono mt-1">{new Date(item.timestamp * 1000).toLocaleString()}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-primary h-8 px-2 font-medium hover:bg-slate-50">
                       Event Detail
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-textMuted space-y-4">
            <ImageIcon className="w-12 h-12 text-slate-300" />
            <div className="text-center">
              <p className="text-text font-semibold">No evidence found</p>
              <p className="text-sm mt-1">Adjust filters or date range.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Evidence;
