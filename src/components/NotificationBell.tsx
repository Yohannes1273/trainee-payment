import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, Check, Info, AlertTriangle, CheckCircle, X, Megaphone, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../services/api';
import { useToast } from './Toast';

interface InAppNotification {
  _id: string;
  userId?: string;
  userRole?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  paymentId?: string;
  createdAt: string | Date;
}

export default function NotificationBell() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Announcement Form State
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceMessage, setAnnounceMessage] = useState('');
  const [announceType, setAnnounceType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [announceTarget, setAnnounceTarget] = useState<string>(''); // empty means global
  const [sendingAnnounce, setSendingAnnounce] = useState(false);

  // Get active user from localStorage to determine permissions & roles
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('college_payment_user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Fetch initial notifications list
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data && res.data.notifications) {
        setNotifications(res.data.notifications);
      }
    } catch (err) {
      console.error('[Notification Bell] Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Setup periodic polling as a solid fallback
    const pollInterval = setInterval(() => {
      fetchNotifications();
    }, 15000); // Poll every 15 seconds

    return () => clearInterval(pollInterval);
  }, []);

  // Setup SSE Real-time connection
  useEffect(() => {
    const token = localStorage.getItem('college_payment_token');
    if (!token) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connectSSE = () => {
      const url = `/api/notifications/stream?token=${encodeURIComponent(token)}`;
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        console.log('[Notification Bell] Real-time SSE channel opened.');
      };

      eventSource.addEventListener('notification', (e: MessageEvent) => {
        try {
          const newNotif: InAppNotification = JSON.parse(e.data);
          
          // Check if notification already exists in list to avoid duplicates
          setNotifications(prev => {
            const exists = prev.some(n => n._id === newNotif._id);
            if (exists) return prev;
            
            // Trigger a beautiful visual audio-less browser toast for real-time awareness!
            toast.info(`🔔 ${newNotif.title}: ${newNotif.message}`);
            
            return [newNotif, ...prev];
          });
        } catch (err) {
          console.error('[Notification Bell] SSE parse error:', err);
        }
      });

      eventSource.onerror = (err) => {
        console.warn('[Notification Bell] SSE connection errored/lost. Attempting automatic reconnection...', err);
        if (eventSource) {
          eventSource.close();
        }
        // Auto-reconnect after 5 seconds
        reconnectTimeout = setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, [toast]);

  // Handle outside clicks to close the dropdown panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark single notification as read
  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      await api.post(`/notifications/${id}/read`);
    } catch (err) {
      console.error('[Notification Bell] Error marking as read:', err);
      // Revert optimistic update on failure
      fetchNotifications();
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      await api.post('/notifications/read-all');
      toast.success('Successfully marked all notifications as read!');
    } catch (err) {
      console.error('[Notification Bell] Error marking all as read:', err);
      fetchNotifications();
    }
  };

  // Handle sending System Announcement
  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announceTitle || !announceMessage) {
      toast.error('Please specify both title and content for the announcement.');
      return;
    }

    try {
      setSendingAnnounce(true);
      await api.post('/notifications/announce', {
        title: announceTitle,
        message: announceMessage,
        type: announceType,
        targetRole: announceTarget || null
      });

      toast.success('System announcement broadcasted successfully!');
      setShowAnnounceModal(false);
      setAnnounceTitle('');
      setAnnounceMessage('');
      setAnnounceType('info');
      setAnnounceTarget('');
      fetchNotifications();
    } catch (err: any) {
      console.error('[Notification Bell] Error broadcasting announcement:', err);
      toast.error(err.response?.data?.error || 'Failed to dispatch broadcast.');
    } finally {
      setSendingAnnounce(false);
    }
  };

  // Unread count
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Filter list based on selected tab
  const displayedNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.isRead;
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle size={15} />
          </div>
        );
      case 'warning':
        return (
          <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={15} />
          </div>
        );
      case 'error':
        return (
          <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <X size={15} />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Info size={15} />
          </div>
        );
    }
  };

  // Check if current user has announcement clearance
  const hasAnnounceClearance = currentUser && [
    'Registrar', 'Finance', 'HR', 'Night Controller', 'Department Head'
  ].includes(currentUser.role);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 active:scale-95 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
        aria-label="View In-app Notifications"
        id="notification-bell-btn"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black tracking-tight text-slate-900 dark:text-slate-100">Portal Notifications</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{unreadCount} unread updates currently</p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-black flex items-center gap-1 cursor-pointer"
                >
                  <Check size={12} />
                  Mark read
                </button>
              )}
            </div>

            {/* Filter Tabs & Admin Controls */}
            <div className="px-4 py-2 bg-slate-50/20 dark:bg-slate-950/10 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition ${
                    activeTab === 'all'
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab('unread')}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition flex items-center gap-1 ${
                    activeTab === 'unread'
                      ? 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {hasAnnounceClearance && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowAnnounceModal(true);
                  }}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[9px] rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer"
                  title="Broadcast System Announcement"
                >
                  <Megaphone size={10} />
                  Broadcast
                </button>
              )}
            </div>

            {/* Scrolling Notifications List */}
            <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {displayedNotifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                  <Bell size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-[11px] font-medium">No updates to display here.</p>
                </div>
              ) : (
                displayedNotifications.map((n) => (
                  <div
                    key={n._id}
                    className={`p-4 flex gap-3 transition-colors relative group ${
                      n.isRead 
                        ? 'bg-transparent hover:bg-slate-50/40 dark:hover:bg-slate-800/10' 
                        : 'bg-indigo-50/20 dark:bg-indigo-950/10 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/15'
                    }`}
                  >
                    {getNotificationIcon(n.type)}
                    <div className="flex-1 min-w-0 pr-6">
                      <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-200 leading-tight">
                        {n.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal break-words">
                        {n.message}
                      </p>
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 font-medium block mt-1">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Unread dot / Mark read hover button */}
                    {!n.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(n._id, e)}
                        className="absolute right-4 top-4 w-5 h-5 rounded-full flex items-center justify-center bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white transition shadow-sm cursor-pointer"
                        title="Mark as Read"
                      >
                        <Check size={10} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/25 text-center">
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                Authorized Live Sync Console
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Broadcast System Announcement Modal */}
      <AnimatePresence>
        {showAnnounceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Megaphone className="text-indigo-600 dark:text-indigo-400" size={16} />
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Broadcast Announcement</h3>
                </div>
                <button
                  onClick={() => setShowAnnounceModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSendAnnouncement} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-1.5">
                    Announcement Title
                  </label>
                  <input
                    type="text"
                    required
                    value={announceTitle}
                    onChange={(e) => setAnnounceTitle(e.target.value)}
                    placeholder="e.g., Campus Fee Payment Deadline"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-1.5">
                    Target Recipient Role
                  </label>
                  <select
                    value={announceTarget}
                    onChange={(e) => setAnnounceTarget(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition dark:text-slate-200"
                  >
                    <option value="" className="dark:bg-slate-900">Everyone (Global Broadcast)</option>
                    <option value="Trainee" className="dark:bg-slate-900">Trainees Only</option>
                    <option value="Finance" className="dark:bg-slate-900">Finance Staff Only</option>
                    <option value="Night Controller" className="dark:bg-slate-900">Night Controllers Only</option>
                    <option value="Trainer" className="dark:bg-slate-900">Trainers Only</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-1.5">
                      Visual Tone Type
                    </label>
                    <select
                      value={announceType}
                      onChange={(e) => setAnnounceType(e.target.value as any)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition dark:text-slate-200"
                    >
                      <option value="info" className="dark:bg-slate-900">ℹ️ Info (Blue)</option>
                      <option value="success" className="dark:bg-slate-900">✅ Success (Green)</option>
                      <option value="warning" className="dark:bg-slate-900">⚠️ Warning (Amber)</option>
                      <option value="error" className="dark:bg-slate-900">🚨 Alert (Red)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-1.5">
                    Announcement Message Content
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={announceMessage}
                    onChange={(e) => setAnnounceMessage(e.target.value)}
                    placeholder="Enter detailed content to broadcast to matched users..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAnnounceModal(false)}
                    className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingAnnounce}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer"
                  >
                    <Send size={12} />
                    {sendingAnnounce ? 'Broadcasting...' : 'Dispatch Broadcast'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
