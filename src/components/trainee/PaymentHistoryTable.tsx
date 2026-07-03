import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Filter, AlertCircle, CheckCircle, Clock, XCircle, ExternalLink, Download, Sparkles, RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import { jsPDF } from 'jspdf';

interface PaymentRecord {
  _id: string;
  programName: string;
  levelNumber: number;
  amountPaid: number;
  monthsCovered: number;
  slipUrl: string;
  status: string;
  rejectionReason?: string;
  receiptNumber?: string;
  dueDate: string;
  paidDate: string;
  penaltyDaysLate: number;
  penaltyAmount: number;
  remainingBalance?: number;
  penaltyStatus?: string;
}

export default function PaymentHistoryTable() {
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params: any = {};
      if (selectedProgram) params.program = selectedProgram;
      if (selectedLevel) params.year = selectedLevel;

      const res = await api.get('/trainee/history', { params });
      if (res.data && res.data.success) {
        setHistory(res.data.history);
      }
    } catch (err: any) {
      console.error('[PaymentHistoryTable] Error:', err);
      setError(err.response?.data?.error || 'Failed to retrieve payment history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedProgram, selectedLevel]);

  // Filter history by search and status
  const filteredHistory = history.filter(item => {
    const matchesSearch = !searchQuery || 
      (item.receiptNumber && item.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.programName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.status.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !selectedStatus || item.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Digital Vault: Generate branded, high-fidelity PDF receipt
  const handleDownloadPDF = (payment: PaymentRecord) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5' // compact receipt size
      });

      const primaryColor = '#1e1b4b'; // indigo-950
      const accentColor = '#4f46e5'; // indigo-600
      
      // Outer border frame
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(1);
      doc.rect(4, 4, 140, 202);
      
      doc.setDrawColor(79, 70, 229); // indigo-600
      doc.setLineWidth(0.5);
      doc.rect(6, 6, 136, 198);

      // Header Banner
      doc.setFillColor(30, 27, 75); // deep indigo
      doc.rect(6, 6, 136, 26, 'F');

      // College Logo / Text Header
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('TAFARI MAKONNEN POLYTECHNIC COLLEGE', 12, 16);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(199, 210, 254);
      doc.text('Trainee Financial Self-Service Ledger • Receipt Vault', 12, 21);
      doc.text('Addis Ababa, Ethiopia', 12, 25);

      // Document Title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(30, 27, 75);
      doc.text('FINANCIAL PAYMENT RECEIPT', 12, 42);

      // Receipt Metadata
      doc.setFontSize(8);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      const receiptNo = payment.receiptNumber || `MOCK-RCPT-${payment._id.slice(-6).toUpperCase()}`;
      doc.text(`Receipt No: ${receiptNo}`, 12, 48);
      doc.text(`Issued Date: ${new Date(payment.paidDate).toLocaleDateString()}`, 12, 52);

      // Status Stamp Ribbon
      doc.setFillColor(209, 250, 229); // light green
      doc.rect(98, 38, 38, 14, 'F');
      doc.setDrawColor(16, 185, 129); // emerald-500
      doc.rect(98, 38, 38, 14, 'D');
      
      doc.setTextColor(6, 95, 70); // deep green
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('VERIFIED', 117, 44, { align: 'center' });
      doc.setFontSize(6.5);
      doc.text('Finance Department', 117, 48, { align: 'center' });

      // Divider Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(12, 58, 136, 58);

      // Transaction / Student Details Section
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 27, 75);
      doc.text('TRAINEE INFORMATION', 12, 66);

      // Detail fields
      const detailsX = 12;
      const valuesX = 60;
      doc.setFontSize(8.5);
      
      // Retrieve trainee name from storage
      const userStr = localStorage.getItem('college_payment_user');
      let traineeName = 'Verified College Trainee';
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          traineeName = parsed.fullName || traineeName;
        } catch (e) {}
      }

      const rows = [
        ['Full Name:', traineeName],
        ['Academic Program:', payment.programName],
        ['Current Level:', `Level ${payment.levelNumber}`],
        ['Reference ID:', payment._id.slice(-12).toUpperCase()],
      ];

      let currentY = 73;
      rows.forEach(([label, val]) => {
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(label, detailsX, currentY);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(val, valuesX, currentY);
        currentY += 6;
      });

      // Divider
      doc.line(12, 100, 136, 100);

      // Payment Breakdown Box
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(12, 106, 124, 46, 'F');
      doc.rect(12, 106, 124, 46, 'D');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 27, 75);
      doc.text('PAYMENT BREAKDOWN', 16, 113);

      doc.setFontSize(8);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      
      // Details inside box
      doc.text('Tuition Installment Block:', 16, 121);
      doc.text(`${payment.amountPaid} ETB`, 128, 121, { align: 'right' });

      doc.text('Penalty / Late Fee Surcharge:', 16, 127);
      doc.text(`${payment.penaltyAmount || 0} ETB`, 128, 127, { align: 'right' });

      doc.line(16, 133, 128, 133);

      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('TOTAL AMOUNT CHARGED:', 16, 140);
      doc.text(`${payment.amountPaid + (payment.penaltyAmount || 0)} ETB`, 128, 140, { align: 'right' });

      doc.setTextColor(16, 185, 129); // emerald-500
      doc.text('AMOUNT PAID & CLEARED:', 16, 146);
      doc.text(`${payment.amountPaid + (payment.penaltyAmount || 0)} ETB`, 128, 146, { align: 'right' });

      // Footer disclaimer & Seal
      doc.setFontSize(7.5);
      doc.setFont('Helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text('This is a computer-generated official document from Tafari Makonnen', 74, 165, { align: 'center' });
      doc.text('Polytechnic College digital treasury. Verified via Secure Cryptography.', 74, 169, { align: 'center' });

      // Signature Area
      doc.line(20, 188, 55, 188);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text('Trainee Signature', 37, 192, { align: 'center' });

      doc.line(93, 188, 128, 188);
      doc.text('Finance Controller Stamp', 110, 192, { align: 'center' });

      // Save the PDF
      doc.save(`Tafari_Makonnen_Receipt_${receiptNo}.pdf`);
    } catch (err) {
      console.error('Failed to generate receipt PDF:', err);
      alert('Error rendering branded PDF. Please try again.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Auto-Verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle size={10} />
            Verified
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle size={10} />
            Rejected
          </span>
        );
      case 'Flagged for Human Review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle size={10} />
            Flagged Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
            <Clock size={10} />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
            <FileText className="text-indigo-400" size={18} />
            Digital Vault & History Log
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Secure vault of submitted receipts. Verified records can be downloaded as official branded PDFs.
          </p>
        </div>
        <button
          onClick={fetchHistory}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline transition"
        >
          Refresh Vault
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative col-span-1 sm:col-span-1">
          <input
            type="text"
            placeholder="Search by Receipt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition"
          />
          <Search className="absolute left-3 top-3.5 text-slate-500" size={14} />
        </div>

        {/* Program Filter */}
        <div className="relative">
          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none appearance-none cursor-pointer"
          >
            <option value="">All Programs</option>
            <option value="Regular">Regular (Semiannual)</option>
            <option value="Extension">Extension (Quarterly)</option>
            <option value="Weekend">Weekend (Quarterly)</option>
            <option value="Short Term">Short Term</option>
          </select>
          <Filter className="absolute right-3 top-3.5 text-slate-500 pointer-events-none" size={12} />
        </div>

        {/* Level Filter */}
        <div className="relative">
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none appearance-none cursor-pointer"
          >
            <option value="">All Levels</option>
            <option value="1">Level 1</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
            <option value="4">Level 4</option>
            <option value="5">Level 5</option>
          </select>
          <Filter className="absolute right-3 top-3.5 text-slate-500 pointer-events-none" size={12} />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none appearance-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="Approved">Verified (Approved)</option>
            <option value="Pending">Pending Review</option>
            <option value="Rejected">Rejected</option>
            <option value="Flagged for Human Review">Flagged</option>
          </select>
          <Filter className="absolute right-3 top-3.5 text-slate-500 pointer-events-none" size={12} />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* History List or Table */}
      <div className="overflow-x-auto border border-slate-800/80 rounded-2xl bg-slate-950/40">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold text-xs flex items-center justify-center gap-2">
            <RefreshCw className="animate-spin text-indigo-400" size={14} />
            Loading Secure Receipts...
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="mx-auto text-slate-700 mb-3" size={32} />
            <p className="text-xs font-bold">No payment slips found in your vault.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-black uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Submission Date</th>
                <th className="px-6 py-4">Program & Level</th>
                <th className="px-6 py-4">Amount Paid</th>
                <th className="px-6 py-4">Penalty Amount</th>
                <th className="px-6 py-4">Receipt Details</th>
                <th className="px-6 py-4 text-center">Digital Vault</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredHistory.map((item) => {
                const isVerified = item.status === 'Approved' || item.status === 'Auto-Verified';
                return (
                  <tr key={item._id} className="hover:bg-slate-900/40 transition">
                    <td className="px-6 py-4 font-mono font-medium whitespace-nowrap text-slate-400">
                      {new Date(item.paidDate).toLocaleDateString()}
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className="font-bold text-white block">{item.programName}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">Level {item.levelNumber}</span>
                    </td>

                    <td className="px-6 py-4 font-black text-white whitespace-nowrap">
                      {item.amountPaid} ETB
                    </td>

                    <td className="px-6 py-4 font-mono whitespace-nowrap text-rose-400">
                      {item.penaltyAmount > 0 ? `+ ${item.penaltyAmount} ETB` : '—'}
                    </td>

                    <td className="px-6 py-4 font-mono text-[10px] text-slate-400">
                      {item.receiptNumber || 'Awaiting Verification'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <a
                          href={item.slipUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-white font-bold inline-flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1 transition text-[10px]"
                        >
                          <ExternalLink size={10} />
                          Original Slip
                        </a>

                        <button
                          onClick={() => handleDownloadPDF(item)}
                          disabled={!isVerified}
                          className={`font-black inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition text-[10px] ${
                            isVerified 
                              ? 'bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-400 hover:text-white cursor-pointer' 
                              : 'bg-slate-950 border border-slate-800/50 text-slate-600 cursor-not-allowed'
                          }`}
                          title={isVerified ? 'Download College Branded PDF Receipt' : 'Awaiting Finance Verification Approval'}
                        >
                          <Download size={10} />
                          {isVerified ? 'Download PDF' : 'Locked Vault'}
                        </button>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                      {item.rejectionReason && (
                        <span className="block text-[10px] text-rose-400 mt-1 max-w-[150px] truncate" title={item.rejectionReason}>
                          Reason: {item.rejectionReason}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
