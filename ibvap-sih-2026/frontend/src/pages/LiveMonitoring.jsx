import React, { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const LiveMonitoring = () => {
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        // Assuming the backend has a /api/health endpoint
        const res = await fetch(`${API_BASE}/api/health`);
        if (res.ok) {
          setBackendStatus('online');
        } else {
          setBackendStatus('error');
        }
      } catch (err) {
        setBackendStatus('error');
      }
    };
    
    checkHealth();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Live Monitoring</h1>
      
      {backendStatus === 'error' && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong>Error:</strong> Cannot connect to the backend server at {API_BASE}. Please ensure the backend is running.
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-4 max-w-5xl mx-auto">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Camera: Webcam 0 (Demo)</h2>
        
        <div className="relative bg-black rounded overflow-hidden aspect-video flex items-center justify-center">
          {backendStatus === 'error' ? (
            <span className="text-white text-lg">Stream unavailable</span>
          ) : (
            <img 
              src={`${API_BASE}/stream/0`} 
              alt="Live video stream" 
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                // Optional: set backend status to error if stream completely fails to load
                // setBackendStatus('error'); 
              }}
            />
          )}
        </div>
        
        <p className="mt-4 text-sm text-gray-500 italic">
          * This is a live AI‑annotated feed. It applies low‑light enhancement and runs real‑time person/vehicle detection.
        </p>
      </div>
    </div>
  );
};

export default LiveMonitoring;
