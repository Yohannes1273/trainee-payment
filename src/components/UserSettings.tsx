import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  Settings, 
  MessageSquareCode,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import api from '../services/api';
import { useToast } from './Toast';

interface UserSettingsProps {
  initialEnabled: boolean;
  telegramChatId: string;
  onPreferenceUpdated?: (enabled: boolean) => void;
  onTelegramIdUpdated?: (chatId: string) => void;
}

export default function UserSettings({ 
  initialEnabled, 
  telegramChatId, 
  onPreferenceUpdated,
  onTelegramIdUpdated 
}: UserSettingsProps) {
  const { toast } = useToast();
  const [alertsEnabled, setAlertsEnabled] = useState(initialEnabled);
  const [chatId, setChatId] = useState(telegramChatId);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync state if props change
  useEffect(() => {
    setAlertsEnabled(initialEnabled);
  }, [initialEnabled]);

  useEffect(() => {
    setChatId(telegramChatId);
  }, [telegramChatId]);

  const handleToggleAlerts = async () => {
    const newValue = !alertsEnabled;
    
    // Optimistic UI update
    setAlertsEnabled(newValue);
    setLoading(true);
    setStatusMessage(null);

    try {
      const response = await api.put('/trainees/preferences', { 
        telegramAlertsEnabled: newValue 
      });
      
      const successMsg = response.data.message || `Telegram alerts successfully ${newValue ? 'enabled' : 'disabled'}.`;
      setStatusMessage({
        type: 'success',
        text: successMsg
      });
      toast.success(successMsg);

      if (onPreferenceUpdated) {
        onPreferenceUpdated(newValue);
      }
    } catch (err: any) {
      // Revert on error
      setAlertsEnabled(!newValue);
      const errMsg = err.response?.data?.error || 'Failed to update notification preferences.';
      setStatusMessage({
        type: 'error',
        text: errMsg
      });
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const [telegramInput, setTelegramInput] = useState(telegramChatId);
  const [telegramSaving, setTelegramSaving] = useState(false);

  useEffect(() => {
    setTelegramInput(chatId);
  }, [chatId]);

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramInput.trim()) {
      const errMsg = 'Please enter a valid Telegram Chat ID.';
      setStatusMessage({ type: 'error', text: errMsg });
      toast.error(errMsg);
      return;
    }

    try {
      setTelegramSaving(true);
      setStatusMessage(null);
      const response = await api.post('/trainees/telegram', { telegramChatId: telegramInput.trim() });
      
      const successMsg = response.data.message || 'Telegram Chat ID registered successfully.';
      setStatusMessage({
        type: 'success',
        text: successMsg
      });
      toast.success(successMsg);
      
      setChatId(telegramInput.trim());
      if (onTelegramIdUpdated) {
        onTelegramIdUpdated(telegramInput.trim());
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to link Telegram Chat ID.';
      setStatusMessage({
        type: 'error',
        text: errMsg
      });
      toast.error(errMsg);
    } finally {
      setTelegramSaving(false);
    }
  };

  return (
    <div className="space-y-8" id="trainee-user-settings">
      {/* Settings Card Frame */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-2xl flex items-center justify-center">
            <Settings size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Dashboard Settings</h2>
            <p className="text-xs text-slate-400 font-medium">Manage notifications and real-time ledger channels</p>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {statusMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 border ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle size={16} className="shrink-0" />
            ) : (
              <AlertTriangle size={16} className="shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </motion.div>
        )}

        {/* Telegram Preference Alert Control */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 md:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-400">
                <Bell size={18} />
                <h4 className="text-sm font-bold tracking-tight text-slate-200">Real-Time Telegram Alerts</h4>
              </div>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                Receive instant automated push updates directly to your personal Telegram client whenever your bank slips are approved, rejected, or auto-verified by Gemini AI.
              </p>
            </div>

            {/* Premium Toggle Switch */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleToggleAlerts}
                disabled={loading}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                  alertsEnabled ? 'bg-indigo-600' : 'bg-slate-800'
                }`}
                role="switch"
                aria-checked={alertsEnabled}
                id="telegram-alerts-toggle"
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    alertsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-xs font-bold font-mono w-14 text-slate-300">
                {loading ? (
                  <Loader2 className="animate-spin text-slate-400 w-4 h-4" />
                ) : alertsEnabled ? (
                  <span className="text-emerald-400">ACTIVE</span>
                ) : (
                  <span className="text-slate-500">MUTED</span>
                )}
              </span>
            </div>
          </div>

          {/* Connection Status Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-4">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Integration Status</h5>
              
              {chatId ? (
                <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-4 flex items-start gap-3">
                  <div className="p-2 bg-indigo-500/15 text-indigo-400 rounded-xl shrink-0">
                    <MessageSquareCode size={18} />
                  </div>
                  <div>
                    <h6 className="text-xs font-bold text-indigo-300">Active Telegram Link</h6>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                      Your trainee profile is bound to chat identifier <code className="text-white font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{chatId}</code>.
                    </p>
                    {alertsEnabled ? (
                      <p className="text-[11px] text-emerald-400 font-semibold mt-2 flex items-center gap-1">
                        <CheckCircle size={12} /> System ready to broadcast real-time settlements
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500 font-semibold mt-2 flex items-center gap-1">
                        <ShieldAlert size={12} /> Alerts are temporarily muted in preferences
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 animate-pulse">
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl shrink-0">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h6 className="text-xs font-bold text-amber-400">Alerts Unlinked</h6>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                      You must link a valid Telegram Chat ID to receive instant mobile notifications. Enter your Chat ID on the right.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Form to Bind Telegram ID */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Link Telegram Chat ID</h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Open Telegram and search for our university payment notification bot to obtain your personal Chat ID, then enter it below.
              </p>
              
              <form onSubmit={handleSaveTelegram} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Chat ID (e.g., 582910394)"
                  value={telegramInput}
                  onChange={(e) => setTelegramInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:border-indigo-500 focus:outline-none"
                  id="settings-telegram-chat-id"
                />
                <button
                  type="submit"
                  disabled={telegramSaving}
                  className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs transition shrink-0 flex items-center gap-1.5 shadow"
                >
                  {telegramSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={13} />
                      Linking...
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      Link Bot
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
