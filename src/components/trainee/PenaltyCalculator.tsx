import React, { useState } from 'react';
import { 
  Calculator, Calendar, AlertTriangle, RefreshCw, Sparkles, TrendingUp, ShieldAlert
} from 'lucide-react';
import api from '../../services/api';

export default function PenaltyCalculator() {
  const [dueDateInput, setDueDateInput] = useState('');
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Offline Instant Penalty Estimator
  const [manualDays, setManualDays] = useState(5);
  const penaltyRate = 10; // 10 ETB per day
  const manualPenalty = manualDays * penaltyRate;

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDateInput) {
      setError('Please select a valid past due date to simulate penalties.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSimulationResult(null);

      const res = await api.get('/trainee/penalty-simulation', {
        params: { dueDate: dueDateInput }
      });

      if (res.data && res.data.success) {
        setSimulationResult(res.data.simulation);
      }
    } catch (err: any) {
      console.error('[PenaltyCalculator] Error:', err);
      setError(err.response?.data?.error || 'Failed to calculate simulated penalties.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      {/* Simulation Form (Calling the live API) */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
            <Calculator className="text-indigo-400" size={18} />
            Live Penalty Shield & Estimator
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Simulate actual overdue days and penalty charges by querying the server with an expected due date.
          </p>
        </div>

        <form onSubmit={handleRunSimulation} className="space-y-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Hypothetical Payment Block Due Date
            </label>
            <input
              type="date"
              value={dueDateInput}
              onChange={(e) => setDueDateInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none transition font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                Computing Late Penalty...
              </>
            ) : (
              <>
                <Sparkles size={12} />
                Run Server Calculation
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold flex items-center gap-2">
            <ShieldAlert size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Live Simulation results panel */}
        {simulationResult && (
          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/15 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400">
              <Calendar size={14} />
              <span className="text-xs font-black uppercase tracking-wider">Simulation Breakdown</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
                <span className="text-slate-500 block text-[10px]">Due Date</span>
                <span className="font-mono font-bold text-white">{new Date(simulationResult.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
                <span className="text-slate-500 block text-[10px]">Days Overdue</span>
                <span className={`font-mono font-extrabold ${simulationResult.daysLate > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {simulationResult.daysLate} days
                </span>
              </div>
              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60 col-span-2">
                <span className="text-slate-500 block text-[10px]">Overdue Late Penalty (10 ETB/day)</span>
                <span className={`font-mono text-lg font-extrabold ${simulationResult.penaltyAmount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  + {simulationResult.penaltyAmount} ETB
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instant Slider Estimate Widget */}
      <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-800/80 pt-6 md:pt-0 md:pl-6 flex flex-col justify-between">
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
              <TrendingUp className="text-indigo-400" size={18} />
              Instant Penalty Quick Estimator
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Slide to quickly estimate potential penalty fees for any overdue payments offline.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-400">
              <span>Days Overdue</span>
              <span className="font-mono text-indigo-400 font-extrabold text-sm">{manualDays} days</span>
            </div>
            
            <input
              type="range"
              min="0"
              max="90"
              value={manualDays}
              onChange={(e) => setManualDays(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg appearance-none"
            />
            
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0 days</span>
              <span>45 days</span>
              <span>90 days</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 block text-[10px]">Estimated Surcharge</span>
            <span className="text-base font-black text-rose-400 font-mono">+{manualPenalty} ETB</span>
          </div>
          <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full font-bold text-[10px] uppercase">
            10 ETB / Day
          </div>
        </div>
      </div>
    </div>
  );
}
