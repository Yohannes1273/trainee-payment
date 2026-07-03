import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, XCircle, FileText, Search, Filter, RefreshCw, 
  Eye, LogOut, ShieldCheck, Landmark, AlertTriangle, Calendar, Camera, X, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../services/api';
import ProfileEditor, { getAvatarUrl } from '../components/ProfileEditor';
import PaymentSearch from '../components/PaymentSearch';
import ResponsiveSidebar from '../components/ResponsiveSidebar';
import DailyInflowStats from '../components/DailyInflowStats';
import TelegramTriggerManager from '../components/TelegramTriggerManager';

interface PendingPayment {
  _id: string;
  traineeId: string;
  studentName: string;
  rollNumber: string;
  programName: string;
  levelNumber: number;
  amountPaid: number;
  slipUrl: string;
  status: string;
  dueDate: string;
  paidDate: string;
  penaltyDaysLate: number;
  penaltyAmount: number;
  aiAmount?: number;
  aiReferenceNumber?: string;
  aiTransactionDate?: string;
  aiConfidence?: string;
  aiReason?: string;
}

export default function FinanceDashboard() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState('All');
  const [levelFilter, setLevelFilter] = useState('All');

  // Modals state
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [viewSlipUrl, setViewSlipUrl] = useState<string | null>(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const fetchPending = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/payments/pending');
      setPayments(response.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to fetch pending payment queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleApprove = async (payment: PendingPayment) => {
    if (!window.confirm(`Are you sure you want to APPROVE payment block of ${payment.amountPaid} ETB for ${payment.studentName}?`)) {
      return;
    }

    try {
      setActionLoading(true);
      setActionMessage('');
      const response = await api.post(`/payments/verify/${payment._id}`, { status: 'Approved' });
      setActionMessage(response.data.message);
      fetchPending();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to approve payment.');
    } finally {
      setActionLoading(false);
    }
  };

  const submitRejection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment || !rejectionReason) return;

    try {
      setActionLoading(true);
      setActionMessage('');
      const response = await api.post(`/payments/verify/${selectedPayment._id}`, {
        status: 'Rejected',
        rejectionReason
      });
      setActionMessage(response.data.message);
      setIsRejectOpen(false);
      setSelectedPayment(null);
      setRejectionReason('');
      fetchPending();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit rejection.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter application
  const filteredPayments = payments.filter((p) => {
    const matchesSearch = p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProgram = programFilter === 'All' || p.programName === programFilter;
    const matchesLevel = levelFilter === 'All' || String(p.levelNumber) === levelFilter;

    return matchesSearch && matchesProgram && matchesLevel;
  });

  const [staffUser, setStaffUser] = useState(() => JSON.parse(localStorage.getItem('college_payment_user') || '{}'));
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('pending');

  const sidebarTabs = [
    { id: 'pending', label: 'Review Queue', icon: ShieldCheck },
    { id: 'search', label: 'Payment Search', icon: Search },
    { id: 'telegram_triggers', label: 'Telegram Alerts', icon: Bell }
  ];

  return (
    <ResponsiveSidebar
      user={{
        fullName: staffUser.fullName || 'Finance Officer',
        role: staffUser.role || 'Finance',
        username: staffUser.username || 'finance',
        email: staffUser.email
      }}
      tabs={sidebarTabs}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={handleLogout}
      onOpenProfile={() => setIsProfileModalOpen(true)}
    >
        
        {activeTab === 'pending' && (
          <>
            {/* Statistics & Overview Blocks */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Pending Review Queue</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-4xl font-black text-amber-500 dark:text-amber-400">{payments.length}</h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">unverified slips</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Requires verification against bank balances.</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Academic Program Streams</p>
                <h3 className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">Regular / Extension</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Automated routing: Extension ➡️ Night Controller.</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Compliance Target</p>
                <h3 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">Zero-Leakage</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Active block validation rules strictly enforced on-save.</p>
              </div>
            </section>

            {/* Daily Revenue vs. Expected Target Sparklines */}
            <DailyInflowStats />

        {/* Feedback Alert Banners */}
        {actionMessage && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-sm font-semibold flex justify-between items-center"
          >
            <span>✨ {actionMessage}</span>
            <button onClick={() => setActionMessage('')} className="hover:text-white font-bold">dismiss</button>
          </motion.div>
        )}

        {/* Filters and Search Workspace */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-3 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search by student name or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-4 w-full md:w-auto items-center">
            {/* Program Dropdown */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-sm shrink-0">
              <Filter size={14} className="text-slate-400" />
              <span className="text-xs text-slate-400">Program:</span>
              <select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className="bg-transparent text-white focus:outline-none text-xs font-semibold"
              >
                <option value="All" className="bg-slate-900">All Streams</option>
                <option value="Regular" className="bg-slate-900">Regular</option>
                <option value="Extension" className="bg-slate-900">Extension</option>
                <option value="Weekend" className="bg-slate-900">Weekend</option>
                <option value="Short Term" className="bg-slate-900">Short Term</option>
              </select>
            </div>

            {/* Level Dropdown */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-sm shrink-0">
              <Filter size={14} className="text-slate-400" />
              <span className="text-xs text-slate-400">Level:</span>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="bg-transparent text-white focus:outline-none text-xs font-semibold"
              >
                <option value="All" className="bg-slate-900">All Levels</option>
                <option value="1" className="bg-slate-900">Level 1</option>
                <option value="2" className="bg-slate-900">Level 2</option>
                <option value="3" className="bg-slate-900">Level 3</option>
                <option value="4" className="bg-slate-900">Level 4</option>
                <option value="5" className="bg-slate-900">Level 5</option>
              </select>
            </div>

            <button
              onClick={fetchPending}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition text-slate-300"
              title="Refresh queue"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </section>

        {/* Verification Queue Table */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800/80 flex justify-between items-center">
            <h3 className="font-bold text-lg">Slip Verification Pipeline</h3>
            <p className="text-xs text-slate-400 font-mono">Matched results: {filteredPayments.length}</p>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <RefreshCw className="animate-spin text-indigo-400 mx-auto mb-3" size={32} />
              <p className="text-slate-400 text-sm font-medium">Scanning registrar financial pipeline...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              <FileText size={44} className="mx-auto mb-2 text-slate-600 animate-pulse" />
              All incoming slips verified. Queue is clean!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 text-xs font-semibold tracking-wider border-b border-slate-800">
                    <th className="px-6 py-4">Submitted On</th>
                    <th className="px-6 py-4">Trainee</th>
                    <th className="px-6 py-4">Stream / Class</th>
                    <th className="px-6 py-4">Target Due Date</th>
                    <th className="px-6 py-4">Submitted Amount</th>
                    <th className="px-6 py-4">AI Audit Status</th>
                    <th className="px-6 py-4">Overdue Late Penalty</th>
                    <th className="px-6 py-4 text-center">Receipt File</th>
                    <th className="px-6 py-4 text-right">Workflow Verification Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {filteredPayments.map((p) => {
                    const isLate = p.penaltyDaysLate > 0;
                    return (
                      <tr key={p._id} className="hover:bg-slate-800/30 transition">
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">
                          {new Date(p.paidDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold">{p.studentName}</p>
                          <p className="text-xs text-slate-400 font-mono">{p.rollNumber}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-indigo-400">{p.programName}</p>
                          <p className="text-xs text-slate-400">Level {p.levelNumber}</p>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-slate-400" />
                            {new Date(p.dueDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-200">
                          {p.amountPaid} ETB
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {p.status === 'Auto-Verified' ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full text-[11px] font-bold">
                                ✨ Auto-Verified
                              </span>
                              {p.aiReferenceNumber && (
                                <p className="text-[10px] text-emerald-400/80 font-mono">Ref: {p.aiReferenceNumber}</p>
                              )}
                            </div>
                          ) : p.status === 'Flagged for Human Review' ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 px-2 py-0.5 rounded-full text-[11px] font-bold">
                                ⚠️ Flagged
                              </span>
                              {p.aiReason && (
                                <p className="text-[10px] text-slate-400 max-w-[180px] leading-tight truncate" title={p.aiReason}>
                                  {p.aiReason}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full text-[11px] font-bold animate-pulse">
                              ⏳ Processing...
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isLate ? (
                            <div className="text-rose-400 font-medium">
                              <p className="text-xs font-bold">+ {p.penaltyAmount} ETB</p>
                              <p className="text-[10px] font-mono text-rose-400/80">({p.penaltyDaysLate} days late)</p>
                            </div>
                          ) : (
                            <span className="text-slate-500 font-mono text-xs">On time</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => setViewSlipUrl(p.slipUrl)}
                            className="bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 py-1.5 px-3 rounded-lg text-xs font-semibold transition active:scale-95 inline-flex items-center gap-1 border border-slate-700/50"
                          >
                            <Eye size={13} />
                            Inspect Slip
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={async () => {
                              if (!window.confirm("Do you want to run Gemini AI analysis on this slip file manually?")) return;
                              try {
                                setActionLoading(true);
                                setActionMessage('Running Gemini 1.5 Flash AI receipt auditor...');
                                const response = await api.post(`/payments/verify/${p._id}`, { status: 'AI-Verify' });
                                setActionMessage(response.data.message);
                                fetchPending();
                              } catch (err: any) {
                                alert(err.response?.data?.error || 'AI verification trigger failed.');
                              } finally {
                                setActionLoading(false);
                              }
                            }}
                            className="bg-indigo-500/15 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 text-indigo-400 py-1.5 px-3 rounded-xl text-xs font-bold transition active:scale-95 inline-flex items-center gap-1"
                            title="Audit receipt with Gemini AI"
                          >
                            ✨ AI Run
                          </button>

                          <button
                            onClick={() => {
                              setSelectedPayment(p);
                              setRejectionReason('');
                              setIsRejectOpen(true);
                            }}
                            className="bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 text-rose-400 py-1.5 px-3 rounded-xl text-xs font-bold transition active:scale-95"
                          >
                            Reject
                          </button>
                          
                          <button
                            onClick={() => handleApprove(p)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 px-4 rounded-xl text-xs font-bold transition active:scale-95 shadow-lg shadow-emerald-600/10"
                          >
                            Approve & Route
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
          </>
        )}

      {activeTab === 'search' && (
        <PaymentSearch />
      )}

      {activeTab === 'telegram_triggers' && (
        <TelegramTriggerManager />
      )}

      {/* Slip Inspection Modal */}
      <AnimatePresence>
        {viewSlipUrl && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Bank Transaction Receipt Inspection</h3>
                <button 
                  onClick={() => setViewSlipUrl(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg transition"
                >
                  <XCircle size={18} />
                </button>
              </div>

              {/* View container */}
              <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800/80 flex items-center justify-center p-2 min-h-[350px]">
                {viewSlipUrl.endsWith('.pdf') ? (
                  <div className="text-center p-8 text-slate-400">
                    <FileText size={48} className="mx-auto mb-2 text-indigo-400" />
                    <p className="font-semibold text-white">Receipt is a PDF Document</p>
                    <a 
                      href={viewSlipUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-indigo-400 underline hover:text-indigo-300 font-bold block mt-2"
                    >
                      Open PDF in New Window
                    </a>
                  </div>
                ) : (
                  <img 
                    src={viewSlipUrl} 
                    alt="Bank Receipt Slip" 
                    referrerPolicy="no-referrer"
                    className="max-h-[500px] w-auto object-contain rounded-lg shadow"
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Structured Rejection Modal */}
      <AnimatePresence>
        {isRejectOpen && selectedPayment && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8"
            >
              <h3 className="text-xl font-bold tracking-tight text-white mb-2">Reject Payment Submission</h3>
              <p className="text-xs text-slate-400 mb-4">
                This action will instantly flag the block payment as Rejected, return it to the student portal, and broadcast a Telegram explanation alert.
              </p>

              <form onSubmit={submitRejection} className="space-y-5">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-400">
                  <p>Trainee: <span className="text-white font-bold">{selectedPayment.studentName}</span></p>
                  <p>Amount: <span className="text-rose-400 font-bold">{selectedPayment.amountPaid} ETB</span></p>
                  <p>Track: <span className="text-white">{selectedPayment.programName} (Level {selectedPayment.levelNumber})</span></p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Rejection Reason Note</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide a detailed explanation (e.g., 'Bank transaction ID was not legible. Please upload a higher resolution photograph of the slip.')"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRejectOpen(false);
                      setSelectedPayment(null);
                    }}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 px-4 rounded-xl font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-3 px-4 rounded-xl font-bold transition flex items-center justify-center gap-1.5 active:scale-95 shadow-lg shadow-rose-600/10"
                  >
                    {actionLoading ? 'Processing...' : 'Submit Rejection'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Picture Editor Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative max-w-sm w-full">
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-900/60 p-1.5 rounded-full z-10"
              title="Close Profile Editor"
            >
              <X size={18} />
            </button>
            <ProfileEditor 
              user={{
                id: staffUser.id || staffUser._id,
                fullName: staffUser.fullName,
                username: staffUser.username,
                email: staffUser.email,
                role: staffUser.role,
                profilePicture: staffUser.profilePicture
              }}
              onAvatarUpdated={(newPath) => {
                const updatedUser = { ...staffUser, profilePicture: newPath };
                setStaffUser(updatedUser);
              }}
            />
          </div>
        </div>
      )}
    </ResponsiveSidebar>
  );
}
