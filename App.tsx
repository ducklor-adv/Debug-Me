
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
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
  Settings
} from 'lucide-react';
import { View, Task, Priority, TaskGroup } from './types';
import Dashboard from './components/Dashboard';
import TaskManager from './components/TaskManager';
import FocusTimer from './components/FocusTimer';
import Analytics from './components/Analytics';
import AICoach from './components/AICoach';
import DailyPlanner, { SCHEDULE as DEFAULT_SCHEDULE, ScheduleBlock } from './components/DailyPlanner';
import Login from './components/Login';

const STORAGE_KEY = 'debugme-schedule-v2';
const TASKS_KEY = 'debugme-tasks-v1';
const GROUPS_KEY = 'debugme-groups-v1';
const VIEW_KEY = 'debugme-view';

const loadSchedule = (): ScheduleBlock[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_SCHEDULE;
};
const saveSchedule = (s: ScheduleBlock[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
};

const loadTasks = (fallback: Task[]): Task[] => {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
};

const loadGroups = (): TaskGroup[] => {
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
  const [schedule, setSchedule] = useState<ScheduleBlock[]>(loadSchedule);
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>(loadGroups);
  const updateSchedule = (s: ScheduleBlock[]) => {
    setSchedule(s);
    saveSchedule(s);
  };

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
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks(defaultTasks));

  // Auto-save tasks, groups & view to localStorage
  useEffect(() => { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem(GROUPS_KEY, JSON.stringify(taskGroups)); }, [taskGroups]);
  useEffect(() => { localStorage.setItem(VIEW_KEY, activeView); }, [activeView]);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = () => {
    signOut(auth);
  };

  const handleNavItemClick = (view: View) => {
    setActiveView(view);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleGearMenuNav = (view: View) => {
    setActiveView(view);
    setIsGearMenuOpen(false);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard tasks={tasks} schedule={schedule} />;
      case 'planner': return <DailyPlanner tasks={tasks} schedule={schedule} onScheduleChange={updateSchedule} taskGroups={taskGroups} />;
      case 'tasks': return <TaskManager tasks={tasks} setTasks={setTasks} taskGroups={taskGroups} setTaskGroups={setTaskGroups} />;
      case 'focus': return <FocusTimer />;
      case 'analytics': return <Analytics tasks={tasks} />;
      case 'ai-coach': return <AICoach tasks={tasks} />;
      default: return <Dashboard tasks={tasks} schedule={schedule} />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-emerald-50">
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

      {/* Sidebar - desktop only */}
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
              <button onClick={handleSignOut} className="w-full py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header - desktop only for sidebar, mobile only for non-dashboard */}
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

        {/* Content */}
        <div className={`flex-1 overflow-y-auto pb-24 lg:pb-6 scroll-smooth ${activeView === 'dashboard' ? 'bg-emerald-50' : 'bg-emerald-50'}`}>
          {activeView === 'dashboard' ? (
            renderContent()
          ) : (
            <div className="max-w-5xl mx-auto px-4 py-4 lg:px-10 lg:py-6">
              {renderContent()}
            </div>
          )}
        </div>

        {/* Gear menu overlay */}
        {isGearMenuOpen && (
          <div
            className="fixed inset-0 z-[59] bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsGearMenuOpen(false)}
          />
        )}

        {/* ===== MOBILE BOTTOM NAV BAR ===== */}
        <div className="fixed bottom-0 left-0 right-0 z-[60] lg:hidden">
          <div className="bg-emerald-800/80 backdrop-blur-md safe-bottom">
            <div className="flex items-center justify-center h-14 relative">

              {/* Radial menu items */}
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

              {/* Gear FAB - center */}
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
