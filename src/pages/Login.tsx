import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Lock, ArrowRight, Landmark, Sparkles, LogIn, Users, 
  CheckCircle, RefreshCw, Mail, Key, ArrowLeft, Eye, EyeOff, Info 
} from 'lucide-react';
import { motion } from 'motion/react';
import { z } from 'zod';
import { useAuth } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import api from '../services/api';
import { useToast } from '../components/Toast';

// Define Zod Schema for validation
const loginSchema = z.object({
  username: z.string().min(1, { message: 'Username or email is required.' }),
  password: z.string().min(3, { message: 'Password must be at least 3 characters.' })
});

export default function Login() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const { isHighContrast } = useTheme();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});

  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [bootstrapSuccess, setBootstrapSuccess] = useState('');

  // Password recovery flow states
  const [viewMode, setViewMode] = useState<'login' | 'forgot'>('login');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState('');
  const [recoverySimulatedLink, setRecoverySimulatedLink] = useState('');

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user) {
      redirectUserByRole(user.role, user.isPasswordChanged);
    }
  }, [user?.id, user?.role, user?.isPasswordChanged]);

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
    setError('');
    setFieldErrors({});

    // Zod validation
    const result = loginSchema.safeParse({ username, password });
    if (!result.success) {
      const formatted = result.error.format();
      setFieldErrors({
        username: formatted.username?._errors[0],
        password: formatted.password?._errors[0]
      });
      toast.error('Validation failed. Please review the highlighted fields.');
      return;
    }

    try {
      setLoading(true);
      const profile = await login(username, password);
      toast.success(`Successfully signed in as ${profile.fullName || profile.username}!`);
      redirectUserByRole(profile.role, profile.isPasswordChanged);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Authentication failed. Please verify credentials.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

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

  const handleOneClickLogin = async (userVal: string, passVal: string) => {
    try {
      setLoading(true);
      setError('');
      setFieldErrors({});
      setUsername(userVal);
      setPassword(passVal);
      
      const profile = await login(userVal, passVal);
      toast.success(`Successfully logged in as ${profile.fullName || profile.username}!`);
      redirectUserByRole(profile.role, profile.isPasswordChanged);
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
      await api.post('/setup/bootstrap');
      const msg = 'System populated! You can now use any 1-Click credentials below.';
      setBootstrapSuccess(msg);
      toast.success('Database bootstrapped successfully!');
    } catch (e: any) {
      toast.error('Bootstrap failed: ' + e.message);
    } finally {
      setBootstrapLoading(false);
    }
  };

  // Determine styles dynamically based on accessibility theme selection
  const wrapperClass = isHighContrast
    ? 'min-h-screen bg-white text-black font-sans flex flex-col lg:flex-row relative overflow-x-hidden'
    : 'min-h-screen bg-slate-950 text-white font-sans flex flex-col lg:flex-row relative overflow-x-hidden';

  const sidebarClass = isHighContrast
    ? 'lg:w-1/2 p-8 md:p-12 flex flex-col justify-between bg-white border-b lg:border-b-0 lg:border-r border-black relative'
    : 'lg:w-1/2 p-8 md:p-12 flex flex-col justify-between bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-950 border-r border-slate-900 relative';

  const formBoxClass = isHighContrast
    ? 'max-w-md w-full space-y-8 bg-white border-2 border-black p-8 rounded-none relative z-10'
    : 'max-w-md w-full space-y-8 bg-slate-900/40 border border-slate-900/60 p-8 rounded-3xl backdrop-blur-md relative z-10 shadow-xl';

  return (
    <div className={wrapperClass}>
      {/* Floating Accessibility Controls */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <ThemeToggle />
      </div>

      {/* Brand & Technical Info Sidebar (Left side) */}
      <div className={sidebarClass}>
        {!isHighContrast && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.08),transparent_50%)]" />
        )}
        
        {/* Brand Header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            isHighContrast 
              ? 'bg-black text-white border-2 border-black' 
              : 'bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 shadow-lg shadow-indigo-600/10'
          }`}>
            <Landmark size={24} />
          </div>
          <div>
            <h1 className={`text-xl font-bold tracking-tight ${isHighContrast ? 'text-black' : 'text-slate-100'}`}>
              Tafari Makonnen TVET
            </h1>
            <p className={`text-xs uppercase tracking-wider font-bold ${isHighContrast ? 'text-black' : 'text-indigo-400 font-mono'}`}>
              Polytechnic Payment System
            </p>
          </div>
        </div>

        {/* Informative Pitch */}
        <div className="space-y-6 max-w-lg my-12 lg:my-0 relative z-10">
          <span className={`inline-block text-xs font-bold px-3.5 py-1.5 rounded-full border tracking-wider uppercase ${
            isHighContrast
              ? 'bg-white border-black text-black'
              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-mono'
          }`}>
            College Financial Stream Routing
          </span>
          <h2 className={`text-3xl md:text-4xl font-extrabold tracking-tight leading-tight ${
            isHighContrast ? 'text-black' : 'text-slate-100'
          }`}>
            Trainee Payment &amp; Receipt Pipeline
          </h2>
          <p className={isHighContrast ? 'text-black text-sm' : 'text-slate-400 text-sm md:text-base leading-relaxed'}>
            A production-ready relational architecture featuring upfront financial block-validations, automated ledger sequence generators, Night Controller streams, and instant Telegram chatbot notifications.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4">
            <button
              onClick={runBootstrap}
              disabled={bootstrapLoading}
              className={`font-bold py-3 px-5 rounded-2xl transition text-sm flex items-center justify-center gap-2 active:scale-95 ${
                isHighContrast
                  ? 'bg-black text-white border-2 border-black hover:bg-neutral-800'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25'
              }`}
            >
              {bootstrapLoading ? (
                <RefreshCw className="animate-spin" size={16} />
              ) : (
                <Sparkles size={16} />
              )}
              1-Click Setup: Bootstrap Database
            </button>
            {bootstrapSuccess && (
              <p className={`text-xs font-semibold self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                isHighContrast
                  ? 'bg-white border-black text-black'
                  : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
              }`}>
                <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                {bootstrapSuccess}
              </p>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className={`text-xs font-mono relative z-10 ${isHighContrast ? 'text-black font-bold' : 'text-slate-500'}`}>
          Secured with RBAC Policy Node • Port 3000 Ingress Clear
        </div>
      </div>

      {/* Form Area (Right side) */}
      <div className={`lg:w-1/2 p-6 md:p-12 flex flex-col justify-center items-center relative overflow-y-auto ${
        isHighContrast ? 'bg-white' : 'bg-slate-950'
      }`}>
        <div className={formBoxClass}>
          {viewMode === 'login' ? (
            <>
              <div>
                <h3 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${
                  isHighContrast ? 'text-black' : 'text-slate-100'
                }`}>
                  <LogIn className={isHighContrast ? 'text-black' : 'text-indigo-400'} size={22} />
                  Sign In to Portal
                </h3>
                <p className={`text-xs mt-1 ${isHighContrast ? 'text-black font-semibold' : 'text-slate-400'}`}>
                  Enter college faculty credentials or register a new TVET account.
                </p>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3.5 border rounded-xl text-xs font-semibold ${
                    isHighContrast 
                      ? 'bg-white border-black text-black' 
                      : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                  }`}
                >
                  ⚠️ {error}
                </motion.div>
              )}

              <form onSubmit={handleCustomLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider block ${
                    isHighContrast ? 'text-black' : 'text-slate-400'
                  }`}>
                    Username or Email
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., registrar"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 ${
                      isHighContrast
                        ? 'bg-white border-2 border-black text-black focus:ring-black'
                        : 'bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                  />
                  {fieldErrors.username && (
                    <p className={`text-xs font-bold mt-1 ${isHighContrast ? 'text-black' : 'text-rose-400'}`}>
                      {fieldErrors.username}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className={`text-xs font-bold uppercase tracking-wider block ${
                      isHighContrast ? 'text-black' : 'text-slate-400'
                    }`}>
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('forgot');
                        setError('');
                        setRecoverySuccess('');
                        setRecoverySimulatedLink('');
                      }}
                      className={`text-[11px] font-bold underline cursor-pointer ${
                        isHighContrast ? 'text-black' : 'text-indigo-400 hover:text-indigo-300'
                      }`}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:ring-1 ${
                        isHighContrast
                          ? 'bg-white border-2 border-black text-black focus:ring-black'
                          : 'bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:ring-indigo-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className={`text-xs font-bold mt-1 ${isHighContrast ? 'text-black' : 'text-rose-400'}`}>
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                    isHighContrast
                      ? 'bg-black text-white border-2 border-black hover:bg-neutral-800'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10'
                  }`}
                >
                  {loading ? 'Verifying Session...' : 'Authenticate Profile'}
                  <ArrowRight size={16} />
                </button>
              </form>

              {/* Registration Link Prompt */}
              <div className="text-center pt-2">
                <p className={`text-sm ${isHighContrast ? 'text-black font-semibold' : 'text-slate-400'}`}>
                  New to Tafari Makonnen?{' '}
                  <Link 
                    to="/register" 
                    className={`font-bold hover:underline ${
                      isHighContrast ? 'text-black underline' : 'text-indigo-400 hover:text-indigo-300'
                    }`}
                  >
                    Create an account
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              {/* FORGOT PASSWORD SCREEN */}
              <div>
                <h3 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${
                  isHighContrast ? 'text-black' : 'text-slate-100'
                }`}>
                  <Key className={isHighContrast ? 'text-black' : 'text-indigo-400'} size={22} />
                  Forgot Password?
                </h3>
                <p className={`text-xs mt-1 ${isHighContrast ? 'text-black font-semibold' : 'text-slate-400'}`}>
                  Request a secure reset recovery link sent to your registered college email.
                </p>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3.5 border rounded-xl text-xs font-semibold ${
                    isHighContrast 
                      ? 'bg-white border-black text-black' 
                      : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                  }`}
                >
                  ⚠️ {error}
                </motion.div>
              )}

              {recoverySuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 border rounded-xl text-xs font-semibold space-y-3 ${
                    isHighContrast 
                      ? 'bg-white border-black text-black' 
                      : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                  }`}
                >
                  <p>🎉 {recoverySuccess}</p>
                  {recoverySimulatedLink && (
                    <div className={`pt-3 border-t space-y-2 ${isHighContrast ? 'border-black' : 'border-emerald-500/20'}`}>
                      <span className={`text-[10px] block font-black uppercase tracking-wider ${
                        isHighContrast ? 'text-black' : 'text-slate-400'
                      }`}>
                        College Email Sandbox:
                      </span>
                      <a 
                        href={recoverySimulatedLink}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-black rounded-lg transition-all active:scale-95 ${
                          isHighContrast 
                            ? 'bg-black text-white hover:bg-neutral-800' 
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
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
                  <label className={`text-xs font-bold uppercase tracking-wider block ${
                    isHighContrast ? 'text-black' : 'text-slate-400'
                  }`}>
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g., student.dawit@student.com"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 ${
                      isHighContrast
                        ? 'bg-white border-2 border-black text-black focus:ring-black'
                        : 'bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('login');
                      setError('');
                    }}
                    className={`w-1/3 border font-bold py-3 rounded-xl transition flex items-center justify-center gap-1.5 text-xs cursor-pointer active:scale-95 ${
                      isHighContrast
                        ? 'bg-white border-black text-black hover:bg-slate-50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <ArrowLeft size={14} />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className={`flex-1 font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-95 ${
                      isHighContrast
                        ? 'bg-black text-white border-2 border-black hover:bg-neutral-800'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                    }`}
                  >
                    {recoveryLoading ? 'Generating Link...' : 'Send Recovery Link'}
                    <Mail size={14} />
                  </button>
                </div>
              </form>
            </>
          )}

          {/* 1-Click Testing Credentials Section */}
          <div className={`space-y-3.5 pt-4 border-t ${isHighContrast ? 'border-black' : 'border-slate-800/80'}`}>
            <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isHighContrast ? 'text-black' : 'text-slate-400'
            }`}>
              <Users size={14} className={isHighContrast ? 'text-black' : 'text-indigo-400'} />
              1-Click Testing Accounts:
            </h4>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handleOneClickLogin('student1', 'student123')}
                className={`py-2.5 px-3 rounded-xl text-left transition duration-300 ${
                  isHighContrast
                    ? 'bg-white border-2 border-black text-black hover:bg-slate-100 font-bold'
                    : 'bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <p className={isHighContrast ? 'text-black' : 'font-bold text-slate-200'}>Dawit Mekonnen</p>
                <p className={`text-[10px] ${isHighContrast ? 'text-neutral-700' : 'text-indigo-400'}`}>
                  Trainee (Extension L3)
                </p>
              </button>

              <button
                onClick={() => handleOneClickLogin('student2', 'student123')}
                className={`py-2.5 px-3 rounded-xl text-left transition duration-300 ${
                  isHighContrast
                    ? 'bg-white border-2 border-black text-black hover:bg-slate-100 font-bold'
                    : 'bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <p className={isHighContrast ? 'text-black' : 'font-bold text-slate-200'}>Meron Tesfaye</p>
                <p className={`text-[10px] ${isHighContrast ? 'text-neutral-700' : 'text-indigo-400'}`}>
                  Trainee (Regular L1)
                </p>
              </button>

              <button
                onClick={() => handleOneClickLogin('finance', 'finance123')}
                className={`py-2.5 px-3 rounded-xl text-left transition duration-300 ${
                  isHighContrast
                    ? 'bg-white border-2 border-black text-black hover:bg-slate-100 font-bold'
                    : 'bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <p className={isHighContrast ? 'text-black' : 'font-bold text-slate-200'}>Almaz Tadesse</p>
                <p className={`text-[10px] ${isHighContrast ? 'text-neutral-700' : 'text-emerald-400'}`}>
                  Finance Queue
                </p>
              </button>

              <button
                onClick={() => handleOneClickLogin('nightcontroller', 'nightcontroller123')}
                className={`py-2.5 px-3 rounded-xl text-left transition duration-300 ${
                  isHighContrast
                    ? 'bg-white border-2 border-black text-black hover:bg-slate-100 font-bold'
                    : 'bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <p className={isHighContrast ? 'text-black' : 'font-bold text-slate-200'}>Bekele Shiferaw</p>
                <p className={`text-[10px] ${isHighContrast ? 'text-neutral-700' : 'text-violet-400'}`}>
                  Night Controller
                </p>
              </button>

              <button
                onClick={() => handleOneClickLogin('registrar', 'registrar123')}
                className={`py-2.5 px-3 rounded-xl text-left transition duration-300 ${
                  isHighContrast
                    ? 'bg-white border-2 border-black text-black hover:bg-slate-100 font-bold'
                    : 'bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <p className={isHighContrast ? 'text-black' : 'font-bold text-slate-200'}>Aster Kebede</p>
                <p className={`text-[10px] ${isHighContrast ? 'text-neutral-700' : 'text-blue-400'}`}>
                  Registrar Staff
                </p>
              </button>

              <button
                onClick={() => handleOneClickLogin('depthead', 'depthead123')}
                className={`py-2.5 px-3 rounded-xl text-left transition duration-300 ${
                  isHighContrast
                    ? 'bg-white border-2 border-black text-black hover:bg-slate-100 font-bold'
                    : 'bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <p className={isHighContrast ? 'text-black' : 'font-bold text-slate-200'}>Dr. Yohannes</p>
                <p className={`text-[10px] ${isHighContrast ? 'text-neutral-700' : 'text-amber-400'}`}>
                  Department Head
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
