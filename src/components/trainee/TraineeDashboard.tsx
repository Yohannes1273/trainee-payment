import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Upload, History, User, CreditCard, Calendar, 
  AlertTriangle, CheckCircle, Clock, ShieldAlert, Sparkles, 
  Send, RefreshCw, FileText, ChevronRight, Bell, ShieldCheck,
  Info, Eye, Activity, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../services/api';
import PaymentHistoryTable from './PaymentHistoryTable';
import PenaltyCalculator from './PenaltyCalculator';

interface PaymentRecord {
  _id: string;
  traineeId: string;
  programName: string;
  levelNumber: number;
  amountPaid: number;
  monthsCovered?: number;
  slipUrl: string;
  status: string; // 'Pending' | 'Approved' | 'Rejected' | 'Auto-Verified' | 'Flagged for Human Review'
  rejectionReason?: string;
  localReceiptId?: string;
  aiAmount?: number;
  aiReferenceNumber?: string;
  aiTransactionDate?: string;
  aiConfidence?: string;
  aiReason?: string;
  dueDate: string;
  paidDate: string;
  verifiedDate?: string;
  verifiedBy?: string;
  penaltyDaysLate?: number;
  penaltyAmount?: number;
  receiptNumber?: string;
}

interface LedgerData {
  trainee: {
    id: string;
    fullName: string;
    email: string;
    rollNumber: string;
    telegramChatId: string;
    admissionStatus: string;
    telegramAlertsEnabled?: boolean;
  };
  academic: {
    sectionName: string;
    levelNumber: number;
    entryYear: string;
    programName: string;
    occupationName: string;
    departmentName: string;
  };
  financialConfig: {
    monthlyRate: number;
    blockMonths: number;
    requiredBlockPrice: number;
  };
  ledgerSummary: {
    totalPaidAmount: number;
    totalPenaltyAmount: number;
    activeOverdueAmount: number;
    activePenaltyAmount: number;
  };
  schedule: Array<{
    blockIndex: number;
    title: string;
    dueDate: string;
    amountRequired: number;
    status: string;
    lateDays: number;
    penaltyFee: number;
    paymentRecord?: {
      _id: string;
      status: string;
      slipUrl: string;
      paidDate: string;
      rejectionReason?: string;
      receiptNumber?: string;
    };
  }>;
  payments?: PaymentRecord[];
}

