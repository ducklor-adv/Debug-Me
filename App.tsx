
import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from 'react';
import { onAuthStateChanged, signOut, deleteUser, User } from 'firebase/auth';
import { auth } from './firebase';
import {
  Activity,
  CheckSquare,
  Timer,
  BarChart3,
  Menu,
  X,
  BookOpen,
  Download,
  Upload,
  Database,
  Cloud,
  CalendarDays,
  Bell,
  WifiOff,
  FolderKanban,
  Wallet,
  PenLine,
  Search,
} from 'lucide-react';
import { View, Task, Habit, Priority, TaskGroup, Milestone, DailyRecord, ScheduleTemplates, CustomScheduleTemplate, getDayType, DEFAULT_CATEGORIES, FocusSession, Project, Expense, BalanceItem } from './types';
import { subscribeAppData, saveAppData, addDailyRecordFS, getDailyRecordsByDate, getDailyRecordCount, addFocusSessionFS, getFocusSessionsByDate } from './lib/firestoreDB';
import Dashboard from './components/Dashboard';
import UndoToast from './components/UndoToast';
import Login from './components/Login';
import OnboardingWizard from './components/OnboardingWizard';
import { useNotificationScheduler } from './hooks/useNotificationScheduler';
import { useLocationReminders } from './hooks/useLocationReminders';
import { analyzeBehaviorPatterns, BehaviorPattern } from './services/behaviorAnalysis';
import { getDailyRecordsInRange } from './lib/firestoreDB';
import { useUndoStack } from './hooks/useUndoStack';
import { migrateV1Slots } from './components/planner/slotUtils';

// Lazy-load non-dashboard views for faster initial load
const TaskManager = lazy(() => import('./components/TaskManager'));
const FocusTimer = lazy(() => import('./components/FocusTimer'));
const Analytics = lazy(() => import('./components/Analytics'));
const DailyPlanner = lazy(() => import('./components/DailyPlanner'));
const CalendarView = lazy(() => import('./components/CalendarView'));
const ProjectManager = lazy(() => import('./components/ProjectManager'));
const ExpenseTracker = lazy(() => import('./components/ExpenseTracker'));
const DiaryView = lazy(() => import('./components/DiaryView'));

const LazyFallback = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div>
  </div>
);

const VIEW_KEY = 'debugme-view';

const DEFAULT_GROUPS: TaskGroup[] = [
  // 💼 อาชีพ
  { key: 'งานหลัก', label: 'งานหลัก', emoji: '💼', color: 'orange', icon: 'briefcase', size: 92, categoryKey: 'career' },
  { key: 'งานรอง', label: 'งานรอง', emoji: '📝', color: 'yellow', icon: 'pencil', size: 66, categoryKey: 'career' },
  // 💪 สุขภาพ
  { key: 'สุขภาพ', label: 'สุขภาพ', emoji: '💪', color: 'green', icon: 'heartpulse', size: 62, categoryKey: 'health' },
  { key: 'พักผ่อน', label: 'พักผ่อน', emoji: '☕', color: 'cyan', icon: 'coffee', size: 56, categoryKey: 'health' },
  // 🏠 กิจวัตรประจำวัน
  { key: 'กิจวัตร', label: 'กิจวัตรทั่วไป', emoji: '🌅', color: 'teal', icon: 'sun', size: 68, categoryKey: 'home' },
  { key: 'งานบ้าน', label: 'งานบ้าน', emoji: '🏠', color: 'yellow', icon: 'broom', size: 66, categoryKey: 'home' },
  { key: 'ธุระส่วนตัว', label: 'ธุระส่วนตัว', emoji: '🔧', color: 'blue', icon: 'calendar', size: 62, categoryKey: 'home' },
  // ❤️ ความสัมพันธ์
  { key: 'ครอบครัว', label: 'ครอบครัว', emoji: '👨‍👩‍👧', color: 'violet', icon: 'family', size: 62, categoryKey: 'relationship' },
  { key: 'เข้าสังคม', label: 'เข้าสังคม', emoji: '🤝', color: 'indigo', icon: 'handshake', size: 66, categoryKey: 'relationship' },
  // 🧠 จิตใจ
  { key: 'พัฒนาตัวเอง', label: 'พัฒนาตัวเอง', emoji: '🧠', color: 'amber', icon: 'brain', size: 72, categoryKey: 'mind' },
  { key: 'สงบใจ', label: 'สงบใจ', emoji: '🧘', color: 'purple', icon: 'moon', size: 62, categoryKey: 'mind' },
  // ⏸️ คั่นเวลา
  { key: 'Breaking', label: 'Breaking', emoji: '⏸️', color: 'cyan', icon: 'coffee', size: 56, categoryKey: 'break' },
  // Quick-access groups (no category — shown on Dashboard)
  { key: 'งานด่วน', label: 'งานด่วน', emoji: '⚡', color: 'rose', icon: 'lightning', size: 82 },
  { key: 'นัดหมาย', label: 'นัดหมาย', emoji: '📅', color: 'indigo', icon: 'handshake', size: 66 },
];

const DEFAULT_MILESTONES: Milestone[] = [
  { id: 'ms-1', title: 'ตื่นนอน', emoji: '🌅', time: '05:00', icon: 'sun', color: 'bg-amber-50 border-amber-300 text-amber-700' },
  { id: 'ms-2', title: 'กินข้าว (เช้า)', emoji: '🍚', time: '07:00', icon: 'coffee', color: 'bg-orange-50 border-orange-300 text-orange-700' },
  { id: 'ms-3', title: 'กินข้าว (เที่ยง)', emoji: '🍚', time: '12:00', icon: 'coffee', color: 'bg-orange-50 border-orange-300 text-orange-700' },
  { id: 'ms-4', title: 'กินข้าว (เย็น)', emoji: '🍚', time: '19:00', icon: 'coffee', color: 'bg-orange-50 border-orange-300 text-orange-700' },
  { id: 'ms-5', title: 'นอน', emoji: '🌙', time: '22:00', icon: 'moon', color: 'bg-indigo-50 border-indigo-300 text-indigo-700' },
];

