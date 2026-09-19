import { useState, useEffect } from 'react';
import { getEvents } from '../services/api';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Search, Filter, Download, Activity, Loader2, Calendar } from 'lucide-react';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        const data = await getEvents();
        setEvents(data.items || []);
      } catch (error) {
        console.error("Failed to load events", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEvents();
    
    import('../services/socket').then(({ socketService }) => {
      socketService.subscribe('events');
      
      const handleNewEvent = (data) => {
        if (data.event) {
          setEvents(prev => {
            const id = data.event.event_id || data.event.id;
            if (prev.some(e => (e.event_id || e.id) === id)) return prev;
            return [data.event, ...prev];
          });
        }
      };
      
      socketService.on('event.created', handleNewEvent);
      
      return () => {
        socketService.off('event.created', handleNewEvent);
        socketService.unsubscribe('events');
      };
    });
  }, []);

  const filteredEvents = events.filter(evt => {
    const matchesSearch = 
      evt.event_type?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      evt.camera_id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeverity = filterSeverity === 'all' || evt.severity === filterSeverity;
    
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Event History</h1>
          <p className="text-textMuted text-sm mt-1">Search, filter, and export historical security events.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="gap-2 bg-white">
            <Calendar className="w-4 h-4" />
            Select Date Range
          </Button>
          <Button variant="primary" className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden bg-white shadow-sm border-border">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-4 justify-between bg-slate-50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
            <input 
              type="text" 
              placeholder="Search by event type or camera..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md pl-9 pr-4 py-2 text-sm text-text placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-textMuted" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-white border border-slate-200 text-text text-sm rounded-md px-3 py-2 focus:ring-primary focus:border-primary focus:outline-none shadow-sm"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>
        
        <CardContent className="flex-1 overflow-auto p-0">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-textMuted">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Loading historical data...</p>
            </div>
          ) : filteredEvents.length > 0 ? (
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Camera Source</TableHead>
                  <TableHead>Track/Zone</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Evidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((evt) => (
                  <TableRow key={evt.event_id || evt.id}>
                    <TableCell className="font-mono text-xs text-textMuted">
                      {new Date(evt.timestamp * 1000 || Date.now()).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-semibold text-text uppercase text-xs tracking-wider">
                      {evt.event_type}
                    </TableCell>
                    <TableCell>
                      <Badge variant={evt.severity === 'critical' ? 'danger' : evt.severity === 'warning' ? 'warning' : 'info'}>
                        {evt.severity || 'info'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-textMuted font-medium text-sm">
                      {evt.camera_id || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {evt.track_id && <span className="text-xs text-textMuted font-mono">ID: #{evt.track_id}</span>}
                        {evt.zone_id && <Badge variant="warning" className="text-[10px] w-fit px-1.5 py-0">{evt.zone_id}</Badge>}
                        {!evt.track_id && !evt.zone_id && <span className="text-slate-400 text-xs">-</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-textMuted max-w-xs truncate text-sm">
                      {evt.description || evt.reason || 'No additional details provided.'}
                    </TableCell>
                    <TableCell className="text-right">
                      {evt.evidence ? (
                        <Button variant="secondary" size="sm" onClick={() => window.location.href = '/evidence'}>
                          View Evidence
                        </Button>
                      ) : (
                        <span className="text-slate-400 text-xs pr-4">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-textMuted space-y-4 p-8">
              <Activity className="w-12 h-12 text-slate-300" />
              <div className="text-center">
                <p className="text-text font-medium">No events found</p>
                <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Events;
