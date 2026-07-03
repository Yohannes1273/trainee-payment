import React, { useState, useEffect } from 'react';
import { 
  Search, SlidersHorizontal, RefreshCw, User, Hash, ShieldAlert, 
  CheckCircle, Clock, XCircle, FileDown, Copy, Check, Filter,
  Building, BookOpen, Layers
} from 'lucide-react';
import api from '../services/api';

interface TraineeRecord {
  _id: string;
  userId: string;
  fullName: string;
  email: string;
  rollNumber: string;
  level: number;
  sectionId: string;
  sectionName: string;
  programName: string;
  occupationName: string;
  departmentName: string;
  paymentStatus: 'Unpaid' | 'Pending' | 'Rejected' | 'Approved';
  admissionStatus: string;
}

export default function TraineeSearchDirectory() {
  const [trainees, setTrainees] = useState<TraineeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Search and filter criteria
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedAdmission, setSelectedAdmission] = useState('');

  // Copy-to-clipboard trace
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTrainees = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/registrar/trainees');
      setTrainees(response.data);
    } catch (err: any) {
      console.error('Error fetching trainees list:', err);
      setError(err.response?.data?.error || 'Failed to retrieve trainee records from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainees();
  }, []);

  const handleCopyRollNumber = (roll: string) => {
    navigator.clipboard.writeText(roll);
    setCopiedId(roll);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Get unique lists for filter select dropdowns
  const uniqueDepts = Array.from(new Set(trainees.map(t => t.departmentName).filter(Boolean)));
  const uniquePrograms = Array.from(new Set(trainees.map(t => t.programName).filter(Boolean)));
  const uniqueAdmissions = Array.from(new Set(trainees.map(t => t.admissionStatus).filter(Boolean)));

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDept('');
    setSelectedLevel('');
    setSelectedProgram('');
    setSelectedStatus('');
    setSelectedAdmission('');
  };

  // Export filtered list to CSV format
  const handleExportCSV = () => {
    if (filteredTrainees.length === 0) return;
    
    const headers = ['Full Name', 'Roll Number', 'Email', 'Department', 'Occupation', 'Level', 'Section', 'Program', 'Payment Status', 'Admission Status'];
    const rows = filteredTrainees.map(t => [
      t.fullName,
      t.rollNumber,
      t.email,
      t.departmentName,
      t.occupationName,
      t.level,
      t.sectionName,
      t.programName,
      t.paymentStatus,
      t.admissionStatus
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Trainees_Directory_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter application
  const filteredTrainees = trainees.filter(t => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      t.fullName.toLowerCase().includes(q) || 
      t.rollNumber.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.sectionName.toLowerCase().includes(q) ||
      t.occupationName.toLowerCase().includes(q);

    const matchesDept = !selectedDept || t.departmentName === selectedDept;
    const matchesLevel = !selectedLevel || String(t.level) === selectedLevel;
    const matchesProgram = !selectedProgram || t.programName === selectedProgram;
    const matchesStatus = !selectedStatus || t.paymentStatus === selectedStatus;
    const matchesAdmission = !selectedAdmission || t.admissionStatus === selectedAdmission;

    return matchesSearch && matchesDept && matchesLevel && matchesProgram && matchesStatus && matchesAdmission;
  });

  // Calculate live filtered statistics
  const statsTotal = filteredTrainees.length;
  const statsApproved = filteredTrainees.filter(t => t.paymentStatus === 'Approved').length;
  const statsPending = filteredTrainees.filter(t => t.paymentStatus === 'Pending').length;
  const statsUnpaid = filteredTrainees.filter(t => t.paymentStatus === 'Unpaid' || t.paymentStatus === 'Rejected').length;

  const getPaymentBadge = (status: 'Unpaid' | 'Pending' | 'Rejected' | 'Approved') => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">
            <CheckCircle size={10} />
            Approved
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">
            <Clock size={10} />
            Pending Review
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">
            <XCircle size={10} />
            Rejected Slip
          </span>
        );
      case 'Unpaid':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">
            <ShieldAlert size={10} />
            Unpaid / Blocked
          </span>
        );
    }
  };

  return (
    <div id="trainee-directory-hub-root" className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Search size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Tafari Makonnen Polytechnic College</span>
          </div>
          <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Trainee Academic &amp; Payment Records Directory</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time multi-portal lookup directory. Search and drill down trainee records by profile name, roll number, department, or payment status.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={handleResetFilters}
            className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-xl transition border border-slate-200 dark:border-slate-800"
          >
            Reset Filters
          </button>
          
          <button
            onClick={handleExportCSV}
            disabled={filteredTrainees.length === 0}
            className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 py-2 px-3.5 rounded-xl text-xs font-bold transition"
            title="Export filtered records to CSV file"
          >
            <FileDown size={14} />
            CSV Export
          </button>

          <button
            onClick={fetchTrainees}
            disabled={loading}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-3.5 rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/10"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Reload Records
          </button>
        </div>
      </div>

      {/* Dynamic Summary Stats Widget */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Total Directory Matches</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl md:text-3xl font-black text-indigo-600 dark:text-indigo-400">{statsTotal}</h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">records found</span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Compliance Approved</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400">{statsApproved}</h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">cleared</span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Pending Verification</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl md:text-3xl font-black text-amber-500 dark:text-amber-400">{statsPending}</h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">reviewing</span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Unpaid or Rejected Slips</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl md:text-3xl font-black text-rose-500 dark:text-rose-400">{statsUnpaid}</h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">blocked</span>
          </div>
        </div>
      </section>

      {/* Dynamic Multi-Criteria Search Filters */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        
        {/* Trainee Search Input */}
        <div className="space-y-1.5 col-span-1 md:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Search size={10} />
            Search Trainee Records
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Filter by student name, roll number, section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 dark:text-slate-100 transition focus:outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Department Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Building size={10} />
            Department
          </label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 transition focus:outline-none"
          >
            <option value="">All Departments</option>
            {uniqueDepts.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* Level Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Filter size={10} />
            Academic Level
          </label>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 transition focus:outline-none"
          >
            <option value="">All Levels</option>
            <option value="1">Level 1</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
            <option value="4">Level 4</option>
            <option value="5">Level 5</option>
          </select>
        </div>

        {/* Program Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Layers size={10} />
            Program Stream
          </label>
          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 transition focus:outline-none"
          >
            <option value="">All Streams</option>
            {uniquePrograms.map(prog => (
              <option key={prog} value={prog}>{prog}</option>
            ))}
          </select>
        </div>

        {/* Payment Status Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <ShieldAlert size={10} />
            Payment Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 transition focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending Review</option>
            <option value="Rejected">Rejected Slip</option>
            <option value="Unpaid">Unpaid / Blocked</option>
          </select>
        </div>

      </div>

      {/* Trainees Directory Main Ledger Table */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="animate-spin text-indigo-500" size={28} />
            <p className="text-sm font-semibold">Indexing Trainee Registry...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-500 flex flex-col items-center justify-center gap-2">
            <ShieldAlert size={28} />
            <p className="text-sm font-bold">{error}</p>
          </div>
        ) : filteredTrainees.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <User size={28} className="text-slate-300" />
            <p className="text-sm font-semibold">No trainee records match search filters.</p>
            <button onClick={handleResetFilters} className="text-xs text-indigo-600 font-bold hover:underline mt-1">Reset Search Filters</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800/80 font-bold">
                  <th className="p-4">Trainee Full Name</th>
                  <th className="p-4">Roll Identifier</th>
                  <th className="p-4">Educational Track (Pathways)</th>
                  <th className="p-4">Class Structure</th>
                  <th className="p-4">Payment Status</th>
                  <th className="p-4 text-center">Copy Identifier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300 font-medium">
                {filteredTrainees.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                    
                    {/* Full Name & Email */}
                    <td className="p-4 max-w-xs">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{t.fullName}</p>
                        <p className="text-[10px] text-slate-400 font-mono tracking-tight">{t.email || 'No email registered'}</p>
                      </div>
                    </td>

                    {/* Roll ID */}
                    <td className="p-4">
                      <span className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                        {t.rollNumber}
                      </span>
                    </td>

                    {/* Pathway Specs */}
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <p className="text-[11px] text-slate-900 dark:text-slate-100 font-bold">{t.departmentName}</p>
                        <p className="text-[10px] text-slate-400 max-w-xs truncate">{t.occupationName}</p>
                      </div>
                    </td>

                    {/* Class Levels & Section */}
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <p className="text-[11px] text-slate-800 dark:text-slate-200 font-semibold">Section {t.sectionName}</p>
                        <p className="text-[10px] text-slate-400">Level {t.level} • {t.programName}</p>
                      </div>
                    </td>

                    {/* Payment Compliance Status Badge */}
                    <td className="p-4">
                      {getPaymentBadge(t.paymentStatus)}
                    </td>

                    {/* Roll ID Clipboard Copy Action */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleCopyRollNumber(t.rollNumber)}
                        className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl transition"
                        title="Copy Roll ID to clipboard"
                      >
                        {copiedId === t.rollNumber ? (
                          <Check size={14} className="text-emerald-500" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