export const DEFAULT_SCHEDULE_TEMPLATES: ScheduleTemplates = {
  workday: [
    { id: 'wd-0',  startTime: '00:00', endTime: '05:00', groupKey: 'sleep' },
    { id: 'wd-1',  startTime: '05:00', endTime: '07:00', groupKey: 'home' },
    { id: 'wd-2',  startTime: '07:00', endTime: '08:00', groupKey: 'health' },
    { id: 'wd-3',  startTime: '08:00', endTime: '12:00', groupKey: 'career' },
    { id: 'wd-4',  startTime: '12:00', endTime: '13:00', groupKey: 'break' },
    { id: 'wd-5',  startTime: '13:00', endTime: '17:00', groupKey: 'career' },
    { id: 'wd-6',  startTime: '17:00', endTime: '19:00', groupKey: 'home' },
    { id: 'wd-7',  startTime: '19:00', endTime: '20:00', groupKey: 'relationship' },
    { id: 'wd-8',  startTime: '20:00', endTime: '21:00', groupKey: 'mind' },
    { id: 'wd-9',  startTime: '21:00', endTime: '22:00', groupKey: 'break' },
    { id: 'wd-10', startTime: '22:00', endTime: '00:00', groupKey: 'sleep' },
  ],
  saturday: [
    { id: 'sat-0',  startTime: '00:00', endTime: '05:00', groupKey: 'sleep' },
    { id: 'sat-1',  startTime: '05:00', endTime: '07:00', groupKey: 'home' },
    { id: 'sat-2',  startTime: '07:00', endTime: '08:00', groupKey: 'health' },
    { id: 'sat-3',  startTime: '08:00', endTime: '10:00', groupKey: 'home' },
    { id: 'sat-4',  startTime: '10:00', endTime: '12:00', groupKey: 'mind' },
    { id: 'sat-5',  startTime: '12:00', endTime: '13:00', groupKey: 'break' },
    { id: 'sat-6',  startTime: '13:00', endTime: '15:00', groupKey: 'relationship' },
    { id: 'sat-7',  startTime: '15:00', endTime: '17:00', groupKey: 'home' },
    { id: 'sat-8',  startTime: '17:00', endTime: '18:00', groupKey: 'health' },
    { id: 'sat-9',  startTime: '18:00', endTime: '20:00', groupKey: 'relationship' },
    { id: 'sat-10', startTime: '20:00', endTime: '22:00', groupKey: 'break' },
    { id: 'sat-11', startTime: '22:00', endTime: '00:00', groupKey: 'sleep' },
  ],
  sunday: [
    { id: 'sun-0',  startTime: '00:00', endTime: '06:00', groupKey: 'sleep' },
    { id: 'sun-1',  startTime: '06:00', endTime: '08:00', groupKey: 'home' },
    { id: 'sun-2',  startTime: '08:00', endTime: '09:00', groupKey: 'health' },
    { id: 'sun-3',  startTime: '09:00', endTime: '12:00', groupKey: 'relationship' },
    { id: 'sun-4',  startTime: '12:00', endTime: '13:00', groupKey: 'break' },
    { id: 'sun-5',  startTime: '13:00', endTime: '15:00', groupKey: 'mind' },
    { id: 'sun-6',  startTime: '15:00', endTime: '17:00', groupKey: 'relationship' },
    { id: 'sun-7',  startTime: '17:00', endTime: '19:00', groupKey: 'home' },
    { id: 'sun-8',  startTime: '19:00', endTime: '21:00', groupKey: 'break' },
    { id: 'sun-9',  startTime: '21:00', endTime: '22:00', groupKey: 'mind' },
    { id: 'sun-10', startTime: '22:00', endTime: '00:00', groupKey: 'sleep' },
  ],
  customTemplates: [
    {
      id: 'ct-lazy', name: 'วันขี้เกียจ', emoji: '😴',
      slots: [
        { id: 'lazy-0',  startTime: '00:00', endTime: '09:00', groupKey: 'sleep' },
        { id: 'lazy-1',  startTime: '09:00', endTime: '10:00', groupKey: 'home' },
        { id: 'lazy-2',  startTime: '10:00', endTime: '12:00', groupKey: 'break' },
        { id: 'lazy-3',  startTime: '12:00', endTime: '13:00', groupKey: 'break' },
        { id: 'lazy-4',  startTime: '13:00', endTime: '15:00', groupKey: 'break' },
        { id: 'lazy-5',  startTime: '15:00', endTime: '16:00', groupKey: 'home' },
        { id: 'lazy-6',  startTime: '16:00', endTime: '18:00', groupKey: 'break' },
        { id: 'lazy-7',  startTime: '18:00', endTime: '19:00', groupKey: 'break' },
        { id: 'lazy-8',  startTime: '19:00', endTime: '22:00', groupKey: 'break' },
        { id: 'lazy-9',  startTime: '22:00', endTime: '00:00', groupKey: 'sleep' },
      ],
    },
    {
      id: 'ct-sick', name: 'วันป่วย', emoji: '🤒',
      slots: [
        { id: 'sick-0',  startTime: '00:00', endTime: '08:00', groupKey: 'sleep' },
        { id: 'sick-1',  startTime: '08:00', endTime: '09:00', groupKey: 'health' },
        { id: 'sick-2',  startTime: '09:00', endTime: '10:00', groupKey: 'home' },
        { id: 'sick-3',  startTime: '10:00', endTime: '12:00', groupKey: 'sleep' },
        { id: 'sick-4',  startTime: '12:00', endTime: '13:00', groupKey: 'home' },
        { id: 'sick-5',  startTime: '13:00', endTime: '15:00', groupKey: 'sleep' },
        { id: 'sick-6',  startTime: '15:00', endTime: '16:00', groupKey: 'health' },
        { id: 'sick-7',  startTime: '16:00', endTime: '18:00', groupKey: 'break' },
        { id: 'sick-8',  startTime: '18:00', endTime: '19:00', groupKey: 'home' },
        { id: 'sick-9',  startTime: '19:00', endTime: '21:00', groupKey: 'break' },
        { id: 'sick-10', startTime: '21:00', endTime: '00:00', groupKey: 'sleep' },
      ],
    },
    {
      id: 'ct-trip', name: 'เที่ยวต่างจังหวัด', emoji: '🏕️',
      slots: [
        { id: 'trip-0',  startTime: '00:00', endTime: '06:00', groupKey: 'sleep' },
        { id: 'trip-1',  startTime: '06:00', endTime: '07:00', groupKey: 'home' },
        { id: 'trip-2',  startTime: '07:00', endTime: '08:00', groupKey: 'health' },
        { id: 'trip-3',  startTime: '08:00', endTime: '09:00', groupKey: 'break' },
        { id: 'trip-4',  startTime: '09:00', endTime: '12:00', groupKey: 'relationship' },
        { id: 'trip-5',  startTime: '12:00', endTime: '13:00', groupKey: 'break' },
        { id: 'trip-6',  startTime: '13:00', endTime: '17:00', groupKey: 'relationship' },
        { id: 'trip-7',  startTime: '17:00', endTime: '18:00', groupKey: 'break' },
        { id: 'trip-8',  startTime: '18:00', endTime: '20:00', groupKey: 'relationship' },
        { id: 'trip-9',  startTime: '20:00', endTime: '22:00', groupKey: 'mind' },
        { id: 'trip-10', startTime: '22:00', endTime: '00:00', groupKey: 'sleep' },
      ],
    },
    {
      id: 'ct-hustle', name: 'วันทำงานหนัก', emoji: '💪',
      slots: [
        { id: 'hst-0',  startTime: '00:00', endTime: '05:00', groupKey: 'sleep' },
        { id: 'hst-1',  startTime: '05:00', endTime: '06:00', groupKey: 'health' },
        { id: 'hst-2',  startTime: '06:00', endTime: '07:00', groupKey: 'home' },
        { id: 'hst-3',  startTime: '07:00', endTime: '12:00', groupKey: 'career' },
        { id: 'hst-4',  startTime: '12:00', endTime: '13:00', groupKey: 'break' },
        { id: 'hst-5',  startTime: '13:00', endTime: '18:00', groupKey: 'career' },
        { id: 'hst-6',  startTime: '18:00', endTime: '19:00', groupKey: 'home' },
        { id: 'hst-7',  startTime: '19:00', endTime: '22:00', groupKey: 'career' },
        { id: 'hst-8',  startTime: '22:00', endTime: '00:00', groupKey: 'sleep' },
      ],
    },
    {
      id: 'ct-family', name: 'วันครอบครัว', emoji: '👨‍👩‍👧‍👦',
      slots: [
        { id: 'fam-0',  startTime: '00:00', endTime: '07:00', groupKey: 'sleep' },
        { id: 'fam-1',  startTime: '07:00', endTime: '09:00', groupKey: 'home' },
        { id: 'fam-2',  startTime: '09:00', endTime: '12:00', groupKey: 'relationship' },
        { id: 'fam-3',  startTime: '12:00', endTime: '13:00', groupKey: 'break' },
        { id: 'fam-4',  startTime: '13:00', endTime: '17:00', groupKey: 'relationship' },
        { id: 'fam-5',  startTime: '17:00', endTime: '18:00', groupKey: 'break' },
        { id: 'fam-6',  startTime: '18:00', endTime: '20:00', groupKey: 'relationship' },
        { id: 'fam-7',  startTime: '20:00', endTime: '22:00', groupKey: 'break' },
        { id: 'fam-8',  startTime: '22:00', endTime: '00:00', groupKey: 'sleep' },
      ],
    },
    {
      id: 'ct-grow', name: 'วันพัฒนาตัวเอง', emoji: '📚',
      slots: [
        { id: 'grw-0',  startTime: '00:00', endTime: '06:00', groupKey: 'sleep' },
        { id: 'grw-1',  startTime: '06:00', endTime: '07:00', groupKey: 'health' },
        { id: 'grw-2',  startTime: '07:00', endTime: '08:00', groupKey: 'home' },
        { id: 'grw-3',  startTime: '08:00', endTime: '12:00', groupKey: 'mind' },
        { id: 'grw-4',  startTime: '12:00', endTime: '13:00', groupKey: 'break' },
        { id: 'grw-5',  startTime: '13:00', endTime: '17:00', groupKey: 'mind' },
        { id: 'grw-6',  startTime: '17:00', endTime: '18:00', groupKey: 'health' },
        { id: 'grw-7',  startTime: '18:00', endTime: '19:00', groupKey: 'relationship' },
        { id: 'grw-8',  startTime: '19:00', endTime: '21:00', groupKey: 'mind' },
        { id: 'grw-9',  startTime: '21:00', endTime: '00:00', groupKey: 'sleep' },
      ],
    },
  ],
};

/** Merge custom templates: remove old "Trip travel", add missing defaults */
const mergeCustomTemplates = (loaded: CustomScheduleTemplate[]): CustomScheduleTemplate[] => {
  const defaultCTs = DEFAULT_SCHEDULE_TEMPLATES.customTemplates || [];
  // Remove old user-created "Trip travel" (non-default IDs with trip/travel in name)
  const filtered = loaded.filter(t => !(/trip|travel/i.test(t.name) && !t.id.startsWith('ct-')));
  // Add missing default custom templates
  const existingIds = new Set(filtered.map(t => t.id));
  const missing = defaultCTs.filter(t => !existingIds.has(t.id));
  return [...filtered, ...missing];
};

const NAV_ITEMS: { view: View; icon: string; label: string }[] = [
  { view: 'dashboard', icon: 'Activity', label: 'TODAY' },
  { view: 'planner', icon: 'BookOpen', label: 'Planner' },
  { view: 'tasks', icon: 'CheckSquare', label: 'Tasks' },
  { view: 'projects', icon: 'FolderKanban', label: 'Projects' },
  { view: 'expenses', icon: 'Wallet', label: 'Expenses' },
];

