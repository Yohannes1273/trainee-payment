import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, FileSpreadsheet, Lock, MessageSquare, 
  RefreshCw, LogOut, Search, Eye, AlertCircle, Sparkles, Camera, X, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../services/api';
import ReportToolbar from '../components/ReportToolbar';
import FinancialDrillDown from '../components/FinancialDrillDown';
import PaymentSearch from '../components/PaymentSearch';
import ProfileEditor, { getAvatarUrl } from '../components/ProfileEditor';
import ResponsiveSidebar from '../components/ResponsiveSidebar';
import DailyInflowStats from '../components/DailyInflowStats';
import TelegramTriggerManager from '../components/TelegramTriggerManager';


interface RoutedReceipt {
  _id: string;
  receiptNumber: string;
  paymentId: string;
  amount: number;
  routedTo: string;
  audited: boolean;
  notes: string;
  studentName: string;
  programName: string;
  levelNumber: number;
  slipUrl: string;
}

export default function NightControllerDashboard() {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<RoutedReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Inline notes input tracker: Map of receipt ID ➡️ text string
  const [inlineNotes, setInlineNotes] = useState<Record<string, string>>({});
  
  // Processing indicators
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');
  const [selectedSlipUrl, setSelectedSlipUrl] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/payments/night-queue');
      setReceipts(response.data);
      
      // Initialize inline notes with existing notes values
      const notesMap: Record<string, string> = {};
      response.data.forEach((r: RoutedReceipt) => {
        notesMap[r._id] = r.notes || '';
      });
      setInlineNotes(notesMap);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to fetch Night Controller queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleNoteChange = (receiptId: string, value: string) => {
    setInlineNotes(prev => ({
      ...prev,
      [receiptId]: value
    }));
  };

  const handleAuditFinalize = async (receiptId: string) => {
    const notesValue = inlineNotes[receiptId] || '';
    
    try {
      setProcessingId(receiptId);
      setActionSuccessMessage('');
      
      const response = await api.post(`/payments/audit/${receiptId}`, { notes: notesValue });
      
      setActionSuccessMessage(`Receipt audited and finalized successfully! Row archived.`);
      
      // Filter out of current grid with smooth fade
      setReceipts(prev => prev.filter(item => item._id !== receiptId));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to finalize audit.');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredReceipts = receipts.filter(r => 
    r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [activeUser, setActiveUser] = useState(() => JSON.parse(localStorage.getItem('college_payment_user') || '{}'));
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('queue');

  const sidebarTabs = [
    { id: 'queue', label: 'Review Queue', icon: FileSpreadsheet },
    { id: 'drilldown', label: 'Drill-Down Reports', icon: Sparkles },
    { id: 'search', label: 'Search Engine', icon: Search },
    { id: 'telegram_triggers', label: 'Telegram Alerts', icon: Bell }
  ];

  return (
    <ResponsiveSidebar
      user={{
        fullName: activeUser.fullName || 'Night Controller',
        role: activeUser.role || 'Night Controller',
        username: activeUser.username || 'nightcontroller',
        email: activeUser.email
      }}
      tabs={sidebarTabs}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={handleLogout}
      onOpenProfile={() => setIsProfileModalOpen(true)}
    >
      {activeTab === 'queue' && (
        <>
          {/* Banner Explainer */}
          <section className="bg-gradient-to-r from-violet-900/20 to-indigo-900/10 border border-violet-500/20 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-violet-400">
                <Sparkles size={18} />
                <h4 className="text-xs font-bold uppercase tracking-wider">Workflow Stream Controller</h4>
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-100">Extension & Weekend Financial Auditing</h2>
              <p className="text-slate-400 text-xs md:text-sm leading-relaxed max-w-2xl">
                This panel displays all approved Extension and Weekend receipts routed by finance staff. 
                As the Night Controller, you must verify the transactions and log finalized ledger physical serials into the system inline.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shrink-0 w-full md:w-64 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Queue Size</p>
              <h3 className="text-4xl font-black text-violet-400">{receipts.length}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Pending physical ledger verification</p>
            </div>
          </section>

          {/* Daily Revenue vs. Expected Target Sparklines */}
          <DailyInflowStats />

          {/* Action Feedbacks */}
          {actionSuccessMessage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-sm font-semibold flex justify-between items-center"
            >
              <span>🎉 {actionSuccessMessage}</span>
              <button onClick={() => setActionSuccessMessage('')} className="hover:text-white font-bold">dismiss</button>
            </motion.div>
          )}

        {/* Toolbar */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-3 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search by student name or receipt serial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none"
            />
          </div>

          <button
            onClick={fetchQueue}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 py-2.5 px-4 rounded-xl text-xs font-bold transition shrink-0"
          >
            <RefreshCw size={14} />
            Sync Auditing Ledger
          </button>
        </section>

        {/* Spreadsheet spreadsheet-style grid table */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="text-violet-400" size={18} />
              <h3 className="font-bold text-lg">Spreadsheet Financial Data-Grid</h3>
            </div>
            <span className="bg-violet-500/15 text-violet-400 border border-violet-500/20 text-xs font-mono font-bold px-3 py-1 rounded-full">
              LIVE QUEUE NODE
            </span>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <RefreshCw className="animate-spin text-violet-400 mx-auto mb-3" size={32} />
              <p className="text-slate-400 text-sm font-medium">Scanning routed streams...</p>
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              <CheckCircle size={44} className="mx-auto mb-2 text-violet-500/60 animate-bounce" />
              All routed items audited and archived. Great job!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 text-xs font-semibold tracking-wider border-b border-slate-800">
                    <th className="px-6 py-4">Receipt Serial</th>
                    <th className="px-6 py-4">Trainee Name</th>
                    <th className="px-6 py-4">Academic stream</th>
                    <th className="px-6 py-4">Settled Amount</th>
                    <th className="px-6 py-4">Payment Slip</th>
                    <th className="px-6 py-4 w-96">Auditing Notes / Physical Log References</th>
                    <th className="px-6 py-4 text-right">Commit Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm font-mono">
                  {filteredReceipts.map((r) => {
                    const notesValue = inlineNotes[r._id] || '';
                    const isProcessing = processingId === r._id;
                    
                    return (
                      <tr key={r._id} className="hover:bg-slate-800/20 transition font-mono">
                        <td className="px-6 py-4">
                          <span className="text-violet-400 font-extrabold text-sm">{r.receiptNumber}</span>
                        </td>
                        <td className="px-6 py-4 font-sans text-slate-200">
                          {r.studentName}
                        </td>
                        <td className="px-6 py-4 font-sans text-xs text-slate-400">
                          {r.programName} (L-{r.levelNumber})
                        </td>
                        <td className="px-6 py-4 font-bold text-white text-sm">
                          {r.amount} ETB
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedSlipUrl(r.slipUrl)}
                            className="bg-slate-800 hover:bg-slate-700 text-violet-400 hover:text-violet-300 py-1 px-2.5 rounded-lg text-xs font-semibold transition active:scale-95 inline-flex items-center gap-1.5 border border-slate-700/50 font-sans"
                          >
                            <Eye size={12} />
                            View Slip
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="relative flex items-center">
                            <MessageSquare size={14} className="absolute left-3 text-slate-500" />
                            <input
                              type="text"
                              placeholder="Type audit notes or physical book references..."
                              value={notesValue}
                              onChange={(e) => handleNoteChange(r._id, e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:border-violet-500 focus:outline-none font-sans"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleAuditFinalize(r._id)}
                            disabled={isProcessing}
                            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-sans py-1.5 px-3 rounded-xl text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-violet-600/10 inline-flex"
                          >
                            {isProcessing ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <CheckCircle size={12} />
                            )}
                            Finalize Row
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

      {activeTab === 'drilldown' && (
        <div className="space-y-8">
          <FinancialDrillDown />
          <ReportToolbar />
        </div>
      )}

      {activeTab === 'search' && (
        <PaymentSearch />
      )}

      {activeTab === 'telegram_triggers' && (
        <TelegramTriggerManager />
      )}

      {/* Slip Viewer Modal */}
      <AnimatePresence>
        {selectedSlipUrl && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl relative p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg font-sans">Audit Receipt Attachment</h3>
                <button 
                  onClick={() => setSelectedSlipUrl(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-lg transition text-xs font-bold font-sans"
                >
                  Close
                </button>
              </div>

              <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800/80 flex items-center justify-center p-2 min-h-[300px]">
                {selectedSlipUrl.endsWith('.pdf') ? (
                  <div className="text-center p-8 text-slate-400 font-sans">
                    <p className="font-semibold text-white">Receipt PDF Document</p>
                    <a 
                      href={selectedSlipUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-violet-400 underline hover:text-violet-300 font-bold block mt-2"
                    >
                      Open PDF in New Tab
                    </a>
                  </div>
                ) : (
                  <img 
                    src={selectedSlipUrl} 
                    alt="Bank Receipt Slip" 
                    referrerPolicy="no-referrer"
                    className="max-h-[450px] w-auto object-contain rounded-lg shadow"
                  />
                )}
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
                id: activeUser.id || activeUser._id,
                fullName: activeUser.fullName,
                username: activeUser.username,
                email: activeUser.email,
                role: activeUser.role,
                profilePicture: activeUser.profilePicture
              }}
              onAvatarUpdated={(newPath) => {
                const updatedUser = { ...activeUser, profilePicture: newPath };
                setActiveUser(updatedUser);
              }}
            />
          </div>
        </div>
      )}
    </ResponsiveSidebar>
  );
}
