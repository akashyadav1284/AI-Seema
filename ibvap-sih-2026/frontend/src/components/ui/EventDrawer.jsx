import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Crosshair, Map, Clock, ShieldAlert, Database, History, ChevronRight } from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './Button';
import { useSimulation } from '../../contexts/SimulationContext';
import { cn } from '../../lib/utils';

export const EventDrawer = ({ event, isOpen, onClose }) => {
  const { cameras, alerts, evidence, acknowledgeAlert, resolveAlert } = useSimulation();

  if (!event) return null;

  const cam = cameras.find(c => c.id === event.camera || c.id === event.camera_id);
  const relatedAlert = alerts.find(a => a.eventId === (event.id || event.event_id));
  const relatedEvidence = evidence.find(e => e.eventId === (event.id || event.event_id));

  const e_timestamp = event.timestamp 
    ? (typeof event.timestamp === 'string' ? new Date(event.timestamp) : new Date(event.timestamp * 1000))
    : new Date();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-text/20 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-surface border-l border-border shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-slate-50 shrink-0">
              <div className="flex flex-col">
                <span className="text-xs font-mono text-textMuted uppercase tracking-wider">{event.id || event.event_id}</span>
                <h2 className="text-lg font-bold text-text uppercase tracking-tight mt-0.5">{event.type || event.event_type}</h2>
              </div>
              <button onClick={onClose} className="p-2 text-textMuted hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-background">
              
              {/* Overview */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-text uppercase tracking-wider border-b border-border pb-1">Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs text-textMuted mb-1">Timestamp</span>
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <Clock className="w-4 h-4 text-primary" />
                      {e_timestamp.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs text-textMuted mb-1">Severity</span>
                    <Badge variant={event.severity?.toLowerCase() === 'critical' ? 'danger' : event.severity?.toLowerCase() === 'high' ? 'danger' : event.severity?.toLowerCase() === 'warning' || event.severity?.toLowerCase() === 'medium' ? 'warning' : 'info'}>
                      {event.severity || 'INFO'}
                    </Badge>
                  </div>
                  <div>
                    <span className="block text-xs text-textMuted mb-1">Confidence</span>
                    <span className="text-sm font-mono font-bold text-success">{event.confidence || '95.0'}%</span>
                  </div>
                  <div>
                    <span className="block text-xs text-textMuted mb-1">Object Type</span>
                    <Badge variant="secondary">{event.objectType || 'UNKNOWN'}</Badge>
                  </div>
                </div>
                <p className="text-sm text-textMuted pt-2 border-t border-border mt-3 italic">
                  {event.description || 'System-generated event detected by AI core.'}
                </p>
              </div>

              {/* Source (Camera & Zone) */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-text uppercase tracking-wider border-b border-border pb-1 flex items-center justify-between">
                  <span>Source Information</span>
                  <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => window.location.href = '/cameras'}>View Camera</Button>
                </h3>
                <div className="bg-white p-3 rounded-md border border-border shadow-sm flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs text-textMuted font-mono">{event.camera || event.camera_id || 'N/A'}</span>
                      <span className="block text-sm font-medium">{cam?.name || 'Unknown Camera'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1 pt-2 border-t border-slate-100">
                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      <Map className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs text-textMuted">Zone / Sector</span>
                      <span className="block text-sm font-medium">{event.zone || event.zone_id || cam?.zone || 'N/A'}</span>
                    </div>
                  </div>
                  {event.track && (
                    <div className="flex items-center gap-3 mt-1 pt-2 border-t border-slate-100">
                      <div className="w-8 h-8 rounded bg-warning/10 flex items-center justify-center text-warning shrink-0">
                        <Crosshair className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <span className="block text-xs text-textMuted">Track ID</span>
                        <span className="block text-sm font-medium font-mono">{event.track}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => window.location.href = '/tracks'}>Open Track</Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Linked Alert */}
              {relatedAlert && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-text uppercase tracking-wider border-b border-border pb-1 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-warning" />
                    Linked Alert
                  </h3>
                  <div className={cn("p-3 rounded-md border shadow-sm", relatedAlert.status === 'NEW' ? 'bg-danger/5 border-danger/20' : 'bg-white border-border')}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs font-mono text-textMuted">{relatedAlert.id}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={relatedAlert.status === 'NEW' ? 'danger' : relatedAlert.status === 'ACKNOWLEDGED' ? 'warning' : 'success'}>
                            {relatedAlert.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {relatedAlert.status === 'NEW' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs border-danger text-danger hover:bg-danger hover:text-white" onClick={() => acknowledgeAlert(relatedAlert.id)}>
                            Acknowledge
                          </Button>
                        )}
                        {(relatedAlert.status === 'NEW' || relatedAlert.status === 'ACKNOWLEDGED') && (
                          <Button size="sm" variant="outline" className="h-7 text-xs border-success text-success hover:bg-success hover:text-white" onClick={() => resolveAlert(relatedAlert.id)}>
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Evidence */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-text uppercase tracking-wider border-b border-border pb-1 flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  Evidence
                </h3>
                {relatedEvidence ? (
                  <div className="bg-white p-3 rounded-md border border-border shadow-sm flex items-center justify-between">
                    <div>
                      <span className="block text-xs text-textMuted font-mono">{relatedEvidence.id}</span>
                      <span className="block text-sm font-medium">{relatedEvidence.type === 'VIDEO_CLIP' ? 'Video Recording' : 'High-Res Snapshot'}</span>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => window.location.href = '/evidence'}>
                      View Evidence
                    </Button>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-md border border-slate-200 text-center">
                    <p className="text-sm text-textMuted">No evidence captured for this event.</p>
                  </div>
                )}
              </div>

              {/* Audit Timeline */}
              <div className="space-y-3 pb-6">
                <h3 className="text-sm font-bold text-text uppercase tracking-wider border-b border-border pb-1 flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-500" />
                  Lifecycle Timeline
                </h3>
                <div className="pl-2 border-l-2 border-slate-200 space-y-4">
                  <div className="relative pl-4">
                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-slate-300 ring-2 ring-background"></div>
                    <p className="text-xs text-textMuted">{e_timestamp.toLocaleString()}</p>
                    <p className="text-sm font-medium">Event Generated</p>
                  </div>
                  {relatedAlert && (
                    <div className="relative pl-4">
                      <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-warning ring-2 ring-background"></div>
                      <p className="text-xs text-textMuted">{new Date(relatedAlert.timestamp).toLocaleString()}</p>
                      <p className="text-sm font-medium">Alert Dispatched</p>
                    </div>
                  )}
                  {relatedAlert?.status === 'ACKNOWLEDGED' && (
                    <div className="relative pl-4">
                      <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background"></div>
                      <p className="text-xs text-textMuted">Operator Action</p>
                      <p className="text-sm font-medium">Alert Acknowledged</p>
                    </div>
                  )}
                  {relatedAlert?.status === 'RESOLVED' && (
                    <div className="relative pl-4">
                      <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-success ring-2 ring-background"></div>
                      <p className="text-xs text-textMuted">Operator Action</p>
                      <p className="text-sm font-medium">Alert Resolved</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
