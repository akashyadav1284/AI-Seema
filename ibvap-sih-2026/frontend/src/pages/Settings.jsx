import React from 'react';
import { useSimulation } from '../contexts/SimulationContext';
import { Play, Pause, RefreshCw, Settings as SettingsIcon, Monitor, Activity, Database, Server, Zap, Shield, Eye, ShieldAlert, Sliders } from 'lucide-react';

const Settings = () => {
  const { isDemoMode, setIsDemoMode, isPaused, toggleSimulation, simSpeed, setSimSpeed, resetDemoData, systemHealth } = useSimulation();

  const handleSimSpeed = (speed) => {
    setSimSpeed(speed);
  };

  return (
    <div className="h-full flex flex-col p-6 animate-in fade-in duration-300 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">System Settings</h1>
          <p className="text-slate-500 mt-1">Configure application preferences and simulation controls.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Demo / Data Controls */}
        <div className="space-y-6 lg:col-span-2">
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <Database className="w-5 h-5 mr-2 text-primary" /> Data Source & Simulation
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-slate-900">Demo Mode</h3>
                  <p className="text-sm text-slate-500">Use centralized simulated data instead of connecting to real APIs. Perfect for demonstrations.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isDemoMode} onChange={(e) => setIsDemoMode(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {isDemoMode && (
                <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-900">Simulation Status</h3>
                      <p className="text-sm text-slate-500">Control the real-time event generator.</p>
                    </div>
                    <button 
                      onClick={toggleSimulation}
                      className={`px-4 py-2 rounded-md font-medium text-sm flex items-center ${isPaused ? 'bg-primary text-white hover:bg-primary-dark' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                    >
                      {isPaused ? <><Play className="w-4 h-4 mr-1" /> Resume</> : <><Pause className="w-4 h-4 mr-1" /> Pause</>}
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <h3 className="font-medium text-slate-900">Simulation Speed</h3>
                      <p className="text-sm text-slate-500">Adjust how fast events occur.</p>
                    </div>
                    <div className="flex bg-slate-100 rounded-md p-1">
                      {[0.5, 1, 2].map(speed => (
                        <button
                          key={speed}
                          onClick={() => handleSimSpeed(speed)}
                          className={`px-3 py-1 text-sm rounded ${simSpeed === speed ? 'bg-white shadow-sm font-medium text-primary' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-blue-100">
                    <button onClick={resetDemoData} className="text-sm font-medium text-red-600 hover:text-red-700 flex items-center">
                      <RefreshCw className="w-4 h-4 mr-1" /> Reset Demo Environment
                    </button>
                    <p className="text-xs text-slate-500 mt-1">This will restore all demo data back to default static state.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <Eye className="w-5 h-5 mr-2 text-primary" /> Appearance & Display
            </h2>
            <div className="space-y-4">
              {['Compact Mode', 'Animations', 'Reduced Motion'].map(setting => {
                const settingKey = `setting_${setting.replace(/\s+/g, '_').toLowerCase()}`;
                const [checked, setChecked] = React.useState(() => {
                  const saved = localStorage.getItem(settingKey);
                  return saved !== null ? saved === 'true' : setting === 'Animations';
                });

                const handleToggle = (e) => {
                  const val = e.target.checked;
                  setChecked(val);
                  localStorage.setItem(settingKey, val);
                };

                return (
                  <div key={setting} className="flex items-center justify-between p-3 border-b border-slate-50 last:border-0">
                    <span className="text-slate-700">{setting}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={checked} onChange={handleToggle} />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <ShieldAlert className="w-5 h-5 mr-2 text-primary" /> Alerts & Notifications
            </h2>
            <div className="space-y-4">
              {['Desktop Notifications', 'Sound Alerts', 'Auto Acknowledge Low Severity'].map(setting => {
                const settingKey = `setting_${setting.replace(/\s+/g, '_').toLowerCase()}`;
                const [checked, setChecked] = React.useState(() => {
                  const saved = localStorage.getItem(settingKey);
                  return saved !== null ? saved === 'true' : setting !== 'Auto Acknowledge Low Severity';
                });

                const handleToggle = (e) => {
                  const val = e.target.checked;
                  setChecked(val);
                  localStorage.setItem(settingKey, val);
                };

                return (
                  <div key={setting} className="flex items-center justify-between p-3 border-b border-slate-50 last:border-0">
                    <span className="text-slate-700">{setting}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={checked} onChange={handleToggle} />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: System Status */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-primary" /> Service Status
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Server className="w-4 h-4 text-slate-400 mr-2" />
                  <span className="text-sm font-medium text-slate-700">API Gateway</span>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">HEALTHY</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Database className="w-4 h-4 text-slate-400 mr-2" />
                  <span className="text-sm font-medium text-slate-700">MongoDB</span>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">CONNECTED</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Zap className="w-4 h-4 text-slate-400 mr-2" />
                  <span className="text-sm font-medium text-slate-700">WebSocket</span>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">CONNECTED</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Monitor className="w-4 h-4 text-slate-400 mr-2" />
                  <span className="text-sm font-medium text-slate-700">AI Engine</span>
                </div>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">RUNNING</span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500 flex justify-between">
                <span>System Latency</span>
                <span className="font-mono">{Math.round(systemHealth.latency)}ms</span>
              </div>
              <div className="text-xs text-slate-500 flex justify-between mt-1">
                <span>AI Processing</span>
                <span className="font-mono">{systemHealth.detectionFps.toFixed(1)} FPS</span>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6 text-white">
             <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-indigo-400" /> Account Settings
            </h2>
            <div className="space-y-4">
               <div>
                 <p className="text-xs text-slate-400">Current User</p>
                 <p className="font-medium">Admin Operator</p>
                 <p className="text-sm text-slate-300">admin@ibvap.gov.in</p>
               </div>
               <div>
                 <p className="text-xs text-slate-400">Role</p>
                 <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs font-medium rounded border border-indigo-500/30">SUPER_ADMIN</span>
               </div>
               <button className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm font-medium transition-colors">
                 Edit Profile
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
