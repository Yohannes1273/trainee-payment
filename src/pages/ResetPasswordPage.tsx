import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  Lock, ArrowLeft, CheckCircle, RefreshCw, AlertCircle, Key, Shield, Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import { useToast } from '../components/Toast';
import api from '../services/api';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid reset link: recovery token is missing.');
      toast.error('Token is missing from URL.');
      return;
    }
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const res = await api.post('/auth/reset-password', {
        token,
        newPassword
      });

      if (res.data && res.data.success) {
        setSuccess('Your password has been reset successfully. You can now log in.');
        toast.success('🎉 Password successfully changed!');
      }
    } catch (err: any) {
      console.error('[ResetPassword] Error:', err);
      const errMsg = err.response?.data?.error || 'Failed to reset password. The link may have expired.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Grid Overlay & Radial gradient for a beautiful ambient visual */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(99,102,241,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-slate-900/60 border border-slate-800/80 p-8 rounded-3xl backdrop-blur-xl relative z-10 space-y-6 shadow-2xl"
      >
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/10">
            <Key size={24} />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
            Reset Password
          </h2>
          <p className="text-xs text-slate-400">
            Establish a new secure access key for your college registry profile.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold flex items-start gap-2">
              <CheckCircle size={14} className="shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
            <Link
              to="/"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition"
            >
              <ArrowLeft size={14} />
              Return to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Recovery Token</label>
              <input
                type="text"
                disabled
                value={token || 'No Token Detected in URL Link'}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-400 font-mono focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">New Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Confirm New Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/10 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={14} />
                  Updating password credentials...
                </>
              ) : (
                <>
                  <Shield size={14} />
                  Update Access Key
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link to="/" className="text-xs text-slate-500 hover:text-slate-400 font-bold underline transition flex items-center justify-center gap-1">
                <ArrowLeft size={12} />
                Cancel and return to Sign In
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
