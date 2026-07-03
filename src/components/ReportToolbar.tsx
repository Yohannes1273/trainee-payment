import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, Filter, RefreshCw, AlertCircle, 
  Send, History, CheckCircle, Database, Award, Layers, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../services/api';
import { jsPDF } from 'jspdf';

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
  entryYearId: string;
}

interface Section {
  _id: string;
  name: string;
  levelId: string;
  trainerId: string | null;
}

interface AggregationRow {
  departmentId: string;
  departmentName: string;
  occupationId: string;
  occupationName: string;
  programId: string;
  programName: string;
  entryYearId: string;
  entryYear: string;
  levelId: string;
  levelNumber: number;
  sectionId: string;
  sectionName: string;
  trainerId: string | null;
  trainerName: string;
  totalTrainees: number;
  activeTrainees: number;
  totalPaidAmount: number;
  paidTraineesCount: number;
  complianceRate: string;
}

interface ReportRow {
  departmentName: string;
  occupationName: string;
  programName: string;
  entryYear: string;
  levelNumber: number;
  sectionName: string;
  trainerName: string;
  traineeName: string;
  rollNumber: string;
  status: string;
  paymentId: string;
  paymentStatus: string;
  amountPaid: number;
  paidDate: string | null;
  dueDate: string | null;
  penaltyDaysLate: number;
  penaltyAmount: number;
}

interface GeneratedReport {
  header: {
    collegeName: string;
    reportTitle: string;
    generatedAt: string;
    documentClass: string;
    academicPeriod: string;
  };
  data: ReportRow[];
  filtersApplied: {
    departmentId?: string;
    occupationId?: string;
    levelId?: string;
    sectionId?: string;
  };
}

interface AuditLogEntry {
  _id: string;
  actionType: string;
  performedBy: string;
  performedByName: string;
  timestamp: string;
  details: any;
  targetUser?: string;
}

