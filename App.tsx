
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { auth } from './firebase';
import {
  Activity,
  CheckSquare,
  Timer,
  BarChart3,
  Sparkles,
  Menu,
  X,
  BookOpen,
  Settings,
  Download,
  Upload,
  Sheet,
  Database,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { View, Task, Priority, TaskGroup, DailyRecord } from './types';
import { addDailyRecord, getRecordsByDate, getRecordCount } from './lib/dailyRecordDB';
import { syncToGoogleSheets, storeGoogleToken, getStoredToken, getSheetUrl } from './lib/googleSheetsSync';
import Dashboard from './components/Dashboard';
import TaskManager from './components/TaskManager';
import FocusTimer from './components/FocusTimer';
import Analytics from './components/Analytics';
import AICoach from './components/AICoach';
import DailyPlanner, { SCHEDULE as DEFAULT_SCHEDULE, ScheduleBlock } from './components/DailyPlanner';
import Login from './components/Login';

// ===== localStorage keys =====
const STORAGE_KEY = 'debugme-schedule-v2';
const TASKS_KEY = 'debugme-tasks-v1';
const GROUPS_KEY = 'debugme-groups-v1';
const VIEW_KEY = 'debugme-view';

const loadLocalSchedule = (): ScheduleBlock[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_SCHEDULE;
};

const loadLocalTasks = (fallback: Task[]): Task[] => {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
};

const loadLocalGroups = (): TaskGroup[] => {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_GROUPS;
};

const DEFAULT_GROUPS: TaskGroup[] = [
  { key: 'งานหลัก', label: 'งานหลัก', emoji: '🔥', color: 'orange', icon: 'code', size: 92 },
  { key: 'งานรอง', label: 'งานรอง', emoji: '🏠', color: 'yellow', icon: 'home', size: 66 },
  { key: 'เฉพาะกิจ', label: 'กิจกรรมเฉพาะกิจ', emoji: '🔧', color: 'blue', icon: 'wrench', size: 62 },
  { key: 'พักผ่อน', label: 'พักผ่อน', emoji: '☕', color: 'green', icon: 'coffee', size: 56 },
  { key: 'พัฒนาตัวเอง', label: 'พัฒนาตัวเอง', emoji: '🧠', color: 'amber', icon: 'brain', size: 72 },
  { key: 'งานด่วน', label: 'งานด่วน', emoji: '⚡', color: 'rose', icon: 'file', size: 82 },
  { key: 'กิจวัตร', label: 'กิจวัตรประจำวัน', emoji: '🌅', color: 'teal', icon: 'sun', size: 68 },
];

const RADIAL_ITEMS: { view: View; icon: string; label: string; gradient: string }[] = [
  { view: 'tasks', icon: 'CheckSquare', label: 'Tasks', gradient: 'from-indigo-500 to-blue-600' },
  { view: 'planner', icon: 'BookOpen', label: 'Planner', gradient: 'from-violet-500 to-purple-600' },
  { view: 'dashboard', icon: 'Activity', label: 'TODAY', gradient: 'from-orange-400 to-orange-600' },
  { view: 'focus', icon: 'Timer', label: 'Focus', gradient: 'from-emerald-400 to-teal-500' },
  { view: 'analytics', icon: 'BarChart3', label: 'Analytics', gradient: 'from-sky-400 to-cyan-500' },
];

const ICON_MAP: Record<string, React.ReactNode> = {
  Activity: <Activity className="w-5 h-5 text-emerald-300" />,
  BookOpen: <BookOpen className="w-5 h-5" />,
  CheckSquare: <CheckSquare className="w-5 h-5" />,
  Timer: <Timer className="w-5 h-5" />,
  BarChart3: <BarChart3 className="w-5 h-5" />,
};

const RADIUS = 110;
const ANGLES = [150, 120, 90, 60, 30];

// Merge any missing default groups into loaded groups
const mergeDefaultGroups = (loaded: TaskGroup[]): TaskGroup[] => {
  const existingKeys = new Set(loaded.map(g => g.key));
  const missing = DEFAULT_GROUPS.filter(g => !existingKeys.has(g.key));
  return missing.length > 0 ? [...loaded, ...missing] : loaded;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<View>(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved && ['dashboard','tasks','focus','analytics','ai-coach','planner'].includes(saved)) return saved as View;
    } catch {}
    return 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGearMenuOpen, setIsGearMenuOpen] = useState(false);

  // Daily records state
  const [todayRecords, setTodayRecords] = useState<DailyRecord[]>([]);
  const [totalRecordCount, setTotalRecordCount] = useState(0);
  const [sheetsSyncStatus, setSheetsSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [sheetsSyncMsg, setSheetsSyncMsg] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const defaultTasks: Task[] = [
    { id: '1', title: 'เขียนโค้ดโปรเจกต์ลูกค้า ก.', description: 'ทำระบบ Backend ให้เสร็จตาม Milestone 1 — Deep Work Session 1-5', priority: Priority.HIGH, completed: false, dueDate: '2026-02-25', category: 'งานหลัก' },
    { id: '2', title: 'Review PR / Issue + เตรียม Workspace', description: 'เปิดเครื่อง อ่าน PR Issue วางแผนก่อนเริ่ม Deep Work', priority: Priority.MEDIUM, completed: false, dueDate: todayStr, category: 'งานหลัก' },
    { id: '3', title: 'Commit / Push + วางแผนพรุ่งนี้', description: 'สรุปงานวันนี้ อัปเดต repo วางแผนงานวันถัดไป', priority: Priority.MEDIUM, completed: false, dueDate: todayStr, category: 'งานหลัก' },
    { id: '4', title: 'รดน้ำ ดูแลต้นไม้', description: 'กิจวัตรเช้า ดูแลสวนรอบบ้าน', priority: Priority.LOW, completed: false, dueDate: todayStr, category: 'งานรอง' },
    { id: '5', title: 'จัดบ้านเก่า (โซนห้องนั่งเล่น)', description: 'คัดแยกของทิ้ง/บริจาค ถูพื้น เคลียร์พื้นที่ให้โล่ง', priority: Priority.MEDIUM, completed: false, dueDate: todayStr, category: 'งานรอง' },
    { id: '6', title: 'ซ่อมหลังคากระท่อมเล็ก', description: 'ปรับปรุงกระท่อมเพื่อใช้เป็นห้องทำงานเขียนโปรแกรมที่สงบๆ', priority: Priority.MEDIUM, completed: false, dueDate: '2026-03-01', category: 'เฉพาะกิจ' },
    { id: '7', title: 'พักผ่อน / เวลาส่วนตัว', description: 'ดูซีรีส์ เล่นเกม หรือพักสายตาจากจอ', priority: Priority.LOW, completed: false, dueDate: todayStr, category: 'พักผ่อน' },
    { id: '8', title: 'นั่งสมาธิ 15 นาที', description: 'กำหนดลมหายใจ ลดความกังวลเรื่องคดีความและงาน', priority: Priority.MEDIUM, completed: false, dueDate: todayStr, category: 'พัฒนาตัวเอง' },
    { id: '9', title: 'ออกกำลังกาย / เดินเล่น', description: 'วิ่งเบาๆ หรือเดินรอบหมู่บ้าน 30-60 นาที', priority: Priority.MEDIUM, completed: false, dueDate: todayStr, category: 'พัฒนาตัวเอง' },
    { id: '10', title: 'Side Project / เรียนรู้สิ่งใหม่', description: 'ลองเทคโนโลยีใหม่ หรือทำโปรเจกต์ส่วนตัว — Evening Session', priority: Priority.LOW, completed: false, dueDate: todayStr, category: 'พัฒนาตัวเอง' },
    { id: '11', title: 'อ่านหนังสือก่อนนอน', description: 'อ่านหนังสือ 30 นาที ก่อนเข้านอน', priority: Priority.LOW, completed: false, dueDate: todayStr, category: 'พัฒนาตัวเอง' },
    { id: '12', title: 'รวบรวมเอกสารคดีความ', description: 'เตรียมเอกสารเกี่ยวกับการเงินและหนี้สินทั้งหมดเพื่อปรึกษาทนาย', priority: Priority.HIGH, completed: false, dueDate: todayStr, category: 'งานด่วน' },
  ];

  // ===== ALL personal data lives LOCAL only =====
  const [schedule, setSchedule] = useState<ScheduleBlock[]>(() => loadLocalSchedule());
  const [tasks, setTasks] = useState<Task[]>(() => loadLocalTasks(defaultTasks));
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>(() => mergeDefaultGroups(loadLocalGroups()));
  const dataReadyRef = useRef(false);

  const updateSchedule = (s: ScheduleBlock[]) => setSchedule(s);

  // Load today's daily records
  const loadTodayRecords = useCallback(async () => {
    try {
      const records = await getRecordsByDate(todayStr);
      setTodayRecords(records);
      const count = await getRecordCount();
      setTotalRecordCount(count);
    } catch (err) {
      console.error('Failed to load daily records:', err);
    }
  }, [todayStr]);

  // Save a daily record (called from DailyPlanner when checking a block)
  const handleSaveDailyRecord = useCallback(async (record: DailyRecord) => {
    try {
      await addDailyRecord(record);
      await loadTodayRecords();
    } catch (err) {
      console.error('Failed to save daily record:', err);
    }
  }, [loadTodayRecords]);

  // Sync ALL data to Google Sheets (records + tasks + schedule + groups)
  const handleSyncToSheets = useCallback(async () => {
    let token = getStoredToken();
    if (!token) {
      try {
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/spreadsheets');
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        token = credential?.accessToken || null;
        if (token) storeGoogleToken(token);
      } catch {
        setSheetsSyncStatus('error');
        setSheetsSyncMsg('ไม่สามารถเชื่อมต่อ Google ได้');
        return;
      }
    }
    if (!token) {
      setSheetsSyncStatus('error');
      setSheetsSyncMsg('ไม่มี token สำหรับ Google Sheets');
      return;
    }

    setSheetsSyncStatus('syncing');
    try {
      const result = await syncToGoogleSheets(token, {
        tasks,
        schedule,
        groups: taskGroups,
      });
      setSheetsSyncStatus('done');
      setSheetsSyncMsg(result.synced > 0
        ? `Sync สำเร็จ! ข้อมูลทั้งหมด → Google Sheets ของคุณ`
        : 'ข้อมูลทั้งหมด sync แล้ว (ไม่มีอะไรใหม่)'
      );
      setTimeout(() => setSheetsSyncStatus('idle'), 4000);
    } catch (err: any) {
      if (err.message === 'TOKEN_EXPIRED') {
        sessionStorage.removeItem('debugme-google-token');
        setSheetsSyncStatus('error');
        setSheetsSyncMsg('Token หมดอายุ — กดอีกครั้งเพื่อ login ใหม่');
      } else {
        setSheetsSyncStatus('error');
        setSheetsSyncMsg('Sync ล้มเหลว: ' + (err.message || 'Unknown error'));
      }
      setTimeout(() => setSheetsSyncStatus('idle'), 5000);
    }
  }, [tasks, schedule, taskGroups]);

  // Mark data ready after initial load, load daily records
  useEffect(() => {
    if (user) {
      dataReadyRef.current = true;
      loadTodayRecords();
    } else {
      dataReadyRef.current = false;
    }
  }, [user, loadTodayRecords]);

  // Auto-save to localStorage when data changes
  useEffect(() => {
    if (!dataReadyRef.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    localStorage.setItem(GROUPS_KEY, JSON.stringify(taskGroups));
  }, [schedule, tasks, taskGroups]);

  useEffect(() => { localStorage.setItem(VIEW_KEY, activeView); }, [activeView]);

  // Safety net: ensure localStorage is up-to-date before tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (dataReadyRef.current) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
        localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
        localStorage.setItem(GROUPS_KEY, JSON.stringify(taskGroups));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  });

  const handleExportData = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      schedule,
      tasks,
      groups: taskGroups,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debugme-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.schedule) setSchedule(data.schedule);
          if (data.tasks) setTasks(data.tasks);
          if (data.groups) setTaskGroups(data.groups);
          alert('นำเข้าข้อมูลสำเร็จ!');
        } catch {
          alert('ไฟล์ไม่ถูกต้อง');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = () => { signOut(auth); };

  const handleNavItemClick = (view: View) => {
    setActiveView(view);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const handleGearMenuNav = (view: View) => {
    setActiveView(view);
    setIsGearMenuOpen(false);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard tasks={tasks} schedule={schedule} />;
      case 'planner': return <DailyPlanner tasks={tasks} schedule={schedule} onScheduleChange={updateSchedule} taskGroups={taskGroups} todayRecords={todayRecords} onSaveDailyRecord={handleSaveDailyRecord} />;
      case 'tasks': return <TaskManager tasks={tasks} setTasks={setTasks} taskGroups={taskGroups} setTaskGroups={setTaskGroups} />;
      case 'focus': return <FocusTimer />;
      case 'analytics': return <Analytics tasks={tasks} />;
      case 'ai-coach': return <AICoach tasks={tasks} />;
      default: return <Dashboard tasks={tasks} schedule={schedule} />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-emerald-50 flex-col gap-3">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-emerald-50 font-sans safe-top safe-left safe-right">
      {/* Mobile Overlay for sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl shadow-emerald-200/50 border-r border-emerald-100 transition-transform duration-300 ease-in-out transform
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0 lg:w-72 flex flex-col
      `}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-20 px-8 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl overflow-hidden shadow-sm">
                <img src="/logo.png" alt="Debug-Me Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-2xl font-black tracking-tight text-slate-800">Debug-Me</span>
            </div>
            <button onClick={toggleSidebar} className="lg:hidden p-2 rounded-xl hover:bg-slate-100">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto scrollbar-hide">
            <NavItem icon={<CheckSquare />} label="Tasks" active={activeView === 'tasks'} onClick={() => handleNavItemClick('tasks')} />
            <NavItem icon={<BookOpen />} label="Daily Planner" active={activeView === 'planner'} onClick={() => handleNavItemClick('planner')} />
            <NavItem icon={<Activity />} label="TODAY" active={activeView === 'dashboard'} onClick={() => handleNavItemClick('dashboard')} />
            <NavItem icon={<Timer />} label="Focus" active={activeView === 'focus'} onClick={() => handleNavItemClick('focus')} />
            <NavItem icon={<BarChart3 />} label="Analytics" active={activeView === 'analytics'} onClick={() => handleNavItemClick('analytics')} />
            <div className="pt-6 mt-6 border-t border-slate-100/60 px-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">AI Assistant</p>
              <NavItem icon={<Sparkles className="text-fuchsia-500" />} label="AI Life Coach" active={activeView === 'ai-coach'} onClick={() => handleNavItemClick('ai-coach')} isSpecial />
            </div>
          </nav>

          <div className="p-4 shrink-0">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                  <span className="text-slate-500 font-bold">{user.email?.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{user.email ? user.email.split('@')[0] : 'User'}</p>
                  <p className="text-xs font-medium text-slate-500 truncate">Life Planner</p>
                </div>
              </div>

              {/* Privacy Badge */}
              <div className="flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold rounded-lg text-emerald-600 bg-emerald-50 border border-emerald-100">
                <ShieldCheck className="w-3 h-3" /> ข้อมูลเก็บในเครื่องคุณเท่านั้น
              </div>

              <div className="flex gap-2">
                <button onClick={handleExportData} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors border border-emerald-200">
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
                <button onClick={handleImportData} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-blue-200">
                  <Upload className="w-3.5 h-3.5" /> Import
                </button>
              </div>

              {/* Data & Sync to Google Sheets */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Daily Records</span>
                  <span className="ml-auto text-xs font-black text-violet-600">{totalRecordCount}</span>
                </div>
                <button
                  onClick={handleSyncToSheets}
                  disabled={sheetsSyncStatus === 'syncing'}
                  className={`w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-colors border ${
                    sheetsSyncStatus === 'syncing'
                      ? 'bg-amber-50 border-amber-200 text-amber-600'
                      : sheetsSyncStatus === 'done'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      : sheetsSyncStatus === 'error'
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'bg-violet-50 border-violet-200 text-violet-600 hover:bg-violet-100'
                  }`}
                >
                  <Sheet className={`w-3.5 h-3.5 ${sheetsSyncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  {sheetsSyncStatus === 'syncing' ? 'Syncing...'
                    : sheetsSyncStatus === 'done' ? 'Synced!'
                    : sheetsSyncStatus === 'error' ? 'Error'
                    : 'Sync to My Google Sheets'}
                </button>
                {sheetsSyncMsg && sheetsSyncStatus !== 'idle' && (
                  <p className="text-[10px] font-bold text-slate-400 text-center">{sheetsSyncMsg}</p>
                )}
                {getSheetUrl() && (
                  <a href={getSheetUrl()!} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 text-[10px] font-bold text-violet-500 hover:text-violet-700">
                    <ExternalLink className="w-3 h-3" /> เปิด Google Sheets
                  </a>
                )}
              </div>
              <button onClick={handleSignOut} className="w-full py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {(activeView !== 'dashboard') && (
          <header className="h-12 flex items-center px-4 shrink-0 sticky top-0 z-30 bg-emerald-600 lg:h-16 lg:px-10">
            <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-emerald-500 lg:hidden text-white/80 mr-3">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white capitalize tracking-tight lg:text-2xl">
              {activeView === 'dashboard' ? 'TODAY' : activeView === 'planner' ? 'Daily Planner' : activeView === 'ai-coach' ? 'AI Coach' : activeView}
            </h2>
          </header>
        )}

        <div className={`flex-1 overflow-y-auto pb-24 lg:pb-6 scroll-smooth bg-emerald-50`}>
          {activeView === 'dashboard' ? (
            renderContent()
          ) : (
            <div className="max-w-5xl mx-auto px-4 py-4 lg:px-10 lg:py-6">
              {renderContent()}
            </div>
          )}
        </div>

        {isGearMenuOpen && (
          <div
            className="fixed inset-0 z-[59] bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsGearMenuOpen(false)}
          />
        )}

        {/* Mobile Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 z-[60] lg:hidden">
          <div className="bg-emerald-800/80 backdrop-blur-md safe-bottom">
            <div className="flex items-center justify-center h-14 relative">
              {RADIAL_ITEMS.map((item, i) => {
                const rad = (ANGLES[i] * Math.PI) / 180;
                const x = Math.cos(rad) * RADIUS;
                const y = -Math.sin(rad) * RADIUS;
                return (
                  <button
                    key={item.view}
                    onClick={() => handleGearMenuNav(item.view)}
                    className={`absolute z-[91] flex flex-col items-center gap-1 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isGearMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'}`}
                    style={{
                      left: `calc(50% + ${x}px)`,
                      bottom: `calc(100% + 14px + ${-y}px)`,
                      transform: 'translate(-50%, 50%)',
                      transitionDelay: isGearMenuOpen ? `${i * 50}ms` : '0ms',
                    }}
                  >
                    <div
                      className={`rounded-full bg-gradient-to-br ${item.gradient} text-white flex items-center justify-center shadow-xl active:scale-90 transition-transform ${activeView === item.view ? 'ring-2 ring-white ring-offset-2 ring-offset-black/20' : ''}`}
                      style={{ width: 48, height: 48 }}
                    >
                      {ICON_MAP[item.icon]}
                    </div>
                    <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}

              <button
                onClick={() => setIsGearMenuOpen(!isGearMenuOpen)}
                className={`absolute -top-7 left-1/2 -translate-x-1/2 z-[92] w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg shadow-emerald-900/30 ${isGearMenuOpen ? 'bg-white text-emerald-700 scale-110' : 'bg-white text-emerald-600'}`}
              >
                <Settings className={`w-6 h-6 transition-transform duration-500 ${isGearMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  isSpecial?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, isSpecial }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center w-full gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200
      ${active
        ? isSpecial
          ? 'bg-fuchsia-50 text-fuchsia-700 shadow-sm border border-fuchsia-100'
          : 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 translate-x-1'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'}
    `}
  >
    {React.cloneElement(icon as React.ReactElement, {
      className: `w-5 h-5 ${active ? (isSpecial ? 'text-fuchsia-600' : 'text-white') : 'text-slate-400'}`
    })}
    <span>{label}</span>
  </button>
);

export default App;
