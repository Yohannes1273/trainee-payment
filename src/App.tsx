import React, { useState, useEffect } from 'react';
import { 
  HashRouter, Routes, Route, Navigate, useNavigate 
} from 'react-router-dom';
import { 
  Lock, ArrowRight, Landmark, Sparkles, LogIn, Users, CheckCircle, RefreshCw, Mail, Key, ArrowLeft, ShieldAlert
} from 'lucide-react';
import { motion } from 'motion/react';
import api from './services/api';

// Core security guards and pages
import ProtectedRoute from './components/ProtectedRoute';
import UnauthorizedPage from './pages/UnauthorizedPage';

// Dashboards
import TraineeDashboard from './pages/TraineeDashboard';
import FinanceDashboard from './pages/FinanceDashboard';
import NightControllerDashboard from './pages/NightControllerDashboard';
import StaffPortal from './pages/StaffPortal';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Toast system
import { ToastProvider, useToast } from './components/Toast';

function LoginScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [bootstrapSuccess, setBootstrapSuccess] = useState('');

  // Password recovery flow states
  const [viewMode, setViewMode] = useState<'login' | 'forgot'>('login');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState('');
  const [recoverySimulatedLink, setRecoverySimulatedLink] = useState('');

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) {
      toast.error('Please enter your registered college email.');
      return;
    }
    try {
      setRecoveryLoading(true);
      setError('');
      setRecoverySuccess('');
      setRecoverySimulatedLink('');

      const res = await api.post('/auth/forgot-password', { email: recoveryEmail });
      if (res.data && res.data.success) {
        setRecoverySuccess(res.data.message);
        toast.success('Recovery link generated successfully!');
        if (res.data.simulatedLink) {
          // Parse relative link structure to correctly use HashRouter path
          const urlObj = new URL(res.data.simulatedLink);
          const relativeHashLink = `/#/reset-password${urlObj.search}`;
          setRecoverySimulatedLink(relativeHashLink);
        }
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Failed to dispatch recovery link. Check registered email.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Auto-redirect if session exists
  useEffect(() => {
    const token = localStorage.getItem('college_payment_token');
    const userStr = localStorage.getItem('college_payment_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        redirectUserByRole(user.role, user.isPasswordChanged);
      } catch (e) {
        localStorage.clear();
      }
    }
  }, []);

  const redirectUserByRole = (role: string, isPasswordChanged?: boolean) => {
    if (isPasswordChanged === false) {
      navigate('/change-password');
      return;
    }
    if (role === 'Trainee') {
      navigate('/trainee');
    } else if (role === 'Finance') {
      navigate('/finance');
    } else if (role === 'Night Controller') {
      navigate('/night-controller');
    } else if (['Registrar', 'HR', 'Department Head', 'Trainer'].includes(role)) {
      navigate('/staff-portal');
    }
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const response = await api.post('/auth/login', { username, password });
      
      localStorage.setItem('college_payment_token', response.data.token);
      localStorage.setItem('college_payment_user', JSON.stringify(response.data.user));
      if (response.data.trainee) {
        localStorage.setItem('college_payment_trainee', JSON.stringify(response.data.trainee));
      }

      toast.success(`Successfully signed in as ${response.data.user.fullName || response.data.user.username}!`);
      redirectUserByRole(response.data.user.role, response.data.user.isPasswordChanged);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Authentication failed. Please verify credentials.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // 1-Click login helper for testing
  const handleOneClickLogin = async (userVal: string, passVal: string) => {
    try {
      setLoading(true);
      setError('');
      setUsername(userVal);
      setPassword(passVal);
      const response = await api.post('/auth/login', { username: userVal, password: passVal });
      
      localStorage.setItem('college_payment_token', response.data.token);
      localStorage.setItem('college_payment_user', JSON.stringify(response.data.user));
      if (response.data.trainee) {
        localStorage.setItem('college_payment_trainee', JSON.stringify(response.data.trainee));
      }

      toast.success(`Successfully logged in as ${response.data.user.fullName || response.data.user.username}!`);
      redirectUserByRole(response.data.user.role, response.data.user.isPasswordChanged);
    } catch (err: any) {
      console.error(err);
      const errMsg = 'Please click the "Bootstrap College Data" button below first to initialize these credentials!';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const runBootstrap = async () => {
    try {
      setBootstrapLoading(true);
      setBootstrapSuccess('');
      const response = await api.post('/setup/bootstrap');
      const msg = 'System populated! You can now use any 1-Click credentials below.';
      setBootstrapSuccess(msg);
      toast.success('Database bootstrapped successfully!');
    } catch (e: any) {
      toast.error('Bootstrap failed: ' + e.message);
      alert('Bootstrap failed: ' + e.message);
    } finally {
      setBootstrapLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col lg:flex-row relative overflow-hidden">
      
      {/* Visual Tech Panel (Left side) */}
      <div className="lg:w-1/2 p-8 md:p-12 flex flex-col justify-between bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-950 border-r border-slate-900 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.08),transparent_50%)]" />
        
        {/* Brand */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/10">
            <Landmark size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">Polytech Payment System</h1>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Enterprise Ingress Node</p>
          </div>
        </div>

        {/* Dynamic Display Text */}
        <div className="space-y-6 max-w-lg my-12 lg:my-0 relative z-10">
          <span className="bg-indigo-500/10 text-indigo-400 text-xs font-bold px-3.5 py-1.5 rounded-full border border-indigo-500/20 tracking-wider uppercase font-mono">
            College Financial Stream Routing
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-100 leading-tight">
            Trainee Payment &amp; Receipt Pipeline
          </h2>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed">
            A production-ready relational architecture featuring upfront financial block-validations, automated ledger sequence generators, Night Controller streams, and instant Telegram chatbot notifications.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4">
            <button
              onClick={runBootstrap}
              disabled={bootstrapLoading}
              className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold py-3 px-5 rounded-2xl transition text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25"
            >
              {bootstrapLoading ? (
                <RefreshCw className="animate-spin" size={16} />
              ) : (
                <Sparkles size={16} />
              )}
              1-Click Setup: Bootstrap Database
            </button>
            {bootstrapSuccess && (
              <p className="text-xs text-indigo-300 font-semibold self-center flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl">
                <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                {bootstrapSuccess}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-slate-500 font-mono relative z-10">
          Secured with RBAC Policy Node • Port 3000 Ingress Clear
        </div>
      </div>

      {/* Interactive Form & Accounts Chooser (Right side) */}
      <div className="lg:w-1/2 p-6 md:p-12 flex flex-col justify-center items-center bg-slate-950 relative overflow-y-auto">
        
        {/* Forms box */}
        <div className="max-w-md w-full space-y-8 bg-slate-900/40 border border-slate-900/60 p-8 rounded-3xl backdrop-blur-md relative z-10">
          {viewMode === 'login' ? (
            <>
              <div>
                <h3 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <LogIn className="text-indigo-400" size={22} />
                  Sign In to Portal
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Enter college faculty credentials or use the 1-Click testing profiles below.
                </p>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl text-xs font-semibold"
                >
                  ⚠️ {error}
                </motion.div>
              )}

              <form onSubmit={handleCustomLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., registrar"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('forgot');
                        setError('');
                        setRecoverySuccess('');
                        setRecoverySimulatedLink('');
                      }}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                >
                  {loading ? 'Verifying Session...' : 'Authenticate Profile'}
                  <ArrowRight size={16} />
                </button>
              </form>
            </>
          ) : (
            <>
              <div>
                <h3 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Key className="text-indigo-400" size={22} />
                  Forgot Password?
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Request a secure reset recovery link sent to your registered college email.
                </p>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl text-xs font-semibold"
                >
                  ⚠️ {error}
                </motion.div>
              )}

              {recoverySuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl text-xs font-semibold space-y-3"
                >
                  <p>🎉 {recoverySuccess}</p>
                  {recoverySimulatedLink && (
                    <div className="pt-3 border-t border-emerald-500/20 space-y-2">
                      <span className="text-[10px] text-slate-400 block font-black uppercase tracking-wider">College Email Sandbox:</span>
                      <a 
                        href={recoverySimulatedLink}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-lg transition-all"
                      >
                        Reset My Password Now
                        <ArrowRight size={12} />
                      </a>
                    </div>
                  )}
                </motion.div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Registered Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g., student.dawit@student.com"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('login');
                      setError('');
                    }}
                    className="w-1/3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 font-bold py-3 rounded-xl transition flex items-center justify-center gap-1.5 text-xs"
                  >
                    <ArrowLeft size={14} />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-xs"
                  >
                    {recoveryLoading ? 'Generating Link...' : 'Send Recovery Link'}
                    <Mail size={14} />
                  </button>
                </div>
              </form>
            </>
          )}

          {/* 1-Click Testing Credentials Section */}
          <div className="space-y-3.5 pt-4 border-t border-slate-800/80">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={14} className="text-indigo-400" />
              1-Click Role Testing accounts:
            </h4>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handleOneClickLogin('student1', 'student123')}
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 py-2.5 px-3 rounded-xl text-left transition"
              >
                <p className="font-bold text-slate-200">Dawit Mekonnen</p>
                <p className="text-[10px] text-indigo-400">Trainee (Extension L3)</p>
              </button>

              <button
                onClick={() => handleOneClickLogin('student2', 'student123')}
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 py-2.5 px-3 rounded-xl text-left transition"
              >
                <p className="font-bold text-slate-200">Meron Tesfaye</p>
                <p className="text-[10px] text-indigo-400">Trainee (Regular L1)</p>
              </button>

              <button
                onClick={() => handleOneClickLogin('finance', 'finance123')}
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 py-2.5 px-3 rounded-xl text-left transition"
              >
                <p className="font-bold text-slate-200">Almaz Tadesse</p>
                <p className="text-[10px] text-emerald-400">Finance queue reviews</p>
              </button>

              <button
                onClick={() => handleOneClickLogin('nightcontroller', 'nightcontroller123')}
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 py-2.5 px-3 rounded-xl text-left transition"
              >
                <p className="font-bold text-slate-200">Bekele Shiferaw</p>
                <p className="text-[10px] text-violet-400">Night Controller audit</p>
              </button>

              <button
                onClick={() => handleOneClickLogin('registrar', 'registrar123')}
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 py-2.5 px-3 rounded-xl text-left transition"
              >
                <p className="font-bold text-slate-200">Aster Kebede</p>
                <p className="text-[10px] text-blue-400">Registrar registry</p>
              </button>

              <button
                onClick={() => handleOneClickLogin('depthead', 'depthead123')}
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 py-2.5 px-3 rounded-xl text-left transition"
              >
                <p className="font-bold text-slate-200">Dr. Yohannes</p>
                <p className="text-[10px] text-amber-400">Department Head</p>
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          {/* Entry Login Gateway */}
          <Route path="/" element={<LoginScreen />} />

          {/* Trainee Portal Gate */}
          <Route 
            path="/trainee" 
            element={
              <ProtectedRoute allowedRoles={['Trainee']}>
                <TraineeDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Finance Operations Gate */}
          <Route 
            path="/finance" 
            element={
              <ProtectedRoute allowedRoles={['Finance']}>
                <FinanceDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Night Controller Gate */}
          <Route 
            path="/night-controller" 
            element={
              <ProtectedRoute allowedRoles={['Night Controller']}>
                <NightControllerDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Relational Academic Setup Gate (Registrar, HR, Dept Head, Trainer) */}
          <Route 
            path="/staff-portal" 
            element={
              <ProtectedRoute allowedRoles={['Registrar', 'HR', 'Department Head', 'Trainer']}>
                <StaffPortal />
              </ProtectedRoute>
            } 
          />

          {/* Change Password Portal */}
          <Route 
            path="/change-password" 
            element={
              <ProtectedRoute 
                allowedRoles={['Registrar', 'HR', 'Department Head', 'Trainer', 'Trainee', 'Finance', 'Night Controller']} 
                bypassPasswordCheck={true}
              >
                <ChangePasswordPage />
              </ProtectedRoute>
            } 
          />

          {/* Password Reset Page */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Safety Interceptor */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ToastProvider>
  );
}
