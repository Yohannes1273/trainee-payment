import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, CheckCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const userStr = localStorage.getItem('college_payment_user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('All password fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    if (newPassword.length < 3) {
      setError('New password must be at least 3 characters long.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/users/change-password', {
        oldPassword,
        newPassword,
        confirmPassword
      });

      setSuccess(res.data.message || 'Password changed successfully!');
      
      // Update local storage so that isPasswordChanged is true
      if (user) {
        user.isPasswordChanged = true;
        localStorage.setItem('college_payment_user', JSON.stringify(user));
      }

      // Redirect after a brief interval so they see success feedback
      setTimeout(() => {
        if (user) {
          if (user.role === 'Trainee') {
            navigate('/trainee');
          } else if (user.role === 'Finance') {
            navigate('/finance');
          } else if (user.role === 'Night Controller') {
            navigate('/night-controller');
          } else {
            navigate('/staff-portal');
          }
        } else {
          navigate('/');
        }
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(99,102,241,0.07),transparent_60%)]" />

      <div className="max-w-md w-full space-y-8 bg-slate-900/50 border border-slate-800/80 p-8 rounded-3xl backdrop-blur-md relative z-10">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={24} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">First-Time Setup</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            For college security compliance, you must establish a personal password before accessing the system.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-400" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Default Password</label>
            <input
              type="password"
              required
              placeholder="Enter temporary password (e.g. 123)"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">New Custom Password</label>
            <input
              type="password"
              required
              placeholder="At least 3 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Confirm New Password</label>
            <input
              type="password"
              required
              placeholder="Confirm your selection"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition border border-slate-700"
            >
              Sign Out
            </button>
            <button
              type="submit"
              disabled={loading || !!success}
              className="w-2/3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  Change Password
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
