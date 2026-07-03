import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building, BookOpen, Layers, Users, ShieldAlert, Sparkles, 
  Send, RefreshCw, LogOut, CheckCircle, ListPlus, FileText, Landmark, X, Camera, Search
} from 'lucide-react';
import { motion } from 'motion/react';
import api from '../services/api';
import ProfileEditor, { getAvatarUrl } from '../components/ProfileEditor';
import ResponsiveSidebar from '../components/ResponsiveSidebar';
import TraineeSearchDirectory from '../components/TraineeSearchDirectory';
import AssignmentForm from '../components/AssignmentForm';
import TrainerComplianceDashboard from '../components/TrainerComplianceDashboard';

export default function StaffPortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [bootstrapMsg, setBootstrapMsg] = useState('');
  
  // Lists
  const [departments, setDepartments] = useState<any[]>([]);
  const [occupations, setOccupations] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [entryYears, setEntryYears] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [complianceData, setComplianceData] = useState<any>(null);

  // Form states
  const [deptForm, setDeptForm] = useState({ name: '', headId: '' });
  const [occForm, setOccForm] = useState({ name: '', departmentId: '' });
  const [progForm, setProgForm] = useState({ name: 'Regular', occupationId: '' });
  const [yearForm, setYearForm] = useState({ year: '', programId: '' });
  const [levelForm, setLevelForm] = useState({ levelNumber: '1', entryYearId: '' });
  const [sectionForm, setSectionForm] = useState({ name: '', levelId: '', trainerId: '' });
  
  const [trainerForm, setTrainerForm] = useState({ 
    username: '', password: '', email: '', fullName: '', departmentId: '' 
  });
  
  const [traineeForm, setTraineeForm] = useState({
    username: '', password: '', email: '', fullName: '', sectionId: '', rollNumber: '', telegramChatId: ''
  });

  const [linkForm, setLinkForm] = useState({ sectionId: '', trainerId: '' });
  const [generatedCreds, setGeneratedCreds] = useState<{username: string, password: string} | null>(null);

  const [staffUser, setStaffUser] = useState(() => JSON.parse(localStorage.getItem('college_payment_user') || '{}'));
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const fetchHierarchyLists = async () => {
    try {
      setLoading(true);
      const [deptsRes, occsRes, progsRes, yearsRes, lvlsRes, secsRes, trainersRes] = await Promise.all([
        api.get('/setup/departments'),
        api.get('/setup/occupations'),
        api.get('/setup/programs'),
        api.get('/setup/entry-years'),
        api.get('/setup/levels'),
        api.get('/setup/sections'),
        api.get('/setup/trainers')
      ]);

      setDepartments(deptsRes.data);
      setOccupations(occsRes.data);
      setPrograms(progsRes.data);
      setEntryYears(yearsRes.data);
      setLevels(lvlsRes.data);
      setSections(secsRes.data);
      setTrainers(trainersRes.data);

      if (staffUser.role === 'Trainer') {
        const compRes = await api.get('/setup/trainer-compliance');
        setComplianceData(compRes.data);
      }
    } catch (error) {
      console.error('Error loading setup data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHierarchyLists();
  }, []);

  // Registrar operations states
  const [traineesList, setTraineesList] = useState<any[]>([]);
  const [academicHistory, setAcademicHistory] = useState<any[]>([]);
  const [selectedTraineeId, setSelectedTraineeId] = useState('');
  const [promotionLevel, setPromotionLevel] = useState('');
  const [transferSectionId, setTransferSectionId] = useState('');
  const [selectedLevelIdForBalance, setSelectedLevelIdForBalance] = useState('');
  const [balancingProposal, setBalancingProposal] = useState<any>(null);
  const [botMessages, setBotMessages] = useState<any[]>([
    { sender: 'bot', text: '👋 Hello! I am the Telegram NLP Assistant. Ask me anything about payment collections. E.g., "How much did the Weekend program collect today?"' }
  ]);
  const [botQueryInput, setBotQueryInput] = useState('');
  const [botLoading, setBotLoading] = useState(false);

  const fetchOperationsData = async () => {
    if (staffUser.role !== 'Registrar') return;
    try {
      setLoading(true);
      const [traineesRes, historyRes] = await Promise.all([
        api.get('/registrar/trainees'),
        api.get('/registrar/history')
      ]);
      setTraineesList(traineesRes.data);
      setAcademicHistory(historyRes.data);
    } catch (error) {
      console.error('Error fetching operations data:', error);
    } finally {
      setLoading(false);
    }
  };
 
  // Admin Operations States
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>({ totalTrainees: 0, totalTrainers: 0, unassignedSections: 0 });
  const [selectedAdminUserId, setSelectedAdminUserId] = useState('');
  const [editingRole, setEditingRole] = useState('');
  const [editingDeptId, setEditingDeptId] = useState('');
  const [editingAssignedPrograms, setEditingAssignedPrograms] = useState<string[]>([]);

  // Cascading Selection Hierarchy states
  const [cascDeptId, setCascDeptId] = useState('');
  const [cascOccId, setCascOccId] = useState('');
  const [cascProgId, setCascProgId] = useState('');
  const [cascYearId, setCascYearId] = useState('');
  const [cascLevelId, setCascLevelId] = useState('');

  // Forms for adding inside cascading hierarchy
  const [newDeptName, setNewDeptName] = useState('');
  const [newOccName, setNewOccName] = useState('');
  const [newProgName, setNewProgName] = useState('Regular');
  const [newYearValue, setNewYearValue] = useState('');
  const [newLevelNumber, setNewLevelNumber] = useState('1');
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionMaxCapacity, setNewSectionMaxCapacity] = useState('30');
  const [newSectionTrainerId, setNewSectionTrainerId] = useState('');

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [usersRes, statsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/stats')
      ]);
      setAdminUsers(usersRes.data);
      setAdminStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching admin operations data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'operations') {
      fetchOperationsData();
    } else if (activeTab === 'admin_control') {
      fetchAdminData();
      fetchHierarchyLists();
    }
  }, [activeTab]);

  const handlePromoteStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTraineeId || !promotionLevel) {
      alert('Please choose a student and enter the new promotion level.');
      return;
    }
    try {
      setLoading(true);
      const res = await api.post(`/registrar/promote/${selectedTraineeId}`, {
        newLevel: parseInt(promotionLevel, 10)
      });
      alert(res.data.message || 'Student promoted successfully!');
      setPromotionLevel('');
      setSelectedTraineeId('');
      fetchOperationsData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Promotion failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTraineeId || !transferSectionId) {
      alert('Please choose a student and select the target transfer section.');
      return;
    }
    try {
      setLoading(true);
      const res = await api.post(`/registrar/transfer/${selectedTraineeId}`, {
        newSectionId: transferSectionId
      });
      alert(res.data.message || 'Student transferred successfully!');
      setTransferSectionId('');
      setSelectedTraineeId('');
      fetchOperationsData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Transfer failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleProposeBalancing = async (levelId: string) => {
    if (!levelId) {
      setBalancingProposal(null);
      return;
    }
    try {
      setLoading(true);
      const res = await api.get(`/registrar/balance/propose/${levelId}`);
      setBalancingProposal(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to fetch balancing proposal.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteBalancing = async () => {
    if (!selectedLevelIdForBalance) return;
    try {
      setLoading(true);
      const res = await api.post(`/registrar/balance/auto-assign/${selectedLevelIdForBalance}`);
      alert(res.data.message || 'Balanced successfully!');
      setBalancingProposal(null);
      setSelectedLevelIdForBalance('');
      fetchOperationsData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Balancing failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendBotMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botQueryInput.trim()) return;
    
    const userMsg = botQueryInput.trim();
    setBotQueryInput('');
    setBotMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    
    try {
      setBotLoading(true);
      const res = await api.post('/bot/query', {
        messageText: userMsg,
        currentDate: "2026-07-01"
      });
      setBotMessages(prev => [...prev, { sender: 'bot', text: res.data.reply }]);
    } catch (err: any) {
      setBotMessages(prev => [...prev, { sender: 'bot', text: `Error: ${err.response?.data?.error || err.message}` }]);
    } finally {
      setBotLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const triggerBootstrap = async () => {
    try {
      setLoading(true);
      setBootstrapMsg('');
      const response = await api.post('/setup/bootstrap');
      setBootstrapMsg(response.data.message);
      fetchHierarchyLists();
    } catch (err: any) {
      setBootstrapMsg(err.response?.data?.error || 'Bootstrap failed.');
    } finally {
      setLoading(false);
    }
  };

  // Submit handlers
  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/setup/departments', deptForm);
      alert('Department created!');
      setDeptForm({ name: '', headId: '' });
      fetchHierarchyLists();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleCreateOcc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/setup/occupations', occForm);
      alert('Occupation created!');
      setOccForm({ name: '', departmentId: '' });
      fetchHierarchyLists();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleCreateProg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/setup/programs', progForm);
      alert('Program created!');
      setProgForm({ name: 'Regular', occupationId: '' });
      fetchHierarchyLists();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/setup/entry-years', yearForm);
      alert('Entry Year created!');
      setYearForm({ year: '', programId: '' });
      fetchHierarchyLists();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleCreateLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/setup/levels', {
        levelNumber: parseInt(levelForm.levelNumber, 10),
        entryYearId: levelForm.entryYearId
      });
      alert('Level created!');
      setLevelForm({ levelNumber: '1', entryYearId: '' });
      fetchHierarchyLists();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/setup/sections', sectionForm);
      alert('Section created!');
      setSectionForm({ name: '', levelId: '', trainerId: '' });
      fetchHierarchyLists();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleUpdateUserRoleAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdminUserId) {
      alert('Please select a user to update.');
      return;
    }
    try {
      setLoading(true);
      const res = await api.put(`/admin/users/${selectedAdminUserId}/role`, {
        role: editingRole,
        departmentId: editingRole === 'Department Head' ? editingDeptId : null,
        assignedPrograms: editingRole === 'Finance' ? editingAssignedPrograms : []
      });
      alert(res.data.message || 'User role updated successfully!');
      setSelectedAdminUserId('');
      setEditingRole('');
      setEditingDeptId('');
      setEditingAssignedPrograms([]);
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Role update failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDeptCascade = async (deptId: string) => {
    if (!window.confirm('Are you sure you want to delete this department? This has cascade delete protection checks on the backend.')) {
      return;
    }
    try {
      setLoading(true);
      const res = await api.delete(`/admin/departments/${deptId}`);
      alert(res.data.message || 'Department deleted.');
      fetchHierarchyLists();
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Deletion failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeptAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName) return;
    try {
      setLoading(true);
      await api.post('/admin/hierarchy/departments', { name: newDeptName });
      alert('Department created successfully!');
      setNewDeptName('');
      fetchHierarchyLists();
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Creation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOccAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOccName || !cascDeptId) return;
    try {
      setLoading(true);
      await api.post('/admin/hierarchy/occupations', { name: newOccName, departmentId: cascDeptId });
      alert('Occupation created successfully!');
      setNewOccName('');
      fetchHierarchyLists();
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Creation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProgAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgName || !cascOccId) return;
    try {
      setLoading(true);
      await api.post('/admin/hierarchy/programs', { name: newProgName, occupationId: cascOccId });
      alert('Program stream created successfully!');
      setNewProgName('Regular');
      fetchHierarchyLists();
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Creation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateYearAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYearValue || !cascProgId) return;
    try {
      setLoading(true);
      await api.post('/admin/hierarchy/years', { year: newYearValue, programId: cascProgId });
      alert('Entry Year created successfully!');
      setNewYearValue('');
      fetchHierarchyLists();
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Creation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLevelAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLevelNumber || !cascYearId) return;
    try {
      setLoading(true);
      await api.post('/admin/hierarchy/levels', { levelNumber: parseInt(newLevelNumber, 10), entryYearId: cascYearId });
      alert('Level created successfully!');
      setNewLevelNumber('1');
      fetchHierarchyLists();
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Creation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSectionAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName || !cascLevelId) return;
    try {
      setLoading(true);
      await api.post('/admin/hierarchy/sections', {
        name: newSectionName,
        levelId: cascLevelId,
        maxCapacity: parseInt(newSectionMaxCapacity, 10) || 30,
        trainerId: newSectionTrainerId || null
      });
      alert('Section created successfully!');
      setNewSectionName('');
      setNewSectionMaxCapacity('30');
      setNewSectionTrainerId('');
      fetchHierarchyLists();
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Creation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/setup/register-trainer', trainerForm);
      alert('Trainer registered successfully into college HR database!');
      setTrainerForm({ username: '', password: '', email: '', fullName: '', departmentId: '' });
      fetchHierarchyLists();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Trainer registration failed');
    }
  };

  const handleRegisterTrainee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setGeneratedCreds(null);
      const res = await api.post('/setup/register-trainee', {
        fullName: traineeForm.fullName,
        email: traineeForm.email,
        sectionId: traineeForm.sectionId,
        rollNumber: traineeForm.rollNumber,
        telegramChatId: traineeForm.telegramChatId
      });

      setGeneratedCreds({
        username: res.data.username,
        password: res.data.defaultPassword || '123'
      });

      alert('Trainee registered & enrolled successfully!');
      setTraineeForm({
        username: '', password: '', email: '', fullName: '', sectionId: '', rollNumber: '', telegramChatId: ''
      });
      fetchHierarchyLists();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Trainee registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/setup/assign-trainer', linkForm);
      alert('Trainer linked to Target Section successfully!');
      setLinkForm({ sectionId: '', trainerId: '' });
      fetchHierarchyLists();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Trainer assignment failed');
    }
  };

  const getSidebarTabs = () => {
    const list = [
      { id: 'overview', label: 'Academic Overview', icon: BookOpen }
    ];

    if (staffUser.role === 'HR' || staffUser.role === 'Registrar') {
      list.push({ id: 'admin_control', label: 'Admin Control', icon: Sparkles });
    }

    if (staffUser.role === 'Registrar') {
      list.push({ id: 'master', label: 'Pipeline Hierarchy', icon: Layers });
      list.push({ id: 'trainees', label: 'Enroll Trainees', icon: Users });
      list.push({ id: 'operations', label: 'Operations', icon: FileText });
    }

    if (staffUser.role === 'HR') {
      list.push({ id: 'hr', label: 'Register Faculty', icon: Users });
    }

    if (staffUser.role === 'Department Head') {
      list.push({ id: 'dept', label: 'Assign Sections', icon: Landmark });
    }

    if (staffUser.role === 'Trainer') {
      list.push({ id: 'trainer', label: 'Section Compliance', icon: CheckCircle });
    }

    // Add Trainees Directory for all staff lookup operations
    list.push({ id: 'trainee_search', label: 'Trainees Directory', icon: Search });

    return list;
  };

  return (
    <ResponsiveSidebar
      user={{
        fullName: staffUser.fullName || 'Staff User',
        role: staffUser.role || 'Staff',
        username: staffUser.username || 'staff',
        email: staffUser.email
      }}
      tabs={getSidebarTabs()}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={handleLogout}
      onOpenProfile={() => setIsProfileModalOpen(true)}
    >
      {/* Banner with 1-Click Bootstrap */}
      <section className="bg-gradient-to-r from-indigo-950/40 to-slate-900 dark:from-indigo-950/40 dark:to-slate-900/60 border border-indigo-500/20 rounded-3xl p-6 md:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400">
            <Sparkles size={18} />
            <h4 className="text-xs font-bold uppercase tracking-wider">Quick Setup Engine</h4>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Bootstrap Polytechnic Collegial Hierarchy</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm leading-relaxed max-w-2xl">
            Instantly wipe and re-initialize the relational database with comprehensive academic pathways, 
            assigned trainers, multiple student enrollment profiles, and active payment records.
          </p>
        </div>

        <div className="shrink-0 w-full lg:w-auto">
          <button
            onClick={triggerBootstrap}
            disabled={loading}
            className="w-full lg:w-auto bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold py-3 px-6 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Bootstrapping...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Bootstrap Collegial Data
              </>
            )}
          </button>
          {bootstrapMsg && (
            <p className="text-xs text-indigo-300 mt-2 text-center font-medium max-w-xs">{bootstrapMsg}</p>
          )}
        </div>
      </section>

      {/* Tab Content Panels */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
          
          {/* TAB: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold">Collegiate Relational Hierarchy View</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold mb-3">
                    <Building size={16} />
                    <span>Departments</span>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {departments.length === 0 ? <p className="text-xs text-slate-500">No departments configured.</p> : 
                      departments.map(d => <li key={d._id} className="p-2 bg-slate-900 rounded border border-slate-800">{d.name}</li>)
                    }
                  </ul>
                </div>

                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold mb-3">
                    <BookOpen size={16} />
                    <span>Occupations</span>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {occupations.length === 0 ? <p className="text-xs text-slate-500">No occupations configured.</p> : 
                      occupations.map(o => <li key={o._id} className="p-2 bg-slate-900 rounded border border-slate-800">{o.name}</li>)
                    }
                  </ul>
                </div>

                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold mb-3">
                    <Layers size={16} />
                    <span>Academic Sections</span>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {sections.length === 0 ? <p className="text-xs text-slate-500">No sections configured.</p> : 
                      sections.map(s => (
                        <li key={s._id} className="p-2.5 bg-slate-900 rounded border border-slate-800 flex justify-between items-center">
                          <span>Section <b>{s.name}</b></span>
                          <span className="text-xs text-indigo-400">Assigned Trainer: {trainers.find(t=>t._id===s.trainerId)?.fullName || 'None'}</span>
                        </li>
                      ))
                    }
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Global Admin Control Panel */}
          {activeTab === 'admin_control' && (
            <div className="space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                    <span className="text-amber-400">👑</span> Global Administrative Control Panel
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    System-wide master configuration hub for Academic Hierarchy and Institutional RBAC Roles.
                  </p>
                </div>
                {staffUser.role === 'HR' && (
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold font-mono px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Global Administrator Privileges
                  </span>
                )}
                {staffUser.role === 'Registrar' && (
                  <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold font-mono px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    Registrar Privileges (Hierarchy Only)
                  </span>
                )}
              </div>

              {/* 1. SYSTEM HEALTH WIDGET */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex items-center gap-5">
                  <div className="p-3.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/10">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Trainees</p>
                    <p className="text-2xl font-black text-white mt-1">{adminStats.totalTrainees}</p>
                    <p className="text-[10px] text-emerald-400 font-mono mt-0.5">Enrolled institutional accounts</p>
                  </div>
                </div>

                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex items-center gap-5">
                  <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/10">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Trainers</p>
                    <p className="text-2xl font-black text-white mt-1">{adminStats.totalTrainers}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Linked faculty educators</p>
                  </div>
                </div>

                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex items-center gap-5">
                  <div className="p-3.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/10">
                    <ShieldAlert size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Unassigned Sections</p>
                    <p className={`text-2xl font-black mt-1 ${adminStats.unassignedSections > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {adminStats.unassignedSections}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">Sections missing Trainer linking</p>
                  </div>
                </div>
              </div>

              {/* 2. ACADEMIC HIERARCHY BUILDER */}
              <div className="bg-slate-950 p-6 md:p-8 rounded-3xl border border-slate-800 space-y-8">
                <div>
                  <h4 className="text-lg font-bold text-indigo-400 flex items-center gap-2">
                    <Sparkles size={18} />
                    Cascade Academic Hierarchy Builder
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Select a tier in the cascading structure to filter children and insert relational descendants seamlessly.
                  </p>
                </div>

                {/* Path Visualizer */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="text-slate-500">Selected Path:</span>
                  <span className="bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-900/30">
                    {departments.find(d => d._id === cascDeptId)?.name || 'Select Dept'}
                  </span>
                  <span className="text-slate-600">➡️</span>
                  <span className="bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-900/30">
                    {occupations.find(o => o._id === cascOccId)?.name || 'Select Occ'}
                  </span>
                  <span className="text-slate-600">➡️</span>
                  <span className="bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-900/30">
                    {programs.find(p => p._id === cascProgId)?.name || 'Select Prog'}
                  </span>
                  <span className="text-slate-600">➡️</span>
                  <span className="bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-900/30">
                    {entryYears.find(y => y._id === cascYearId)?.year || 'Select Year'}
                  </span>
                  <span className="text-slate-600">➡️</span>
                  <span className="bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-900/30">
                    {levels.find(l => l._id === cascLevelId) ? `Level ${levels.find(l => l._id === cascLevelId)?.levelNumber}` : 'Select Level'}
                  </span>
                </div>

                {/* Grid of Cascade Selectors and Creators */}
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-5">
                  
                  {/* Tier 1: Department */}
                  <div className="space-y-3 bg-slate-900/20 p-4 rounded-2xl border border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">1. Department</span>
                    <select
                      value={cascDeptId}
                      onChange={e => {
                        setCascDeptId(e.target.value);
                        setCascOccId('');
                        setCascProgId('');
                        setCascYearId('');
                        setCascLevelId('');
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none font-medium"
                    >
                      <option value="">-- Select Department --</option>
                      {departments.map(d => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>

                    <form onSubmit={handleCreateDeptAdmin} className="space-y-2 pt-2 border-t border-slate-800">
                      <input
                        type="text" required placeholder="New Department..."
                        value={newDeptName} onChange={e => setNewDeptName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                      />
                      <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 text-[10px] rounded-lg transition">
                        ➕ Add Dept
                      </button>
                    </form>

                    {/* Department Lists with Deletion Button for HR Admin */}
                    {staffUser.role === 'HR' && departments.length > 0 && (
                      <div className="pt-2 border-t border-slate-800 space-y-1 max-h-32 overflow-y-auto">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Active Tiers (Delete Check)</span>
                        {departments.map(d => (
                          <div key={d._id} className="flex justify-between items-center text-[10px] bg-slate-950 px-1.5 py-1 rounded border border-slate-800">
                            <span className="truncate max-w-[80px] font-medium" title={d.name}>{d.name}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteDeptCascade(d._id)}
                              className="text-red-400 hover:text-red-300 font-extrabold px-1"
                              title="Delete Department with Integrity Check"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tier 2: Occupation */}
                  <div className="space-y-3 bg-slate-900/20 p-4 rounded-2xl border border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">2. Occupation</span>
                    <select
                      disabled={!cascDeptId}
                      value={cascOccId}
                      onChange={e => {
                        setCascOccId(e.target.value);
                        setCascProgId('');
                        setCascYearId('');
                        setCascLevelId('');
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                    >
                      <option value="">-- Choose Occ --</option>
                      {occupations.filter(o => o.departmentId === cascDeptId).map(o => (
                        <option key={o._id} value={o._id}>{o.name}</option>
                      ))}
                    </select>

                    <form onSubmit={handleCreateOccAdmin} className="space-y-2 pt-2 border-t border-slate-800">
                      <input
                        type="text" required disabled={!cascDeptId} placeholder="New Occupation..."
                        value={newOccName} onChange={e => setNewOccName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none disabled:opacity-40"
                      />
                      <button type="submit" disabled={!cascDeptId} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 text-[10px] rounded-lg transition disabled:opacity-40">
                        ➕ Add Occ
                      </button>
                    </form>
                  </div>

                  {/* Tier 3: Program */}
                  <div className="space-y-3 bg-slate-900/20 p-4 rounded-2xl border border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">3. Program Stream</span>
                    <select
                      disabled={!cascOccId}
                      value={cascProgId}
                      onChange={e => {
                        setCascProgId(e.target.value);
                        setCascYearId('');
                        setCascLevelId('');
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                    >
                      <option value="">-- Choose Program --</option>
                      {programs.filter(p => p.occupationId === cascOccId).map(p => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </select>

                    <form onSubmit={handleCreateProgAdmin} className="space-y-2 pt-2 border-t border-slate-800">
                      <select
                        disabled={!cascOccId}
                        value={newProgName} onChange={e => setNewProgName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-1 py-1 text-[11px] text-white focus:border-indigo-500 focus:outline-none disabled:opacity-40 font-medium"
                      >
                        <option value="Regular">Regular</option>
                        <option value="Extension">Extension</option>
                        <option value="Weekend">Weekend</option>
                        <option value="Short Term">Short Term</option>
                      </select>
                      <button type="submit" disabled={!cascOccId} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 text-[10px] rounded-lg transition disabled:opacity-40">
                        ➕ Add Program
                      </button>
                    </form>
                  </div>

                  {/* Tier 4: Entry Year */}
                  <div className="space-y-3 bg-slate-900/20 p-4 rounded-2xl border border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">4. Entry Year</span>
                    <select
                      disabled={!cascProgId}
                      value={cascYearId}
                      onChange={e => {
                        setCascYearId(e.target.value);
                        setCascLevelId('');
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                    >
                      <option value="">-- Choose Year --</option>
                      {entryYears.filter(y => y.programId === cascProgId).map(y => (
                        <option key={y._id} value={y._id}>{y.year}</option>
                      ))}
                    </select>

                    <form onSubmit={handleCreateYearAdmin} className="space-y-2 pt-2 border-t border-slate-800">
                      <input
                        type="text" required disabled={!cascProgId} placeholder="e.g. 2026..."
                        value={newYearValue} onChange={e => setNewYearValue(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none disabled:opacity-40"
                      />
                      <button type="submit" disabled={!cascProgId} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 text-[10px] rounded-lg transition disabled:opacity-40">
                        ➕ Add Year
                      </button>
                    </form>
                  </div>

                  {/* Tier 5: Level */}
                  <div className="space-y-3 bg-slate-900/20 p-4 rounded-2xl border border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">5. Level Tier</span>
                    <select
                      disabled={!cascYearId}
                      value={cascLevelId}
                      onChange={e => setCascLevelId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                    >
                      <option value="">-- Choose Level --</option>
                      {levels.filter(l => l.entryYearId === cascYearId).map(l => (
                        <option key={l._id} value={l._id}>Level {l.levelNumber}</option>
                      ))}
                    </select>

                    <form onSubmit={handleCreateLevelAdmin} className="space-y-2 pt-2 border-t border-slate-800">
                      <select
                        disabled={!cascYearId}
                        value={newLevelNumber} onChange={e => setNewLevelNumber(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-1 py-1 text-[11px] text-white focus:border-indigo-500 focus:outline-none disabled:opacity-40 font-medium"
                      >
                        <option value="1">Level 1</option>
                        <option value="2">Level 2</option>
                        <option value="3">Level 3</option>
                        <option value="4">Level 4</option>
                      </select>
                      <button type="submit" disabled={!cascYearId} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 text-[10px] rounded-lg transition disabled:opacity-40">
                        ➕ Add Level
                      </button>
                    </form>
                  </div>

                  {/* Tier 6: Section */}
                  <div className="space-y-3 bg-slate-900/20 p-4 rounded-2xl border border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">6. Class Section</span>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[10px] text-slate-400">
                      {cascLevelId ? (
                        <>
                          <span className="font-semibold block text-indigo-400 mb-1">Enrolled Classrooms:</span>
                          <ul className="space-y-1 max-h-16 overflow-y-auto font-mono">
                            {sections.filter(s => s.levelId === cascLevelId).length === 0 ? (
                              <li className="text-slate-600 italic">None</li>
                            ) : (
                              sections.filter(s => s.levelId === cascLevelId).map(s => (
                                <li key={s._id} className="truncate">
                                  • Sec {s.name} (Max {s.maxCapacity || 30})
                                </li>
                              ))
                            )}
                          </ul>
                        </>
                      ) : (
                        <span className="italic text-slate-600">Choose parent level to display classrooms</span>
                      )}
                    </div>

                    <form onSubmit={handleCreateSectionAdmin} className="space-y-2 pt-2 border-t border-slate-800">
                      <input
                        type="text" required disabled={!cascLevelId} placeholder="Section Name (A/B)..."
                        value={newSectionName} onChange={e => setNewSectionName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none disabled:opacity-40"
                      />
                      <input
                        type="number" required disabled={!cascLevelId} placeholder="Max Cap..."
                        value={newSectionMaxCapacity} onChange={e => setNewSectionMaxCapacity(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none disabled:opacity-40"
                      />
                      <select
                        disabled={!cascLevelId}
                        value={newSectionTrainerId} onChange={e => setNewSectionTrainerId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-1 py-1 text-[10px] text-white focus:border-indigo-500 focus:outline-none disabled:opacity-40 font-medium"
                      >
                        <option value="">-- Faculty Trainer --</option>
                        {trainers.map(t => (
                          <option key={t._id} value={t._id}>{t.fullName}</option>
                        ))}
                      </select>
                      <button type="submit" disabled={!cascLevelId} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 text-[10px] rounded-lg transition disabled:opacity-40">
                        ➕ Add Section
                      </button>
                    </form>
                  </div>

                </div>
              </div>

              {/* 3. ROLE-BASED ACCESS CONTROL (RBAC) & MAPPINGS */}
              {staffUser.role === 'HR' ? (
                <div className="bg-slate-950 p-6 md:p-8 rounded-3xl border border-slate-800 space-y-6">
                  <div>
                    <h4 className="text-lg font-bold text-indigo-400 flex items-center gap-2">
                      <Landmark size={18} />
                      User Authorization Roles & Settings Mappings
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Manage all system accounts, update authorization roles, link Department Heads to their physical department, and configure covered Finance program flows.
                    </p>
                  </div>

                  {/* Layout of Table and Quick-mapping editor */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* List Table of Institutional Accounts */}
                    <div className="lg:col-span-2 overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-900 text-slate-400 text-xs font-semibold tracking-wider border-b border-slate-800">
                            <th className="px-4 py-3">User Profile</th>
                            <th className="px-4 py-3">Username / Email</th>
                            <th className="px-4 py-3">Assigned Role</th>
                            <th className="px-4 py-3">Mappings & Coverage</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 text-xs">
                          {adminUsers.map(user => (
                            <tr key={user._id} className="hover:bg-slate-900/50">
                              <td className="px-4 py-3 font-bold text-white">{user.fullName}</td>
                              <td className="px-4 py-3">
                                <div className="font-mono text-slate-400">{user.username}</div>
                                <div className="text-[10px] text-slate-500">{user.email}</div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  user.role === 'HR' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                  user.role === 'Registrar' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                  user.role === 'Finance' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  user.role === 'Department Head' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
                                  'bg-slate-800 text-slate-400'
                                }`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {user.role === 'Department Head' && user.departmentId && (
                                  <span className="text-[10px] text-violet-400 font-medium">
                                    Dept: {departments.find(d => d._id === user.departmentId)?.name || 'Unknown Department'}
                                  </span>
                                )}
                                {user.role === 'Finance' && user.assignedPrograms && user.assignedPrograms.length > 0 && (
                                  <span className="text-[10px] text-emerald-400 font-mono block">
                                    Flows: {user.assignedPrograms.join(', ')}
                                  </span>
                                )}
                                {!user.departmentId && (!user.assignedPrograms || user.assignedPrograms.length === 0) && (
                                  <span className="text-[10px] text-slate-600 italic">No specific bounds (Global)</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAdminUserId(user._id);
                                    setEditingRole(user.role);
                                    setEditingDeptId(user.departmentId || '');
                                    setEditingAssignedPrograms(user.assignedPrograms || []);
                                  }}
                                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] px-2.5 py-1 rounded-md font-bold transition"
                                >
                                  Configure Role
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Editor Form Panel */}
                    <div className="bg-slate-900/30 p-5 rounded-2xl border border-slate-800 space-y-4">
                      <h5 className="text-sm font-bold text-indigo-400">Configure User Authorization Bounds</h5>
                      {selectedAdminUserId ? (
                        <form onSubmit={handleUpdateUserRoleAdmin} className="space-y-4">
                          <p className="text-xs text-slate-300">
                            Editing User: <b className="text-white font-black">{adminUsers.find(u => u._id === selectedAdminUserId)?.fullName}</b>
                          </p>

                          {/* Role Selector */}
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold uppercase block">Authorized Role</label>
                            <select
                              required
                              value={editingRole}
                              onChange={e => setEditingRole(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                            >
                              <option value="Registrar">Registrar</option>
                              <option value="HR">HR / Global Admin</option>
                              <option value="Finance">Finance</option>
                              <option value="Department Head">Department Head</option>
                              <option value="Trainer">Trainer Faculty</option>
                              <option value="Night Controller">Night Controller</option>
                              <option value="Trainee">Trainee</option>
                            </select>
                          </div>

                          {/* Dept Head Department Link */}
                          {editingRole === 'Department Head' && (
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400 font-bold uppercase block">Assign Department</label>
                              <select
                                required
                                value={editingDeptId}
                                onChange={e => setEditingDeptId(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                              >
                                <option value="">-- Choose Department --</option>
                                {departments.map(d => (
                                  <option key={d._id} value={d._id}>{d.name}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Finance Programs Multi-Select Checkboxes */}
                          {editingRole === 'Finance' && (
                            <div className="space-y-2">
                              <label className="text-[10px] text-slate-400 font-bold uppercase block">Covered Program flows</label>
                              <div className="space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                                {['Regular', 'Extension', 'Weekend', 'Short Term'].map(pName => {
                                  const isChecked = editingAssignedPrograms.includes(pName);
                                  return (
                                    <label key={pName} className="flex items-center gap-2 text-xs font-medium cursor-pointer text-slate-300 hover:text-white">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          if (isChecked) {
                                            setEditingAssignedPrograms(editingAssignedPrograms.filter(p => p !== pName));
                                          } else {
                                            setEditingAssignedPrograms([...editingAssignedPrograms, pName]);
                                          }
                                        }}
                                        className="rounded bg-slate-900 border-slate-800 text-indigo-500 focus:ring-0"
                                      />
                                      {pName} Flow
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <button
                              type="submit"
                              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-lg transition"
                            >
                              Apply Role
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedAdminUserId('')}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold py-2 px-3 rounded-lg transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <p className="text-xs text-slate-500 italic text-center py-8">
                          Select configure role on a user profile in the table to start updating permissions.
                        </p>
                      )}
                    </div>

                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/40 p-6 rounded-2xl border border-slate-850 text-xs text-slate-500">
                  ⚠️ Role-Based Access Control (RBAC) user profile edits and user-to-program mappings are exclusively restricted to <b>HR / Global Administrator</b> accounts.
                </div>
              )}
            </div>
          )}
          {activeTab === 'master' && (
            <div className="space-y-8">
              <h3 className="text-xl font-bold">Configure Master Data Pipeline</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Department Form */}
                <form onSubmit={handleCreateDept} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                  <h4 className="font-semibold text-indigo-400">1. Register Department</h4>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 block font-semibold">Department Name</label>
                    <input 
                      type="text" required placeholder="e.g., Information Technology"
                      value={deptForm.name} onChange={e=>setDeptForm({...deptForm, name: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-4 rounded-xl transition">
                    Create Department
                  </button>
                </form>

                {/* Occupation Form */}
                <form onSubmit={handleCreateOcc} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                  <h4 className="font-semibold text-indigo-400">2. Register Occupation</h4>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 block font-semibold">Occupation Name</label>
                      <input 
                        type="text" required placeholder="e.g., Web Development"
                        value={occForm.name} onChange={e=>setOccForm({...occForm, name: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 block font-semibold">Select Department</label>
                      <select 
                        required value={occForm.departmentId} onChange={e=>setOccForm({...occForm, departmentId: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Choose Department --</option>
                        {departments.map(d=><option key={d._id} value={d._id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-4 rounded-xl transition">
                    Create Occupation
                  </button>
                </form>

                {/* Program Form */}
                <form onSubmit={handleCreateProg} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                  <h4 className="font-semibold text-indigo-400">3. Register Program Stream</h4>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 block font-semibold">Program Type</label>
                      <select 
                        value={progForm.name} onChange={e=>setProgForm({...progForm, name: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="Regular">Regular (25 ETB/mo, 6-mo block)</option>
                        <option value="Extension">Extension (level-based rates, 3-mo block)</option>
                        <option value="Weekend">Weekend (level-based rates, 3-mo block)</option>
                        <option value="Short Term">Short Term (&gt;= 3500 ETB flat fee)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 block font-semibold">Select Occupation</label>
                      <select 
                        required value={progForm.occupationId} onChange={e=>setProgForm({...progForm, occupationId: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Choose Occupation --</option>
                        {occupations.map(o=><option key={o._id} value={o._id}>{o.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-4 rounded-xl transition">
                    Create Program
                  </button>
                </form>

                {/* Section Form */}
                <form onSubmit={handleCreateSection} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                  <h4 className="font-semibold text-indigo-400">4. Register Academic Section</h4>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 block font-semibold">Section Name (e.g., A, B, C)</label>
                      <input 
                        type="text" required placeholder="e.g., A"
                        value={sectionForm.name} onChange={e=>setSectionForm({...sectionForm, name: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 block font-semibold">Link Level</label>
                      <select 
                        required value={sectionForm.levelId} onChange={e=>setSectionForm({...sectionForm, levelId: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Choose Level --</option>
                        {levels.map(l=> (
                          <option key={l._id} value={l._id}>
                            Level {l.levelNumber} (ID: {l._id.substring(0,6)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-4 rounded-xl transition">
                    Create Section
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB: Registrar enroll trainees */}
          {activeTab === 'trainees' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-xl font-bold">Register & Enroll New Trainees</h3>

              {generatedCreds && (
                <div className="bg-indigo-600/15 border border-indigo-500/30 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold">
                    <Sparkles size={18} />
                    <h4>Credentials Generated Successfully!</h4>
                  </div>
                  <p className="text-xs text-slate-300">
                    Provide the following institutional credentials to the student. They will be forced to choose a personal password upon their first login.
                  </p>
                  <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase">Generated Username</p>
                      <p className="text-lg font-mono font-extrabold text-white select-all">{generatedCreds.username}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase">Temporary Password</p>
                      <p className="text-lg font-mono font-extrabold text-emerald-400 select-all">{generatedCreds.password}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setGeneratedCreds(null)}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 rounded-xl font-bold transition"
                  >
                    Close &amp; Continue
                  </button>
                </div>
              )}
              
              <form onSubmit={handleRegisterTrainee} className="bg-slate-950 p-6 md:p-8 rounded-2xl border border-slate-800 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2 bg-indigo-950/20 border border-indigo-500/10 p-4 rounded-xl text-xs text-indigo-300 leading-relaxed font-medium">
                    ✨ <b>Automated Credentials Engine Enabled</b>: Usernames and temporary passwords are now secure and dynamically auto-generated based on name characters (e.g., first 3 characters of first name + last name) to avoid collisions and protect access.
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 block font-semibold">Full Name</label>
                    <input 
                      type="text" required placeholder="e.g., Dawit Mekonnen"
                      value={traineeForm.fullName} onChange={e=>setTraineeForm({...traineeForm, fullName: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 block font-semibold">Email Address</label>
                    <input 
                      type="email" required placeholder="student@gmail.com"
                      value={traineeForm.email} onChange={e=>setTraineeForm({...traineeForm, email: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 block font-semibold">Official College Roll Number</label>
                    <input 
                      type="text" required placeholder="PT/1092/24"
                      value={traineeForm.rollNumber} onChange={e=>setTraineeForm({...traineeForm, rollNumber: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 block font-semibold">Academic Class Section Enrollment</label>
                    <select 
                      required value={traineeForm.sectionId} onChange={e=>setTraineeForm({...traineeForm, sectionId: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">-- Select Section --</option>
                      {sections.map(s=><option key={s._id} value={s._id}>Section {s.name} (L-{levels.find(l=>l._id===s.levelId)?.levelNumber})</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs text-slate-400 block font-semibold">Telegram Chat ID (Optional)</label>
                    <input 
                      type="text" placeholder="e.g. 581291039"
                      value={traineeForm.telegramChatId} onChange={e=>setTraineeForm({...traineeForm, telegramChatId: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button type="submit" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition">
                  Enroll Trainee Profile
                </button>
              </form>
            </div>
          )}

          {/* TAB: HR register trainers */}
          {activeTab === 'hr' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold">Register College Trainers Faculty</h3>
              
              <form onSubmit={handleRegisterTrainer} className="bg-slate-950 p-6 md:p-8 rounded-2xl border border-slate-800 space-y-5 max-w-xl">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 block font-semibold">Faculty Full Name</label>
                  <input 
                    type="text" required placeholder="Solomon Ayele"
                    value={trainerForm.fullName} onChange={e=>setTrainerForm({...trainerForm, fullName: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 block font-semibold">Username</label>
                    <input 
                      type="text" required placeholder="solomon.faculty"
                      value={trainerForm.username} onChange={e=>setTrainerForm({...trainerForm, username: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 block font-semibold">Password</label>
                    <input 
                      type="password" required placeholder="••••••••"
                      value={trainerForm.password} onChange={e=>setTrainerForm({...trainerForm, password: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 block font-semibold">Faculty Email</label>
                  <input 
                    type="email" required placeholder="solomon@polytech.edu"
                    value={trainerForm.email} onChange={e=>setTrainerForm({...trainerForm, email: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 block font-semibold">Primary Assigned Department</label>
                  <select 
                    required value={trainerForm.departmentId} onChange={e=>setTrainerForm({...trainerForm, departmentId: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Choose Department --</option>
                    {departments.map(d=><option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>

                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition">
                  Register Trainer User
                </button>
              </form>
            </div>
          )}

          {/* TAB: Department Head assign trainers to sections */}
          {activeTab === 'dept' && (
            <div className="space-y-6">
              <AssignmentForm 
                staffUser={staffUser}
                departments={departments}
                occupations={occupations}
                programs={programs}
                entryYears={entryYears}
                levels={levels}
                sections={sections}
                trainers={trainers}
                onSuccess={fetchHierarchyLists}
              />
            </div>
          )}

          {/* TAB: Trainer assigned section compliance lists */}
          {activeTab === 'trainer' && (
            <div className="space-y-6">
              <TrainerComplianceDashboard 
                complianceData={complianceData}
                onRefresh={fetchHierarchyLists}
              />
            </div>
          )}

          {/* TAB: Registrar Operations */}
          {activeTab === 'operations' && (
            <div className="space-y-8">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-10 h-10 bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Registrar Operations Command</h3>
                  <p className="text-xs text-slate-400">Perform academic promotions, lateral section transfers, section balancing, and Telegram bot auditing.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* COLUMN 1: Academic Progression & Section Transfers */}
                <div className="space-y-6">
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold">
                      <Users size={18} />
                      <h4>Trainee Progression & Transfers</h4>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-400 block font-semibold">Select Trainee Profile</label>
                        <select
                          value={selectedTraineeId}
                          onChange={e => {
                            setSelectedTraineeId(e.target.value);
                            setTransferSectionId('');
                            setPromotionLevel('');
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-white"
                        >
                          <option value="">-- Choose Trainee --</option>
                          {traineesList.map(t => (
                            <option key={t._id} value={t._id}>
                              {t.fullName} ({t.rollNumber}) - L{t.level}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedTraineeId && (
                        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2 text-xs">
                          <p className="font-semibold text-slate-300">Selected Trainee Academic Pathway:</p>
                          <div className="grid grid-cols-2 gap-2 text-slate-400 font-mono">
                            <div>• Roll No: <span className="text-white">{traineesList.find(t=>t._id===selectedTraineeId)?.rollNumber}</span></div>
                            <div>• Current Level: <span className="text-white">Level {traineesList.find(t=>t._id===selectedTraineeId)?.level}</span></div>
                            <div>• Current Section: <span className="text-white">Section {traineesList.find(t=>t._id===selectedTraineeId)?.sectionName}</span></div>
                            <div>• Program Stream: <span className="text-white">{traineesList.find(t=>t._id===selectedTraineeId)?.programName}</span></div>
                          </div>
                        </div>
                      )}

                      {/* Promotion Form */}
                      <form onSubmit={handlePromoteStudent} className="pt-2 border-t border-slate-800 space-y-3">
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Level Promotion</p>
                        <div className="flex gap-2">
                          <div className="grow">
                            <select
                              value={promotionLevel}
                              onChange={e => setPromotionLevel(e.target.value)}
                              disabled={!selectedTraineeId}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:opacity-50 text-white"
                            >
                              <option value="">-- Promote to Level --</option>
                              <option value="2">Level 2</option>
                              <option value="3">Level 3</option>
                              <option value="4">Level 4</option>
                            </select>
                          </div>
                          <button
                            type="submit"
                            disabled={!selectedTraineeId || !promotionLevel || loading}
                            className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold px-4 py-2 rounded-xl text-xs transition shrink-0 disabled:opacity-50"
                          >
                            Promote
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500">Note: Promotion requires all previous level payments to be fully Approved/Auto-Verified.</p>
                      </form>

                      {/* Section Transfer Form */}
                      <form onSubmit={handleTransferSection} className="pt-4 border-t border-slate-800 space-y-3">
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Lateral Section Transfer</p>
                        <div className="flex gap-2">
                          <div className="grow">
                            <select
                              value={transferSectionId}
                              onChange={e => setTransferSectionId(e.target.value)}
                              disabled={!selectedTraineeId}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:opacity-50 text-white"
                            >
                              <option value="">-- Target Section --</option>
                              {sections.map(sec => {
                                return (
                                  <option key={sec._id} value={sec._id}>
                                    Section {sec.name} (L-{levels.find(l=>l._id===sec.levelId)?.levelNumber})
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                          <button
                            type="submit"
                            disabled={!selectedTraineeId || !transferSectionId || loading}
                            className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold px-4 py-2 rounded-xl text-xs transition shrink-0 disabled:opacity-50"
                          >
                            Transfer
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: Section Balancing Service */}
                <div className="space-y-6">
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold">
                      <Layers size={18} />
                      <h4>Section Balancing Service</h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      Balance students round-robin across Sections A, B, and C if the current student enrollment exceeds the Max Capacity constant (30 students).
                    </p>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-400 block font-semibold">Select Level for Balancing Audit</label>
                        <select
                          value={selectedLevelIdForBalance}
                          onChange={e => {
                            setSelectedLevelIdForBalance(e.target.value);
                            handleProposeBalancing(e.target.value);
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none text-white"
                        >
                          <option value="">-- Choose Level --</option>
                          {levels.map(l => (
                            <option key={l._id} value={l._id}>
                              Level {l.levelNumber} (ID: {l._id.substring(0, 6)})
                            </option>
                          ))}
                        </select>
                      </div>

                      {balancingProposal && (
                        <div className="space-y-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs text-slate-400">Total Enrolled Trainees: <b className="text-white">{balancingProposal.totalTrainees}</b></p>
                              <p className="text-xs text-slate-400">Max Capacity Cap: <b className="text-white">{balancingProposal.maxCapacity}</b></p>
                            </div>
                            <div>
                              {balancingProposal.exceedsCapacity ? (
                                <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">⚠️ Capacity Exceeded</span>
                              ) : (
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-1 rounded-full">✓ Within Capacity</span>
                              )}
                            </div>
                          </div>

                          {balancingProposal.proposal && balancingProposal.proposal.length > 0 && (
                            <div className="space-y-3">
                              <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Proposed Balanced Assignments</p>
                              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                {balancingProposal.proposal.map((prop: any) => (
                                  <div key={prop.traineeId} className="bg-slate-950 p-2 rounded border border-slate-800 flex justify-between items-center text-xs">
                                    <span className="font-semibold">{prop.fullName}</span>
                                    <span className="font-mono text-slate-400">
                                      Section {prop.currentSectionName} ➔ <b className="text-emerald-400">Section {prop.proposedSectionName}</b>
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <button
                                onClick={handleExecuteBalancing}
                                disabled={loading}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition"
                              >
                                Execute One-Click Auto-Assign Balancing
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* BOT SECTION: Telegram NLP Assistant chatbot simulator */}
                <div className="lg:col-span-2 bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold">
                    <Sparkles size={18} />
                    <h4>Telegram Natural Language Bot Chat Simulator (Gemini powered)</h4>
                  </div>
                  <p className="text-xs text-slate-400">
                    Interact directly with the Gemini 3.5 Flash powered Telegram Bot NLP parser. Send free-form sentences to aggregate ledgers instantly.
                  </p>

                  <div className="bg-slate-900 rounded-xl border border-slate-800 flex flex-col h-72 overflow-hidden">
                    <div className="p-4 overflow-y-auto space-y-3 grow flex flex-col">
                      {botMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                            msg.sender === 'user'
                              ? 'bg-indigo-600 text-white self-end rounded-tr-none'
                              : 'bg-slate-950 border border-slate-800 text-slate-300 self-start rounded-tl-none whitespace-pre-wrap'
                          }`}
                        >
                          {msg.text}
                        </div>
                      ))}
                      {botLoading && (
                        <div className="bg-slate-950 border border-slate-800 text-slate-400 text-xs p-3 rounded-2xl self-start rounded-tl-none animate-pulse">
                          Bot is analyzing query, resolving relative date context (Today = 2026-07-01), aggregating payments from paymentService, and formatting a conversational reply...
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleSendBotMessage} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g., How much did the Weekend program collect today?"
                        value={botQueryInput}
                        onChange={e => setBotQueryInput(e.target.value)}
                        className="grow bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={botLoading || !botQueryInput.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                </div>

                {/* LOGS SECTION: Academic transfer & promotion history log */}
                <div className="lg:col-span-2 bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold">
                    <FileText size={18} />
                    <h4>Academic History &amp; Transfer Audit Logs</h4>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                          <th className="p-3">Date</th>
                          <th className="p-3">Student Name</th>
                          <th className="p-3">Roll Number</th>
                          <th className="p-3">Type</th>
                          <th className="p-3">Progression Details</th>
                          <th className="p-3">Registrar</th>
                          <th className="p-3">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {academicHistory.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-slate-500">No promotion or transfer logs found.</td>
                          </tr>
                        ) : (
                          academicHistory.map((h: any) => (
                            <tr key={h._id} className="hover:bg-slate-900/40">
                              <td className="p-3 font-mono">{new Date(h.dateOfTransfer).toLocaleDateString()}</td>
                              <td className="p-3 font-bold">{h.traineeName}</td>
                              <td className="p-3 font-mono">{h.rollNumber}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  h.type === 'Promotion' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {h.type}
                                </span>
                              </td>
                              <td className="p-3">
                                {h.type === 'Promotion' ? (
                                  <span>Level {h.fromLevel} ➔ <b>Level {h.toLevel}</b></span>
                                ) : (
                                  <span>Section {h.fromSectionName} ➔ <b>Section {h.toSectionName}</b> (L-{h.toLevel})</span>
                                )}
                              </td>
                              <td className="p-3 text-slate-400">{h.registrarName}</td>
                              <td className="p-3 italic max-w-xs truncate" title={h.reason}>{h.reason}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB: Trainees Directory Lookup Search */}
          {activeTab === 'trainee_search' && (
            <TraineeSearchDirectory />
          )}

        </section>

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