// Merge any missing default groups into loaded groups
// Force-update icons & categoryKey for default groups (when defaults change)
const DEFAULT_GROUP_MAP = new Map(DEFAULT_GROUPS.map(g => [g.key, g]));

// Groups that have been permanently removed
const REMOVED_GROUPS = new Set(['เฉพาะกิจ', 'ว่าง']);

const mergeDefaultGroups = (loaded: TaskGroup[]): TaskGroup[] => {
  // Filter out removed groups
  const filtered = loaded.filter(g => !REMOVED_GROUPS.has(g.key));
  const existingKeys = new Set(filtered.map(g => g.key));
  const missing = DEFAULT_GROUPS.filter(g => !existingKeys.has(g.key));
  // Update icons and categoryKey of existing default groups to match latest defaults
  const updated = filtered.map(g => {
    const def = DEFAULT_GROUP_MAP.get(g.key);
    if (def) {
      const patches: Partial<TaskGroup> = {};
      if (def.icon !== g.icon) patches.icon = def.icon;
      if (def.categoryKey && def.categoryKey !== g.categoryKey) patches.categoryKey = def.categoryKey;
      if (Object.keys(patches).length > 0) return { ...g, ...patches };
    }
    return g;
  });
  return missing.length > 0 ? [...updated, ...missing] : updated;
};

// Merge any missing default tasks into loaded tasks (by id prefix 'd-')
// Exclude tasks that user has explicitly deleted
const mergeDefaultTasks = (loaded: Task[], defaults: Task[], deletedIds: string[] = []): Task[] => {
  const deletedSet = new Set(deletedIds);
  // Collect default IDs for งานด่วน/นัดหมาย — these start empty, user adds manually
  const uncatDefaultIds = new Set(defaults.filter(t => t.category === 'งานด่วน' || t.category === 'นัดหมาย').map(t => t.id));
  // Filter out deleted + old default งานด่วน/นัดหมาย tasks
  const filtered = loaded.filter(t => !deletedSet.has(t.id) && !uncatDefaultIds.has(t.id));

  const existingIds = new Set(filtered.map(t => t.id));
  const missing = defaults.filter(t => !existingIds.has(t.id) && !deletedSet.has(t.id) && !uncatDefaultIds.has(t.id));
  return missing.length > 0 ? [...filtered, ...missing] : filtered;
};

