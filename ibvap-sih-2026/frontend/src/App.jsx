import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LiveMonitoring from './pages/LiveMonitoring';
import Cameras from './pages/Cameras';
import Alerts from './pages/Alerts';
import Events from './pages/Events';
import Analytics from './pages/Analytics';
import SystemHealth from './pages/SystemHealth';
import Zones from './pages/Zones';
import Tracks from './pages/Tracks';
import Evidence from './pages/Evidence';

// Placeholder components for new routes to ensure routing works
const PlaceholderPage = ({ title }) => (
  <div className="flex flex-col h-[calc(100vh-6rem)] items-center justify-center animate-in fade-in duration-500">
    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">{title}</h1>
    <p className="text-slate-400 mt-2">This module is under construction.</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="/" element={<Dashboard />} />
            <Route path="/live" element={<LiveMonitoring />} />
            <Route path="/cameras" element={<Cameras />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/events" element={<Events />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/reports" element={<PlaceholderPage title="Automated Reports" />} />
            <Route path="/health" element={<SystemHealth />} />
            <Route path="/settings" element={<PlaceholderPage title="System Settings" />} />
            <Route path="/zones" element={<Zones />} />
            <Route path="/tracks" element={<Tracks />} />
            <Route path="/evidence" element={<Evidence />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
