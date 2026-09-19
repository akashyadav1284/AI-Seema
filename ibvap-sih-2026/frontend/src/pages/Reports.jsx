import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { FileText, Download, Plus, Search, Calendar, Filter, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { useSimulation } from '../contexts/SimulationContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const Reports = () => {
  const { reports, generateReport } = useSimulation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportType, setReportType] = useState('DAILY OPERATIONS');
  const [reportPeriod, setReportPeriod] = useState('Last 24h');
  const [showModal, setShowModal] = useState(false);

  const handleGenerate = () => {
    generateReport({ type: reportType, period: reportPeriod });
    setShowModal(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Intelligence Reports</h1>
          <p className="text-textMuted text-sm mt-1">Automated summaries, compliance logs, and analytics exports.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" className="gap-2 shadow-sm" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
            New Report
          </Button>
        </div>
      </div>

      <div className="p-4 border border-border flex flex-col sm:flex-row sm:items-center gap-4 justify-between bg-white rounded-xl shrink-0 shadow-sm">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
          <input 
            type="text" 
            placeholder="Search reports..." 
            className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-4 py-2 text-sm text-text placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="bg-white gap-2 h-9 text-sm">
            <Filter className="w-4 h-4" /> Filter
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden bg-white shadow-sm border-border">
        <CardContent className="flex-1 overflow-auto p-0 custom-scrollbar">
          {reports.length > 0 ? (
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b border-border shadow-sm">
                <TableRow>
                  <TableHead>Report ID</TableHead>
                  <TableHead>Name / Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Generated At</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-mono text-xs text-textMuted">{report.id}</TableCell>
                    <TableCell>
                      <div className="font-bold text-sm text-text">{report.name}</div>
                      <div className="text-[10px] uppercase tracking-wider text-primary font-semibold mt-0.5">{report.type}</div>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-textMuted">{report.period}</TableCell>
                    <TableCell className="font-mono text-xs text-textMuted">
                      {new Date(report.created).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{report.author}</TableCell>
                    <TableCell>
                      {report.status === 'READY' ? (
                        <div className="flex items-center gap-1.5 text-success text-xs font-bold uppercase tracking-wider">
                          <CheckCircle2 className="w-4 h-4" /> Ready
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-warning text-xs font-bold uppercase tracking-wider">
                          <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 gap-2" disabled={report.status !== 'READY'}>
                        <Download className="w-4 h-4" /> Download PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-textMuted space-y-4">
              <FileText className="w-12 h-12 text-slate-300" />
              <div className="text-center">
                <p className="text-text font-semibold">No reports generated</p>
                <p className="text-sm mt-1">Click "New Report" to generate one.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Report Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-text/20 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-surface border border-border shadow-2xl rounded-xl p-6"
            >
              <h2 className="text-lg font-bold mb-4">Generate Intelligence Report</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-1.5">Report Type</label>
                  <select 
                    value={reportType} 
                    onChange={e => setReportType(e.target.value)}
                    className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm"
                  >
                    <option value="DAILY OPERATIONS">Daily Operations Summary</option>
                    <option value="SECURITY INCIDENT">Security Incident Log</option>
                    <option value="SYSTEM COMPLIANCE">System Compliance & Health</option>
                    <option value="ANALYTICS EXPORT">Analytics Data Export</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-1.5">Time Period</label>
                  <select 
                    value={reportPeriod} 
                    onChange={e => setReportPeriod(e.target.value)}
                    className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm"
                  >
                    <option value="Last 24h">Last 24 Hours</option>
                    <option value="Last 7 Days">Last 7 Days</option>
                    <option value="Last 30 Days">Last 30 Days</option>
                    <option value="Custom Range">Custom Date Range...</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button variant="primary" className="gap-2" onClick={handleGenerate}>
                  <Plus className="w-4 h-4" /> Generate Now
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reports;
