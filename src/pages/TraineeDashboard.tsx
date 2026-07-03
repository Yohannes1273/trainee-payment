import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, Calendar, AlertTriangle, CheckCircle, Upload, 
  Send, HelpCircle, Landmark, LogOut, RefreshCw, FileText, X, Camera, Settings 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../services/api';
import ProfileEditor, { getAvatarUrl } from '../components/ProfileEditor';
import ResponsiveSidebar from '../components/ResponsiveSidebar';
import UserSettings from '../components/UserSettings';
import TraineeSelfService from '../components/trainee/TraineeDashboard';

interface LedgerData {
  trainee: {
    id: string;
    fullName: string;
    email: string;
    rollNumber: string;
    telegramChatId: string;
    admissionStatus: string;
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
  payments: Array<{
    _id: string;
    amountPaid: number;
    programName: string;
    levelNumber: number;
    status: string;
    dueDate: string;
    paidDate: string;
    slipUrl: string;
    rejectionReason?: string;
    receiptNumber?: string;
  }>;
}

export default function TraineeDashboard() {
  const navigate = useNavigate();
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ledger');
  
  // Telegram State
  const [telegramInput, setTelegramInput] = useState('');
  const [telegramSaving, setTelegramSaving] = useState(false);
  const [telegramMessage, setTelegramMessage] = useState('');

  // User State
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem('college_payment_user') || '{}'));
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Upload Modal State
  const [activeBlock, setActiveBlock] = useState<LedgerData['schedule'][0] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/trainees/ledger');
      setLedger(response.data);
      if (response.data.trainee.telegramChatId) {
        setTelegramInput(response.data.trainee.telegramChatId);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to fetch ledger details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setTelegramSaving(true);
      setTelegramMessage('');
      const response = await api.post('/trainees/telegram', { telegramChatId: telegramInput });
      setTelegramMessage(response.data.message);
      fetchLedger();
    } catch (err: any) {
      setTelegramMessage(err.response?.data?.error || 'Failed to save telegram ID.');
    } finally {
      setTelegramSaving(false);
    }
  };

  // Drag and drop handlers
  const [dragActive, setDragActive] = useState(false);
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
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

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !activeBlock) return;

    try {
      setUploading(true);
      setUploadError('');

      const formData = new FormData();
      formData.append('slip', selectedFile);
      formData.append('programName', ledger!.academic.programName);
      formData.append('levelNumber', String(ledger!.academic.levelNumber));
      formData.append('amountPaid', String(activeBlock.amountRequired));
      formData.append('dueDate', activeBlock.dueDate);

      await api.post('/payments/submit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Clear states and reload
      setSelectedFile(null);
      setActiveBlock(null);
      fetchLedger();
    } catch (err: any) {
      setUploadError(err.response?.data?.error || 'Failed to upload slip.');
    } finally {
      setUploading(false);
    }
  };

  if (loading && !ledger) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <RefreshCw className="animate-spin text-indigo-400 mb-4" size={40} />
        <p className="text-slate-400 font-medium">Retrieving academic and ledger profiles...</p>
      </div>
    );
  }

  const sidebarTabs = [
    { id: 'ledger', label: 'My Academic Ledger', icon: CreditCard },
    { id: 'self-service', label: 'Self-Service Module', icon: FileText },
    { id: 'settings', label: 'Notification Settings', icon: Settings }
  ];

  return (
    <ResponsiveSidebar
      user={{
        fullName: ledger?.trainee.fullName || currentUser.fullName || 'Trainee Student',
        role: 'Trainee',
        username: currentUser.username || 'trainee',
        email: ledger?.trainee.email
      }}
      tabs={sidebarTabs}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={handleLogout}
      onOpenProfile={() => setIsProfileModalOpen(true)}
    >
      {activeTab === 'ledger' ? (
        <>
          {/* Banner Alert for Overdue Balances */}
        {ledger && ledger.ledgerSummary.activeOverdueAmount > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-4"
          >
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-rose-400">Payment Block Blockade Warning</h3>
              <p className="text-sm text-slate-300 mt-1">
                You have overdue blocks totaling <span className="font-bold text-white">{ledger.ledgerSummary.activeOverdueAmount} ETB</span>. 
                Please settle these blocks immediately to avoid cumulative penalties and ensure continuous academic enrollment clearance.
              </p>
            </div>
          </motion.div>
        )}

        {/* Academic Hierarchy Profile Block */}
        {ledger && (
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-indigo-500/10 text-indigo-400 text-xs font-bold font-mono px-3 py-1 rounded-full border border-indigo-500/20">
                  {ledger.academic.programName} STREAM
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/20">
                  {ledger.trainee.admissionStatus}
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{ledger.trainee.fullName}</h2>
              <p className="text-slate-400 mt-1 max-w-xl text-sm leading-relaxed">
                {ledger.academic.departmentName} Dept ➡️ {ledger.academic.occupationName} Major (Level {ledger.academic.levelNumber}, Section {ledger.academic.sectionName})
              </p>
            </div>

            {/* Telegram chatbot binder */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 w-full md:w-96">
              <div className="flex items-center gap-2 text-indigo-400 mb-2">
                <Send size={16} />
                <h4 className="text-xs font-bold uppercase tracking-wider">Telegram Notifications</h4>
              </div>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                Receive instant receipt alerts, approval statuses, and deadline reminders.
              </p>
              
              <form onSubmit={handleSaveTelegram} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Chat ID (e.g., 582910394)"
                  value={telegramInput}
                  onChange={(e) => setTelegramInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={telegramSaving}
                  className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 text-white font-semibold px-3 rounded-xl text-xs transition shrink-0"
                >
                  {telegramSaving ? 'Saving...' : 'Link Bot'}
                </button>
              </form>
              
              {telegramMessage && (
                <p className="text-[11px] text-indigo-300 mt-2 font-medium">{telegramMessage}</p>
              )}
            </div>
          </section>
        )}

        {/* Ledger Summary Bento Cards */}
        {ledger && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Settled Payments</p>
              <h3 className="text-3xl font-extrabold tracking-tight text-emerald-400">
                {ledger.ledgerSummary.totalPaidAmount} <span className="text-xs font-semibold text-slate-400">ETB</span>
              </h3>
              <p className="text-xs text-slate-400 mt-2">Approved block transactions</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Overdue Payments</p>
              <h3 className={`text-3xl font-extrabold tracking-tight ${ledger.ledgerSummary.activeOverdueAmount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {ledger.ledgerSummary.activeOverdueAmount} <span className="text-xs font-semibold text-slate-400">ETB</span>
              </h3>
              <p className="text-xs text-slate-400 mt-2">Pending unsubmitted blocks</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Accrued Penalties</p>
              <h3 className={`text-3xl font-extrabold tracking-tight ${ledger.ledgerSummary.activePenaltyAmount > 0 ? 'text-yellow-400' : 'text-slate-400'}`}>
                {ledger.ledgerSummary.activePenaltyAmount} <span className="text-xs font-semibold text-slate-400">ETB</span>
              </h3>
              <p className="text-xs text-slate-400 mt-2">10 ETB per late day</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Stream Rate</p>
              <h3 className="text-3xl font-extrabold tracking-tight text-blue-400">
                {ledger.financialConfig.monthlyRate} <span className="text-xs font-semibold text-slate-400">ETB/mo</span>
              </h3>
              <p className="text-xs text-slate-400 mt-2">
                Upfront {ledger.financialConfig.blockMonths}-month block intervals
              </p>
            </div>
          </section>
        )}

        {/* Payment Block Schedule */}
        {ledger && (
          <section className="space-y-4">
            <h3 className="text-xl font-bold tracking-tight">Active Academic Block Schedules</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {ledger.schedule.map((block) => {
                const isApproved = block.status === 'Approved';
                const isPending = block.status === 'Pending';
                const isOverdue = block.status === 'Overdue';
                const isUnpaid = block.status === 'Unpaid';

                let statusBadge = (
                  <span className="bg-slate-800 text-slate-400 border border-slate-700/50 text-xs font-semibold px-2 py-1 rounded-md">
                    Unpaid
                  </span>
                );
                if (isApproved) {
                  statusBadge = (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-xs font-semibold px-2 py-1 rounded-md">
                      Approved
                    </span>
                  );
                } else if (isPending) {
                  statusBadge = (
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/25 text-xs font-semibold px-2 py-1 rounded-md">
                      Pending Staff Verify
                    </span>
                  );
                } else if (isOverdue) {
                  statusBadge = (
                    <span className="bg-rose-500/15 text-rose-400 border border-rose-500/25 text-xs font-semibold px-2 py-1 rounded-md animate-pulse">
                      Overdue ({block.lateDays} days)
                    </span>
                  );
                }

                return (
                  <div 
                    key={block.blockIndex}
                    className={`bg-slate-900 border ${isOverdue ? 'border-rose-500/30 bg-rose-500/[0.01]' : 'border-slate-800'} rounded-2xl p-5 flex flex-col justify-between gap-4`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        {statusBadge}
                        <p className="text-xs font-mono font-bold text-slate-400">BLOCK {block.blockIndex}</p>
                      </div>

                      <h4 className="font-bold text-base line-clamp-1">{block.title}</h4>
                      
                      <div className="space-y-1.5 mt-3 text-xs text-slate-400">
                        <p className="flex items-center gap-1.5">
                          <Calendar size={13} />
                          Deadline: {new Date(block.dueDate).toLocaleDateString()}
                        </p>
                        <p className="flex items-center gap-1.5 font-semibold text-slate-300">
                          <Landmark size={13} />
                          Required Block: {block.amountRequired} ETB
                        </p>
                        {isOverdue && (
                          <p className="text-rose-400 font-medium">
                            ⚠️ Accumulated Penalty: +{block.penaltyFee} ETB
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60">
                      {isApproved ? (
                        <div className="text-xs text-slate-400 space-y-1">
                          <p className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle size={12} />
                            Settled on: {new Date(block.paymentRecord?.paidDate!).toLocaleDateString()}
                          </p>
                          <p className="font-mono">Rcpt: {block.paymentRecord?.receiptNumber}</p>
                        </div>
                      ) : isPending ? (
                        <div className="text-xs text-amber-400 flex items-center gap-1 py-1">
                          <RefreshCw size={12} className="animate-spin" />
                          Waiting for clearance
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setUploadError('');
                            setSelectedFile(null);
                            setActiveBlock(block);
                          }}
                          className={`w-full text-center py-2 rounded-xl text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1.5 ${
                            isOverdue 
                              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/10' 
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                          }`}
                        >
                          <Upload size={13} />
                          Settle Block Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Payments Submission Trail */}
        {ledger && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
              <h3 className="font-bold text-lg">Bank Receipt Submission Log</h3>
              <p className="text-xs text-slate-400 font-mono">Total Submitted: {ledger.payments.length}</p>
            </div>
            
            {ledger.payments.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <FileText size={40} className="mx-auto mb-2 text-slate-600 animate-bounce" />
                No receipt records found in college financial trail.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 text-xs font-semibold tracking-wider border-b border-slate-800">
                      <th className="px-6 py-3">Paid Date</th>
                      <th className="px-6 py-3">Due Target</th>
                      <th className="px-6 py-3">Amount Submitted</th>
                      <th className="px-6 py-3">Academic Track</th>
                      <th className="px-6 py-3">Approval State</th>
                      <th className="px-6 py-3">Official Receipt</th>
                      <th className="px-6 py-3">Verification Review Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-sm">
                    {ledger.payments.map((p) => {
                      return (
                        <tr key={p._id} className="hover:bg-slate-800/40 transition">
                          <td className="px-6 py-4 font-mono text-xs">
                            {new Date(p.paidDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-400">
                            {new Date(p.dueDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 font-semibold">
                            {p.amountPaid} ETB
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400">
                            {p.programName} (L-{p.levelNumber})
                          </td>
                          <td className="px-6 py-4">
                            {p.status === 'Approved' ? (
                              <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25 text-xs">
                                Approved
                              </span>
                            ) : p.status === 'Rejected' ? (
                              <span className="text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/25 text-xs">
                                Rejected
                              </span>
                            ) : (
                              <span className="text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25 text-xs">
                                Pending Verification
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">
                            {p.receiptNumber ? (
                              <span className="text-indigo-400 font-bold">{p.receiptNumber}</span>
                            ) : (
                              <a 
                                href={p.slipUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-slate-400 underline hover:text-white"
                              >
                                View uploaded slip
                              </a>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400">
                            {p.status === 'Rejected' ? (
                              <span className="text-rose-300 font-medium bg-rose-950/40 p-2 rounded border border-rose-500/10 block">
                                ❌ {p.rejectionReason}
                              </span>
                            ) : (
                              'Approved slip cleared.'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </>
      ) : activeTab === 'self-service' ? (
        <TraineeSelfService />
      ) : (
        ledger && (
          <UserSettings 
            initialEnabled={ledger.trainee.telegramAlertsEnabled !== false}
            telegramChatId={ledger.trainee.telegramChatId || ''}
            onPreferenceUpdated={(enabled) => {
              setLedger((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  trainee: {
                    ...prev.trainee,
                    telegramAlertsEnabled: enabled
                  }
                };
              });
            }}
            onTelegramIdUpdated={(chatId) => {
              setLedger((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  trainee: {
                    ...prev.trainee,
                    telegramChatId: chatId
                  }
                };
              });
              setTelegramInput(chatId);
            }}
          />
        )
      )}


      {/* Attach Bank Slip Upload Modal Dialog */}
      <AnimatePresence>
        {activeBlock && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative"
            >
              {/* Close Button */}
              <button 
                onClick={() => {
                  setActiveBlock(null);
                  setSelectedFile(null);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg"
              >
                <X size={18} />
              </button>

              <div className="p-6 md:p-8 space-y-6">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-white">Settle Academic Block</h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Upload your official bank transaction receipt slip to initiate validation procedures.
                  </p>
                </div>

                {/* Block Info Display */}
                <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/60 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-500">Block Name</p>
                    <p className="font-semibold text-slate-300">{activeBlock.title}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Due Deadline</p>
                    <p className="font-semibold text-slate-300">{new Date(activeBlock.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Validation Price</p>
                    <p className="font-bold text-indigo-400">{activeBlock.amountRequired} ETB</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Program Stream</p>
                    <p className="font-semibold text-slate-300">{ledger?.academic.programName}</p>
                  </div>
                </div>

                {uploadError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold">
                    ⚠️ {uploadError}
                  </div>
                )}

                {/* Upload Form */}
                <form onSubmit={handleUploadSubmit} className="space-y-6">
                  
                  {/* File Upload Zone (Drag and Drop / Manual Selector) */}
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition ${
                      dragActive 
                        ? 'border-indigo-500 bg-indigo-500/[0.04]' 
                        : selectedFile 
                        ? 'border-emerald-500/60 bg-emerald-500/[0.01]' 
                        : 'border-slate-800 hover:border-indigo-500/50 bg-slate-950'
                    }`}
                  >
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      onChange={handleFileChange}
                      className="hidden" 
                      accept="image/*,application/pdf"
                    />

                    {selectedFile ? (
                      <div className="text-center space-y-2">
                        <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center mx-auto border border-emerald-500/30">
                          <CheckCircle size={22} />
                        </div>
                        <p className="text-sm font-semibold text-slate-200 line-clamp-1">{selectedFile.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        <p className="text-[10px] text-indigo-400 underline mt-2">Click to replace file</p>
                      </div>
                    ) : (
                      <div className="text-center space-y-3">
                        <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center mx-auto border border-indigo-500/30">
                          <Upload size={22} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Drag & drop your bank slip or <span className="text-indigo-400 font-bold">browse</span></p>
                          <p className="text-xs text-slate-500 mt-1">Accepts clear JPG, PNG images or PDF scan files (Max 5MB)</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveBlock(null);
                        setSelectedFile(null);
                      }}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white py-3 px-4 rounded-xl font-medium transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploading || !selectedFile}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 text-white py-3 px-4 rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      {uploading ? (
                        <>
                          <RefreshCw className="animate-spin" size={16} />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          Submit to Finance
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
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
                id: currentUser.id || currentUser._id,
                fullName: currentUser.fullName,
                username: currentUser.username,
                email: currentUser.email,
                role: currentUser.role,
                profilePicture: currentUser.profilePicture
              }}
              onAvatarUpdated={(newPath) => {
                const updatedUser = { ...currentUser, profilePicture: newPath };
                setCurrentUser(updatedUser);
              }}
            />
          </div>
        </div>
      )}
    </ResponsiveSidebar>
  );
}
