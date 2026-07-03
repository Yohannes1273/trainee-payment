import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Landmark, User, Mail, Lock, Check, RefreshCw, 
  ArrowRight, Eye, EyeOff, Info, ArrowLeft 
} from 'lucide-react';
import { motion } from 'motion/react';
import { z } from 'zod';
import { useAuth } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import api from '../services/api';
import { useToast } from '../components/Toast';

// Form validation schema using Zod
const registerSchema = z.object({
  fullName: z.string().min(3, { message: 'Full name must be at least 3 characters.' }),
  email: z.string().email({ message: 'Must be a valid college or public email address.' }),
  role: z.enum(['Trainee', 'Finance', 'Registrar', 'Night Controller', 'Trainer', 'Department Head']),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long for security compliance.' }),
  departmentId: z.string().optional(),
  sectionId: z.string().optional(),
});

interface DepartmentItem {
  _id: string;
  name: string;
}

interface SectionItem {
  _id: string;
  name: string;
}

export default function Register() {
  const navigate = useNavigate();
  const { register, user } = useAuth();
  const { isHighContrast } = useTheme();
  const { toast } = useToast();

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Trainee' | 'Finance' | 'Registrar' | 'Night Controller' | 'Trainer' | 'Department Head'>('Trainee');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [sectionId, setSectionId] = useState('');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Dynamic lists from backend
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user) {
      redirectUserByRole(user.role);
    }
  }, [user?.id, user?.role]);

  // Load lists on mount
  useEffect(() => {
    const fetchLists = async () => {
      try {
        setLoadingLists(true);
        const [deptRes, sectRes] = await Promise.all([
          api.get('/auth/departments'),
          api.get('/auth/sections')
        ]);
        setDepartments(deptRes.data || []);
        setSections(sectRes.data || []);
      } catch (err) {
        console.error('Failed to load departments or sections:', err);
      } finally {
        setLoadingLists(false);
      }
    };
    fetchLists();
  }, []);

  const redirectUserByRole = (roleStr: string) => {
    if (roleStr === 'Trainee') {
      navigate('/trainee');
    } else if (roleStr === 'Finance') {
      navigate('/finance');
    } else if (roleStr === 'Night Controller') {
      navigate('/night-controller');
    } else if (['Registrar', 'HR', 'Department Head', 'Trainer'].includes(roleStr)) {
      navigate('/staff-portal');
    }
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: 'No password', color: 'bg-slate-800' };
    if (pass.length < 6) return { score: 1, text: 'Weak (Too Short)', color: 'bg-rose-500' };
    
    let score = 1;
    const hasNumbers = /\d/.test(pass);
    const hasSpecial = /[^A-Za-z0-9]/.test(pass);
    const hasUpperLower = /[a-z]/.test(pass) && /[A-Z]/.test(pass);

    if (hasNumbers) score++;
    if (hasSpecial) score++;
    if (hasUpperLower) score++;

    if (score === 2) return { score: 2, text: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, text: 'Good', color: 'bg-blue-500' };
    return { score: 4, text: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const submissionData = {
      fullName,
      email,
      role,
      password,
      departmentId: departmentId || undefined,
      sectionId: sectionId || undefined
    };

    // Zod validation
    const result = registerSchema.safeParse(submissionData);
    if (!result.success) {
      const formatted = result.error.format();
      const newErrors: Record<string, string> = {};
      
      if (formatted.fullName) newErrors.fullName = formatted.fullName._errors[0];
      if (formatted.email) newErrors.email = formatted.email._errors[0];
      if (formatted.role) newErrors.role = formatted.role._errors[0];
      if (formatted.password) newErrors.password = formatted.password._errors[0];
      
      setFieldErrors(newErrors);
      toast.error('Please fix the errors before submitting.');
      return;
    }

    try {
      setLoading(true);
      const registeredUser = await register(submissionData);
      toast.success(`Welcome to Tafari Makonnen, ${registeredUser.fullName}!`);
      redirectUserByRole(registeredUser.role);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Registration failed. Please review your info.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const wrapperClass = isHighContrast
    ? 'min-h-screen bg-white text-black font-sans flex flex-col lg:flex-row relative overflow-x-hidden'
    : 'min-h-screen bg-slate-950 text-white font-sans flex flex-col lg:flex-row relative overflow-x-hidden';

  const sidebarClass = isHighContrast
    ? 'lg:w-1/2 p-8 md:p-12 flex flex-col justify-between bg-white border-b lg:border-b-0 lg:border-r border-black relative'
    : 'lg:w-1/2 p-8 md:p-12 flex flex-col justify-between bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-950 border-r border-slate-900 relative';

  const formBoxClass = isHighContrast
    ? 'max-w-lg w-full space-y-8 bg-white border-2 border-black p-8 rounded-none relative z-10'
    : 'max-w-lg w-full space-y-8 bg-slate-900/40 border border-slate-900/60 p-8 rounded-3xl backdrop-blur-md relative z-10 shadow-xl';

  return (
    <div className={wrapperClass}>
      {/* Accessibility Control */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <ThemeToggle />
      </div>

      {/* College Info Sidebar (Left side) */}
      <div className={sidebarClass}>
        {!isHighContrast && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.08),transparent_50%)]" />
        )}
        
        {/* Brand */}
        <div className="flex items-center gap-3 relative z-10">
          <Link to="/" className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            isHighContrast 
              ? 'bg-black text-white border-2 border-black' 
              : 'bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 shadow-lg'
          }`}>
            <Landmark size={24} />
          </Link>
          <div>
            <h1 className={`text-xl font-bold tracking-tight ${isHighContrast ? 'text-black' : 'text-slate-100'}`}>
              Tafari Makonnen TVET
            </h1>
            <p className={`text-xs uppercase tracking-wider font-bold ${isHighContrast ? 'text-black' : 'text-indigo-400 font-mono'}`}>
              Institutional Signup Portal
            </p>
          </div>
        </div>

        {/* Informative description */}
        <div className="space-y-6 max-w-lg my-12 lg:my-0 relative z-10">
          <span className={`inline-block text-xs font-bold px-3.5 py-1.5 rounded-full border tracking-wider uppercase ${
            isHighContrast
              ? 'bg-white border-black text-black'
              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-mono'
          }`}>
            Self-Onboarding Ingress
          </span>
          <h2 className={`text-3xl font-extrabold tracking-tight leading-tight ${
            isHighContrast ? 'text-black' : 'text-slate-100'
          }`}>
            Establish Your TVET Identity
          </h2>
          <p className={isHighContrast ? 'text-black text-sm' : 'text-slate-400 text-sm md:text-base leading-relaxed'}>
            Register directly as a Trainee, Finance officer, Registrar staff, or Night Controller to access relevant payment queues, course registrations, and stream routing.
          </p>

          <div className={`p-4 rounded-2xl border flex gap-3 items-start ${
            isHighContrast ? 'bg-white border-black text-black' : 'bg-slate-900/50 border-slate-800 text-slate-300 text-xs'
          }`}>
            <Info size={18} className="text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold">Credential Standards</h5>
              <p className="mt-1 leading-relaxed">
                Trainees will be auto-assigned roll numbers. All passwords are encrypted with bcryptjs on our cloud server nodes before saving.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className={`text-xs font-mono relative z-10 ${isHighContrast ? 'text-black font-bold' : 'text-slate-500'}`}>
          TMPC TVET Academic Hub • EST. 1925
        </div>
      </div>

      {/* Form area (Right side) */}
      <div className={`lg:w-1/2 p-6 md:p-12 flex flex-col justify-center items-center relative overflow-y-auto ${
        isHighContrast ? 'bg-white' : 'bg-slate-950'
      }`}>
        <div className={formBoxClass}>
          <div>
            <Link 
              to="/" 
              className={`inline-flex items-center gap-1.5 text-xs font-bold mb-4 hover:underline ${
                isHighContrast ? 'text-black' : 'text-indigo-400'
              }`}
            >
              <ArrowLeft size={14} />
              Back to Login
            </Link>
            
            <h3 className={`text-2xl font-bold tracking-tight ${isHighContrast ? 'text-black' : 'text-slate-100'}`}>
              Account Onboarding Form
            </h3>
            <p className={`text-xs mt-1 ${isHighContrast ? 'text-black font-semibold' : 'text-slate-400'}`}>
              Please fill out all the fields below to create your TVET profile.
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className={`text-xs font-bold uppercase tracking-wider block ${
                isHighContrast ? 'text-black' : 'text-slate-400'
              }`}>
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Yohannes Gebeyehu"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 ${
                  isHighContrast
                    ? 'bg-white border-2 border-black text-black focus:ring-black'
                    : 'bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:ring-indigo-500'
                }`}
              />
              {fieldErrors.fullName && (
                <p className={`text-xs font-bold mt-1 ${isHighContrast ? 'text-black' : 'text-rose-400'}`}>
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className={`text-xs font-bold uppercase tracking-wider block ${
                isHighContrast ? 'text-black' : 'text-slate-400'
              }`}>
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="e.g., yohannes@tmc.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 ${
                  isHighContrast
                    ? 'bg-white border-2 border-black text-black focus:ring-black'
                    : 'bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:ring-indigo-500'
                }`}
              />
              {fieldErrors.email && (
                <p className={`text-xs font-bold mt-1 ${isHighContrast ? 'text-black' : 'text-rose-400'}`}>
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Role Select */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold uppercase tracking-wider block ${
                  isHighContrast ? 'text-black' : 'text-slate-400'
                }`}>
                  Portal Role
                </label>
                <select
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value as any);
                    // Clear department/section of unrelated roles
                    if (!['Trainer', 'Department Head', 'Trainee'].includes(e.target.value)) {
                      setDepartmentId('');
                    }
                    if (e.target.value !== 'Trainee') {
                      setSectionId('');
                    }
                  }}
                  className={`w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 ${
                    isHighContrast
                      ? 'bg-white border-2 border-black text-black focus:ring-black font-bold'
                      : 'bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                >
                  <option value="Trainee">Trainee (Student)</option>
                  <option value="Finance">Finance Officer</option>
                  <option value="Registrar">Registrar Staff</option>
                  <option value="Night Controller">Night Controller</option>
                  <option value="Trainer">Trainer (Faculty)</option>
                  <option value="Department Head">Department Head</option>
                </select>
                {fieldErrors.role && (
                  <p className={`text-xs font-bold mt-1 ${isHighContrast ? 'text-black' : 'text-rose-400'}`}>
                    {fieldErrors.role}
                  </p>
                )}
              </div>

              {/* Department Select (shown conditionally or as optional) */}
              {['Trainee', 'Trainer', 'Department Head'].includes(role) && (
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider block ${
                    isHighContrast ? 'text-black' : 'text-slate-400'
                  }`}>
                    Department
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    required
                    className={`w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 ${
                      isHighContrast
                        ? 'bg-white border-2 border-black text-black focus:ring-black font-bold'
                        : 'bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                  >
                    <option value="">-- Choose Department --</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Academic Section Select (shown ONLY for Trainees) */}
            {role === 'Trainee' && (
              <div className="space-y-1.5">
                <label className={`text-xs font-bold uppercase tracking-wider block ${
                  isHighContrast ? 'text-black' : 'text-slate-400'
                }`}>
                  Academic Class Section Enrolment
                </label>
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  required
                  className={`w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 ${
                    isHighContrast
                      ? 'bg-white border-2 border-black text-black focus:ring-black font-bold'
                      : 'bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                >
                  <option value="">-- Select Section --</option>
                  {sections.map((sec) => (
                    <option key={sec._id} value={sec._id}>
                      Class {sec.name}
                    </option>
                  ))}
                </select>
                <p className={`text-[11px] ${isHighContrast ? 'text-neutral-700 font-semibold' : 'text-slate-400 font-mono'}`}>
                  Required to bind payments to Trainer verification feeds.
                </p>
              </div>
            )}

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className={`text-xs font-bold uppercase tracking-wider block ${
                isHighContrast ? 'text-black' : 'text-slate-400'
              }`}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-1 ${
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
              
              {/* Visual Password Strength Indicator */}
              {password && (
                <div className="space-y-1 pt-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                    <span className={isHighContrast ? 'text-black' : 'text-slate-400'}>Strength:</span>
                    <span className={isHighContrast ? 'text-black' : 'text-indigo-400'}>{strength.text}</span>
                  </div>
                  <div className={`h-1.5 w-full rounded-full ${isHighContrast ? 'bg-neutral-200' : 'bg-slate-850'}`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${(strength.score / 4) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {fieldErrors.password && (
                <p className={`text-xs font-bold mt-1 ${isHighContrast ? 'text-black' : 'text-rose-400'}`}>
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full font-bold py-3 mt-2 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                isHighContrast
                  ? 'bg-black text-white border-2 border-black hover:bg-neutral-800'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10'
              }`}
            >
              {loading ? 'Disbursing Record...' : 'Complete TVET Registration'}
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Login Redirection */}
          <div className="text-center pt-2">
            <p className={`text-sm ${isHighContrast ? 'text-black font-semibold' : 'text-slate-400'}`}>
              Already registered?{' '}
              <Link 
                to="/" 
                className={`font-bold hover:underline ${
                  isHighContrast ? 'text-black underline' : 'text-indigo-400 hover:text-indigo-300'
                }`}
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
