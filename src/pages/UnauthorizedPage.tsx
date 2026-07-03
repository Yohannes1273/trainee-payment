import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { motion } from 'motion/react';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const userStr = localStorage.getItem('college_payment_user');
  let user = null;
  try {
    if (userStr) user = JSON.parse(userStr);
  } catch (e) {
    console.error(e);
  }

  const handleReturn = () => {
    if (!user) {
      navigate('/');
      return;
    }
    // Smart redirect based on role
    switch (user.role) {
      case 'Trainee':
        navigate('/trainee');
        break;
      case 'Finance':
        navigate('/finance');
        break;
      case 'Night Controller':
        navigate('/night-controller');
        break;
      default:
        navigate('/dashboard'); // generic dashboard
        break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white font-sans selection:bg-rose-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(244,63,94,0.08),transparent_50%)]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative max-w-md w-full bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-8 text-center shadow-2xl"
      >
        <div className="mx-auto w-16 h-16 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
          <ShieldAlert size={32} />
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-2">
          403 Forbidden
        </h1>
        <p className="text-slate-400 font-medium mb-4">
          Access Credentials Insufficient
        </p>

        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 text-sm text-slate-400 leading-relaxed text-left mb-8">
          <p className="font-semibold text-slate-300 mb-1">Security Warning:</p>
          Your authenticated role <span className="text-rose-400 font-mono font-bold bg-rose-400/10 px-2 py-0.5 rounded border border-rose-400/20">{user?.role || 'Guest'}</span> does not possess the registry clearance to bypass this workflow node.
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white py-3 px-4 rounded-xl font-medium transition duration-200 border border-slate-600/40"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
          
          <button
            onClick={handleReturn}
            className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white py-3 px-4 rounded-xl font-medium transition duration-200 shadow-lg shadow-rose-600/20"
          >
            <Home size={18} />
            My Portal
          </button>
        </div>
      </motion.div>
    </div>
  );
}
