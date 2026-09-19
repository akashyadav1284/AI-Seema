import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Camera, Bell, Activity, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSimulation } from '../../contexts/SimulationContext';
import { cn } from '../../lib/utils';

export const CommandPalette = ({ isOpen, setIsOpen }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { cameras, alerts } = useSimulation(); // Can pull from simulation for fast search

  // Close on Escape, toggle on Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsOpen]);

  // Prevent scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  const navigationActions = [
    { id: 'nav-dashboard', label: 'Go to Command Center', icon: Activity, type: 'Navigation', onSelect: () => navigate('/') },
    { id: 'nav-cameras', label: 'View All Cameras', icon: Camera, type: 'Navigation', onSelect: () => navigate('/cameras') },
    { id: 'nav-alerts', label: 'Incident Management', icon: Bell, type: 'Navigation', onSelect: () => navigate('/alerts') },
  ];

  const cameraActions = cameras.map(c => ({
    id: `cam-${c.id}`,
    label: `View Camera: ${c.name}`,
    subLabel: `${c.id} • ${c.status}`,
    icon: Camera,
    type: 'Cameras',
    onSelect: () => { navigate('/cameras'); } // Could pass state to auto-select
  }));

  const allActions = [...navigationActions, ...cameraActions];
  
  const filteredActions = query === '' 
    ? allActions.slice(0, 5) 
    : allActions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()) || a.type.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredActions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        filteredActions[selectedIndex].onSelect();
        setIsOpen(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[10vh] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden pointer-events-auto flex flex-col"
            >
              {/* Input Header */}
              <div className="flex items-center px-4 py-3 border-b border-slate-100">
                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search cameras, zones, incidents, or commands..."
                  className="w-full bg-transparent border-none text-text outline-none px-3 py-1 text-lg placeholder:text-slate-300"
                />
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-text hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Results */}
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {filteredActions.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">
                    No results found for "{query}"
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredActions.map((action, idx) => (
                      <div
                        key={action.id}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => { action.onSelect(); setIsOpen(false); }}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                          selectedIndex === idx ? "bg-primary/10 text-primary" : "text-text hover:bg-slate-50"
                        )}
                      >
                        <div className={cn(
                          "p-2 rounded-md shrink-0",
                          selectedIndex === idx ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
                        )}>
                          <action.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 flex flex-col min-w-0">
                          <span className="text-sm font-semibold truncate">{action.label}</span>
                          {action.subLabel && <span className="text-xs text-slate-400 truncate">{action.subLabel}</span>}
                        </div>
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold mr-2 hidden sm:block">
                          {action.type}
                        </span>
                        {selectedIndex === idx && <ArrowRight className="w-4 h-4 shrink-0" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold uppercase text-slate-400 tracking-widest">
                <div className="flex gap-4">
                  <span><kbd className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-600">↑↓</kbd> to navigate</span>
                  <span><kbd className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-600">↵</kbd> to select</span>
                </div>
                <span><kbd className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-600">ESC</kbd> to close</span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
