import React, { useState } from 'react';
import { 
  CheckCircle, Clock, ShieldAlert, XCircle, Search, 
  Filter, User, Eye, CheckSquare, RefreshCw, Layers, Users, TrendingUp
} from 'lucide-react';
import api from '../services/api';

interface TrainerComplianceDashboardProps {
  complianceData: any;
  onRefresh: () => void;
}

export default function TrainerComplianceDashboard({
  complianceData,
  onRefresh
}: TrainerComplianceDashboardProps) {
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Unpaid' | 'Pending'>('All');
  const [sectionFilter, setSectionFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTraineeId, setExpandedTraineeId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  if (!complianceData) {
    return (
      <div className="p-8 text-center text-slate-500 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="animate-spin text-indigo-500" size={24} />
        <p className="text-sm font-semibold">Loading Monitoring Engine...</p>
      </div>
    );
  }

  const sectionsList = complianceData.sections || [];
  const apiGenderStats = complianceData.genderStats || {
    totalTrainees: 0,
    paidMale: 0,
    paidFemale: 0,
    unpaidMale: 0,
    unpaidFemale: 0
  };

  // Dynamically calculate reactive statistics based on Section filter
  const getFilteredGenderStats = () => {
    if (sectionFilter === 'All') {
      return apiGenderStats;
    }

    // Recalculate stats for the selected section
    const targetSection = sectionsList.find((s: any) => s.sectionId === sectionFilter);
    if (!targetSection) return apiGenderStats;

    let total = 0;
    let paidM = 0;
    let paidF = 0;
    let unpaidM = 0;
    let unpaidF = 0;

    targetSection.trainees.forEach((t: any) => {
      total++;
      const isPaid = t.approvedPaymentsCount > 0;
      if (t.gender === 'Female') {
        if (isPaid) paidF++;
        else unpaidF++;
      } else {
        if (isPaid) paidM++;
        else unpaidM++;
      }
    });

    return {
      totalTrainees: total,
      paidMale: paidM,
      paidFemale: paidF,
      unpaidMale: unpaidM,
      unpaidFemale: unpaidF
    };
  };

  const currentStats = getFilteredGenderStats();

  const handleTogglePhysicalConfirm = async (paymentId: string, currentStatus: boolean) => {
    try {
      setTogglingId(paymentId);
      await api.post('/setup/toggle-payment-confirm', {
        paymentId,
        trainerConfirmed: !currentStatus
      });
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update physical confirmation.');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div id="trainer-monitoring-engine-root" className="space-y-8">
      
      {/* Dashboard Sub-Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            <TrendingUp className="text-indigo-400" size={24} />
            TVET Section Compliance Monitoring Engine
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
            Real-time physical payment validation, multi-criteria filtering, and live gender-based compliance ledgering.
          </p>
        </div>

        {/* Section Filter Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Section:</span>
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 rounded-xl px-3.5 py-2 focus:outline-none focus:border-indigo-500 transition"
          >
            <option value="All">All Assigned Sections</option>
            {sectionsList.map((s: any) => (
              <option key={s.sectionId} value={s.sectionId}>Section {s.sectionName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* GENDER-BASED REPORTING SECTION (STAT CARDS) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Trainees Card */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
            <Users size={12} className="text-indigo-400" />
            Total Supervised Trainees
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-indigo-400 font-mono">{currentStats.totalTrainees}</h3>
            <span className="text-xs text-slate-400 font-medium">active enrollments</span>
          </div>
          <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none">
            <Users size={72} />
          </div>
        </div>

        {/* Paid Trainees Gender-Split Card */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
          <p className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1">
            <CheckCircle size={12} />
            Approved &amp; Cleared (Paid)
          </p>
          <div className="flex items-baseline gap-2 mb-3">
            <h3 className="text-3xl font-black text-emerald-400 font-mono">
              {currentStats.paidMale + currentStats.paidFemale}
            </h3>
            <span className="text-xs text-slate-400 font-medium">trainees</span>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-slate-800/80 pt-2 text-xs font-mono">
            <div className="text-slate-400">
              Male: <span className="text-slate-200 font-bold">{currentStats.paidMale}</span>
            </div>
            <div className="text-slate-400">
              Female: <span className="text-slate-200 font-bold">{currentStats.paidFemale}</span>
            </div>
          </div>
        </div>

        {/* Unpaid Trainees Gender-Split Card */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
          <p className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-1">
            <ShieldAlert size={12} />
            Outstanding Defaulters (Unpaid)
          </p>
          <div className="flex items-baseline gap-2 mb-3">
            <h3 className="text-3xl font-black text-rose-400 font-mono">
              {currentStats.unpaidMale + currentStats.unpaidFemale}
            </h3>
            <span className="text-xs text-slate-400 font-medium">trainees</span>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-slate-800/80 pt-2 text-xs font-mono">
            <div className="text-slate-400">
              Male: <span className="text-slate-200 font-bold">{currentStats.unpaidMale}</span>
            </div>
            <div className="text-slate-400">
              Female: <span className="text-slate-200 font-bold">{currentStats.unpaidFemale}</span>
            </div>
          </div>
        </div>

      </section>

      {/* FILTER CONTROL BAR & SMART SEARCH */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row justify-between gap-4 items-center">
        
        {/* Status Toggle Buttons */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <span className="text-xs text-slate-400 font-semibold mr-2 flex items-center gap-1 select-none">
            <Filter size={12} /> Filter:
          </span>
          <div className="inline-flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setStatusFilter('All')}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition ${statusFilter === 'All' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              All Trainees
            </button>
            <button
              onClick={() => setStatusFilter('Paid')}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition ${statusFilter === 'Paid' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Paid
            </button>
            <button
              onClick={() => setStatusFilter('Unpaid')}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition ${statusFilter === 'Unpaid' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Unpaid
            </button>
            <button
              onClick={() => setStatusFilter('Pending')}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition ${statusFilter === 'Pending' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Pending Slip
            </button>
          </div>
        </div>

        {/* Smart Search Field */}
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="absolute left-3.5 top-3 text-slate-500" size={14} />
          <input
            type="text"
            placeholder="Search student or roll ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 transition focus:outline-none placeholder:text-slate-500"
          />
        </div>

      </div>

      {/* COMPLIANCE MONITORING LEDGER */}
      {sectionsList.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-slate-950 rounded-2xl border border-slate-800">
          <ShieldAlert size={36} className="mx-auto text-slate-600 mb-2" />
          You have not been linked to any sections by the Department Head.
        </div>
      ) : (
        sectionsList
          .filter((sec: any) => sectionFilter === 'All' || sec.sectionId === sectionFilter)
          .map((sec: any) => {
            // Apply filtering logic to students inside the section
            const filteredTrainees = sec.trainees.filter((t: any) => {
              const q = searchQuery.toLowerCase();
              const matchesSearch = t.fullName.toLowerCase().includes(q) || t.rollNumber.toLowerCase().includes(q);
              
              if (!matchesSearch) return false;

              // Apply status filters
              const isPaid = t.approvedPaymentsCount > 0;
              if (statusFilter === 'Paid') return isPaid;
              if (statusFilter === 'Unpaid') return !isPaid;
              if (statusFilter === 'Pending') return t.pendingVerificationCount > 0;

              return true;
            });

            if (filteredTrainees.length === 0) return null;

            return (
              <div key={sec.sectionId} className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                
                {/* Section header banner */}
                <div className="px-6 py-4.5 bg-slate-900/40 border-b border-slate-800/80 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-2.5">
                    <Layers className="text-indigo-400" size={16} />
                    <h4 className="font-extrabold text-indigo-400 text-base">Class Section: {sec.sectionName}</h4>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono font-bold bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg">
                    Trainees Registered: {filteredTrainees.length}
                  </p>
                </div>

                {/* Trainees list table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 text-[10px] font-extrabold tracking-widest uppercase border-b border-slate-800">
                        <th className="px-6 py-3.5">Trainee Profile</th>
                        <th className="px-6 py-3.5">Roll Identifier</th>
                        <th className="px-6 py-3.5">Gender</th>
                        <th className="px-6 py-3.5">Telegram BOT</th>
                        <th className="px-6 py-3.5">Compliance Level</th>
                        <th className="px-6 py-3.5">Verification Pending</th>
                        <th className="px-6 py-3.5">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {filteredTrainees.map((t: any) => {
                        const isExpanded = expandedTraineeId === t.traineeId;
                        const isStudentPaid = t.approvedPaymentsCount > 0;

                        return (
                          <React.Fragment key={t.traineeId}>
                            <tr className={`hover:bg-slate-900/30 transition ${isExpanded ? 'bg-indigo-950/5' : ''}`}>
                              
                              {/* Name & Account Status */}
                              <td className="px-6 py-4">
                                <div className="space-y-0.5">
                                  <p className="font-bold text-slate-200">{t.fullName}</p>
                                  <span className="inline-flex bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                                    {t.status}
                                  </span>
                                </div>
                              </td>

                              {/* Roll ID */}
                              <td className="px-6 py-4 font-mono font-bold text-slate-400">{t.rollNumber}</td>

                              {/* Gender */}
                              <td className="px-6 py-4 text-slate-400">
                                <span className={`inline-flex px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold ${t.gender === 'Female' ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                  {t.gender || 'Male'}
                                </span>
                              </td>

                              {/* Bot alert channel linking */}
                              <td className="px-6 py-4">
                                {t.telegramLinked ? (
                                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                                    <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                    Linked ✅
                                  </span>
                                ) : (
                                  <span className="text-slate-500 font-mono">Inactive</span>
                                )}
                              </td>

                              {/* Cleared Blocks Status */}
                              <td className="px-6 py-4">
                                {isStudentPaid ? (
                                  <span className="text-emerald-400 font-black flex items-center gap-1">
                                    <CheckCircle size={12} />
                                    {t.approvedPaymentsCount} Cleared Block(s)
                                  </span>
                                ) : (
                                  <span className="text-rose-400 font-bold flex items-center gap-1">
                                    <XCircle size={12} />
                                    Unpaid Defaulter
                                  </span>
                                )}
                              </td>

                              {/* Pending slips count */}
                              <td className="px-6 py-4">
                                {t.pendingVerificationCount > 0 ? (
                                  <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono animate-pulse">
                                    {t.pendingVerificationCount} Slip(s) Review
                                  </span>
                                ) : (
                                  <span className="text-slate-500 font-mono">None</span>
                                )}
                              </td>

                              {/* Open Payment Tracker action */}
                              <td className="px-6 py-4">
                                <button
                                  onClick={() => setExpandedTraineeId(isExpanded ? null : t.traineeId)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-200 rounded-xl transition text-[11px] font-bold"
                                >
                                  <Eye size={12} />
                                  {isExpanded ? 'Hide Tracker' : 'Track Payments'}
                                </button>
                              </td>

                            </tr>

                            {/* EXPANDED ACCORDION drawer for payments ledger ("Payment Tracker") */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={7} className="px-6 py-5 bg-slate-950 border-y border-slate-800/60">
                                  <div className="space-y-4">
                                    <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                                      <h5 className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                                        <User size={13} className="text-indigo-400" />
                                        Ledger Tracking Sheet for {t.fullName}
                                      </h5>
                                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                                        Total Cleared Ledger: {t.totalPaidETB} ETB
                                      </span>
                                    </div>

                                    {(!t.payments || t.payments.length === 0) ? (
                                      <p className="text-xs text-slate-500 italic p-3 text-center bg-slate-900 rounded-xl border border-slate-800/40">
                                        No bank slips or payments have been uploaded by this trainee.
                                      </p>
                                    ) : (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {t.payments.map((p: any) => (
                                          <div key={p._id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between gap-3">
                                            
                                            {/* Slip Info Header */}
                                            <div className="flex justify-between items-start gap-2">
                                              <div>
                                                <p className="text-xs font-bold text-slate-200">{p.programName} Pathway</p>
                                                <p className="text-[10px] text-slate-500">Level {p.levelNumber} Block</p>
                                                <p className="text-[10px] text-slate-400 font-mono mt-1">Submitted: {new Date(p.paidDate).toLocaleDateString()}</p>
                                              </div>
                                              <div className="text-right">
                                                <span className="text-sm font-extrabold text-indigo-400 font-mono block">{p.amountPaid} ETB</span>
                                                <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border mt-1 ${
                                                  p.status === 'Approved' || p.status === 'Auto-Verified'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : p.status === 'Pending'
                                                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                }`}>
                                                  {p.status}
                                                </span>
                                              </div>
                                            </div>

                                            {/* Action Bar (Real-time Physical Validity Toggle & Slip View) */}
                                            <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-3 mt-1">
                                              
                                              {/* Slip View Button */}
                                              <a
                                                href={p.slipUrl}
                                                target="_blank"
                                                referrerPolicy="no-referrer"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition"
                                              >
                                                <Eye size={12} />
                                                View Slip Receipt
                                              </a>

                                              {/* REAL-TIME PHYSICAL VERIFICATION TOGGLE */}
                                              <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-400 font-semibold select-none">
                                                  Physically Confirmed:
                                                </span>
                                                
                                                <button
                                                  type="button"
                                                  disabled={togglingId === p._id}
                                                  onClick={() => handleTogglePhysicalConfirm(p._id, p.trainerConfirmed)}
                                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:ring-offset-0 ${p.trainerConfirmed ? 'bg-emerald-500' : 'bg-slate-750'}`}
                                                >
                                                  <span className="sr-only">Toggle physical validity</span>
                                                  <span
                                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${p.trainerConfirmed ? 'translate-x-4.5' : 'translate-x-1'}`}
                                                  />
                                                </button>
                                              </div>

                                            </div>

                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            );
          })
      )}

    </div>
  );
}