export default function TraineeDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'upload' | 'history' | 'profile'>('dashboard');
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Slip Upload form states
  const [programName, setProgramName] = useState('Regular');
  const [levelNumber, setLevelNumber] = useState('1');
  const [amountPaid, setAmountPaid] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Settings states
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramAlertsEnabled, setTelegramAlertsEnabled] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  // Real-time tracker states
  const [selectedTrackedPaymentId, setSelectedTrackedPaymentId] = useState<string | null>(null);
  const [syncingQuietly, setSyncingQuietly] = useState(false);
  const [trackerFilter, setTrackerFilter] = useState<'All' | 'Pending' | 'Verified' | 'Rejected'>('All');

  // Quiet refresh function
  const refreshLedgerQuietly = async () => {
    try {
      setSyncingQuietly(true);
      const res = await api.get('/trainees/ledger');
      if (res.data) {
        setLedger(res.data);
      }
    } catch (err) {
      console.error('[TraineeDashboard] Silent refresh error:', err);
    } finally {
      setSyncingQuietly(false);
    }
  };

  // Auto-select most recently uploaded slip if none selected
  useEffect(() => {
    if (ledger?.payments && ledger.payments.length > 0) {
      if (!selectedTrackedPaymentId) {
        const sorted = [...ledger.payments].sort(
          (a, b) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime()
        );
        setSelectedTrackedPaymentId(sorted[0]._id);
      }
    }
  }, [ledger?.payments, selectedTrackedPaymentId]);

  // Real-time background polling for non-finalized slips
  useEffect(() => {
    let intervalId: any = null;
    const hasPendingSlips = ledger?.payments?.some(
      (p) => p.status === 'Pending' || p.status === 'Auto-Verified' || p.status === 'Flagged for Human Review'
    );
    
    if (hasPendingSlips) {
      intervalId = setInterval(() => {
        refreshLedgerQuietly();
      }, 8000); // Poll every 8 seconds for immediate feedback
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [ledger?.payments]);

  // Fetch the student's isolated ledger details
  const fetchLedger = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/trainees/ledger');
      if (res.data) {
        setLedger(res.data);
        setProgramName(res.data.academic?.programName || 'Regular');
        setLevelNumber(String(res.data.academic?.levelNumber || '1'));
        setTelegramChatId(res.data.trainee?.telegramChatId || '');
        setTelegramAlertsEnabled(res.data.trainee?.telegramAlertsEnabled !== false);
      }
    } catch (err: any) {
      console.error('[TraineeDashboard] Error fetching ledger:', err);
      setError(err.response?.data?.error || 'Failed to sync ledger details from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  // Set the correct block cost automatically based on program and level
  useEffect(() => {
    if (programName === 'Regular') {
      setAmountPaid('150');
    } else if (programName === 'Short Term') {
      setAmountPaid('3500');
    } else {
      // Extension & Weekend block pricing: 3 months * rate
      const levelRates: Record<string, number> = { '1': 175, '2': 225, '3': 300, '4': 375, '5': 450 };
      const rate = levelRates[levelNumber] || 175;
      setAmountPaid(String(rate * 3));
    }
  }, [programName, levelNumber]);

  // Drag and Drop files
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Submit payment slip
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');

    if (!selectedFile) {
      setUploadError('Please select or drag in a bank receipt slip file.');
      return;
    }
    if (!dueDate) {
      setUploadError('Please provide the due date of the block you are paying.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('slip', selectedFile);
      formData.append('programName', programName);
      formData.append('levelNumber', levelNumber);
      formData.append('amountPaid', amountPaid);
      formData.append('dueDate', new Date(dueDate).toISOString());

      const res = await api.post('/trainee/upload-slip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data && res.data.success) {
        setUploadSuccess('🎉 Receipt slip submitted successfully! AI auto-verification initiated.');
        setSelectedFile(null);
        setDueDate('');
        fetchLedger();
      }
    } catch (err: any) {
      console.error('[TraineeDashboard] Submit error:', err);
      setUploadError(err.response?.data?.error || 'Failed to upload bank receipt.');
    } finally {
      setUploading(false);
    }
  };

  // Save Telegram and Alerts Preferences
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMessage('');
    try {
      setSettingsSaving(true);
      
      // Save telegramChatId
      await api.post('/trainees/telegram', { telegramChatId });
      
      // Save notification preferences
      await api.put('/trainees/preferences', { telegramAlertsEnabled });
      
      setSettingsMessage('🎉 Profile settings and notification channels synchronized successfully!');
      fetchLedger();
    } catch (err: any) {
      setSettingsMessage(err.response?.data?.error || 'Failed to update preferences.');
    } finally {
      setSettingsSaving(false);
    }
  };

  // Calculate annual tuition progress
  const getTuitionStats = () => {
    if (!ledger) return { expected: 1000, paid: 0, percent: 0 };
    
    // Annual expected based on program
    const prog = ledger.academic.programName;
    const rate = ledger.financialConfig?.monthlyRate || 175;
    
    let expected = rate * 12; // Default 1 year
    if (prog === 'Regular') {
      expected = 300; // 25 * 12
    } else if (prog === 'Short Term') {
      expected = 3500;
    }

    const paid = ledger.ledgerSummary?.totalPaidAmount || 0;
    const percent = Math.min(100, Math.round((paid / expected) * 100));
    
    return { expected, paid, percent };
  };

  // Check upcoming payment dates for "Penalty Protection" (Due within 48 hours)
  const getPenaltyProtectionAlerts = () => {
    if (!ledger) return [];
    
    const now = new Date();
    const alerts: Array<{ blockTitle: string; hoursLeft: number; dueDate: Date }> = [];
    
    ledger.schedule.forEach(block => {
      if (block.status === 'Paid' || block.status === 'Approved') return;
      
      const due = new Date(block.dueDate);
      const diffMs = due.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      // Alert if due within 48 hours
      if (diffHours > 0 && diffHours <= 48) {
        alerts.push({
          blockTitle: block.title,
          hoursLeft: Math.round(diffHours),
          dueDate: due
        });
      }
    });
    
    return alerts;
  };

  const tuition = getTuitionStats();
  const protectionAlerts = getPenaltyProtectionAlerts();

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24 md:pb-8 flex flex-col">
      {/* Header Banner */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <span className="font-black text-sm text-white">TM</span>
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider text-slate-200 uppercase">Tafari Makonnen</h1>
            <p className="text-[10px] text-slate-400 font-mono">Polytechnic College Trainee Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
            <ShieldCheck size={10} />
            Isolated Guard
          </span>
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <RefreshCw className="animate-spin text-indigo-400" size={32} />
            <p className="text-xs font-mono text-slate-400">Syncing college ledger with isolation guardrails...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-bold space-y-2 max-w-md mx-auto">
            <ShieldAlert size={20} />
            <p>{error}</p>
            <button 
              onClick={fetchLedger}
              className="text-[10px] bg-rose-500 text-white px-3 py-1.5 rounded-lg hover:bg-rose-400 transition font-black uppercase"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            {/* Penalty Protection Alerts Banner */}
            {protectionAlerts.length > 0 && (
              <div className="bg-gradient-to-r from-rose-950/80 to-rose-900/40 border border-rose-500/30 rounded-3xl p-5 flex items-start gap-4 shadow-lg shadow-rose-950/20 animate-pulse">
                <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={20} />
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-rose-300 uppercase tracking-wide">Penalty Protection Active</h4>
                  {protectionAlerts.map((alert, i) => (
                    <p key={i} className="text-xs text-slate-200 leading-relaxed">
                      Your payment for <strong>{alert.blockTitle}</strong> is due in less than <strong>{alert.hoursLeft} hours</strong> ({alert.dueDate.toLocaleDateString()}). Settle now to shield your account from late surcharges.
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Render Active Tab */}
            <div className="space-y-6">
              
              {/* TAB 1: DASHBOARD OVERVIEW */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Progress Bar Widget */}
                  <section className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Financial Command Center</span>
                        <h2 className="text-lg font-black text-white mt-1">Annual Tuition Settlement Progress</h2>
                        <p className="text-xs text-slate-400 mt-1">Tracking cumulative payments against current expected annual dues.</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-white font-mono">{tuition.percent}%</span>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Dues Cleared</span>
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="space-y-2">
                      <div className="w-full bg-slate-950 rounded-full h-4 overflow-hidden border border-slate-800 p-0.5">
                        <div 
                          className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${tuition.percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-500">
                        <span>Paid: {tuition.paid} ETB</span>
                        <span>Dues: {tuition.expected} ETB</span>
                      </div>
                    </div>
                  </section>

                  {/* Summary Metric Cards */}
                  <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-2">
                      <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Active Overdue Amount</span>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-extrabold text-white font-mono">{ledger?.ledgerSummary.activeOverdueAmount || 0} ETB</span>
                        <CreditCard className="text-slate-500" size={16} />
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-2">
                      <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Accumulated Late Penalties</span>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-extrabold text-rose-400 font-mono">+{ledger?.ledgerSummary.activePenaltyAmount || 0} ETB</span>
                        <AlertTriangle className="text-rose-500" size={16} />
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-2">
                      <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Total Certified Dues Paid</span>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-extrabold text-emerald-400 font-mono">{ledger?.ledgerSummary.totalPaidAmount || 0} ETB</span>
                        <CheckCircle className="text-emerald-500" size={16} />
                      </div>
                    </div>
                  </section>

                  {/* Academic Profile & Active Payment Blocks */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Your Active Settlement Schedule</h3>
                        <p className="text-xs text-slate-500 mt-1">Review your program blocks, payment deadlines, and approval statuses.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {ledger?.schedule.map((block) => {
                          const isApproved = block.status === 'Paid' || block.status === 'Approved';
                          const isPending = block.status === 'Pending';
                          const isOverdue = block.status === 'Overdue';
                          
                          return (
                            <div 
                              key={block.blockIndex}
                              className={`p-4 rounded-2xl border ${
                                isOverdue ? 'border-rose-500/20 bg-rose-500/[0.01]' : 'border-slate-800 bg-slate-950/40'
                              } flex flex-col justify-between gap-4`}
                            >
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                    isApproved ? 'bg-emerald-500/10 text-emerald-400' :
                                    isPending ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                                  }`}>
                                    {block.status}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500">Block {block.blockIndex}</span>
                                </div>
                                <h4 className="text-xs font-black text-white">{block.title}</h4>
                                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Calendar size={10} />
                                  Due: {new Date(block.dueDate).toLocaleDateString()}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                                <span className="text-slate-400">Required:</span>
                                <span className="font-extrabold text-white">{block.amountRequired} ETB</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Academic details box */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Academic Registration</h3>
                      
                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-800/50">
                          <span className="text-slate-500">Full Name</span>
                          <span className="font-bold text-white">{ledger?.trainee.fullName}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/50">
                          <span className="text-slate-500">Roll Number</span>
                          <span className="font-mono text-white">{ledger?.trainee.rollNumber}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/50">
                          <span className="text-slate-500">Program Track</span>
                          <span className="font-bold text-indigo-400">{ledger?.academic.programName}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/50">
                          <span className="text-slate-500">Level / Year</span>
                          <span className="font-bold text-white">Level {ledger?.academic.levelNumber}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Department</span>
                          <span className="text-slate-300 text-right font-medium max-w-[150px] truncate">{ledger?.academic.departmentName}</span>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-400 leading-relaxed flex gap-2">
                        <Clock className="text-indigo-400 shrink-0" size={14} />
                        <span>Dues and status sync automatically with Tafari Makonnen college finance registrar.</span>
                      </div>
                    </div>
                  </div>

                  {/* Penalty Simulation Widget directly accessible on Dashboard */}
                  <PenaltyCalculator />
                </div>
              )}

              {/* TAB 2: SMART UPLOAD MODULE */}
              {activeTab === 'upload' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Form & Regulations */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                      <div>
                        <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                          <Upload className="text-indigo-400" size={18} />
                          Submit Bank Payment Slip
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Select your course parameters, enter transaction details, and upload the bank slip.
                        </p>
                      </div>

                      <form onSubmit={handleUploadSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                              Academic Program
                            </label>
                            <select
                              value={programName}
                              onChange={(e) => setProgramName(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                            >
                              <option value="Regular">Regular</option>
                              <option value="Extension">Extension</option>
                              <option value="Weekend">Weekend</option>
                              <option value="Short Term">Short Term</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                              Current level
                            </label>
                            <select
                              value={levelNumber}
                              onChange={(e) => setLevelNumber(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                            >
                              <option value="1">Level 1</option>
                              <option value="2">Level 2</option>
                              <option value="3">Level 3</option>
                              <option value="4">Level 4</option>
                              <option value="5">Level 5</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                              Amount Paid (ETB)
                            </label>
                            <input
                              type="number"
                              required
                              placeholder="e.g. 150"
                              value={amountPaid}
                              onChange={(e) => setAmountPaid(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                              Block payment due date
                          </label>
                          <input
                            type="date"
                            required
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
                          />
                        </div>

                        {/* Drag & Drop File Upload Stage */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Deposit Receipt Slip (Image or PDF)
                          </label>
                          <div
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('slip-file-input')?.click()}
                            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[160px] ${
                              dragActive 
                                ? 'border-indigo-500 bg-indigo-500/5' 
                                : selectedFile 
                                  ? 'border-emerald-500 bg-emerald-500/5' 
                                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                            }`}
                          >
                            <input
                              id="slip-file-input"
                              type="file"
                              accept="image/*,.pdf"
                              onChange={handleFileChange}
                              className="hidden"
                            />

                            {selectedFile ? (
                              <div className="space-y-2">
                                <CheckCircle className="text-emerald-400 mx-auto" size={32} />
                                <p className="text-xs font-black text-white">{selectedFile.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB - Click to change</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Upload className="text-slate-500 mx-auto" size={32} />
                                <p className="text-xs font-black text-white">Drag & drop your bank slip here</p>
                                <p className="text-[10px] text-slate-500">or click to browse local files (PDF, PNG, JPG up to 5MB)</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {uploadError && (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold">
                            {uploadError}
                          </div>
                        )}

                        {uploadSuccess && (
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold">
                            {uploadSuccess}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={uploading}
                          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 transition cursor-pointer"
                        >
                          {uploading ? (
                            <>
                              <RefreshCw className="animate-spin" size={14} />
                              Uploading & Running Automated AI Verification...
                            </>
                          ) : (
                            <>
                              <Send size={14} />
                              Submit Block Payment Slip
                            </>
                          )}
                        </button>
                      </form>
                    </div>

                    {/* Guidelines Box */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                      <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                          Payment Block Regulations
                        </h4>
                        <ul className="space-y-3 text-xs text-slate-300">
                          <li className="flex items-start gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                            <span><strong>Regular Program:</strong> Structured in upfront 6-month blocks (150 ETB per installment). Got to match exact block price.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                            <span><strong>Extension / Weekend:</strong> Variable block fees based on level. Paid upfront in 3-month blocks.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                            <span><strong>Short Term Program:</strong> Flat tuition rate of at least 3,500 ETB per semester block.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                            <span><strong>Late Surcharges:</strong> Accumulates automatically on past due dates at a flat rate of 10 ETB per late day.</span>
                          </li>
                        </ul>
                      </div>

                      <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2 text-rose-400">
                          <AlertTriangle size={14} />
                          <span className="text-[10px] font-black uppercase tracking-wider">Overdue Penalty Alert</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Unapproved or outstanding blocks are swept automatically by the system. Use the Interactive Calculator below to simulate overdue liabilities.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Live Slip Tracker */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                      {/* Tracker Header */}
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                        <div>
                          <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                            <Activity className="text-indigo-400 animate-pulse" size={16} />
                            Live Slip Tracker
                          </h3>
                          <p className="text-[10px] text-slate-400">Real-time "Pending/Verified" tracker</p>
                        </div>
                        <button
                          type="button"
                          onClick={refreshLedgerQuietly}
                          disabled={syncingQuietly}
                          className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-50 transition cursor-pointer flex items-center justify-center"
                          title="Sync status now"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingQuietly ? 'animate-spin text-indigo-400' : ''}`} />
                        </button>
                      </div>

                      {/* Tracker Body */}
                      {(!ledger?.payments || ledger.payments.length === 0) ? (
                        <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-850 flex flex-col items-center justify-center space-y-2">
                          <Clock className="text-slate-600" size={24} />
                          <p className="text-xs font-bold text-slate-400">No Slips Uploaded Yet</p>
                          <p className="text-[10px] text-slate-500 max-w-[180px]">Submit your first payment receipt to start tracking its verification status in real time.</p>
                        </div>
                      ) : (() => {
                        const sortedPayments = [...(ledger.payments || [])].sort(
                          (a, b) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime()
                        );
                        const trackedPayment = sortedPayments.find(p => p._id === selectedTrackedPaymentId) || sortedPayments[0];

                        return (
                          <div className="space-y-6">
                            {/* Live Status Pipeline/Stepper for active slip */}
                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Pipeline Progress</span>
                                <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full">
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    trackedPayment?.status === 'Pending' || trackedPayment?.status === 'Auto-Verified' || trackedPayment?.status === 'Flagged for Human Review'
                                      ? 'bg-amber-400 animate-pulse'
                                      : trackedPayment?.status === 'Approved'
                                        ? 'bg-emerald-400'
                                        : 'bg-rose-400'
                                  }`} />
                                  {trackedPayment?.status === 'Pending' || trackedPayment?.status === 'Auto-Verified' || trackedPayment?.status === 'Flagged for Human Review'
                                    ? 'Polling Live'
                                    : 'Finalized'
                                  }
                                </div>
                              </div>

                              {/* Stepper Steps */}
                              <div className="relative pl-6 space-y-6 border-l border-slate-800">
                                {/* Step 1: Ingested */}
                                <div className="relative">
                                  <span className="absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                                    ✓
                                  </span>
                                  <div className="space-y-0.5">
                                    <span className="text-xs font-black text-white block">Receipt Ingested</span>
                                    <span className="text-[9px] text-slate-500 block font-mono">
                                      Uploaded {new Date(trackedPayment?.paidDate || '').toLocaleString()}
                                    </span>
                                  </div>
                                </div>

                                {/* Step 2: AI Automated Validation */}
                                <div className="relative">
                                  {trackedPayment?.status === 'Pending' ? (
                                    <span className="absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-slate-950 border border-indigo-500/40 text-indigo-400 text-[10px]">
                                      <RefreshCw size={10} className="animate-spin" />
                                    </span>
                                  ) : trackedPayment?.status === 'Rejected' ? (
                                    <span className="absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold">
                                      ✕
                                    </span>
                                  ) : trackedPayment?.status === 'Flagged for Human Review' ? (
                                    <span className="absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                                      !
                                    </span>
                                  ) : (
                                    <span className="absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                                      ✓
                                    </span>
                                  )}
                                  <div className="space-y-0.5">
                                    <span className="text-xs font-black text-white block">Automated AI Verification</span>
                                    <span className="text-[9px] text-slate-400 block">
                                      {trackedPayment?.status === 'Pending' && 'OCR model parsing receipt...'}
                                      {trackedPayment?.status === 'Auto-Verified' && 'AI auto-matched price & block parameters!'}
                                      {trackedPayment?.status === 'Approved' && 'AI validation verified.'}
                                      {trackedPayment?.status === 'Flagged for Human Review' && 'AI flagged: Discrepancy detected.'}
                                      {trackedPayment?.status === 'Rejected' && 'AI/Manual check rejected.'}
                                    </span>
                                    {trackedPayment?.aiReason && (
                                      <p className="text-[9px] text-indigo-400 bg-indigo-500/5 p-1.5 rounded-lg border border-indigo-500/10 mt-1 font-sans leading-relaxed">
                                        <strong>AI Note:</strong> {trackedPayment.aiReason}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Step 3: Finance Release & Approval */}
                                <div className="relative">
                                  {trackedPayment?.status === 'Approved' ? (
                                    <span className="absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                                      ✓
                                    </span>
                                  ) : trackedPayment?.status === 'Rejected' ? (
                                    <span className="absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold">
                                      ✕
                                    </span>
                                  ) : (
                                    <span className="absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-slate-950 border border-slate-800 text-slate-600 text-[10px]">
                                      ●
                                    </span>
                                  )}
                                  <div className="space-y-0.5">
                                    <span className="text-xs font-black text-white block">College Finance Audit</span>
                                    <span className="text-[9px] text-slate-400 block">
                                      {trackedPayment?.status === 'Approved' && 'Settlement approved & credited!'}
                                      {trackedPayment?.status === 'Rejected' && 'Auditor Rejected.'}
                                      {(trackedPayment?.status === 'Pending' || trackedPayment?.status === 'Auto-Verified') && 'Awaiting final manual audit release...'}
                                      {trackedPayment?.status === 'Flagged for Human Review' && 'Priority Review: Queue pending manual auditor audit.'}
                                    </span>
                                    {trackedPayment?.rejectionReason && (
                                      <p className="text-[9px] text-rose-400 bg-rose-500/5 p-1.5 rounded-lg border border-rose-500/10 mt-1 font-sans leading-relaxed">
                                        <strong>Rejection Reason:</strong> {trackedPayment.rejectionReason}
                                      </p>
                                    )}
                                    {trackedPayment?.receiptNumber && (
                                      <p className="text-[9px] text-emerald-400 bg-emerald-500/5 p-1.5 rounded-lg border border-emerald-500/10 mt-1 font-mono">
                                        <strong>Receipt No:</strong> {trackedPayment.receiptNumber}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Document Preview block */}
                              {trackedPayment?.slipUrl && (
                                <div className="pt-3 border-t border-slate-800/80">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">Uploaded Receipt Preview</span>
                                  {trackedPayment.slipUrl.endsWith('.pdf') ? (
                                    <div className="flex items-center gap-2 text-xs text-slate-300 p-2 bg-slate-900 rounded-xl border border-slate-800">
                                      <FileText className="text-rose-400 shrink-0" size={14} />
                                      <span className="truncate max-w-[120px]">{trackedPayment.slipUrl.split('/').pop()}</span>
                                      <a href={trackedPayment.slipUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline font-bold ml-auto text-[10px] shrink-0">Open</a>
                                    </div>
                                  ) : (
                                    <div className="relative group overflow-hidden rounded-xl aspect-[16/9] bg-slate-900 border border-slate-800">
                                      <img 
                                        src={trackedPayment.slipUrl} 
                                        alt="Payment Receipt Slip" 
                                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                                        referrerPolicy="no-referrer"
                                      />
                                      <a 
                                        href={trackedPayment.slipUrl} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="absolute inset-0 bg-slate-950/65 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold transition duration-200"
                                      >
                                        <Eye size={12} className="mr-1" /> View Full Image
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Historical uploads filterable selector list */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Submission History</span>
                                <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-850">
                                  {(['All', 'Pending', 'Verified', 'Rejected'] as const).map((f) => (
                                    <button
                                      key={f}
                                      type="button"
                                      onClick={() => setTrackerFilter(f)}
                                      className={`text-[9px] px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                                        trackerFilter === f 
                                          ? 'bg-slate-900 text-indigo-400 font-extrabold border border-slate-800' 
                                          : 'text-slate-500 hover:text-slate-300'
                                      }`}
                                    >
                                      {f}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                                {sortedPayments
                                  .filter((p) => {
                                    if (trackerFilter === 'All') return true;
                                    if (trackerFilter === 'Pending') return p.status === 'Pending' || p.status === 'Auto-Verified' || p.status === 'Flagged for Human Review';
                                    if (trackerFilter === 'Verified') return p.status === 'Approved';
                                    if (trackerFilter === 'Rejected') return p.status === 'Rejected';
                                    return true;
                                  })
                                  .map((p) => {
                                    const isSelected = p._id === trackedPayment?._id;
                                    return (
                                      <button
                                        key={p._id}
                                        type="button"
                                        onClick={() => setSelectedTrackedPaymentId(p._id)}
                                        className={`w-full text-left p-3 rounded-2xl border transition flex flex-col gap-1.5 cursor-pointer ${
                                          isSelected 
                                            ? 'bg-indigo-600/10 border-indigo-500/80 shadow-lg shadow-indigo-650/5' 
                                            : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-950 hover:border-slate-700'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between w-full">
                                          <span className="text-xs font-black text-white">{p.amountPaid.toLocaleString()} ETB</span>
                                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                            p.status === 'Approved'
                                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                              : p.status === 'Rejected'
                                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                                          }`}>
                                            {p.status}
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono w-full">
                                          <span>{p.programName} L{p.levelNumber}</span>
                                          <span>{new Date(p.paidDate).toLocaleDateString()}</span>
                                        </div>
                                      </button>
                                    );
                                  })}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DIGITAL VAULT & HISTORY LOG */}
              {activeTab === 'history' && (
                <PaymentHistoryTable />
              )}

              {/* TAB 4: PROFILE & TELEGRAM CONFIG */}
              {activeTab === 'profile' && (
                <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                  <div>
                    <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                      <User className="text-indigo-400" size={18} />
                      Trainee Secure Settings
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Configure your Telegram Alert ID and manage automated notification Preferences.
                    </p>
                  </div>

                  <form onSubmit={handleSaveSettings} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                          Telegram Chat ID
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 581729381"
                          value={telegramChatId}
                          onChange={(e) => setTelegramChatId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                          Receive live payment validation notifications directly on your mobile device.
                        </p>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-white block">Enable Telegram Alerts</span>
                          <span className="text-[10px] text-slate-500 block">Get direct status updates as soon as finance registers your receipt.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={telegramAlertsEnabled}
                            onChange={(e) => setTelegramAlertsEnabled(e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>

                    {settingsMessage && (
                      <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-xs font-bold">
                        {settingsMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={settingsSaving}
                      className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 transition cursor-pointer"
                    >
                      {settingsSaving ? (
                        <>
                          <RefreshCw className="animate-spin" size={14} />
                          Saving Student Preferences...
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          Synchronize Channels
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

            </div>
          </>
        )}

      </main>

      {/* PERSISTENT BOTTOM TAB NAVIGATION BAR (Mobile-First) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-t border-slate-900 px-6 py-2.5 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition ${
            activeTab === 'dashboard' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-black uppercase tracking-wider">Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition ${
            activeTab === 'upload' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Upload size={20} />
          <span className="text-[10px] font-black uppercase tracking-wider">Upload</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition ${
            activeTab === 'history' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <History size={20} />
          <span className="text-[10px] font-black uppercase tracking-wider">History</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition ${
            activeTab === 'profile' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <User size={20} />
          <span className="text-[10px] font-black uppercase tracking-wider">Profile</span>
        </button>
      </nav>
    </div>
  );
}
