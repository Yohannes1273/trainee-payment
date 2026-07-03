import React, { useState, useEffect } from 'react';
import { 
  Search, SlidersHorizontal, RefreshCw, Layers, 
  User, Hash, Calendar, DollarSign, CheckCircle2, 
  Clock, XCircle, AlertCircle, FileSpreadsheet,
  Copy, Check, X, ShieldCheck, FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import api from '../services/api';
import { useToast } from './Toast';

interface Department {
  _id: string;
  name: string;
}

interface Occupation {
  _id: string;
  name: string;
  departmentId: string;
}

interface Level {
  _id: string;
  levelNumber: number;
}

interface Section {
  _id: string;
  name: string;
  levelId: string;
}

interface SearchResult {
  _id: string;
  studentName: string;
  rollNumber: string;
  receiptNumber: string;
  amountPaid: number;
  programName: string;
  levelNumber: number;
  sectionName: string;
  occupationName: string;
  departmentName: string;
  status: string;
  paidDate: string;
  aiConfidence?: string;
}

export default function PaymentSearch() {
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [copiedItem, setCopiedItem] = useState(false);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCopyDetails = async (item: SearchResult) => {
    const text = `--- DIGITAL TRANSACTION RECEIPT ---
Receipt No: ${item.receiptNumber}
Student: ${item.studentName} (Roll: ${item.rollNumber})
Amount Paid: ${item.amountPaid} ETB
Program: ${item.programName} (Level ${item.levelNumber})
Department: ${item.departmentName} (Sec: ${item.sectionName})
Date: ${new Date(item.paidDate).toLocaleDateString()}
Status: ${item.status}
----------------------------------`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(true);
      toast.success('Receipt details copied to clipboard!');
      setTimeout(() => setCopiedItem(false), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard.');
    }
  };

  const handleDownloadReceiptPDF = (item: SearchResult) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });

      // 1. Header background (indigo gradient / solid representation)
      doc.setFillColor(79, 70, 229);
      doc.rect(15, 15, 118, 24, 'F');

      // 2. Header texts with elegant branding
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("TVET ACADEMIC COLLEGE", 74, 22.5, { align: 'center' });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text("OFFICIAL TRANSACTION RECEIPT", 74, 28, { align: 'center' });
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(199, 210, 254);
      doc.text("VERIFIED SECURE DIGITAL LEDGER SLIP", 74, 33, { align: 'center' });

      // 3. Receipt container card
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.rect(15, 43, 118, 108, 'FD');

      // 4. Content rows inside the card
      let y = 52;
      const drawRow = (label: string, value: string, isBoldValue = false, valueColor?: [number, number, number]) => {
        doc.setTextColor(100, 116, 139); // slate-500
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(label, 20, y);

        if (valueColor) {
          doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
        } else {
          doc.setTextColor(51, 65, 85); // slate-700
        }
        
        doc.setFont("helvetica", isBoldValue ? "bold" : "normal");
        doc.setFontSize(9);
        doc.text(value, 128, y, { align: 'right' });

        // horizontal separator line
        doc.setDrawColor(241, 245, 249); // slate-100
        doc.line(20, y + 4, 128, y + 4);
        y += 10;
      };

      // Row 1: Receipt Number
      drawRow("RECEIPT REFERENCE", item.receiptNumber, true, [79, 70, 229]);

      // Row 2: Payment Date
      drawRow("PAYMENT DATE", new Date(item.paidDate).toLocaleString());

      // Row 3: Trainee Name & Roll Number
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("TRAINEE PROFILE", 20, y);

      doc.setTextColor(51, 65, 85);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(item.studentName, 128, y, { align: 'right' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Roll: ${item.rollNumber}`, 128, y + 4.5, { align: 'right' });

      doc.setDrawColor(241, 245, 249);
      doc.line(20, y + 8, 128, y + 8);
      y += 13;

      // Row 4: Department & Section
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("ACADEMICS & DEP.", 20, y);

      doc.setTextColor(51, 65, 85);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(item.departmentName, 128, y, { align: 'right' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Sec: ${item.sectionName} | Level ${item.levelNumber}`, 128, y + 4.5, { align: 'right' });

      doc.setDrawColor(241, 245, 249);
      doc.line(20, y + 8, 128, y + 8);
      y += 13;

      // Row 5: Program
      drawRow("PROGRAM", item.programName);

      // Row 6: Status
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("STATUS", 20, y);

      const statusUpper = item.status.toUpperCase();
      let statusColor: [number, number, number] = [100, 116, 139];
      let statusBg: [number, number, number] = [241, 245, 249];
      if (statusUpper === 'PAID' || statusUpper === 'COMPLETED' || statusUpper === 'SUCCESS') {
        statusColor = [16, 185, 129];
        statusBg = [209, 250, 229];
      } else if (statusUpper === 'PENDING') {
        statusColor = [245, 158, 11];
        statusBg = [254, 243, 199];
      } else if (statusUpper === 'FAILED' || statusUpper === 'CANCELLED') {
        statusColor = [239, 68, 68];
        statusBg = [254, 226, 226];
      }

      doc.setFillColor(statusBg[0], statusBg[1], statusBg[2]);
      doc.rect(98, y - 5.5, 30, 7, 'F');
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(statusUpper, 113, y - 1, { align: 'center' });

      doc.setDrawColor(241, 245, 249);
      doc.line(20, y + 3, 128, y + 3);
      y += 9;

      // Row 7: AI Trust Index if exists, else skip
      if (item.aiConfidence) {
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("AI TRUST INDEX", 20, y);

        const isHigh = item.aiConfidence.toLowerCase() === 'high';
        doc.setTextColor(isHigh ? 16 : 245, isHigh ? 185 : 158, isHigh ? 129 : 11);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text(`${item.aiConfidence.toUpperCase()} CONFIDENCE`, 128, y, { align: 'right' });

        doc.setDrawColor(241, 245, 249);
        doc.line(20, y + 4, 128, y + 4);
        y += 9;
      }

      // Settled amount banner
      doc.setFillColor(241, 245, 249);
      doc.rect(20, y - 1, 108, 12, 'F');
      
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("SETTLED AMOUNT:", 24, y + 6.5);

      doc.setTextColor(79, 70, 229); // indigo-600
      doc.setFontSize(11);
      doc.text(`${item.amountPaid.toLocaleString()} ETB`, 124, y + 6.5, { align: 'right' });

      // 5. Barcode & Verification
      const barcodeX = 54;
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.3);
      for (let i = 0; i < 40; i++) {
        const lineX = barcodeX + i * 1.0;
        const charVal = item.receiptNumber.charCodeAt(i % item.receiptNumber.length);
        if (charVal % 3 !== 0) {
          doc.setLineWidth(charVal % 2 === 0 ? 0.6 : 0.25);
          doc.line(lineX, 161, lineX, 171);
        }
      }
      doc.setLineWidth(0.2);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(`*${item._id.toUpperCase()}*`, 74, 175, { align: 'center' });

      doc.setFontSize(7.5);
      doc.text("Thank you for your payment.", 74, 183, { align: 'center' });
      doc.text("This is an official transaction record from TVET Academic College.", 74, 187, { align: 'center' });
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(79, 70, 229);
      doc.text("AUTHENTIC DIGITAL LEDGER SIGNATURE VERIFIED", 74, 192, { align: 'center' });

      doc.save(`Receipt_${item.receiptNumber}.pdf`);
      toast.success('Professional Receipt PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate Receipt PDF.');
    }
  };

  const renderBarcode = (text: string) => {
    // Deterministic pseudo-barcode generation based on receipt text
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pattern = (hash * 997).toString().split('');
    return (
      <div className="flex items-center justify-center gap-[2px] h-10 w-full opacity-60">
        {Array.from({ length: 32 }).map((_, idx) => {
          const thickness = (idx % 3 === 0 || idx % 7 === 0) ? 'w-[3px]' : 'w-[1.5px]';
          const height = (idx % 5 === 0) ? 'h-10' : 'h-8';
          const isSpacer = idx % 11 === 0;
          return (
            <div 
              key={idx} 
              className={`${thickness} ${height} ${isSpacer ? 'bg-transparent' : 'bg-slate-500'} rounded-sm`} 
            />
          );
        })}
      </div>
    );
  };

  // Metadata options
  const [departments, setDepartments] = useState<Department[]>([]);
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  
  // Search parameters
  const [studentName, setStudentName] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedOcc, setSelectedOcc] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Debounced input states
  const [debouncedStudentName, setDebouncedStudentName] = useState('');
  const [debouncedReceiptNumber, setDebouncedReceiptNumber] = useState('');

  // Execution states
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load select option metadata on mount
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [deptRes, occRes, lvlRes, secRes] = await Promise.all([
          api.get('/setup/departments'),
          api.get('/setup/occupations'),
          api.get('/setup/levels'),
          api.get('/setup/sections')
        ]);
        setDepartments(deptRes.data);
        setOccupations(occRes.data);
        setLevels(lvlRes.data);
        setSections(secRes.data);
      } catch (err) {
        console.error('Failed to populate search selector options:', err);
      }
    };
    loadMetadata();
  }, []);

  // Debounce Student Name text field (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedStudentName(studentName);
    }, 300);
    return () => clearTimeout(timer);
  }, [studentName]);

  // Debounce Receipt Number text field (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedReceiptNumber(receiptNumber);
    }, 300);
    return () => clearTimeout(timer);
  }, [receiptNumber]);

  // Fetch search matches
  const fetchSearchResults = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/payments/search', {
        params: {
          studentName: debouncedStudentName || undefined,
          receiptNumber: debouncedReceiptNumber || undefined,
          department: selectedDept || undefined,
          occupation: selectedOcc || undefined,
          level: selectedLevel || undefined,
          section: selectedSection || undefined,
          status: selectedStatus || undefined
        }
      });
      setResults(response.data);
    } catch (err: any) {
      console.error('Payment search engine failed:', err);
      setError(err.response?.data?.error || 'Failed to fetch filtered search ledger list.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger search on filter changes
  useEffect(() => {
    fetchSearchResults();
  }, [
    debouncedStudentName,
    debouncedReceiptNumber,
    selectedDept,
    selectedOcc,
    selectedLevel,
    selectedSection,
    selectedStatus
  ]);

  // Dependent cascading filters
  const filteredOccupations = occupations.filter(o => !selectedDept || o.departmentId === selectedDept);
  
  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0
    }).format(amount).replace('ETB', 'ETB ');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">
            <CheckCircle2 size={10} />
            Approved
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase animate-pulse">
            <Clock size={10} />
            Pending
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">
            <XCircle size={10} />
            Rejected
          </span>
        );
      case 'Auto-Verified':
        return (
          <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">
            <CheckCircle2 size={10} />
            Auto-Verified
          </span>
        );
      case 'Flagged for Human Review':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">
            <AlertCircle size={10} />
            Review Flag
          </span>
        );
    }
  };

  const handleClearFilters = () => {
    setStudentName('');
    setReceiptNumber('');
    setSelectedDept('');
    setSelectedOcc('');
    setSelectedLevel('');
    setSelectedSection('');
    setSelectedStatus('');
  };

  return (
    <div id="payment-search-engine-root" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl text-slate-100">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400">
            <Search size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">TVET Smart Search Hub</span>
          </div>
          <h3 className="text-xl font-black tracking-tight">Financial Ledger Search Engine</h3>
          <p className="text-xs text-slate-400">
            Search payments by student profile, reference ID, and traverse structural hierarchy filters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearFilters}
            className="text-xs text-slate-400 hover:text-white font-semibold hover:bg-slate-800 px-3 py-1.5 rounded-xl transition"
          >
            Reset Filters
          </button>
          <button
            onClick={fetchSearchResults}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 py-1.5 px-4 rounded-xl text-xs font-bold transition shrink-0"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Re-index Search
          </button>
        </div>
      </div>

      {/* Dynamic Multi-Criteria Search Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        
        {/* Student Name */}
        <div className="space-y-1.5 col-span-1 sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <User size={10} />
            Student Name
          </label>
          <div className="relative">
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. Yohannes Gebeyehu"
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 transition focus:outline-none"
            />
            {studentName && (
              <span className="absolute right-3 top-2.5 flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            )}
          </div>
        </div>

        {/* Receipt Number */}
        <div className="space-y-1.5 col-span-1 sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Hash size={10} />
            Receipt / Ref ID
          </label>
          <div className="relative">
            <input
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder="e.g. REC-10001"
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 transition focus:outline-none"
            />
            {receiptNumber && (
              <span className="absolute right-3 top-2.5 flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            )}
          </div>
        </div>

        {/* Department Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Layers size={10} />
            Department
          </label>
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setSelectedOcc(''); // Reset children cascade
            }}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 transition focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept._id} value={dept._id}>{dept.name}</option>
            ))}
          </select>
        </div>

        {/* Occupation Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <SlidersHorizontal size={10} />
            Occupation
          </label>
          <select
            value={selectedOcc}
            onChange={(e) => setSelectedOcc(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 transition focus:outline-none"
          >
            <option value="">All Occupations</option>
            {filteredOccupations.map((occ) => (
              <option key={occ._id} value={occ._id}>{occ.name}</option>
            ))}
          </select>
        </div>

        {/* Level Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Layers size={10} />
            Level
          </label>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 transition focus:outline-none"
          >
            <option value="">All Levels</option>
            {levels.map((lvl) => (
              <option key={lvl._id} value={lvl._id}>Level {lvl.levelNumber}</option>
            ))}
          </select>
        </div>

        {/* Section Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <SlidersHorizontal size={10} />
            Section
          </label>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 transition focus:outline-none"
          >
            <option value="">All Sections</option>
            {sections.map((sec) => (
              <option key={sec._id} value={sec._id}>{sec.name}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <ShieldCheck size={10} />
            Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 transition focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Auto-Verified">Auto-Verified</option>
            <option value="Flagged for Human Review">Flagged for Human Review</option>
          </select>
        </div>

      </div>

      {/* Results Section */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileSpreadsheet size={12} className="text-indigo-400" />
            Query Index Results
          </h4>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">
            {results.length} matches
          </span>
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <RefreshCw size={28} className="text-indigo-500 animate-spin" />
            <p className="text-xs font-medium text-slate-400">Reindexing filtered ledger rows...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-xs font-medium">
            {error}
          </div>
        ) : results.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-xs">
            No payments found matching the specified filters. Try broadening your query parameters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 text-slate-400 font-bold bg-slate-900/10">
                  <th className="px-5 py-3">Receipt / ID</th>
                  <th className="px-5 py-3">Student Name</th>
                  <th className="px-5 py-3 text-right">Amount Paid</th>
                  <th className="px-5 py-3">Program & Level</th>
                  <th className="px-5 py-3">Department & Section</th>
                  <th className="px-5 py-3">Paid Date</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {results.map((item) => (
                  <tr 
                    key={item._id} 
                    className="hover:bg-slate-900/40 transition group"
                  >
                    <td className="px-5 py-3.5 font-bold text-slate-200">
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="text-left text-xs text-indigo-400 hover:text-indigo-300 hover:underline font-mono focus:outline-none cursor-pointer flex items-center gap-1"
                          title="Click to view digital receipt summary"
                        >
                          <span>{item.receiptNumber}</span>
                        </button>
                        {item.aiConfidence && (
                          <span className={`text-[9px] font-semibold uppercase ${
                            item.aiConfidence === 'high' ? 'text-emerald-500' : 'text-amber-500'
                          }`}>
                            AI: {item.aiConfidence}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-200 block">{item.studentName}</span>
                        <span className="text-[10px] text-slate-500 font-mono block">Roll: {item.rollNumber}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-violet-400">
                      {formatCurrency(item.amountPaid)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">
                      <div className="space-y-0.5">
                        <span>{item.programName}</span>
                        <span className="block text-[10px] text-slate-500 font-semibold">Level {item.levelNumber}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">
                      <div className="space-y-0.5">
                        <span className="block max-w-[150px] truncate">{item.departmentName}</span>
                        <span className="block text-[10px] text-slate-500 font-semibold">Sec: {item.sectionName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-500 shrink-0" />
                        <span>{new Date(item.paidDate).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {getStatusBadge(item.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Body: Ticket-Stub / Digital Slip design */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col"
              id="quick-view-modal"
            >
              {/* Top border decor accent */}
              <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 shrink-0" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:bg-slate-800 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>

              {/* Scrollable content container for slip */}
              <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[85vh]">
                
                {/* Header branding */}
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    <ShieldCheck size={12} />
                    Official Digital Ledger Copy
                  </div>
                  <h3 className="text-sm font-black tracking-widest text-slate-400 uppercase mt-2">
                    TVET Financial Authority
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">
                    VERIFIED SECURE SLIP
                  </p>
                </div>

                {/* Perforated divider look */}
                <div className="relative flex items-center justify-between">
                  {/* Left notch */}
                  <div className="absolute -left-10 md:-left-12 h-6 w-6 rounded-full bg-slate-950 border border-slate-800/80 z-20" />
                  <div className="w-full border-t border-dashed border-slate-800" />
                  {/* Right notch */}
                  <div className="absolute -right-10 md:-right-12 h-6 w-6 rounded-full bg-slate-950 border border-slate-800/80 z-20" />
                </div>

                {/* Transaction Main Highlight (Big Amount) */}
                <div className="text-center space-y-2 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Settled Transaction Amount
                  </span>
                  <h2 className="text-4xl font-black text-white tracking-tight">
                    {formatCurrency(selectedItem.amountPaid)}
                  </h2>
                  <div className="inline-flex items-center justify-center">
                    {getStatusBadge(selectedItem.status)}
                  </div>
                </div>

                {/* Detailed key-value card */}
                <div className="bg-slate-950 border border-slate-800/60 rounded-2xl p-5 space-y-4">
                  {/* Reference No row */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-900">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Receipt Reference</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-indigo-400 font-mono font-bold">
                        {selectedItem.receiptNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedItem.receiptNumber);
                          toast.success('Receipt reference copied to clipboard!');
                        }}
                        className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-900 transition cursor-pointer"
                        title="Copy receipt number"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Student profile row */}
                  <div className="flex items-start justify-between pb-3 border-b border-slate-900 gap-4">
                    <span className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Trainee Profile</span>
                    <div className="text-right">
                      <span className="text-xs text-slate-200 font-bold block">
                        {selectedItem.studentName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Roll: {selectedItem.rollNumber}
                      </span>
                    </div>
                  </div>

                  {/* Program / Level / Dept Info */}
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Program</span>
                      <span className="text-xs text-slate-300 font-medium block">
                        {selectedItem.programName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold block">
                        Level {selectedItem.levelNumber}
                      </span>
                    </div>

                    <div className="space-y-1 text-right">
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Academics</span>
                      <span className="text-xs text-slate-300 font-medium block truncate max-w-[150px] ml-auto">
                        {selectedItem.departmentName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold block">
                        Sec: {selectedItem.sectionName}
                      </span>
                    </div>
                  </div>

                  {/* Occupation row */}
                  <div className="pt-3 border-t border-slate-900 flex justify-between items-center text-xs">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Occupation</span>
                    <span className="text-slate-300 font-medium truncate max-w-[180px]">
                      {selectedItem.occupationName || 'N/A'}
                    </span>
                  </div>

                  {/* Date and Security Badge */}
                  <div className="pt-3 border-t border-slate-900 flex justify-between items-center text-xs">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Payment Date</span>
                    <span className="text-slate-300 font-mono">
                      {new Date(selectedItem.paidDate).toLocaleString()}
                    </span>
                  </div>

                  {/* AI verification details if applicable */}
                  {selectedItem.aiConfidence && (
                    <div className="pt-3 border-t border-slate-900 flex justify-between items-center text-xs">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">AI Trust Index</span>
                      <span className={`font-mono text-xs font-bold uppercase ${
                        selectedItem.aiConfidence === 'high' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {selectedItem.aiConfidence} Confidence
                      </span>
                    </div>
                  )}
                </div>

                {/* Perforated divider look 2 */}
                <div className="relative flex items-center justify-between">
                  {/* Left notch */}
                  <div className="absolute -left-10 md:-left-12 h-6 w-6 rounded-full bg-slate-950 border border-slate-800/80 z-20" />
                  <div className="w-full border-t border-dashed border-slate-800" />
                  {/* Right notch */}
                  <div className="absolute -right-10 md:-right-12 h-6 w-6 rounded-full bg-slate-950 border border-slate-800/80 z-20" />
                </div>

                {/* Barcode and security foot */}
                <div className="text-center space-y-3">
                  {/* Barcode representation */}
                  <div className="flex justify-center items-center py-1 bg-white/5 rounded-2xl">
                    {renderBarcode(selectedItem.receiptNumber)}
                  </div>

                  <p className="text-[8px] text-slate-500 font-mono tracking-[0.25em]">
                    *{selectedItem._id.toUpperCase()}*
                  </p>
                </div>
              </div>

              {/* Close controls */}
              <div className="p-4 bg-slate-950/40 border-t border-slate-800/60 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyDetails(selectedItem)}
                  className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold px-4 py-2.5 rounded-2xl text-xs transition flex items-center gap-2 cursor-pointer border border-slate-700/50"
                >
                  {copiedItem ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Receipt</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadReceiptPDF(selectedItem)}
                  className="bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-bold px-4 py-2.5 rounded-2xl text-xs transition flex items-center gap-2 cursor-pointer border border-violet-500/50"
                >
                  <FileDown size={14} />
                  <span>Receipt PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold px-6 py-2.5 rounded-2xl transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
