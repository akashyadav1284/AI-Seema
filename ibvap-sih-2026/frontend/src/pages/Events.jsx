import { useState, useEffect } from 'react';
import { getEvents } from '../services/api';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Search, Filter, Download, Activity, Loader2, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

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
        setEvents(data.data || []);
      } catch (error) {
        console.error("Failed to load events", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEvents();
  }, []);

  const filteredEvents = events.filter(evt => {
    const matchesSearch = 
      evt.type?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      evt.camera_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeverity = filterSeverity === 'all' || evt.severity === filterSeverity;
    
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Event History</h1>
          <p className="text-slate-400 text-sm mt-1">Search, filter, and export historical security events.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="gap-2">
            <Calendar className="w-4 h-4" />
            Select Date Range
          </Button>
          <Button variant="secondary" className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-4 justify-between bg-surfaceHover/30">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by event type or camera..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border rounded-md pl-9 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-background border border-border text-slate-200 text-sm rounded-md px-3 py-2 focus:ring-primary focus:border-primary focus:outline-none"
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
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Loading historical data...</p>
            </div>
          ) : filteredEvents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Camera Source</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((evt) => (
                  <TableRow key={evt.id}>
                    <TableCell className="font-mono text-sm text-slate-400">
                      {new Date(evt.timestamp || Date.now()).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium text-slate-200">
                      {evt.type}
                    </TableCell>
                    <TableCell>
                      <Badge variant={evt.severity === 'critical' ? 'danger' : evt.severity === 'warning' ? 'warning' : 'info'}>
                        {evt.severity || 'info'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {evt.camera_name || 'N/A'}
                    </TableCell>
                    <TableCell className="text-slate-400 max-w-xs truncate">
                      {evt.description || 'No additional details provided.'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
                        Investigate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 p-8">
              <Activity className="w-12 h-12 text-slate-700" />
              <div className="text-center">
                <p className="text-slate-300 font-medium">No events found</p>
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
