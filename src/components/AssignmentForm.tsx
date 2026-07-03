import React, { useState, useEffect } from 'react';
import { 
  Landmark, Building, BookOpen, Layers, Clock, Filter, 
  UserCheck, ShieldCheck, HelpCircle, RefreshCw
} from 'lucide-react';
import api from '../services/api';

interface AssignmentFormProps {
  staffUser: any;
  departments: any[];
  occupations: any[];
  programs: any[];
  entryYears: any[];
  levels: any[];
  sections: any[];
  trainers: any[];
  onSuccess: () => void;
}

export default function AssignmentForm({
  staffUser,
  departments,
  occupations,
  programs,
  entryYears,
  levels,
  sections,
  trainers,
  onSuccess
}: AssignmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dropdown states
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedOccId, setSelectedOccId] = useState('');
  const [selectedProgId, setSelectedProgId] = useState('');
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedTrainerId, setSelectedTrainerId] = useState('');

  // Auto-Lock department logic for Department Head
  useEffect(() => {
    // Attempt to match by ID or by name
    if (staffUser?.role === 'Department Head') {
      const matchedDept = departments.find(d => 
        d.headId === staffUser.id || 
        d._id === staffUser.departmentId ||
        d.name === staffUser.department
      );
      if (matchedDept) {
        if (selectedDeptId !== matchedDept._id) {
          setSelectedDeptId(matchedDept._id);
        }
      } else if (staffUser.departmentId) {
        if (selectedDeptId !== staffUser.departmentId) {
          setSelectedDeptId(staffUser.departmentId);
        }
      }
    }
  }, [staffUser, departments, selectedDeptId]);

  // Reset cascade steps if higher level selection changes
  useEffect(() => {
    setSelectedOccId('');
    setSelectedProgId('');
    setSelectedYearId('');
    setSelectedLevelId('');
    setSelectedSectionId('');
  }, [selectedDeptId]);

  useEffect(() => {
    setSelectedProgId('');
    setSelectedYearId('');
    setSelectedLevelId('');
    setSelectedSectionId('');
  }, [selectedOccId]);

  useEffect(() => {
    setSelectedYearId('');
    setSelectedLevelId('');
    setSelectedSectionId('');
  }, [selectedProgId]);

  useEffect(() => {
    setSelectedLevelId('');
    setSelectedSectionId('');
  }, [selectedYearId]);

  useEffect(() => {
    setSelectedSectionId('');
  }, [selectedLevelId]);

  // Filter lists based on cascaded relationships
  const filteredOccupations = occupations.filter(occ => occ.departmentId === selectedDeptId);
  const filteredPrograms = programs.filter(prog => prog.occupationId === selectedOccId);
  const filteredYears = entryYears.filter(yr => yr.programId === selectedProgId);
  const filteredLevels = levels.filter(lvl => lvl.entryYearId === selectedYearId);
  const filteredSections = sections.filter(sec => sec.levelId === selectedLevelId);

  // Filter trainers to show only those belonging to the identified department
  const activeDeptDoc = departments.find(d => d._id === selectedDeptId);
  const filteredTrainers = trainers.filter(trainer => {
    if (!activeDeptDoc) return false;
    // Match by departmentId on trainer object, or trainerId included in department.trainerIds
    const isTrainerInDeptList = activeDeptDoc.trainerIds?.includes(trainer._id);
    const matchesDeptId = trainer.departmentId === selectedDeptId;
    return isTrainerInDeptList || matchesDeptId;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSectionId || !selectedTrainerId) {
      setError('Please select both class section and trainer to establish link.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');

      const res = await api.post('/setup/assign-trainer', {
        sectionId: selectedSectionId,
        trainerId: selectedTrainerId
      });

      setSuccessMsg(res.data.message || 'Trainer successfully linked to target class section!');
      setSelectedTrainerId('');
      onSuccess();
    } catch (err: any) {
      console.error('Assignment error:', err);
      setError(err.response?.data?.error || 'Failed to establish trainer-section assignment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="trainer-assignment-card" className="bg-slate-950 p-6 md:p-8 rounded-2xl border border-slate-800 space-y-6 max-w-xl">
      <div className="space-y-1.5">
        <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Landmark size={20} className="text-indigo-400" />
          TVET Faculty Assignment System
        </h4>
        <p className="text-xs text-slate-400">
          Link registered trainers to academic class sections. Relational filters cascade down to protect assignment integrity.
        </p>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl text-xs text-rose-400 font-bold">
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-xl text-xs text-emerald-400 font-bold">
          🎉 {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Step 1: Department (Locked automatically for department heads) */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Building size={11} className="text-indigo-400" />
            1. Department (Auto-Locked Context)
          </label>
          {staffUser?.role === 'Department Head' ? (
            <div className="flex items-center justify-between bg-slate-900 border border-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-bold text-indigo-400 select-none">
              <span>{departments.find(d => d._id === selectedDeptId)?.name || staffUser?.department || 'Information Technology'}</span>
              <span className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 text-[9px] uppercase px-2 py-0.5 rounded-full text-indigo-300">
                <ShieldCheck size={10} />
                Secured
              </span>
            </div>
          ) : (
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none transition"
              required
            >
              <option value="">-- Choose Department --</option>
              {departments.map(d => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Step 2: Occupation */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <BookOpen size={11} />
            2. Occupation Pathway
          </label>
          <select
            value={selectedOccId}
            onChange={(e) => setSelectedOccId(e.target.value)}
            disabled={!selectedDeptId}
            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 disabled:opacity-40 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none transition"
            required
          >
            <option value="">-- Choose Occupation --</option>
            {filteredOccupations.map(occ => (
              <option key={occ._id} value={occ._id}>{occ.name}</option>
            ))}
          </select>
        </div>

        {/* Step 3: Program Stream */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Layers size={11} />
            3. Program Stream
          </label>
          <select
            value={selectedProgId}
            onChange={(e) => setSelectedProgId(e.target.value)}
            disabled={!selectedOccId}
            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 disabled:opacity-40 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none transition"
            required
          >
            <option value="">-- Choose Program --</option>
            {filteredPrograms.map(prog => (
              <option key={prog._id} value={prog._id}>{prog.name}</option>
            ))}
          </select>
        </div>

        {/* Step 4: Entry Year */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Clock size={11} />
            4. Entry Year
          </label>
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            disabled={!selectedProgId}
            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 disabled:opacity-40 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none transition"
            required
          >
            <option value="">-- Choose Entry Year --</option>
            {filteredYears.map(yr => (
              <option key={yr._id} value={yr._id}>{yr.year}</option>
            ))}
          </select>
        </div>

        {/* Step 5: Academic Level */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Filter size={11} />
            5. Level Number
          </label>
          <select
            value={selectedLevelId}
            onChange={(e) => setSelectedLevelId(e.target.value)}
            disabled={!selectedYearId}
            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 disabled:opacity-40 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none transition"
            required
          >
            <option value="">-- Choose Level --</option>
            {filteredLevels.map(lvl => (
              <option key={lvl._id} value={lvl._id}>Level {lvl.levelNumber}</option>
            ))}
          </select>
        </div>

        {/* Step 6: Section */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <HelpCircle size={11} />
            6. Target Section
          </label>
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            disabled={!selectedLevelId}
            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 disabled:opacity-40 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none transition"
            required
          >
            <option value="">-- Choose Class Section --</option>
            {filteredSections.map(sec => (
              <option key={sec._id} value={sec._id}>Section {sec.name}</option>
            ))}
          </select>
        </div>

        <div className="border-t border-slate-800/80 my-4 pt-4"></div>

        {/* Step 7: Trainer selection (Filtered by department) */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
            <UserCheck size={11} />
            7. Department Trainer to Assign
          </label>
          <select
            value={selectedTrainerId}
            onChange={(e) => setSelectedTrainerId(e.target.value)}
            disabled={!selectedDeptId}
            className="w-full bg-slate-900 border border-indigo-950/40 focus:border-indigo-500 disabled:opacity-40 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none transition font-bold"
            required
          >
            <option value="">-- Select Faculty Trainer --</option>
            {filteredTrainers.map(t => (
              <option key={t._id} value={t._id}>{t.fullName}</option>
            ))}
          </select>
          {selectedDeptId && filteredTrainers.length === 0 && (
            <p className="text-[10px] text-amber-500 font-medium">
              ⚠️ No trainers are registered under this department yet. Please register one first.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !selectedSectionId || !selectedTrainerId}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 active:scale-95 text-white font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 mt-6 shadow-lg shadow-indigo-600/10"
        >
          {loading ? (
            <>
              <RefreshCw className="animate-spin" size={14} />
              Binding Relationship...
            </>
          ) : (
            'Establish Relational Assignment Link'
          )}
        </button>

      </form>
    </div>
  );
}