// Migrate old task formats to new (no startTime/endTime/recurring)
function migrateTask(t: any): Task {
  const migrated = { ...t };
  // Old format: dueDate → startDate/endDate
  if (migrated.dueDate && !migrated.startDate) {
    migrated.startDate = migrated.dueDate;
    migrated.endDate = migrated.dueDate;
  }
  // Convert old time fields to estimatedDuration
  if (migrated.startTime && migrated.endTime && !migrated.estimatedDuration) {
    const [sh, sm] = migrated.startTime.split(':').map(Number);
    const [eh, em] = migrated.endTime.split(':').map(Number);
    const dur = (eh * 60 + em) - (sh * 60 + sm);
    if (dur > 0) migrated.estimatedDuration = dur;
  }
  // Convert recurring tasks: remove dates (= always active)
  if (migrated.recurring === 'daily') {
    delete migrated.startDate;
    delete migrated.endDate;
  }
  // Remove deprecated fields
  delete migrated.startTime;
  delete migrated.endTime;
  delete migrated.dueDate;
  delete migrated.recurring;
  return migrated as Task;
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<View>(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved && ['dashboard','tasks','focus','analytics','ai-coach','planner','habits','calendar','search','projects','expenses'].includes(saved)) return saved as View;
    } catch {}
    return 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true); // assume true until data loads
  const [enabledModules, setEnabledModules] = useState<string[]>(['planner', 'tasks', 'expenses', 'projects', 'diary']);

  // Daily records state
  const [todayRecords, setTodayRecords] = useState<DailyRecord[]>([]);
  const [totalRecordCount, setTotalRecordCount] = useState(0);
  const [todayFocusSessions, setTodayFocusSessions] = useState<FocusSession[]>([]);

  // Reactive todayStr — updates when day changes (overnight / visibility change)
  const [todayStr, setTodayStr] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const checkDayChange = () => {
      const now = new Date().toISOString().split('T')[0];
      setTodayStr(prev => {
        if (prev !== now) {
          return now;
        }
        return prev;
      });
    };

    // Check when tab becomes visible again
    const onVisibility = () => { if (document.visibilityState === 'visible') checkDayChange(); };
    document.addEventListener('visibilitychange', onVisibility);

    // Also check every 60s as fallback
    const interval = setInterval(checkDayChange, 60_000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(interval);
    };
  }, []);
  const defaultTasks: Task[] = useMemo(() => [
    // ===== ทุกวัน (ไม่ต้องระบุ dayTypes — recurring, no dates) =====
    // 🌅 กิจวัตรทั่วไป — เช้า
    { id: 'd-1', title: 'เช้า : ตื่นนอน ล้างหน้า แปรงฟัน', description: 'ตื่นนอนแล้วล้างหน้า แปรงฟัน เตรียมพร้อมเริ่มวัน', priority: Priority.MEDIUM, completed: false, category: 'กิจวัตร', estimatedDuration: 15 },
    { id: 'd-2', title: 'เช้า : เตรียมอาหารเช้า / กินข้าว', description: 'ทำอาหารเช้าง่ายๆ กินให้อิ่มก่อนเริ่มงาน', priority: Priority.MEDIUM, completed: false, category: 'กิจวัตร', estimatedDuration: 30 },
    { id: 'd-23', title: 'เช้า : อาบน้ำ แต่งตัว', description: 'อาบน้ำเช้า แต่งตัวเตรียมพร้อม', priority: Priority.MEDIUM, completed: false, category: 'กิจวัตร', estimatedDuration: 20 },
    // 🌅 กิจวัตรทั่วไป — เย็น
    { id: 'd-3', title: 'เย็น : อาบน้ำ', description: 'อาบน้ำหลังเลิกงาน ผ่อนคลายร่างกาย', priority: Priority.LOW, completed: false, category: 'กิจวัตร', estimatedDuration: 20 },
    { id: 'd-24', title: 'เย็น : เตรียมตัวนอน', description: 'แปรงฟัน เปลี่ยนชุด ปิดหน้าจอ เตรียมพร้อมเข้านอน', priority: Priority.LOW, completed: false, category: 'กิจวัตร', estimatedDuration: 15 },
    // 💪 สุขภาพ — ทุกวัน
    { id: 'd-14', title: 'ออกกำลังกาย / วิ่ง / เดินเร็ว', description: 'คาร์ดิโอ 30-45 นาที หรือเดินรอบหมู่บ้าน', priority: Priority.HIGH, completed: false, category: 'สุขภาพ', estimatedDuration: 40 },
    { id: 'd-15', title: 'ยืดเหยียด / โยคะ', description: 'ยืดกล้ามเนื้อ ผ่อนคลายร่างกาย', priority: Priority.LOW, completed: false, category: 'สุขภาพ', estimatedDuration: 20 },
    { id: 'd-16', title: 'นั่งสมาธิ / หายใจลึก', description: 'นั่งสมาธิ 10-15 นาที ฝึกจิตให้สงบ', priority: Priority.MEDIUM, completed: false, category: 'สุขภาพ', estimatedDuration: 15 },
    // 🌅 กิจวัตรทั่วไป — กลางวัน
    { id: 'd-21', title: 'เที่ยง : พักเที่ยง / กินข้าวกลางวัน', description: 'กินข้าว พักสมอง เดินเล่นสั้นๆ', priority: Priority.MEDIUM, completed: false, category: 'กิจวัตร', estimatedDuration: 60 },
    // ☕ พักผ่อน — ทุกวัน
    { id: 'd-22', title: 'พักผ่อน / งานอดิเรก', description: 'ดูซีรีส์ เล่นเกม ฟังเพลง หรือพักสายตา', priority: Priority.LOW, completed: false, category: 'พักผ่อน', estimatedDuration: 30 },
    // 🌅 กิจวัตรทั่วไป — มื้อเย็น
    { id: 'd-17', title: 'เย็น : กินข้าวเย็น', description: 'กินข้าวเย็น อาจกินกับครอบครัว', priority: Priority.HIGH, completed: false, category: 'กิจวัตร', estimatedDuration: 30 },
    // 👨‍👩‍👧 ครอบครัว — ทุกวัน (เย็น)
    { id: 'd-18', title: 'เวลาครอบครัว / พูดคุย', description: 'ใช้เวลาด้วยกัน ดูทีวี เล่นเกม หรือคุยกัน', priority: Priority.MEDIUM, completed: false, category: 'ครอบครัว', estimatedDuration: 30 },

    // ===== จ-ศ เท่านั้น (workday) =====
    // 💼 งานหลัก
    { id: 'd-4', title: 'เช็คอีเมล / วางแผนงานวันนี้', description: 'อ่านอีเมล ดู task list จัดลำดับความสำคัญ', priority: Priority.HIGH, completed: false, category: 'งานหลัก', dayTypes: ['workday'], estimatedDuration: 30 },
    { id: 'd-5', title: 'Deep Work — งานหลักช่วงเช้า', description: 'ทำงานที่ต้องใช้สมาธิสูง ปิดแจ้งเตือน', priority: Priority.HIGH, completed: false, category: 'งานหลัก', dayTypes: ['workday'], estimatedDuration: 210 },
    { id: 'd-6', title: 'Deep Work — งานหลักช่วงบ่าย', description: 'ทำงานต่อเนื่องจากช่วงเช้า หรือประชุม', priority: Priority.HIGH, completed: false, category: 'งานหลัก', dayTypes: ['workday'], estimatedDuration: 210 },
    { id: 'd-7', title: 'สรุปงาน / วางแผนพรุ่งนี้', description: 'อัปเดตความคืบหน้า จดสิ่งที่ต้องทำต่อ', priority: Priority.MEDIUM, completed: false, category: 'งานหลัก', dayTypes: ['workday'], estimatedDuration: 30 },
    // 🏠 งานบ้าน — จ-ศ (ช่วงเย็น)
    { id: 'd-8', title: 'ล้างจาน / เก็บครัว', description: 'ทำความสะอาดหลังทำอาหาร', priority: Priority.LOW, completed: false, category: 'งานบ้าน', dayTypes: ['workday'], estimatedDuration: 20 },
    { id: 'd-9', title: 'กวาดบ้าน / ถูพื้น', description: 'ทำความสะอาดพื้นที่ส่วนกลาง', priority: Priority.LOW, completed: false, category: 'งานบ้าน', dayTypes: ['workday'], estimatedDuration: 20 },
    // 🧠 พัฒนาตัวเอง — จ-ศ (ช่วงค่ำ 1 ชม.)
    { id: 'd-11', title: 'อ่านหนังสือ / บทความ', description: 'อ่านหนังสือที่สนใจ หรือบทความเพิ่มความรู้', priority: Priority.MEDIUM, completed: false, category: 'พัฒนาตัวเอง', dayTypes: ['workday'], estimatedDuration: 30 },
    { id: 'd-12', title: 'เรียนออนไลน์ / ฝึกทักษะใหม่', description: 'คอร์สออนไลน์ ดู tutorial หรือฝึกปฏิบัติ', priority: Priority.MEDIUM, completed: false, category: 'พัฒนาตัวเอง', dayTypes: ['workday'], estimatedDuration: 30 },
    // 🔧 ธุระส่วนตัว — จ-ศ (หลังเลิกงาน)
    { id: 'd-23', title: 'ซื้อของใช้ / ของกิน', description: 'ไปตลาด ซื้อของที่จำเป็น', priority: Priority.MEDIUM, completed: false, category: 'ธุระส่วนตัว', dayTypes: ['workday'], estimatedDuration: 45 },

    // ===== เสาร์เท่านั้น (saturday) =====
    { id: 'd-25', title: 'ทำความสะอาดบ้านใหญ่', description: 'ถูพื้น เช็ดกระจก จัดระเบียบ ซักผ้าปูที่นอน', priority: Priority.MEDIUM, completed: false, category: 'งานบ้าน', dayTypes: ['saturday'], estimatedDuration: 120 },
    { id: 'd-26', title: 'ธุระส่วนตัว / ช้อปปิ้ง', description: 'จ่ายตลาด ซื้อของใช้ประจำสัปดาห์ ธุระธนาคาร', priority: Priority.MEDIUM, completed: false, category: 'ธุระส่วนตัว', dayTypes: ['saturday'], estimatedDuration: 90 },
    { id: 'd-27', title: 'เรียนรู้ / Side Project', description: 'คอร์สออนไลน์ อ่านหนังสือ หรือทำโปรเจกต์ส่วนตัว', priority: Priority.MEDIUM, completed: false, category: 'พัฒนาตัวเอง', dayTypes: ['saturday'], estimatedDuration: 120 },
    { id: 'd-28', title: 'กิจกรรมครอบครัว / เที่ยว', description: 'ออกไปเที่ยวด้วยกัน ทำกิจกรรมร่วมกัน', priority: Priority.HIGH, completed: false, category: 'ครอบครัว', dayTypes: ['saturday'], estimatedDuration: 120 },

    // ===== อาทิตย์เท่านั้น (sunday) =====
    { id: 'd-29', title: 'เวลาครอบครัว / ไปวัด / ทำบุญ', description: 'กิจกรรมครอบครัวช่วงเช้า ไปวัด ทำอาหารด้วยกัน', priority: Priority.HIGH, completed: false, category: 'ครอบครัว', dayTypes: ['sunday'], estimatedDuration: 120 },
    { id: 'd-30', title: 'จัดการธุระ / เตรียมของสัปดาห์หน้า', description: 'เตรียมเสื้อผ้า จัดกระเป๋า เตรียมอาหาร', priority: Priority.MEDIUM, completed: false, category: 'ธุระส่วนตัว', dayTypes: ['sunday'], estimatedDuration: 60 },
    { id: 'd-31', title: 'อ่านหนังสือ / วางแผนสัปดาห์', description: 'อ่านหนังสือ ทบทวนเป้าหมาย วางแผนสัปดาห์หน้า', priority: Priority.MEDIUM, completed: false, category: 'พัฒนาตัวเอง', dayTypes: ['sunday'], estimatedDuration: 120 },
    { id: 'd-32', title: 'กินข้าวเย็นครอบครัว / พูดคุยสัปดาห์หน้า', description: 'กินข้าวด้วยกัน คุยเรื่องสัปดาห์หน้า', priority: Priority.HIGH, completed: false, category: 'ครอบครัว', dayTypes: ['sunday'], estimatedDuration: 60 },

    // ===== เสาร์+อาทิตย์ (weekend) =====
    { id: 'd-33', title: 'พักผ่อนเต็มที่ / งานอดิเรก', description: 'ดูหนัง เล่นเกม ทำสวน หรืออะไรก็ได้ที่ชอบ', priority: Priority.LOW, completed: false, category: 'พักผ่อน', dayTypes: ['saturday', 'sunday'], estimatedDuration: 90 },

    // ===== ⚡ งานด่วน — เรื่องเร่งด่วนหลากหลายด้าน =====
    { id: 'd-19', title: 'จ่ายบิล / ค่าน้ำค่าไฟ', description: 'ตรวจสอบและชำระค่าใช้จ่ายรายเดือน', priority: Priority.HIGH, completed: false, category: 'งานด่วน', dayTypes: ['workday'], estimatedDuration: 30 },
    { id: 'd-45', title: 'แก้ปัญหาเร่งด่วนที่ทำงาน', description: 'งาน bug / ลูกค้าร้องเรียน / ระบบล่ม ต้องจัดการทันที', priority: Priority.HIGH, completed: false, category: 'งานด่วน', dayTypes: ['workday'], estimatedDuration: 60 },
    { id: 'd-46', title: 'ติดต่อเรื่องด่วน (โทร/ส่งข้อความ)', description: 'โทรหาคนที่ต้องติดต่อด่วน ตอบข้อความสำคัญ', priority: Priority.HIGH, completed: false, category: 'งานด่วน', estimatedDuration: 15 },
    { id: 'd-47', title: 'ส่งเอกสาร / งานก่อน Deadline', description: 'เอกสารสำคัญที่ต้องส่งภายในวันนี้ หรือใกล้ deadline', priority: Priority.HIGH, completed: false, category: 'งานด่วน', dayTypes: ['workday'], estimatedDuration: 45 },
    { id: 'd-48', title: 'ซ่อมแซมของเสีย (บ้าน/รถ/อุปกรณ์)', description: 'ของเสียที่ต้องซ่อมด่วน น้ำรั่ว ไฟดับ รถเสีย', priority: Priority.HIGH, completed: false, category: 'งานด่วน', estimatedDuration: 60 },
    { id: 'd-49', title: 'ดูแลคนป่วย / เหตุฉุกเฉินครอบครัว', description: 'พาไปหาหมอ ดูแลคนในบ้านที่ไม่สบาย', priority: Priority.HIGH, completed: false, category: 'งานด่วน', estimatedDuration: 120 },
    { id: 'd-50', title: 'เตรียมของสำหรับงาน / อีเว้นท์', description: 'เตรียมอุปกรณ์ เอกสาร ของขวัญ สำหรับงานที่กำลังจะถึง', priority: Priority.HIGH, completed: false, category: 'งานด่วน', estimatedDuration: 45 },
    // 🏠 งานบ้าน — ซักผ้า (ทุกวัน)
    { id: 'd-10', title: 'ซักผ้า / ตากผ้า / พับผ้า', description: 'จัดการเสื้อผ้า', priority: Priority.LOW, completed: false, category: 'งานบ้าน', estimatedDuration: 20 },
    // 🧠 พัฒนาตัวเอง — เขียนบันทึก (ทุกวัน)
    { id: 'd-13', title: 'เขียนบันทึก / วางแผนเป้าหมาย', description: 'Journal สะท้อนตัวเอง ทบทวนเป้าหมาย', priority: Priority.LOW, completed: false, category: 'พัฒนาตัวเอง', estimatedDuration: 15 },
    // 🔧 ธุระส่วนตัว — เอกสาร (มี deadline)
    { id: 'd-24', title: 'จัดการเอกสาร / ธุระธนาคาร', description: 'เอกสารสำคัญ โอนเงิน หรือติดต่อหน่วยงาน', priority: Priority.MEDIUM, completed: false, startDate: todayStr, endDate: '2026-02-28', category: 'ธุระส่วนตัว', dayTypes: ['workday'], estimatedDuration: 60 },

    // ===== กลุ่มที่ยังไม่มี default task =====

    // 📝 งานรอง (career) — งาน side / freelance / รายได้เสริม
    { id: 'd-34', title: 'งานรอง / Freelance / รายได้เสริม', description: 'ทำงานเสริม ตอบลูกค้า หรือพัฒนาช่องทางรายได้', priority: Priority.MEDIUM, completed: false, category: 'งานรอง', dayTypes: ['workday'], estimatedDuration: 60 },
    { id: 'd-35', title: 'วางแผนการเงิน / ทบทวนรายรับ-รายจ่าย', description: 'สรุปค่าใช้จ่าย ดูยอดเงินออม วางแผนเป้าหมายการเงิน', priority: Priority.MEDIUM, completed: false, category: 'งานรอง', dayTypes: ['sunday'], estimatedDuration: 30 },
    { id: 'd-58', title: 'Debug-Me App — พัฒนาแอป Life Planner', description: 'พัฒนาแอป Debug-Me ระบบวางแผนชีวิตประจำวัน (React + TypeScript + Firebase + Gemini AI) ให้ครบ features: Task management, Daily planner, Dashboard, AI Coach, Project timeline, Analytics', priority: Priority.HIGH, completed: false, category: 'งานรอง', dayTypes: ['workday', 'saturday'], estimatedDuration: 240, subtasks: [
      { id: 'ds-1', title: 'ระบบ Task CRUD + Bubble UI + TaskEditModal (3 tabs)', completed: true },
      { id: 'ds-2', title: 'ตารางวัน (Daily Planner) + Custom Day + dayPlans layer', completed: true },
      { id: 'ds-3', title: 'หน้า Dashboard (TODAY) — Hero + Countdown + Done/Skip', completed: true },
      { id: 'ds-4', title: 'AI Coach (Gemini) + Project AI Analyzer', completed: true },
      { id: 'ds-5', title: 'AI Prompt Generator + Import JSON → Timeline', completed: true },
      { id: 'ds-6', title: 'Project Kanban + Timeline view', completed: true },
      { id: 'ds-7', title: 'Analytics Dashboard + Charts', completed: true },
      { id: 'ds-8', title: 'Notification Scheduler (smart timing)', completed: true },
      { id: 'ds-9', title: 'เพิ่มระบบ isUrgent flag สำหรับงานด่วน', completed: false, note: 'ยังไม่ implement — task-level flag สำหรับเน้นงานด่วน' },
      { id: 'ds-10', title: 'ระบบ Habit Tracker + Streak', completed: false, note: 'ติดตาม habit รายวัน แสดง streak calendar' },
      { id: 'ds-11', title: 'Export/Backup ข้อมูลเป็น CSV/JSON', completed: false },
      { id: 'ds-12', title: 'PWA + Offline support', completed: false, note: 'Service Worker, install prompt, offline cache' },
    ] },

    // 🤝 เข้าสังคม (relationship) — เพื่อน / ชุมชน / networking
    { id: 'd-36', title: 'โทร / แชทเพื่อนสนิท', description: 'ติดต่อเพื่อนสนิท ถามไถ่ความเป็นอยู่ รักษาความสัมพันธ์', priority: Priority.LOW, completed: false, category: 'เข้าสังคม', estimatedDuration: 15 },
    { id: 'd-37', title: 'ออกไปเจอเพื่อน / สังสรรค์', description: 'นัดเจอเพื่อน กินข้าว ทำกิจกรรมด้วยกัน', priority: Priority.MEDIUM, completed: false, category: 'เข้าสังคม', dayTypes: ['saturday'], estimatedDuration: 120 },
    { id: 'd-38', title: 'ช่วยเหลือคนรอบข้าง / จิตอาสา', description: 'ทำเรื่องดีๆ เล็กๆ น้อยๆ ให้คนรอบข้าง ทำบุญ บริจาค', priority: Priority.LOW, completed: false, category: 'เข้าสังคม', dayTypes: ['sunday'], estimatedDuration: 60 },

    // 🧘 สงบใจ (mind) — ผ่อนคลายจิตใจ / mindfulness
    { id: 'd-39', title: 'เขียน Gratitude / สิ่งดีๆ วันนี้', description: 'จดสิ่งที่รู้สึกขอบคุณ 3 ข้อ สะท้อนตัวเองก่อนนอน', priority: Priority.LOW, completed: false, category: 'สงบใจ', estimatedDuration: 10 },
    { id: 'd-40', title: 'ฟังเพลงผ่อนคลาย / เสียงธรรมชาติ', description: 'ฟังเพลงเบาๆ White Noise หรือเสียงธรรมชาติ ปล่อยวางสมอง', priority: Priority.LOW, completed: false, category: 'สงบใจ', estimatedDuration: 15 },
    { id: 'd-41', title: 'สวดมนต์ / อ่านธรรมะ', description: 'สวดมนต์ก่อนนอน หรืออ่านข้อคิดดีๆ เติมพลังจิตใจ', priority: Priority.LOW, completed: false, category: 'สงบใจ', estimatedDuration: 15 },

    // ⏸️ Breaking (break) — พักระหว่างวัน
    { id: 'd-42', title: 'พักสายตา / เดินเล่นสั้นๆ', description: 'ลุกจากโต๊ะ เดินยืดเส้น พักสายตาจากหน้าจอ 5-10 นาที', priority: Priority.LOW, completed: false, category: 'Breaking', dayTypes: ['workday'], estimatedDuration: 10 },
    { id: 'd-43', title: 'ดื่มน้ำ / ทานของว่าง', description: 'ดื่มน้ำให้เพียงพอ ทานผลไม้หรือของว่างเบาๆ', priority: Priority.LOW, completed: false, category: 'Breaking', estimatedDuration: 10 },

    // 📅 นัดหมาย — นัดหมายหลายประเภทตามเป้าหมาย
    { id: 'd-44', title: 'ตรวจสอบนัดหมายประจำสัปดาห์', description: 'เช็คปฏิทิน ยืนยันนัดหมาย เตรียมตัวล่วงหน้า', priority: Priority.MEDIUM, completed: false, category: 'นัดหมาย', dayTypes: ['workday'], estimatedDuration: 10 },
    { id: 'd-20', title: 'นัดหมอ / ตรวจสุขภาพ', description: 'นัดพบแพทย์ ทันตแพทย์ ตรวจสุขภาพประจำปี', priority: Priority.HIGH, completed: false, category: 'นัดหมาย', estimatedDuration: 60 },
    { id: 'd-51', title: 'นัดประชุม / ประชุมออนไลน์', description: 'ประชุมทีม ประชุมลูกค้า หรือ video call สำคัญ', priority: Priority.HIGH, completed: false, category: 'นัดหมาย', dayTypes: ['workday'], estimatedDuration: 60 },
    { id: 'd-52', title: 'นัดเพื่อน / กินข้าว / สังสรรค์', description: 'นัดเจอเพื่อน กินข้าว ทำกิจกรรมด้วยกัน', priority: Priority.MEDIUM, completed: false, category: 'นัดหมาย', estimatedDuration: 120 },
    { id: 'd-53', title: 'นัดช่างซ่อม / ช่างต่างๆ', description: 'นัดช่างซ่อมแอร์ ช่างไฟ ช่างประปา หรือช่างอื่นๆ', priority: Priority.MEDIUM, completed: false, category: 'นัดหมาย', estimatedDuration: 60 },
    { id: 'd-54', title: 'นัดทำธุระราชการ / ธนาคาร', description: 'นัดทำบัตร ต่อทะเบียน จัดการเอกสารราชการ ธนาคาร', priority: Priority.MEDIUM, completed: false, category: 'นัดหมาย', dayTypes: ['workday'], estimatedDuration: 90 },
    { id: 'd-55', title: 'นัดทำผม / สปา / ดูแลตัวเอง', description: 'ตัดผม ทำเล็บ นวดผ่อนคลาย ดูแลตัวเอง', priority: Priority.LOW, completed: false, category: 'นัดหมาย', estimatedDuration: 90 },
    { id: 'd-56', title: 'นัดรับ-ส่งของ / พัสดุ', description: 'รอรับพัสดุ นัดส่งของ หรือไปรับสินค้าที่สั่ง', priority: Priority.MEDIUM, completed: false, category: 'นัดหมาย', estimatedDuration: 30 },
    { id: 'd-57', title: 'นัดพบครู / อาจารย์ / ที่ปรึกษา', description: 'ประชุมผู้ปกครอง พบอาจารย์ที่ปรึกษา หรือ mentor', priority: Priority.MEDIUM, completed: false, category: 'นัดหมาย', estimatedDuration: 60 },

  ], [todayStr]);

  // ===== Data state (synced via Firestore) =====
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [scheduleTemplates, setScheduleTemplates] = useState<ScheduleTemplates>(DEFAULT_SCHEDULE_TEMPLATES);
  const [deletedDefaultTaskIds, setDeletedDefaultTaskIds] = useState<string[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [diarySearch, setDiarySearch] = useState('');
  const [balanceItems, setBalanceItems] = useState<BalanceItem[]>([]);
  const [firestoreLoading, setFirestoreLoading] = useState(true);
  const firestoreReadyRef = useRef(false);
  const isRemoteUpdateRef = useRef(false);
  const saveVersionRef = useRef(0); // version counter: only latest save can reset isRemoteUpdateRef
  const [isDirty, setIsDirty] = useState(false);

  // ===== Online/Offline detection =====
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  // ===== Undo system =====
  const { push: pushUndo, undo, toast: undoToast, dismissToast } = useUndoStack();

  // ===== Notification settings (device-local) =====
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    try { return localStorage.getItem('debugme-notif') === 'true'; } catch { return false; }
  });
  const [reminderMinutes, setReminderMinutes] = useState(() => {
    try { return parseInt(localStorage.getItem('debugme-reminder-min') || '5'); } catch { return 5; }
  });
  const [showNotifSettings, setShowNotifSettings] = useState(false);

  // Behavior patterns for smart reminders (cached in state)
  const [behaviorPatterns, setBehaviorPatterns] = useState<Map<string, BehaviorPattern>>(new Map());

  // Load behavior patterns (30 days of records) — once on login, recalculate weekly
  useEffect(() => {
    if (!user || firestoreLoading) return;
    const cacheKey = 'debugme-behavior-patterns-date';
    const lastCalc = localStorage.getItem(cacheKey);
    const now = new Date().toISOString().split('T')[0];
    // Only recalculate weekly
    if (lastCalc && lastCalc > new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]) return;

    (async () => {
      try {
        const end = new Date();
        const start = new Date(Date.now() - 30 * 86400000);
        const records = await getDailyRecordsInRange(user.uid, start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
        const dayType = getDayType(new Date());
        const slots = scheduleTemplates[dayType] || [];
        const patterns = analyzeBehaviorPatterns(records, slots);
        setBehaviorPatterns(patterns);
        localStorage.setItem(cacheKey, now);
      } catch (err) {
        console.error('Failed to analyze behavior patterns:', err);
      }
    })();
  }, [user, firestoreLoading]);

  useNotificationScheduler(scheduleTemplates, taskGroups, notificationsEnabled, reminderMinutes, behaviorPatterns);

  // Location-based reminders
  useLocationReminders(tasks, notificationsEnabled);

  // Load today's daily records from Firestore
  const loadTodayRecords = useCallback(async () => {
    if (!user) return;
    try {
      const records = await getDailyRecordsByDate(user.uid, todayStr);
      setTodayRecords(records);
      const count = await getDailyRecordCount(user.uid);
      setTotalRecordCount(count);
    } catch (err) {
      console.error('Failed to load daily records:', err);
    }
  }, [todayStr, user]);

  // Save a daily record to Firestore
  const handleSaveDailyRecord = useCallback(async (record: DailyRecord) => {
    if (!user) return;
    try {
      await addDailyRecordFS(user.uid, record);
      await loadTodayRecords();
    } catch (err) {
      console.error('Failed to save daily record:', err);
    }
  }, [loadTodayRecords, user]);

  // Mark a task as completed (for non-recurring tasks, called from Dashboard)
  const handleTaskComplete = useCallback((taskId: string, completed: boolean) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, completed, completedAt: completed ? new Date().toISOString() : undefined }
        : t
    ));
  }, []);

  // Load today's focus sessions
  const loadTodayFocusSessions = useCallback(async () => {
    if (!user) return;
    try {
      const sessions = await getFocusSessionsByDate(user.uid, todayStr);
      setTodayFocusSessions(sessions);
    } catch (err) {
      console.error('Failed to load focus sessions:', err);
    }
  }, [todayStr, user]);

  // Save a focus session to Firestore
  const handleSaveFocusSession = useCallback(async (session: FocusSession) => {
    if (!user) return;
    try {
      await addFocusSessionFS(user.uid, session);
      await loadTodayFocusSessions();
    } catch (err) {
      console.error('Failed to save focus session:', err);
    }
  }, [loadTodayFocusSessions, user]);

  // Dirty state: tracks unsaved local changes
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Subscribe to Firestore real-time updates when user logs in
  useEffect(() => {
    if (!user) {
      firestoreReadyRef.current = false;
      setFirestoreLoading(true);
      return;
    }

    loadTodayRecords();
    loadTodayFocusSessions();

    const unsubscribe = subscribeAppData(user.uid, (data) => {
      const wasOwnSave = isRemoteUpdateRef.current;
      firestoreReadyRef.current = true;

      // If this is an echo from our own save, skip all state updates.
      if (wasOwnSave) {
        setFirestoreLoading(false);
        return;
      }

      if (data) {
        // Collect all changes that need to be saved back (consolidated into 1 write)
        const saveBack: Record<string, unknown> = {};

        // Migrate old tasks if needed
        const migratedTasks = (data.tasks || []).map(migrateTask);
        const needsMigration = (data.tasks || []).some((t: any) => t.dueDate && !t.startDate);

        // Load deleted default task IDs
        const deletedIds = data.deletedDefaultTaskIds || [];
        setDeletedDefaultTaskIds(deletedIds);

        // Merge missing default tasks into existing user's tasks (exclude deleted ones)
        const mergedTasks = mergeDefaultTasks(migratedTasks, defaultTasks, deletedIds);
        setTasks(mergedTasks);

        // Groups: merge defaults + fix icons/categoryKey
        if (data.groups) {
          const mergedGroups = mergeDefaultGroups(data.groups);
          setTaskGroups(mergedGroups);
          const groupsChanged = data.groups.some((g: TaskGroup) => {
            const def = DEFAULT_GROUP_MAP.get(g.key);
            return def && (g.icon !== def.icon || g.categoryKey !== def.categoryKey);
          });
          if (groupsChanged || mergedGroups.length > data.groups.length) {
            saveBack.groups = mergedGroups;
          }
        }

        // Milestones: merge missing defaults + fix known timing issues
        if (data.milestones?.length) {
          let ms = data.milestones as Milestone[];
          let msChanged = false;
          ms = ms.map(m => {
            if (m.id === 'ms-2' && m.time === '09:00') { msChanged = true; return { ...m, time: '07:00' }; }
            return m;
          });
          const existingIds = new Set(ms.map(m => m.id));
          const missingMs = DEFAULT_MILESTONES.filter(m => !existingIds.has(m.id));
          if (missingMs.length > 0) { ms = [...ms, ...missingMs]; msChanged = true; }
          setMilestones(ms);
          if (msChanged) saveBack.milestones = ms;
        } else {
          setMilestones(DEFAULT_MILESTONES);
        }

        // Schedule templates migration
        // Detect old group-key-based slots (Thai names) and reset to category-based defaults
        const CATEGORY_KEYS = new Set(DEFAULT_CATEGORIES.map(c => c.key));
        const hasOldGroupKeys = (slots: any[]) =>
          (slots || []).some((s: any) => s.groupKey && !CATEGORY_KEYS.has(s.groupKey));

        if (data.scheduleTemplates) {
          const tpl = data.scheduleTemplates;
          const validSlots = (arr: any[]) => (arr || []).filter((s: any) => s.groupKey && (s.duration !== undefined || (s.startTime && s.endTime)));
          const vWork = validSlots(tpl.workday);
          const vSat = validSlots(tpl.saturday);
          const vSun = validSlots(tpl.sunday);

          // Migration: Reset to defaults if old group keys (Thai names instead of category keys)
          const oldKeys = hasOldGroupKeys(vWork) || hasOldGroupKeys(vSat) || hasOldGroupKeys(vSun);

          const mergedCTs = mergeCustomTemplates(Array.isArray(tpl.customTemplates) ? tpl.customTemplates : []);

          if (!wasOwnSave && oldKeys) {
            const migrated: ScheduleTemplates = {
              ...DEFAULT_SCHEDULE_TEMPLATES,
              customTemplates: mergedCTs,
              dayPlans: tpl.dayPlans || undefined,
              dayOverrides: tpl.dayOverrides || undefined,
              dateOverrides: tpl.dateOverrides || undefined,
            };
            setScheduleTemplates(migrated);
            saveBack.scheduleTemplates = migrated;
          } else {
            const fixed: ScheduleTemplates = {
              workday: vWork,
              saturday: vSat,
              sunday: vSun,
              wakeTime: tpl.wakeTime || '05:00',
              sleepTime: tpl.sleepTime || '22:00',
              scheduleVersion: tpl.scheduleVersion,
              customTemplates: mergedCTs,
              dayPlans: tpl.dayPlans || undefined,
              dayOverrides: tpl.dayOverrides || undefined,
              dateOverrides: tpl.dateOverrides || undefined,
            };

            // V2 migration: convert startTime/endTime slots to duration-based
            if (!fixed.scheduleVersion || fixed.scheduleVersion < 2) {
              const wake = fixed.wakeTime || '05:00';
              const sleep = fixed.sleepTime || '22:00';
              fixed.workday = migrateV1Slots(fixed.workday, wake, sleep);
              fixed.saturday = migrateV1Slots(fixed.saturday, wake, sleep);
              fixed.sunday = migrateV1Slots(fixed.sunday, wake, sleep);
              if (fixed.customTemplates) {
                fixed.customTemplates = fixed.customTemplates.map(ct => ({
                  ...ct,
                  slots: migrateV1Slots(ct.slots, ct.wakeTime || wake, ct.sleepTime || sleep),
                }));
              }
              if (fixed.dayPlans) {
                for (const key of Object.keys(fixed.dayPlans)) {
                  fixed.dayPlans[key] = migrateV1Slots(fixed.dayPlans[key], wake, sleep);
                }
              }
              fixed.scheduleVersion = 2;
              saveBack.scheduleTemplates = fixed;
            }

            setScheduleTemplates(fixed);
          }
        } else if (data.schedule && data.schedule.length > 0) {
          setScheduleTemplates(DEFAULT_SCHEDULE_TEMPLATES);
          saveBack.scheduleTemplates = DEFAULT_SCHEDULE_TEMPLATES;
        } else {
          setScheduleTemplates(DEFAULT_SCHEDULE_TEMPLATES);
        }

        // Habits
        if (data.habits) {
          setHabits(data.habits);
        } else {
          setHabits([]);
        }

        // Projects
        if (data.projects !== undefined) {
          setProjects(data.projects || []);
        } else {
          setProjects([]);
          saveBack.projects = [];
        }
        // Expenses
        if (data.expenses !== undefined) {
          setExpenses(data.expenses || []);
        } else {
          // Field missing in Firestore — initialize it so future saves don't lose data
          setExpenses([]);
          saveBack.expenses = [];
        }

        // Balance items
        if (data.balanceItems !== undefined) {
          setBalanceItems(data.balanceItems || []);
        } else {
          setBalanceItems([]);
          saveBack.balanceItems = [];
        }

        // Tasks: save back if migration or new defaults added
        if (needsMigration || mergedTasks.length > migratedTasks.length) {
          saveBack.tasks = mergedTasks;
          saveBack.milestones = saveBack.milestones || data.milestones || DEFAULT_MILESTONES;
          saveBack.deletedDefaultTaskIds = deletedIds;
        }

        // Load onboarding state
        if (data.onboardingCompleted !== undefined) setOnboardingCompleted(data.onboardingCompleted);
        if (data.enabledModules) setEnabledModules(data.enabledModules);

        if (Object.keys(saveBack).length > 0 && !wasOwnSave) {
          saveAppData(user.uid, saveBack);
        }
      } else {
        // First time user — show onboarding
        setOnboardingCompleted(false);
        setTasks(defaultTasks);
        setTaskGroups(DEFAULT_GROUPS);
        setMilestones(DEFAULT_MILESTONES);
        setScheduleTemplates(DEFAULT_SCHEDULE_TEMPLATES);
        setDeletedDefaultTaskIds([]);
        setHabits([]);
        saveAppData(user.uid, {
          tasks: defaultTasks,
          groups: DEFAULT_GROUPS,
          milestones: DEFAULT_MILESTONES,
          scheduleTemplates: DEFAULT_SCHEDULE_TEMPLATES,
          deletedDefaultTaskIds: [],
          habits: [],
          projects: [],
          expenses: [],
        });
      }
      setFirestoreLoading(false);
    });

    return () => unsubscribe();
  }, [user, loadTodayRecords, loadTodayFocusSessions]);

  // Auto-save: debounce 1.5s after any local change
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!firestoreReadyRef.current || !user) return;

    // IMMEDIATELY increment version + block echoes when state changes
    // This ensures old save timeouts can't reset the flag prematurely
    const myVersion = ++saveVersionRef.current;
    isRemoteUpdateRef.current = true;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setIsDirty(true);
    setSaveStatus('idle');

    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await saveAppData(user.uid, { tasks, groups: taskGroups, milestones, scheduleTemplates, deletedDefaultTaskIds, habits, projects, expenses, balanceItems }, false);
        setIsDirty(false);
        setSaveStatus('saved');
        setTimeout(() => {
          if (saveVersionRef.current === myVersion) {
            setSaveStatus('idle');
            isRemoteUpdateRef.current = false;
          }
        }, 2000);
      } catch (err) {
        console.error('[DebugMe] Auto-save failed:', err);
        setSaveStatus('idle');
        if (saveVersionRef.current === myVersion) {
          isRemoteUpdateRef.current = false;
        }
      }
    }, 1500);

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [tasks, taskGroups, milestones, scheduleTemplates, deletedDefaultTaskIds, habits, projects, expenses, balanceItems, user]);

  useEffect(() => { localStorage.setItem(VIEW_KEY, activeView); }, [activeView]);

  const handleExportData = () => {
    const data = {
      version: 3,
      exportedAt: new Date().toISOString(),
      tasks,
      groups: taskGroups,
      milestones,
      scheduleTemplates,
      deletedDefaultTaskIds,
      habits,
      projects,
      expenses,
      balanceItems,
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
          if (data.tasks) setTasks(data.tasks.map(migrateTask));
          if (data.groups) setTaskGroups(data.groups);
          if (data.milestones) setMilestones(data.milestones);
          if (data.scheduleTemplates) setScheduleTemplates(data.scheduleTemplates);
          if (data.deletedDefaultTaskIds) setDeletedDefaultTaskIds(data.deletedDefaultTaskIds);
          if (data.habits) setHabits(data.habits);
          if (data.projects) setProjects(data.projects);
          if (data.expenses) setExpenses(data.expenses);
          if (data.balanceItems) setBalanceItems(data.balanceItems);
          alert('นำเข้าข้อมูลสำเร็จ!');
        } catch {
          alert('ไฟล์ไม่ถูกต้อง');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Immediate save to Firestore (for delete/critical operations)
  const handleImmediateSave = useCallback(async (updatedTasks?: Task[], updatedDeletedIds?: string[]) => {
    if (!user) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const myVersion = ++saveVersionRef.current;
    isRemoteUpdateRef.current = true;
    try {
      const dataToSave = {
        tasks: updatedTasks || tasks,
        groups: taskGroups,
        milestones,
        scheduleTemplates,
        deletedDefaultTaskIds: updatedDeletedIds || deletedDefaultTaskIds,
        habits,
        projects,
        expenses,
        balanceItems,
      };
      await saveAppData(user.uid, dataToSave, false);
      setTimeout(() => {
        if (saveVersionRef.current === myVersion) {
          isRemoteUpdateRef.current = false;
        }
      }, 2000);
    } catch (err) {
      console.error('[DebugMe] Immediate save failed:', err);
      if (saveVersionRef.current === myVersion) {
        isRemoteUpdateRef.current = false;
      }
    }
  }, [user, tasks, taskGroups, milestones, scheduleTemplates, deletedDefaultTaskIds, habits, projects, expenses]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = () => { signOut(auth); };
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      await deleteUser(user);
    } catch {
      alert('ลบบัญชีไม่สำเร็จ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่ แล้วลองอีกครั้ง');
    }
  };

  const handleNavItemClick = (view: View) => {
    setActiveView(view);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  // Pending slot: passed from Dashboard → Planner
  const [pendingSlot, setPendingSlot] = useState<{ startTime: string; endTime: string } | null>(null);
  // Pending group: passed from Dashboard → TaskManager
  const [pendingGroupKey, setPendingGroupKey] = useState<string | null>(null);

  const handleNavigateToPlanner = (startTime: string, endTime: string) => {
    setPendingSlot({ startTime, endTime });
    setActiveView('planner');
  };

  const handleNavigateToGroup = (groupKey: string) => {
    setPendingGroupKey(groupKey);
    setActiveView('tasks');
    // Clear after a tick so it doesn't re-trigger
    setTimeout(() => setPendingGroupKey(null), 100);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard tasks={tasks} taskGroups={taskGroups} scheduleTemplates={scheduleTemplates} todayRecords={todayRecords} onSaveDailyRecord={handleSaveDailyRecord} onTaskComplete={handleTaskComplete} onSaveFocusSession={handleSaveFocusSession} onNavigateToPlanner={handleNavigateToPlanner} onNavigateToGroup={handleNavigateToGroup} expenses={expenses} />;
      case 'planner': return <Suspense fallback={<LazyFallback />}><DailyPlanner tasks={tasks} setTasks={setTasks} taskGroups={taskGroups} milestones={milestones} scheduleTemplates={scheduleTemplates} setScheduleTemplates={setScheduleTemplates} todayRecords={todayRecords} onSaveDailyRecord={handleSaveDailyRecord} deletedDefaultTaskIds={deletedDefaultTaskIds} setDeletedDefaultTaskIds={setDeletedDefaultTaskIds} onImmediateSave={handleImmediateSave} pendingSlot={pendingSlot} onPendingSlotHandled={() => setPendingSlot(null)} defaultScheduleTemplates={DEFAULT_SCHEDULE_TEMPLATES} /></Suspense>;
      case 'tasks': return <Suspense fallback={<LazyFallback />}><TaskManager tasks={tasks} setTasks={setTasks} taskGroups={taskGroups} setTaskGroups={setTaskGroups} deletedDefaultTaskIds={deletedDefaultTaskIds} setDeletedDefaultTaskIds={setDeletedDefaultTaskIds} onImmediateSave={handleImmediateSave} initialGroupKey={pendingGroupKey} defaultTasks={defaultTasks} /></Suspense>;
      case 'focus': return <Suspense fallback={<LazyFallback />}><FocusTimer onSaveFocusSession={handleSaveFocusSession} todayFocusSessions={todayFocusSessions} /></Suspense>;
      case 'analytics': return <Suspense fallback={<LazyFallback />}><Analytics tasks={tasks} taskGroups={taskGroups} scheduleTemplates={scheduleTemplates} todayRecords={todayRecords} totalRecordCount={totalRecordCount} userId={user!.uid} /></Suspense>;
      case 'calendar': return <Suspense fallback={<LazyFallback />}><CalendarView tasks={tasks} taskGroups={taskGroups} scheduleTemplates={scheduleTemplates} userId={user!.uid} /></Suspense>;
      case 'projects': return <Suspense fallback={<LazyFallback />}><ProjectManager projects={projects} setProjects={setProjects} tasks={tasks} setTasks={setTasks} taskGroups={taskGroups} onImmediateSave={handleImmediateSave} /></Suspense>;
      case 'expenses': return <Suspense fallback={<LazyFallback />}><ExpenseTracker expenses={expenses} setExpenses={setExpenses} balanceItems={balanceItems} setBalanceItems={setBalanceItems} /></Suspense>;
      case 'diary': return <Suspense fallback={<LazyFallback />}><DiaryView userId={user!.uid} searchQuery={diarySearch} /></Suspense>;
      default: return <Dashboard tasks={tasks} taskGroups={taskGroups} scheduleTemplates={scheduleTemplates} todayRecords={todayRecords} onSaveDailyRecord={handleSaveDailyRecord} onTaskComplete={handleTaskComplete} onSaveFocusSession={handleSaveFocusSession} onNavigateToPlanner={handleNavigateToPlanner} onNavigateToGroup={handleNavigateToGroup} />;
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

  if (firestoreLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-emerald-50 flex-col gap-3">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-emerald-600 font-medium">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  // Show onboarding wizard for new users
  if (!onboardingCompleted) {
    return (
      <OnboardingWizard
        onComplete={async (result) => {
          setOnboardingCompleted(true);
          setEnabledModules(result.enabledModules);
          setScheduleTemplates(prev => ({ ...prev, wakeTime: result.wakeTime, sleepTime: result.sleepTime }));
          if (user) {
            await saveAppData(user.uid, {
              onboardingCompleted: true,
              enabledModules: result.enabledModules,
              scheduleTemplates: { ...scheduleTemplates, wakeTime: result.wakeTime, sleepTime: result.sleepTime },
            });
          }
        }}
      />
    );
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
            {enabledModules.includes('diary') && <NavItem icon={<PenLine />} label="Diary" active={activeView === 'diary'} onClick={() => handleNavItemClick('diary')} />}
            <NavItem icon={<BarChart3 />} label="Analyst" active={activeView === 'analytics'} onClick={() => handleNavItemClick('analytics')} />
            <NavItem icon={<CalendarDays />} label="Calendar" active={activeView === 'calendar'} onClick={() => handleNavItemClick('calendar')} />
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

              {/* Offline indicator */}
              {!isOnline && (
                <div className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl border bg-amber-50 border-amber-200 text-amber-600">
                  <WifiOff className="w-3.5 h-3.5" /> ออฟไลน์
                </div>
              )}

              {/* Auto-save status */}
              <div className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl border transition-all ${
                saveStatus === 'saving'
                  ? 'bg-blue-50 border-blue-200 text-blue-500'
                  : saveStatus === 'saved'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                {saveStatus === 'saving' ? (
                  <><span className="w-3 h-3 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" /> กำลังบันทึก...</>
                ) : saveStatus === 'saved' ? (
                  <><Cloud className="w-3.5 h-3.5" /> บันทึกแล้ว</>
                ) : (
                  <><Cloud className="w-3.5 h-3.5" /> Auto-save</>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={handleExportData} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors border border-emerald-200">
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
                <button onClick={handleImportData} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-blue-200">
                  <Upload className="w-3.5 h-3.5" /> Import
                </button>
              </div>

              {/* Daily Records Counter */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Daily Records</span>
                  <span className="ml-auto text-xs font-black text-violet-600">{totalRecordCount}</span>
                </div>
              </div>
              <button onClick={handleSignOut} className="w-full py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0">
                ออกจากระบบ
              </button>
              <button onClick={() => setShowDeleteAccount(true)} className="w-full py-2 text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors shrink-0">
                ลบบัญชี
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {(activeView !== 'dashboard' && activeView !== 'diary') && (
          <header className="h-12 flex items-center px-4 shrink-0 sticky top-0 z-30 bg-emerald-600 lg:h-16 lg:px-10">
            <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-emerald-500 lg:hidden text-white/80 mr-3">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white capitalize tracking-tight lg:text-2xl flex-1">
              {activeView === 'planner' ? 'Daily Planner' : activeView === 'calendar' ? 'Calendar' : activeView === 'projects' ? 'Projects' : activeView === 'expenses' ? 'Expenses' : activeView}
            </h2>
            <button onClick={() => setShowNotifSettings(true)} className="p-2 rounded-lg hover:bg-emerald-500 text-white/80">
              <Bell className="w-5 h-5" />
            </button>
          </header>
        )}
        {activeView === 'diary' && (
          <header className="h-12 flex items-center gap-2 px-4 shrink-0 sticky top-0 z-30 bg-emerald-600 lg:h-16 lg:px-10">
            <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-emerald-500 lg:hidden text-white/80">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white tracking-tight lg:text-2xl shrink-0">Diary</h2>
            <div className="flex-1" />
            <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1.5 w-[180px]">
              <Search className="w-3.5 h-3.5 text-white/50 shrink-0" />
              <input
                value={diarySearch}
                onChange={e => setDiarySearch(e.target.value)}
                placeholder="ค้นหา..."
                className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/40"
              />
              {diarySearch && <button onClick={() => setDiarySearch('')}><X className="w-3 h-3 text-white/50" /></button>}
            </div>
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

        {/* Mobile Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 z-[60] lg:hidden">
          <div className="bg-white/90 backdrop-blur-md border-t border-slate-200 safe-bottom">
            <div className="flex items-center justify-around h-14">
              {NAV_ITEMS.filter(item => item.view === 'dashboard' || enabledModules.includes(item.view)).map(item => {
                const isActive = activeView === item.view;
                const Icon = item.icon === 'Activity' ? Activity
                  : item.icon === 'CheckSquare' ? CheckSquare
                  : item.icon === 'BookOpen' ? BookOpen
                  : item.icon === 'Wallet' ? Wallet
                  : FolderKanban;
                return (
                  <button
                    key={item.view}
                    onClick={() => setActiveView(item.view)}
                    className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
                      isActive ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className={`text-[10px] font-bold ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Undo Toast */}
        <UndoToast action={undoToast} onUndo={undo} onDismiss={dismissToast} />

        {/* Delete Account Confirmation */}
        {showDeleteAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteAccount(false)}>
            <div className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-black text-rose-600 text-center">ลบบัญชี</h3>
              <p className="text-xs text-slate-500 text-center">เมื่อลบบัญชีแล้ว ข้อมูลทั้งหมดจะหายไปถาวร ไม่สามารถกู้คืนได้</p>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteAccount(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500">ยกเลิก</button>
                <button onClick={handleDeleteAccount} className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600">ลบบัญชีถาวร</button>
              </div>
            </div>
          </div>
        )}
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
