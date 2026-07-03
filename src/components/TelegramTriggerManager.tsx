import React, { useState, useEffect } from 'react';
import { 
  Send, Sparkles, ShieldAlert, Bell, ToggleLeft, ToggleRight, 
  RefreshCw, CheckCircle, Save, AlertCircle, HelpCircle, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../services/api';

interface TriggerConfig {
  enabled: boolean;
  traineeTemplate: string;
  staffTemplate: string;
}

interface TriggersMap {
  [key: string]: TriggerConfig;
}

export default function TelegramTriggerManager() {
  const [triggers, setTriggers] = useState<TriggersMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  
  // Feedback states
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);

  // Test parameters
  const [testDirectId, setTestDirectId] = useState('');
  const [testGroupId, setTestGroupId] = useState('');
  const [activeTestEvent, setActiveTestEvent] = useState('approve_payment');

  const fetchTriggers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/telegram-triggers');
      if (res.data.success && res.data.config) {
        setTriggers(res.data.config);
      }
    } catch (err: any) {
      console.error('Error fetching triggers:', err);
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to fetch Telegram triggers from server.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTriggers();
  }, []);

  const handleToggle = (eventKey: string) => {
    setTriggers(prev => ({
      ...prev,
      [eventKey]: {
        ...prev[eventKey],
        enabled: !prev[eventKey].enabled
      }
    }));
  };

  const handleTemplateChange = (eventKey: string, field: 'traineeTemplate' | 'staffTemplate', val: string) => {
    setTriggers(prev => ({
      ...prev,
      [eventKey]: {
        ...prev[eventKey],
        [field]: val
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setStatusMsg(null);
      const res = await api.post('/telegram-triggers/save', { config: triggers });
      if (res.data.success) {
        setStatusMsg({
          type: 'success',
          text: res.data.message || 'Trigger templates persisted successfully!'
        });
      }
    } catch (err: any) {
      console.error('Error saving triggers:', err);
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to save configurations.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestTrigger = async () => {
    try {
      setTesting(activeTestEvent);
      setTestResult(null);
      const res = await api.post('/telegram-triggers/test', {
        event: activeTestEvent,
        testDirectChatId: testDirectId.trim() || undefined,
        testGroupChatId: testGroupId.trim() || undefined
      });
      setTestResult(res.data);
    } catch (err: any) {
      console.error('Error testing trigger:', err);
      setTestResult({
        success: false,
        message: err.response?.data?.error || 'Failed to send test alert.'
      });
    } finally {
      setTesting(null);
    }
  };

  const getEventName = (key: string) => {
    switch (key) {
      case 'submit_slip': return 'New Slip Submission';
      case 'approve_payment': return 'Finance Manual Approval';
      case 'reject_payment': return 'Finance Manual Rejection';
      case 'auto_verify': return 'Gemini AI Auto-Verification';
      case 'flag_review': return 'Gemini AI Review Flagging';
      default: return key;
    }
  };

  const getEventVariables = (key: string) => {
    switch (key) {
      case 'submit_slip': 
        return ['traineeName', 'rollNumber', 'programName', 'levelNumber', 'amountPaid', 'dueDate', 'penaltyAmount'];
      case 'approve_payment': 
        return ['traineeName', 'receiptNumber', 'amountPaid', 'penaltyAmount', 'routedTo'];
      case 'reject_payment': 
        return ['traineeName', 'amountPaid', 'rejectionReason'];
      case 'auto_verify': 
        return ['traineeName', 'receiptNumber', 'amountPaid', 'penaltyAmount', 'routedTo', 'aiReferenceNumber'];
      case 'flag_review': 
        return ['traineeName', 'amountPaid', 'aiReason'];
      default: 
        return [];
    }
  };

  return (
    <div id="telegram-trigger-manager-root" className="bg-slate-950 border border-slate-800/80 rounded-3xl p-6 shadow-xl text-slate-100">
      
      {/* Upper Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/60 pb-5 mb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-violet-500 animate-ping" />
            <span className="text-[10px] font-black tracking-widest text-violet-400 uppercase">Telegram Alert Core</span>
          </div>
          <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <Bell size={20} className="text-violet-400" />
            Notification Triggers & Live Template Engine
          </h3>
          <p className="text-slate-400 text-xs">
            Administer transactional notification sequences dispatched by your university chatbot client on verification actions.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchTriggers}
            className="p-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-xl transition duration-200"
            title="Refresh Templates"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 transition duration-200 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
            Save Trigger Layouts
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl border mb-6 flex items-start gap-3 ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
          <p className="text-xs font-semibold">{statusMsg.text}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
          <RefreshCw className="animate-spin text-violet-400" size={32} />
          <p className="text-xs font-bold uppercase tracking-wider">Syncing Trigger Registers...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Left panel: Trigger templates list */}
          <div className="xl:col-span-8 space-y-6">
            {Object.entries(triggers).map(([key, configVal]) => {
              const config = configVal as TriggerConfig;
              const variables = getEventVariables(key);
              return (
                <div 
                  key={key} 
                  className={`border rounded-2xl p-5 space-y-4 transition duration-200 ${
                    config.enabled 
                      ? 'bg-slate-900/40 border-slate-800/80' 
                      : 'bg-slate-900/10 border-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-white flex items-center gap-2">
                        {getEventName(key)}
                        <span className="text-[10px] font-mono text-slate-500">[{key}]</span>
                      </h4>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Dispatched when a payment slip is processed under this state.
                      </p>
                    </div>

                    <button 
                      onClick={() => handleToggle(key)}
                      className="transition duration-150 text-slate-400 hover:text-white"
                    >
                      {config.enabled ? (
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 font-black text-[10px] uppercase">
                          Active <ToggleRight size={18} className="text-emerald-400" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-slate-800/40 text-slate-500 px-3 py-1 rounded-full border border-slate-800/40 font-black text-[10px] uppercase">
                          Disabled <ToggleLeft size={18} className="text-slate-600" />
                        </div>
                      )}
                    </button>
                  </div>

                  {config.enabled && (
                    <div className="space-y-4 pt-2 border-t border-slate-800/30">
                      
                      {/* Available variables badge line */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-1">Variables:</span>
                        {variables.map(v => (
                          <span 
                            key={v} 
                            className="bg-slate-950 text-indigo-400 border border-slate-800/80 font-mono text-[9px] px-2 py-0.5 rounded cursor-pointer hover:border-indigo-500/50 transition"
                            title={`Click to copy {${v}}`}
                            onClick={() => {
                              navigator.clipboard.writeText(`{${v}}`);
                            }}
                          >
                            {`{${v}}`}
                          </span>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Trainee Direct template block */}
                        {config.traineeTemplate !== undefined && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                              Trainee DM Template
                              <span className="text-[9px] text-slate-500 font-normal normal-case italic">Supports HTML format</span>
                            </label>
                            <textarea
                              value={config.traineeTemplate}
                              onChange={(e) => handleTemplateChange(key, 'traineeTemplate', e.target.value)}
                              rows={5}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition font-sans leading-relaxed"
                              placeholder="Leave blank to disable direct trainee message"
                            />
                          </div>
                        )}

                        {/* Staff Broadcast template block */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                            Staff Group Template
                            <span className="text-[9px] text-slate-500 font-normal normal-case italic">Supports HTML format</span>
                          </label>
                          <textarea
                            value={config.staffTemplate}
                            onChange={(e) => handleTemplateChange(key, 'staffTemplate', e.target.value)}
                            rows={5}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition font-sans leading-relaxed"
                            placeholder="Leave blank to disable group message"
                          />
                        </div>

                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          {/* Right panel: Testing & Verification Console */}
          <div className="xl:col-span-4 space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-5">
              
              <div className="border-b border-slate-800/60 pb-4">
                <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                  <Sparkles size={16} className="text-violet-400 animate-pulse" />
                  Integration Test Bench
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Trigger mock transaction payloads downstream into Telegram and inspect delivery outcomes.
                </p>
              </div>

              <div className="space-y-3.5">
                
                {/* Event picker */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Target Test Event</label>
                  <select
                    value={activeTestEvent}
                    onChange={(e) => setActiveTestEvent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition"
                  >
                    {Object.keys(triggers).map(ev => (
                      <option key={ev} value={ev}>{getEventName(ev)}</option>
                    ))}
                  </select>
                </div>

                {/* Direct Chat ID (Trainee simulation) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Trainee Personal Chat ID (Optional)</label>
                  <input
                    type="text"
                    value={testDirectId}
                    onChange={(e) => setTestDirectId(e.target.value)}
                    placeholder="e.g. 52938475"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition font-mono"
                  />
                  <p className="text-[9px] text-slate-500 italic">Overrides template values for simulation.</p>
                </div>

                {/* Group Chat ID (override) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Group Chat ID override (Optional)</label>
                  <input
                    type="text"
                    value={testGroupId}
                    onChange={(e) => setTestGroupId(e.target.value)}
                    placeholder="e.g. -10012938475"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition font-mono"
                  />
                  <p className="text-[9px] text-slate-500 italic">If empty, defaults to college notification chat.</p>
                </div>

                {/* Dispatch Button */}
                <button
                  onClick={handleTestTrigger}
                  disabled={!!testing || loading}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600/80 to-indigo-600/80 hover:from-violet-600 hover:to-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition duration-200 disabled:opacity-40 shadow"
                >
                  {testing ? (
                    <>
                      <RefreshCw className="animate-spin" size={13} />
                      <span>Transmitting Payload...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Dispatch Mock Payment Alert</span>
                    </>
                  )}
                </button>

              </div>

              {/* Simulation Result Output */}
              {testResult && (
                <div className="mt-4 p-4 rounded-xl border bg-slate-950 border-slate-850 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black tracking-wider uppercase text-indigo-400">Dispatch Report</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      testResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {testResult.success ? 'Delivered' : 'Failed'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-semibold">{testResult.message}</p>

                  {testResult.details && (
                    <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-slate-850 pt-2 font-mono">
                      <div>
                        <p className="text-slate-500 uppercase tracking-widest">Direct Link</p>
                        <p className={`font-bold ${testResult.details.directSuccess ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {testResult.details.directSuccess ? 'Success' : 'Bypassed/No ID'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 uppercase tracking-widest">Group Stream</p>
                        <p className={`font-bold ${testResult.details.groupSuccess ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {testResult.details.groupSuccess ? 'Success' : 'No Access/Unconfigured'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