export default function ReportToolbar() {
  const [activeTab, setActiveTab] = useState<'aggregation' | 'generator' | 'audit'>('aggregation');

  // Academic Selectors State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const [selectedDept, setSelectedDept] = useState('');
  const [selectedOcc, setSelectedOcc] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  // Aggregation Summary Table Data
  const [aggregations, setAggregations] = useState<AggregationRow[]>([]);
  const [aggLoading, setAggLoading] = useState(false);

  // Generated Report Data
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // User Actions State Feedback
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [announcingSectionId, setAnnouncingSectionId] = useState<string | null>(null);

  // Load Selectors Data
  useEffect(() => {
    const loadSelectors = async () => {
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
        console.error('Error populating dropdown filters:', err);
      }
    };
    loadSelectors();
    fetchAggregation();
    fetchAuditLogs();
  }, []);

  const fetchAggregation = async () => {
    try {
      setAggLoading(true);
      const res = await api.get('/payments/aggregation-summary');
      setAggregations(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setAggLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLogsLoading(true);
      const res = await api.get('/reports/audit-logs');
      setAuditLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Filter occupations matching selected department
  const filteredOccs = occupations.filter(o => !selectedDept || o.departmentId === selectedDept);

  // Trigger Trainer Telegram Notification Workflow
  const handleAnnounceTrainer = async (sectionId: string) => {
    try {
      setAnnouncingSectionId(sectionId);
      setActionSuccess('');
      setActionError('');

      const res = await api.post('/payments/announce-trainer', { sectionId });
      setActionSuccess(res.data.message || 'Announcement sent successfully!');
      
      // Auto-refresh logs to show compliance history log
      fetchAuditLogs();
    } catch (err: any) {
      console.error(err);
      setActionError(err.response?.data?.error || 'Failed to dispatch notification over Telegram Bot.');
    } finally {
      setAnnouncingSectionId(null);
    }
  };

  // Generate Report Engine Action
  const handleGenerateReport = async () => {
    try {
      setGenLoading(true);
      setGeneratedReport(null);
      setActionSuccess('');
      setActionError('');

      const response = await api.post('/reports/generate', {
        departmentId: selectedDept || undefined,
        occupationId: selectedOcc || undefined,
        levelId: selectedLevel || undefined,
        sectionId: selectedSection || undefined
      });

      setGeneratedReport(response.data);
      setShowReportModal(true);
      fetchAuditLogs(); // Refresh logs
    } catch (err: any) {
      console.error(err);
      setActionError(err.response?.data?.error || 'Failed to generate flat audit report.');
    } finally {
      setGenLoading(false);
    }
  };

  // PDF Document Generation & Blob Streaming
  const handleDownloadPDF = () => {
    if (!generatedReport) return;

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
      });

      // Fetch dynamic names for headers
      const deptName = departments.find(d => d._id === selectedDept)?.name || 'ALL DEPARTMENTS';
      const occName = occupations.find(o => o._id === selectedOcc)?.name || 'ALL OCCUPATIONS';
      const lvlNumber = levels.find(l => l._id === selectedLevel)?.levelNumber || 'ALL LEVELS';
      const secName = sections.find(s => s._id === selectedSection)?.name || 'ALL SECTIONS';

      // 1. Render Institutional Header Block
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text(generatedReport.header.collegeName.toUpperCase(), 40, 45);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(generatedReport.header.documentClass, 40, 60);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(79, 70, 229); // indigo-600
      doc.text(generatedReport.header.reportTitle, 40, 85);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(`Generated At: ${new Date(generatedReport.header.generatedAt).toLocaleString()}`, 40, 100);
      doc.text(`Academic Period: ${generatedReport.header.academicPeriod}`, 40, 112);

      const filterText = `Academic Selectors Applied: Dept [${deptName}] | Occ [${occName}] | Level [${lvlNumber}] | Section [${secName}]`;
      doc.text(filterText, 40, 125);

      // Separator Line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(1.5);
      doc.line(40, 135, 800, 135);

      // 2. Table Header setup
      const headers = ['Student Name', 'Roll Number', 'Dept / Occupation', 'Lvl/Sec', 'Program', 'Status', 'Settled Amount', 'Verify Status'];
      const colWidths = [130, 80, 150, 60, 70, 60, 80, 80];
      const colPositions = [40];
      for (let i = 0; i < colWidths.length - 1; i++) {
        colPositions.push(colPositions[i] + colWidths[i]);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(40, 145, 760, 20, 'F');
      doc.setTextColor(51, 65, 85); // slate-700

      headers.forEach((header, idx) => {
        doc.text(header, colPositions[idx] + 5, 158);
      });

      // 3. Render Data Rows with smart Page-Breaking
      let y = 180;
      generatedReport.data.forEach((row) => {
        if (y > 530) {
          doc.addPage();
          // Redraw headers on new page
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setFillColor(241, 245, 249);
          doc.rect(40, 40, 760, 20, 'F');
          doc.setTextColor(51, 65, 85);
          headers.forEach((header, idx) => {
            doc.text(header, colPositions[idx] + 5, 53);
          });
          y = 75;
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);

        const rowDeptOcc = `${row.departmentName.substring(0, 12)} / ${row.occupationName.substring(0, 12)}`;

        doc.text(row.traineeName.substring(0, 22), colPositions[0] + 5, y);
        doc.text(row.rollNumber, colPositions[1] + 5, y);
        doc.text(rowDeptOcc, colPositions[2] + 5, y);
        doc.text(`L-${row.levelNumber} [${row.sectionName}]`, colPositions[3] + 5, y);
        doc.text(row.programName, colPositions[4] + 5, y);
        doc.text(row.status, colPositions[5] + 5, y);
        doc.text(`${row.amountPaid} ETB`, colPositions[6] + 5, y);

        // Conditional status color
        if (row.paymentStatus === 'Approved') {
          doc.setTextColor(16, 185, 129); // green
        } else if (row.paymentStatus === 'Pending') {
          doc.setTextColor(245, 158, 11); // orange
        } else {
          doc.setTextColor(239, 68, 68); // red
        }
        doc.text(row.paymentStatus, colPositions[7] + 5, y);

        // Row border
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.5);
        doc.line(40, y + 5, 800, y + 5);

        y += 18;
      });

      // 4. Client-side streaming via Blob Object (safely bypassing browser blockages)
      const blob = doc.output('blob');
      const blobURL = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.id = 'report_blob_download';
      link.href = blobURL;
      link.download = `NPC_Academic_Compliance_Report_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setActionSuccess('PDF Document streamed and downloaded successfully!');
    } catch (err: any) {
      console.error(err);
      setActionError('PDF Generation failure: ' + err.message);
    }
  };

  return (
    <div id="report-toolbar-root" className="space-y-6">
      
      {/* Tab Selectors */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-px">
        <button
          onClick={() => { setActiveTab('aggregation'); fetchAggregation(); }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'aggregation' 
              ? 'border-violet-500 text-violet-400 font-extrabold bg-violet-500/5' 
              : 'border-transparent text-slate-400 hover:text-white'
          } rounded-t-xl`}
        >
          <div className="flex items-center gap-1.5">
            <Database size={14} />
            Academic Path Aggregation
          </div>
        </button>

        <button
          onClick={() => setActiveTab('generator')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'generator' 
              ? 'border-violet-500 text-violet-400 font-extrabold bg-violet-500/5' 
              : 'border-transparent text-slate-400 hover:text-white'
          } rounded-t-xl`}
        >
          <div className="flex items-center gap-1.5">
            <FileText size={14} />
            Formal Report Engine
          </div>
        </button>

        <button
          onClick={() => { setActiveTab('audit'); fetchAuditLogs(); }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'audit' 
              ? 'border-violet-500 text-violet-400 font-extrabold bg-violet-500/5' 
              : 'border-transparent text-slate-400 hover:text-white'
          } rounded-t-xl`}
        >
          <div className="flex items-center gap-1.5">
            <History size={14} />
            Audit Ledger Trail
          </div>
        </button>
      </div>

      {/* Alerts Feed */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl flex items-center justify-between">
          <span>✔️ {actionSuccess}</span>
          <button onClick={() => setActionSuccess('')} className="underline uppercase tracking-widest text-[10px] hover:text-white pl-4">close</button>
        </div>
      )}
      {actionError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl flex items-center justify-between">
          <span>⚠️ {actionError}</span>
          <button onClick={() => setActionError('')} className="underline uppercase tracking-widest text-[10px] hover:text-white pl-4">close</button>
        </div>
      )}

      {/* Aggregation Tab */}
      {activeTab === 'aggregation' && (
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Layers size={18} className="text-violet-400" />
                Financial Path Aggregator (8-Layer Deep Traverse)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Computes totals along <b>Dept ➡️ Occ ➡️ Prog ➡️ Year ➡️ Level ➡️ Section ➡️ Student ➡️ Payments</b> paths.
              </p>
            </div>
            <button
              onClick={fetchAggregation}
              disabled={aggLoading}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs text-slate-300 font-bold py-1.5 px-3 rounded-lg border border-slate-700 transition"
            >
              <RefreshCw size={12} className={aggLoading ? 'animate-spin' : ''} />
              Re-Calculate Path
            </button>
          </div>

          <div className="overflow-x-auto">
            {aggLoading ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <RefreshCw className="animate-spin text-violet-400 mx-auto mb-2" size={24} />
                Scanning full academic pathway nodes...
              </div>
            ) : aggregations.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No active academic configurations found. Run system bootstrap to generate test paths.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <th className="px-5 py-3 font-sans">Academic Section Details</th>
                    <th className="px-4 py-3 font-sans">Trainer</th>
                    <th className="px-4 py-3 text-center">Trainees (Active)</th>
                    <th className="px-4 py-3 text-right">Approved Amount</th>
                    <th className="px-4 py-3 text-center">Compliance</th>
                    <th className="px-5 py-3 text-right font-sans">Telegram Bot Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {aggregations.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/10">
                      <td className="px-5 py-3.5">
                        <p className="font-sans font-bold text-slate-200">{row.departmentName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {row.occupationName} • Level {row.levelNumber} - Section {row.sectionName} ({row.programName})
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300 font-sans font-medium">
                        {row.trainerName}
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-300">
                        {row.totalTrainees} <span className="text-slate-500">({row.activeTrainees})</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-white">
                        {row.totalPaidAmount.toLocaleString()} ETB
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-block font-sans font-bold text-[10px] px-2 py-0.5 rounded-full ${
                          parseInt(row.complianceRate) > 75 
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                            : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                        }`}>
                          {row.complianceRate}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-sans">
                        <button
                          onClick={() => handleAnnounceTrainer(row.sectionId)}
                          disabled={announcingSectionId === row.sectionId || !row.trainerId}
                          className="bg-violet-600/15 hover:bg-violet-600 text-violet-400 hover:text-white border border-violet-500/20 disabled:opacity-50 py-1 px-2.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1.5 inline-flex"
                        >
                          {announcingSectionId === row.sectionId ? (
                            <RefreshCw size={10} className="animate-spin" />
                          ) : (
                            <Send size={10} />
                          )}
                          Direct Bot Compliance Alert
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Generator Tab */}
      {activeTab === 'generator' && (
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              <FileText size={18} className="text-violet-400" />
              Institutional Audit Report Generator
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select any level of the academic hierarchy to filter the student ledger dataset. Flattens deep trainee payments records into formal layout.
            </p>
          </div>

          {/* Selector Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800/60">
            {/* Department Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Department</label>
              <select
                value={selectedDept}
                onChange={(e) => { setSelectedDept(e.target.value); setSelectedOcc(''); }}
                className="w-full bg-slate-900 border border-slate-800 text-xs rounded-lg py-2 px-3 text-slate-200 focus:border-violet-500 focus:outline-none"
              >
                <option value="">-- ALL DEPARTMENTS --</option>
                {departments.map(d => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Occupation Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Occupation</label>
              <select
                value={selectedOcc}
                onChange={(e) => setSelectedOcc(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-xs rounded-lg py-2 px-3 text-slate-200 focus:border-violet-500 focus:outline-none"
              >
                <option value="">-- ALL OCCUPATIONS --</option>
                {filteredOccs.map(o => (
                  <option key={o._id} value={o._id}>{o.name}</option>
                ))}
              </select>
            </div>

            {/* Level Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Academic Level</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-xs rounded-lg py-2 px-3 text-slate-200 focus:border-violet-500 focus:outline-none"
              >
                <option value="">-- ALL LEVELS --</option>
                {levels.map(l => (
                  <option key={l._id} value={l._id}>Level {l.levelNumber}</option>
                ))}
              </select>
            </div>

            {/* Section Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Section</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-xs rounded-lg py-2 px-3 text-slate-200 focus:border-violet-500 focus:outline-none"
              >
                <option value="">-- ALL SECTIONS --</option>
                {sections.map(s => (
                  <option key={s._id} value={s._id}>Section {s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions Block */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleGenerateReport}
              disabled={genLoading}
              className="bg-violet-600 hover:bg-violet-500 active:scale-95 disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-violet-600/10"
            >
              {genLoading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <FileText size={14} />
              )}
              Generate Summary Report
            </button>
          </div>
        </div>
      )}

      {/* Audit Log Trail Tab */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <History size={18} className="text-violet-400" />
                Institutional Audit Log & Compliance ledger
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Real-time immutable transparency feed capturing report generation, compliance alerts, and system auditing.
              </p>
            </div>
            <button
              onClick={fetchAuditLogs}
              disabled={logsLoading}
              className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold py-1.5 px-3 rounded-lg transition"
            >
              <RefreshCw size={12} className={logsLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="p-4 max-h-[350px] overflow-y-auto space-y-3 font-mono">
            {logsLoading ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                Syncing ledger entries...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                Audit logs ledger is empty. Generate a report or trigger direct alerts to populate logs.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log._id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/60 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        log.actionType === 'Report Generated'
                          ? 'bg-blue-500/15 text-blue-400'
                          : 'bg-violet-500/15 text-violet-400'
                      }`}>
                        {log.actionType}
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="font-sans font-semibold text-slate-300">
                      Executed By: <span className="text-slate-100">{log.performedByName}</span>
                    </p>
                    {log.details && (
                      <pre className="text-[10px] text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-800 overflow-x-auto max-w-2xl">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 font-sans">
                    Ref ID: {log._id.slice(-6)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Structured Report Modal Screen */}
      <AnimatePresence>
        {showReportModal && generatedReport && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-5xl h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Document Header Panel */}
              <div className="p-6 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-md">
                    {generatedReport.header.documentClass}
                  </span>
                  <h3 className="font-bold font-sans text-slate-100 text-lg mt-2">
                    {generatedReport.header.collegeName}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {generatedReport.header.reportTitle} • {generatedReport.header.academicPeriod}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadPDF}
                    className="bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-sans py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-violet-600/10"
                  >
                    <Download size={14} />
                    Download PDF Document
                  </button>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans py-2 px-4 rounded-xl text-xs font-bold transition border border-slate-700"
                  >
                    Close Sheet
                  </button>
                </div>
              </div>

              {/* Document Content Table (Scrollable) */}
              <div className="flex-1 overflow-auto p-6 bg-slate-950 font-mono">
                {generatedReport.data.length === 0 ? (
                  <div className="p-16 text-center text-slate-500 text-xs font-sans">
                    No payment rows matched the selected academic configuration filter.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 font-sans">
                        <th className="px-4 py-2.5">Student Name</th>
                        <th className="px-4 py-2.5">Roll Number</th>
                        <th className="px-4 py-2.5">Class / Sec</th>
                        <th className="px-4 py-2.5">Program</th>
                        <th className="px-4 py-2.5">Admission</th>
                        <th className="px-4 py-2.5 text-right">Paid Amount</th>
                        <th className="px-4 py-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {generatedReport.data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/10">
                          <td className="px-4 py-3 font-sans text-slate-200 font-medium">
                            {row.traineeName}
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {row.rollNumber}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            Level {row.levelNumber} - Section {row.sectionName}
                          </td>
                          <td className="px-4 py-3 text-slate-400 font-sans">
                            {row.programName}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-sans ${
                              row.status === 'Active' 
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-white">
                            {row.amountPaid.toLocaleString()} ETB
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full font-sans text-[10px] font-bold ${
                              row.paymentStatus === 'Approved'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : row.paymentStatus === 'Pending'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {row.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Document Summary Footer Panel */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0 font-sans">
                <div>
                  Rows Compiled: <span className="text-white font-mono font-bold">{generatedReport.data.length} records</span>
                </div>
                <div>
                  National Polytechnic compliance ledger node • page 1 of 1
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
