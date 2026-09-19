import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import LoginVisualization from '../components/ui/LoginVisualization';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleMouseMove = (e) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials or server error.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col md:flex-row bg-white overflow-hidden selection:bg-primary/20"
      onMouseMove={handleMouseMove}
    >
      {/* Left Intelligence Visualization (Hidden on Mobile, 55% on Desktop) */}
      <div className="hidden md:flex md:w-[55%] relative h-full min-h-screen border-r border-border bg-slate-50">
        <LoginVisualization mousePosition={mousePosition} />
      </div>

      {/* Right Authentication Panel (Full width on Mobile, 45% on Desktop) */}
      <div className="w-full md:w-[45%] h-screen flex flex-col items-center justify-center bg-white p-6 relative z-10">
        
        {/* Mobile Header Graphic (Only visible on small screens) */}
        <div className="md:hidden w-full h-48 absolute top-0 left-0 bg-slate-50 border-b border-border overflow-hidden pointer-events-none">
          <LoginVisualization mousePosition={mousePosition} />
        </div>
        
        <div className="w-full max-w-sm mt-32 md:mt-0 relative">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-text tracking-tight uppercase">IBVAP</h1>
            <h2 className="text-xl font-semibold text-text mt-2">Secure Access</h2>
            <p className="text-textMuted text-sm mt-1 font-medium">Authorized personnel only.</p>
          </div>
          
          <motion.div
            animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-danger/10 border border-danger/30 text-danger text-sm px-4 py-3 rounded-md font-medium">
                  {error}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-text">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md px-4 py-2.5 text-sm text-text placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                  placeholder="admin@ibvap.gov"
                  required
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-text">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md pl-4 pr-10 py-2.5 text-sm text-text placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                    placeholder="••••••••"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full mt-8 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold tracking-wide shadow-md hover:shadow-lg transition-all"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  'SECURE SIGN IN'
                )}
              </Button>
            </form>
          </motion.div>
          
          <div className="mt-12 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center font-medium">
              This system is restricted to authorized users. All activities are monitored and recorded.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
