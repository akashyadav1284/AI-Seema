import { useState, useEffect } from 'react';
import { getZones } from '../services/api';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Plus, Search, Map, Loader2, ShieldAlert, Hexagon, Activity } from 'lucide-react';

const Zones = () => {
  const [zones, setZones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchZones = async () => {
      setIsLoading(true);
      try {
        const data = await getZones();
        setZones(data.items || []);
      } catch (error) {
        console.error("Failed to load zones", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchZones();
  }, []);

  const filteredZones = zones.filter(zone => 
    zone.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    zone.camera_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Zones & Fences</h1>
          <p className="text-textMuted text-sm mt-1">Configure and manage virtual boundaries, restricted areas, and tripwires.</p>
        </div>
        <Button className="shrink-0 gap-2">
          <Plus className="w-4 h-4" />
          Create Zone/Fence
        </Button>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden bg-white shadow-sm border-border">
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
            <input 
              type="text" 
              placeholder="Search zones by name or camera..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md pl-9 pr-4 py-2 text-sm text-text placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
            />
          </div>
        </div>
        
        <CardContent className="flex-1 overflow-auto p-0">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-textMuted">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Loading zones configuration...</p>
            </div>
          ) : filteredZones.length > 0 ? (
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Camera Source</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredZones.map((zone) => (
                  <TableRow key={zone.zone_id || zone.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {zone.active !== false ? (
                          <Activity className="w-4 h-4 text-success" />
                        ) : (
                          <Activity className="w-4 h-4 text-slate-400" />
                        )}
                        <Badge variant={zone.active !== false ? 'success' : 'secondary'}>
                          {zone.active !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-textMuted">
                        {zone.zone_type === 'VIRTUAL_FENCE' ? <Hexagon className="w-4 h-4" /> : <Map className="w-4 h-4" />}
                        <span className="capitalize font-medium">{zone.zone_type || 'Polygon'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-text">
                      {zone.name}
                    </TableCell>
                    <TableCell className="text-textMuted font-medium text-sm">
                      {zone.camera_name || zone.camera_id}
                    </TableCell>
                    <TableCell>
                      <Badge variant={zone.severity === 'high' || zone.severity === 'critical' ? 'danger' : zone.severity === 'medium' || zone.severity === 'warning' ? 'warning' : 'info'}>
                        {zone.severity || 'medium'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" className="text-primary hover:text-primary hover:bg-slate-50">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-textMuted space-y-4 p-8">
              <ShieldAlert className="w-12 h-12 text-slate-300" />
              <div className="text-center">
                <p className="text-text font-semibold">No active zones or fences</p>
                <p className="text-sm mt-1">Create your first virtual boundary to monitor restricted areas.</p>
                <Button className="mt-4" variant="secondary" onClick={() => {}}>
                  Create Zone/Fence
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Zones;
