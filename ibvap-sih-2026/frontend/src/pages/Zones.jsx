import { useState, useEffect } from 'react';
import { getZones } from '../services/api';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Plus, Search, Map, Loader2, ShieldAlert, Hexagon, Activity, Edit, Trash } from 'lucide-react';
import { useDataFusion } from '../hooks/useDataFusion';
import { useSimulation } from '../contexts/SimulationContext';

const Zones = () => {
  const [zonesData, setZonesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newZone, setNewZone] = useState({ id: '', name: '', type: 'MONITORED_AREA', riskLevel: 'LOW', status: 'ACTIVE', cameras: [] });

  const { isDemoMode, addZone, updateZone, deleteZone, cameras } = useSimulation();

  useEffect(() => {
    const fetchZones = async () => {
      setIsLoading(true);
      try {
        const data = await getZones();
        setZonesData(data.items || []);
      } catch (error) {
        console.error("Failed to load zones", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchZones();
  }, []);

  const fusedZones = useDataFusion(zonesData, 'zones');

  const filteredZones = fusedZones.filter(zone => 
    zone.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (zone.camera_name || zone.camera_id || zone.cameras?.join(','))?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetModal = () => {
    setNewZone({ id: '', name: '', type: 'MONITORED_AREA', riskLevel: 'LOW', status: 'ACTIVE', cameras: [] });
    setIsEditMode(false);
  };

  const handleAddZone = () => {
    if (isDemoMode) {
      if (isEditMode) {
        updateZone(newZone.id, newZone);
      } else {
        addZone(newZone);
      }
      setIsModalOpen(false);
      resetModal();
    } else {
      alert("Real API update not implemented yet.");
    }
  };

  const handleEditZone = (zone) => {
    setNewZone({ ...zone, id: zone.zone_id || zone.id });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDeleteZone = (id) => {
    if (confirm("Are you sure you want to delete this zone?")) {
      if (isDemoMode) {
        deleteZone(id);
      } else {
        alert("Real API delete not implemented yet.");
      }
    }
  };

  const handleCameraToggle = (cameraId) => {
    setNewZone(prev => {
      const cams = prev.cameras || [];
      if (cams.includes(cameraId)) {
        return { ...prev, cameras: cams.filter(c => c !== cameraId) };
      } else {
        return { ...prev, cameras: [...cams, cameraId] };
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Zones & Fences</h1>
          <p className="text-textMuted text-sm mt-1">Configure and manage virtual boundaries, restricted areas, and tripwires.</p>
        </div>
        <Button className="shrink-0 gap-2" onClick={() => { resetModal(); setIsModalOpen(true); }}>
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
          <div className="hidden sm:flex text-sm font-medium text-textMuted flex-col items-end">
            {fusedZones.length} Total Zones
            {isDemoMode && <span className="text-xs text-primary font-bold">DEMO DATA ACTIVE</span>}
          </div>
        </div>
        
        <CardContent className="flex-1 overflow-auto p-0">
          {isLoading && !isDemoMode ? (
            <div className="h-full flex flex-col items-center justify-center text-textMuted">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Loading zones configuration...</p>
            </div>
          ) : filteredZones.length > 0 ? (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white">
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Camera Source</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredZones.map((zone) => (
                  <TableRow key={zone.zone_id || zone.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {zone.status === 'ACTIVE' || zone.active !== false ? (
                          <Activity className="w-4 h-4 text-success" />
                        ) : (
                          <Activity className="w-4 h-4 text-slate-400" />
                        )}
                        <Badge variant={zone.status === 'ACTIVE' || zone.active !== false ? 'success' : 'secondary'}>
                          {zone.status || (zone.active !== false ? 'Active' : 'Inactive')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-textMuted">
                        {zone.type === 'VIRTUAL_FENCE' || zone.zone_type === 'VIRTUAL_FENCE' ? <Hexagon className="w-4 h-4" /> : <Map className="w-4 h-4" />}
                        <span className="capitalize font-medium">{(zone.type || zone.zone_type || 'Polygon').replace('_', ' ').toLowerCase()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-text">
                      {zone.name}
                      {zone._isSimulated && <span className="text-[10px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded ml-2">DEMO</span>}
                    </TableCell>
                    <TableCell className="text-textMuted font-medium text-sm">
                      {zone.cameras ? zone.cameras.join(', ') : (zone.camera_name || zone.camera_id || 'None')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={zone.riskLevel === 'CRITICAL' || zone.severity === 'critical' || zone.severity === 'high' ? 'danger' : zone.riskLevel === 'MEDIUM' || zone.severity === 'medium' ? 'warning' : 'info'}>
                        {zone.riskLevel || zone.severity || 'LOW'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" className="p-2 h-8 w-8 text-textMuted hover:bg-slate-100" onClick={() => handleEditZone(zone)} title="Edit">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" className="p-2 h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteZone(zone.id || zone.zone_id)} title="Delete">
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
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
                <Button className="mt-4" variant="secondary" onClick={() => { resetModal(); setIsModalOpen(true); }}>
                  Create Zone/Fence
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Zone Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-border p-6 rounded-lg shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-4 text-text">{isEditMode ? 'Edit Zone' : 'Create Zone/Fence'}</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-text mb-1">Zone Name</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={newZone.name} onChange={e => setNewZone({...newZone, name: e.target.value})} placeholder="e.g. Perimeter Alpha" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text mb-1">Zone Type</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={newZone.type} onChange={e => setNewZone({...newZone, type: e.target.value})}>
                  <option value="RESTRICTED_ZONE">Restricted Zone</option>
                  <option value="VIRTUAL_FENCE">Virtual Fence</option>
                  <option value="MONITORED_AREA">Monitored Area</option>
                  <option value="BUFFER_ZONE">Buffer Zone</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Risk Level</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={newZone.riskLevel} onChange={e => setNewZone({...newZone, riskLevel: e.target.value})}>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-text mb-2">Assign Cameras</label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-md">
                {cameras.map(cam => (
                  <label key={cam.id} className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded text-primary focus:ring-primary" 
                      checked={(newZone.cameras || []).includes(cam.id)}
                      onChange={() => handleCameraToggle(cam.id)}
                    />
                    <span className="truncate">{cam.name}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-slate-100 rounded-md flex items-center justify-center mb-6">
               <div className="text-center text-slate-400 py-6">
                 <Map className="w-8 h-8 mx-auto mb-2 opacity-50" />
                 <p className="text-sm font-medium">Map boundary drawing will appear here</p>
               </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleAddZone}>{isEditMode ? 'Save Changes' : 'Create Zone'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Zones;
