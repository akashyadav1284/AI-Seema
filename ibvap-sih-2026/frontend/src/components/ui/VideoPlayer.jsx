import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Maximize, Minimize, AlertCircle, RefreshCw, WifiOff, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { motion, AnimatePresence } from 'framer-motion';

const MAX_RETRIES = 3;
const BUFFER_TIMEOUT_MS = 3000; // 3 seconds before assuming it's buffering/stalled

export const VideoPlayer = ({ src, cameraName, capabilities = [], detections = [], className }) => {
  // CONNECTING, LIVE, BUFFERING, RECONNECTING, DISCONNECTED, ERROR
  const [status, setStatus] = useState('CONNECTING');
  const [retryCount, setRetryCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef(null);
  const bufferTimer = useRef(null);
  const retryTimer = useRef(null);

  // Derive unique src to force reload (avoids browser caching broken streams)
  const token = localStorage.getItem('token');
  const tokenParam = token ? `token=${encodeURIComponent(token)}` : '';
  const baseSrc = src ? `${src}${src.includes('?') ? '&' : '?'}${tokenParam}` : '';
  const streamSrc = (src && (status === 'CONNECTING' || status === 'RECONNECTING' || status === 'LIVE' || status === 'BUFFERING')) 
    ? `${baseSrc}&t=${Date.now()}` 
    : '';

  // Setup Buffering Timeout
  useEffect(() => {
    if (status === 'CONNECTING' || status === 'RECONNECTING') {
      bufferTimer.current = setTimeout(() => {
        setStatus('BUFFERING');
      }, BUFFER_TIMEOUT_MS);
    }

    return () => {
      if (bufferTimer.current) clearTimeout(bufferTimer.current);
    };
  }, [status, retryCount]);

  const handleLoad = () => {
    if (bufferTimer.current) clearTimeout(bufferTimer.current);
    setStatus('LIVE');
    setRetryCount(0); // reset retries on successful connection
  };

  const handleError = () => {
    if (bufferTimer.current) clearTimeout(bufferTimer.current);
    
    if (retryCount < MAX_RETRIES) {
      setStatus('ERROR'); // brief flash of error
      retryTimer.current = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setStatus('RECONNECTING');
      }, 1000);
    } else {
      setStatus('DISCONNECTED');
    }
  };

  const manualReconnect = () => {
    setRetryCount(0);
    setStatus('CONNECTING');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "group relative bg-black rounded-lg overflow-hidden flex flex-col items-center justify-center border border-slate-800 transition-all",
        isFullscreen ? "rounded-none border-0" : "",
        className
      )}
    >
      {/* Top overlay */}
      <div className="absolute top-0 inset-x-0 p-3 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
          <span className={cn(
            "w-2 h-2 rounded-full",
            status === 'LIVE' ? "bg-success animate-pulse" :
            status === 'BUFFERING' || status === 'CONNECTING' || status === 'RECONNECTING' ? "bg-warning" :
            "bg-danger"
          )}></span>
          <span className="text-sm font-semibold text-white drop-shadow-md">{cameraName}</span>
        </div>
        <div className="flex gap-2">
          {capabilities.map(cap => (
            <span key={cap} className="px-1.5 py-0.5 rounded bg-primary text-white text-[10px] font-bold uppercase tracking-wider">
              {cap}
            </span>
          ))}
        </div>
      </div>

      {/* Actual Video Stream (MJPEG via IMG) */}
      {(status === 'CONNECTING' || status === 'RECONNECTING' || status === 'BUFFERING' || status === 'LIVE') && (
        <img 
          src={streamSrc} 
          alt={`Live feed from ${cameraName}`} 
          className={cn(
            "w-full h-full object-contain transition-opacity duration-500 z-0",
            status === 'LIVE' ? 'opacity-100' : 'opacity-30 blur-sm'
          )}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {/* State Machine Overlays */}
      <AnimatePresence mode="wait">
        {(status === 'CONNECTING' || status === 'RECONNECTING' || status === 'BUFFERING') && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10"
          >
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-slate-200 font-medium tracking-widest uppercase text-sm">
              {status === 'BUFFERING' ? 'Buffering stream...' : 
               status === 'RECONNECTING' ? `Reconnecting (Attempt ${retryCount}/${MAX_RETRIES})...` : 
               'Establishing Connection...'}
            </p>
          </motion.div>
        )}

        {status === 'DISCONNECTED' && (
          <motion.div 
            key="disconnected"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-10"
          >
            <WifiOff className="w-12 h-12 text-danger mb-4 opacity-80" />
            <p className="text-slate-100 font-medium text-lg">Signal Lost</p>
            <p className="text-slate-400 text-sm mt-1 max-w-xs text-center mb-6">
              The camera stream could not be reached after multiple attempts.
            </p>
            <Button variant="secondary" onClick={manualReconnect} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Retry Connection
            </Button>
          </motion.div>
        )}

        {status === 'ERROR' && (
          <motion.div 
            key="error"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-danger/20 backdrop-blur-sm z-10"
          >
            <AlertCircle className="w-10 h-10 text-danger animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom overlay controls */}
      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="text-[10px] font-mono text-white/50 bg-black/50 px-2 py-1 rounded">
          {status}
        </div>
        <button 
          onClick={toggleFullscreen}
          className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>

      {/* AI Overlays (YOLO Bounding Boxes) - Only visible when LIVE */}
      {status === 'LIVE' && detections && detections.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {detections.map((det, idx) => {
            const left = `${det.x * 100}%`;
            const top = `${det.y * 100}%`;
            const width = `${det.w * 100}%`;
            const height = `${det.h * 100}%`;
            
            const colors = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];
            const color = colors[(det.trackId || idx) % colors.length];

            return (
              <div 
                key={idx}
                className="absolute border-2 transition-all duration-100 ease-linear"
                style={{
                  left, top, width, height,
                  borderColor: color,
                  boxShadow: `0 0 10px ${color}40 inset, 0 0 10px ${color}40`
                }}
              >
                <div 
                  className="absolute -top-6 left-[-2px] px-1.5 py-0.5 text-[10px] font-bold text-white whitespace-nowrap z-20"
                  style={{ backgroundColor: color }}
                >
                  <span className="uppercase tracking-wider mr-1">{det.class}</span>
                  {det.trackId !== undefined && (
                    <span className="bg-black/40 px-1 rounded mr-1">#{det.trackId}</span>
                  )}
                  {det.confidence && (
                    <span className="opacity-80">{Math.round(det.confidence * 100)}%</span>
                  )}
                </div>
                {/* Crosshairs */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2" style={{ borderColor: color, transform: 'translate(-2px, -2px)' }}></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2" style={{ borderColor: color, transform: 'translate(2px, -2px)' }}></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2" style={{ borderColor: color, transform: 'translate(-2px, 2px)' }}></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2" style={{ borderColor: color, transform: 'translate(2px, 2px)' }}></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
