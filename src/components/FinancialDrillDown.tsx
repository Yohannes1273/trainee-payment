import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, DollarSign, AlertTriangle, Users, 
  ChevronRight, ArrowLeft, RefreshCw, Home, ShieldAlert, Download
} from 'lucide-react';
import api from '../services/api';

interface Breadcrumb {
  name: string;
  level: string;
  id: string;
}

interface CurrentLevel {
  name: string;
  level: string;
  id: string;
  totalPaid: number;
  expectedFee: number;
  revenueGap: number;
  traineeCount: number;
}

interface BreakdownItem {
  id: string;
  name: string;
  rollNumber?: string;
  nextLevel: string;
  totalPaid: number;
  expectedFee: number;
  revenueGap: number;
  traineeCount: number;
}

export default function FinancialDrillDown() {
  const [level, setLevel] = useState<string>('root');
  const [parentId, setParentId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  const [currentLevel, setCurrentLevel] = useState<CurrentLevel | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([]);

  const fetchFinancialData = async (targetLevel: string, id: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/reports/financial', {
        params: { level: targetLevel, id }
      });
      setCurrentLevel(response.data.currentLevel);
      setBreadcrumbs(response.data.breadcrumbs);
      setBreakdown(response.data.breakdown);
      setLevel(targetLevel);
      setParentId(id);
    } catch (err: any) {
      console.error('Failed to load drill-down report:', err);
      setError(err.response?.data?.error || 'Failed to retrieve real-time financial totals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData('root', '');
  }, []);

  const handleNavigate = (targetLevel: string, id: string) => {
    fetchFinancialData(targetLevel, id);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('ETB', 'ETB ');
  };

  const getPercentPaid = () => {
    if (!currentLevel || currentLevel.expectedFee === 0) return 0;
    return Math.round((currentLevel.totalPaid / currentLevel.expectedFee) * 100);
  };

  const handleDownloadCSV = () => {
    if (breakdown.length === 0) return;

    // Build the hierarchy path text for file name and header
    const pathText = breadcrumbs.map(b => b.name).join(' > ');
    
    // Create CSV content
    const headers = [
      'Entity/Student Name',
      ...(level === 'section' ? ['Roll Number'] : []),
      'Total Paid (ETB)',
      'Expected Fee (ETB)',
      'Revenue Gap (ETB)',
      'Trainees Count'
    ];

    const rows = breakdown.map(item => {
      const escapedName = `"${item.name.replace(/"/g, '""')}"`;
      const itemRow = [
        escapedName,
        ...(level === 'section' ? [item.rollNumber || 'N/A'] : []),
        item.totalPaid,
        item.expectedFee,
        item.revenueGap,
        item.traineeCount
      ];
      return itemRow.join(',');
    });

    const csvContent = [
      `"Financial Intelligence Drill-Down Report"`,
      `"Hierarchy Trace: ${pathText.replace(/"/g, '""')}"`,
      `"Generated At: ${new Date().toLocaleString()}"`,
      `"Current Level Tier: ${level.toUpperCase()}"`,
      '',
      headers.join(','),
      ...rows
    ].join('\n');

    // Create a blob and link to download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate an audit-ready clean filename
    const safePathName = breadcrumbs.map(b => b.name.replace(/[^a-z0-9]/gi, '_')).join('_');
    link.download = `Financial_Report_${safePathName || 'Root'}_${Date.now()}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="financial-drilldown-root" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl text-slate-100">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-violet-400">
            <TrendingUp size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Financial Intelligence Engine</span>
          </div>
          <h3 className="text-xl font-black tracking-tight">Real-Time Drill-Down Revenue Tracker</h3>
          <p className="text-xs text-slate-400">
            Select nodes to traverse down Department ➡️ Occupation ➡️ Program ➡️ Entry Year ➡️ Level ➡️ Section ➡️ Trainee.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end sm:self-auto">
          <button
            onClick={handleDownloadCSV}
            disabled={loading || breakdown.length === 0}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 active:scale-95 text-white py-2 px-4 rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
          >
            <Download size={12} />
            Download Report
          </button>

          <button
            onClick={() => fetchFinancialData(level, parentId)}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 active:scale-95 text-slate-300 py-2 px-4 rounded-xl text-xs font-bold transition shrink-0"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh Core Ledger
          </button>
        </div>
      </div>

      {/* Breadcrumbs Navigation */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-950/60 border border-slate-800/80 px-4 py-2.5 rounded-2xl text-xs overflow-x-auto">
        <span className="text-slate-500 font-medium">Hierarchy Trace:</span>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={`${crumb.level}-${crumb.id}-${idx}`}>
            {idx > 0 && <ChevronRight size={14} className="text-slate-600 shrink-0" />}
            <button
              onClick={() => handleNavigate(crumb.level, crumb.id)}
              disabled={loading || (crumb.level === level && crumb.id === parentId)}
              className={`font-semibold transition shrink-0 flex items-center gap-1 ${
                crumb.level === level && crumb.id === parentId
                  ? 'text-violet-400 cursor-default'
                  : 'text-slate-400 hover:text-white active:scale-95'
              }`}
            >
              {crumb.level === 'root' && <Home size={12} className="inline mr-0.5" />}
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl text-xs font-medium flex items-center gap-2">
          <ShieldAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Paid Card */}
        <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 space-y-2 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-300">
            <DollarSign size={80} className="text-violet-500" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Collected Revenue</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-2xl font-black text-violet-400">
              {currentLevel ? formatCurrency(currentLevel.totalPaid) : '---'}
            </h4>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
              {currentLevel ? getPercentPaid() : 0}%
            </span>
            <span>of total expected fees collected</span>
          </div>
        </div>

        {/* Expected Revenue Card */}
        <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 space-y-2 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-300">
            <TrendingUp size={80} className="text-indigo-500" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expected Revenue</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-2xl font-black text-indigo-400">
              {currentLevel ? formatCurrency(currentLevel.expectedFee) : '---'}
            </h4>
          </div>
          <p className="text-[10px] text-slate-400">Target enrollment fee value</p>
        </div>

        {/* Revenue Gap Card */}
        <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 space-y-2 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-300">
            <AlertTriangle size={80} className="text-amber-500" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue Gap (Outstanding)</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-2xl font-black text-amber-500">
              {currentLevel ? formatCurrency(currentLevel.revenueGap) : '---'}
            </h4>
          </div>
          <p className="text-[10px] text-amber-500/80 font-medium">Unpaid/unapproved semester fees</p>
        </div>

        {/* Trainee Count Card */}
        <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 space-y-2 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-300">
            <Users size={80} className="text-emerald-500" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Active Trainees</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-2xl font-black text-emerald-400">
              {currentLevel ? currentLevel.traineeCount : '---'}
            </h4>
          </div>
          <p className="text-[10px] text-slate-400">Within selected node & children</p>
        </div>
      </div>

      {/* Breakdown List Section */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            {level === 'section' ? 'Students & Payment Coverage' : 'Breakdown of Child Elements'}
          </h4>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">
            {breakdown.length} items
          </span>
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <RefreshCw size={28} className="text-violet-500 animate-spin" />
            <p className="text-xs font-medium text-slate-400">Compiling multi-level financial indexes...</p>
          </div>
        ) : breakdown.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs bg-slate-950">
            No children nodes or student profiles found at this hierarchy level.
          </div>
        ) : (
          <div className="overflow-x-auto bg-slate-950">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 text-slate-400 font-bold bg-slate-900/10">
                  <th className="px-5 py-3">Node / Entity Name</th>
                  {level === 'section' && <th className="px-5 py-3">Roll Number</th>}
                  <th className="px-5 py-3 text-right">Total Paid</th>
                  <th className="px-5 py-3 text-right">Expected Fee</th>
                  <th className="px-5 py-3 text-right">Revenue Gap</th>
                  <th className="px-5 py-3 text-center">Trainees</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {breakdown.map((item) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-slate-900/40 transition group"
                  >
                    <td className="px-5 py-3.5 font-bold text-slate-200">
                      <div className="space-y-0.5">
                        <span>{item.name}</span>
                        {item.rollNumber && (
                          <span className="sm:hidden block text-[10px] text-slate-500 font-normal">
                            Roll: {item.rollNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    {level === 'section' && (
                      <td className="px-5 py-3.5 text-slate-400 font-mono">
                        {item.rollNumber || 'N/A'}
                      </td>
                    )}
                    <td className="px-5 py-3.5 text-right font-semibold text-emerald-400">
                      {formatCurrency(item.totalPaid)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-400">
                      {formatCurrency(item.expectedFee)}
                    </td>
                    <td className={`px-5 py-3.5 text-right font-semibold ${item.revenueGap > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                      {formatCurrency(item.revenueGap)}
                    </td>
                    <td className="px-5 py-3.5 text-center font-medium text-slate-400">
                      {item.traineeCount}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {item.nextLevel !== 'trainee' ? (
                        <button
                          onClick={() => handleNavigate(item.nextLevel, item.id)}
                          className="inline-flex items-center gap-1.5 bg-violet-600/10 hover:bg-violet-600 border border-violet-500/20 hover:border-violet-500 text-violet-400 hover:text-white px-3 py-1.5 rounded-xl font-bold transition active:scale-95"
                        >
                          <span>Drill Down</span>
                          <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-800 px-2.5 py-1 rounded-full">
                          Student Ledger
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Traversal Back Button (Only shown when not at root) */}
      {level !== 'root' && (
        <div className="flex justify-start">
          <button
            onClick={() => {
              if (breadcrumbs.length > 1) {
                const parentCrumb = breadcrumbs[breadcrumbs.length - 2];
                handleNavigate(parentCrumb.level, parentCrumb.id);
              } else {
                handleNavigate('root', '');
              }
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-705 border border-slate-800 px-4 py-2 rounded-xl transition"
          >
            <ArrowLeft size={14} />
            <span>Go Up One Level</span>
          </button>
        </div>
      )}

    </div>
  );
}
