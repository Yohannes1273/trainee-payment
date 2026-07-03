import React, { useState, useEffect } from 'react';
import { 
  Menu, X, LogOut, User, Landmark, HelpCircle, Shield, LucideIcon,
  CreditCard, Settings, ShieldCheck, Search, FileSpreadsheet, Sparkles,
  BookOpen, Layers, Users, FileText, CheckCircle, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ThemeToggle from './ThemeToggle';
import { getAvatarUrl } from './ProfileEditor';
import NotificationBell from './NotificationBell';

interface SidebarTab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface ResponsiveSidebarProps {
  user?: {
    fullName: string;
    role: string;
    username: string;
    email?: string;
  };
  activeTab?: string;
  setActiveTab?: (tabId: string) => void;
  tabs?: SidebarTab[];
  onLogout: () => void;
  onOpenProfile: () => void;
  children: React.ReactNode;
}

export default function ResponsiveSidebar({
  user,
  activeTab,
  setActiveTab,
  tabs = [],
  onLogout,
  onOpenProfile,
  children
}: ResponsiveSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Fallback profile if no user object exists anywhere
  const fallbackUser = {
    fullName: 'Portal User',
    role: 'Staff',
    username: 'user',
    email: ''
  };

  // State to hold the actively displayed user object
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('college_payment_user');
      return stored ? JSON.parse(stored) : (user || fallbackUser);
    } catch {
      return user || fallbackUser;
    }
  });

  // Keep state in sync with localStorage and prop updates
  useEffect(() => {
    const syncUser = () => {
      try {
        const stored = localStorage.getItem('college_payment_user');
        if (stored) {
          setCurrentUser(JSON.parse(stored));
        } else if (user) {
          setCurrentUser(user);
        }
      } catch (e) {
        if (user) {
          setCurrentUser(user);
        }
      }
    };

    syncUser();

    window.addEventListener('storage', syncUser);
    // Custom event to handle local updates in the same tab
    window.addEventListener('profile-updated', syncUser);

    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('profile-updated', syncUser);
    };
  }, [user?.fullName, user?.role, user?.username, user?.email]);

  const activeUser = currentUser || fallbackUser;

  // Dynamically resolve navigation tabs based on user role from localStorage
  const getDynamicTabs = (userRole: string): SidebarTab[] => {
    const roleLower = (userRole || '').toLowerCase();
    
    if (roleLower === 'trainee') {
      return [
        { id: 'ledger', label: 'My Academic Ledger', icon: CreditCard },
        { id: 'self-service', label: 'Self-Service Module', icon: FileText },
        { id: 'settings', label: 'Notification Settings', icon: Settings }
      ];
    }
    
    if (roleLower === 'finance') {
      return [
        { id: 'pending', label: 'Review Queue', icon: ShieldCheck },
        { id: 'search', label: 'Payment Search', icon: Search },
        { id: 'telegram_triggers', label: 'Telegram Alerts', icon: Bell }
      ];
    }
    
    if (roleLower === 'night controller' || roleLower === 'night_controller' || roleLower === 'night-controller') {
      return [
        { id: 'queue', label: 'Review Queue', icon: FileSpreadsheet },
        { id: 'drilldown', label: 'Drill-Down Reports', icon: Sparkles },
        { id: 'search', label: 'Search Engine', icon: Search },
        { id: 'telegram_triggers', label: 'Telegram Alerts', icon: Bell }
      ];
    }
    
    // Fallback/Default for other Staff roles
    const list: SidebarTab[] = [
      { id: 'overview', label: 'Academic Overview', icon: BookOpen }
    ];
    
    if (userRole === 'HR' || userRole === 'Registrar') {
      list.push({ id: 'admin_control', label: 'Admin Control', icon: Sparkles });
    }
    if (userRole === 'Registrar') {
      list.push({ id: 'master', label: 'Pipeline Hierarchy', icon: Layers });
      list.push({ id: 'trainees', label: 'Enroll Trainees', icon: Users });
      list.push({ id: 'operations', label: 'Operations', icon: FileText });
    }
    if (userRole === 'HR') {
      list.push({ id: 'hr', label: 'Register Faculty', icon: Users });
    }
    if (userRole === 'Department Head') {
      list.push({ id: 'dept', label: 'Assign Sections', icon: Landmark });
    }
    if (userRole === 'Trainer') {
      list.push({ id: 'trainer', label: 'Section Compliance', icon: CheckCircle });
    }
    
    return list;
  };

  const dynamicTabs = getDynamicTabs(activeUser.role);
  const displayTabs = dynamicTabs.length > 0 ? dynamicTabs : tabs;

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* Backdrop for Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            className="lg:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation Panel (Responsive Drawer / Fixed Left Sidebar) */}
      <aside
        id="app-navigation-sidebar"
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col w-72 lg:w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/80 transform lg:transform-none transition-all duration-300 ease-in-out shadow-xl lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header (Hidden on Mobile, block on Desktop) */}
        <div className="hidden lg:flex items-center gap-3 p-6 border-b border-slate-200 dark:border-slate-800/80">
          <div className="w-11 h-11 bg-indigo-600/10 dark:bg-indigo-600/15 border border-indigo-500/20 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-md">
            <Landmark size={22} />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">Polytech Portal</h1>
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest">
              {activeUser.role} console
            </p>
          </div>
        </div>

        {/* Mobile Header Inside Drawer */}
        <div className="lg:hidden flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <Landmark className="text-indigo-600 dark:text-indigo-400" size={20} />
            <span className="font-bold text-slate-900 dark:text-slate-100">Portal Index Navigation</span>
          </div>
          <button onClick={closeSidebar} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Active User Information Widget */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                closeSidebar();
                onOpenProfile();
              }}
              className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-500 hover:scale-105 active:scale-95 transition cursor-pointer group"
              title="Edit Profile"
            >
              <img
                src={getAvatarUrl(activeUser)}
                alt={activeUser.fullName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <User size={12} className="text-white" />
              </div>
            </button>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">{activeUser.fullName}</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">@{activeUser.username}</p>
              <span className="inline-block mt-1 text-[9px] bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
                {activeUser.role}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tab Links (Wide scroll area) */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
          {displayTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (setActiveTab) {
                    setActiveTab(tab.id);
                  }
                  closeSidebar();
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 dark:shadow-indigo-600/15'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800/80 space-y-4">
          {/* Desktop theme toggle drawer */}
          <div className="hidden lg:flex items-center justify-between bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800 p-3 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Theme preference</span>
            <ThemeToggle />
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-rose-500/10 dark:bg-rose-500/10 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 text-rose-600 dark:text-rose-400 py-3.5 px-4 rounded-2xl text-xs font-black transition-all duration-300 border border-rose-500/20 hover:border-rose-600 cursor-pointer"
          >
            <LogOut size={16} />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>

      {/* Primary Dashboard Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Universal Sticky Top Navigation Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-5 sm:px-6 py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle button */}
            <button
              onClick={toggleSidebar}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all duration-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
              aria-label="Open portal drawer"
            >
              <Menu size={18} />
            </button>
            
            {/* Navigation Location breadcrumb trail */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden xs:inline">Academic Financial Portal</span>
              <span className="text-slate-300 dark:text-slate-700 hidden xs:inline">/</span>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{activeUser.role} Console</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={onLogout}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 active:scale-95 transition-all duration-300 border border-rose-500/20 hover:border-rose-600 cursor-pointer"
              title="Sign Out Session"
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

