
export enum Priority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export interface TaskAttachment {
  type: 'photo' | 'video' | 'audio' | 'phone' | 'contact' | 'gps';
  label: string;
  value: string;
  preview?: string;
}

// SubTask — รายการย่อยภายใน Task (todo list)
export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  note?: string;  // per-item detail/note
}

// Recurrence — การทำซ้ำขั้นสูง
export interface Recurrence {
  pattern: 'daily' | 'every_x_days' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;        // every_x_days: ทุก X วัน
  weekDays?: number[];      // weekly: 0=อา, 1=จ, ..., 6=ส
  monthDay?: number;        // monthly: วันที่ 1-31
  monthDate?: { month: number; day: number }; // yearly
}

// LocationReminder — แจ้งเตือนตาม GPS
export interface LocationReminder {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;             // meters
  label: string;              // e.g. "บ้าน", "ออฟฟิศ"
  triggerOn: 'enter' | 'exit' | 'both';
  enabled: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  completed: boolean;
  startDate?: string;    // YYYY-MM-DD (optional — omit for recurring tasks)
  endDate?: string;      // YYYY-MM-DD
  category: string;
  notes?: string;
  attachments?: TaskAttachment[];
  dayTypes?: DayType[];   // e.g. ['workday'] = จ-ศ only, undefined = ทุกวัน
  startTime?: string;    // HH:MM — for calendar scheduling
  endTime?: string;      // HH:MM
  estimatedDuration?: number;  // minutes
  completedAt?: string;        // ISO timestamp
  subtasks?: SubTask[];         // งานย่อย
  recurrence?: Recurrence;      // การทำซ้ำขั้นสูง
  locationReminder?: LocationReminder;  // แจ้งเตือนตามพิกัด
}

export interface Milestone {
  id: string;
  title: string;
  emoji: string;
  time: string;       // HH:MM
  icon: string;
  color: string;      // Tailwind color classes e.g. 'bg-amber-50 border-amber-300 text-amber-700'
}

export interface TimeSlot {
  id: string;
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  groupKey: string;   // references TaskGroup.key
  assignedTaskIds?: string[];  // task IDs explicitly assigned to this slot
  excludedTaskIds?: string[];  // task IDs excluded from auto-matching
}

export type DayType = 'workday' | 'saturday' | 'sunday';

export interface CustomScheduleTemplate {
  id: string;
  name: string;
  emoji: string;
  slots: TimeSlot[];
}

export interface ScheduleTemplates {
  workday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
  customTemplates?: CustomScheduleTemplate[];
  dayPlans?: { [dayOfWeek: string]: TimeSlot[] };  // "0"-"6" → per-day customized schedule
  dayOverrides?: { [dayOfWeek: string]: string };   // "0"-"6" → custom template overlay (removable)
  dateOverrides?: { [date: string]: string };       // "YYYY-MM-DD" → custom template ID
}

/** Resolve schedule slots for a specific day of week (+ optional date for date-specific overrides) */
// Special override value: marks a day as "cleared" (no slots)
export const CLEAR_OVERRIDE = '__clear__';

export function getScheduleForDay(
  templates: ScheduleTemplates,
  dayOfWeek: number,
  dateStr?: string
): { slots: TimeSlot[]; source: 'base' | 'custom' | 'cleared' | 'dayPlan'; templateId?: string; templateName?: string; templateEmoji?: string; overrideType?: 'date' | 'day' } {
  // 1. Date-specific override (highest priority)
  if (dateStr && templates.dateOverrides?.[dateStr]) {
    if (templates.dateOverrides[dateStr] === CLEAR_OVERRIDE) {
      return { slots: [], source: 'cleared', overrideType: 'date' };
    }
    const ct = (templates.customTemplates || []).find(t => t.id === templates.dateOverrides![dateStr]);
    if (ct) return { slots: ct.slots, source: 'custom', templateId: ct.id, templateName: ct.name, templateEmoji: ct.emoji, overrideType: 'date' };
  }
  // 2. Day-of-week custom template overlay
  const overrideId = templates.dayOverrides?.[String(dayOfWeek)];
  if (overrideId) {
    if (overrideId === CLEAR_OVERRIDE) {
      return { slots: [], source: 'cleared', overrideType: 'day' };
    }
    const ct = (templates.customTemplates || []).find(t => t.id === overrideId);
    if (ct) return { slots: ct.slots, source: 'custom', templateId: ct.id, templateName: ct.name, templateEmoji: ct.emoji, overrideType: 'day' };
  }
  // 3. Per-day plan (user's edits for this specific day of week)
  const dayPlan = templates.dayPlans?.[String(dayOfWeek)];
  if (dayPlan !== undefined) {
    return { slots: dayPlan, source: 'dayPlan' };
  }
  // 4. Fallback to base template
  if (dayOfWeek === 0) return { slots: templates.sunday, source: 'base' };
  if (dayOfWeek === 6) return { slots: templates.saturday, source: 'base' };
  return { slots: templates.workday, source: 'base' };
}

/** Determine the day type from a Date object */
export function getDayType(date: Date): DayType {
  const dow = date.getDay(); // 0=Sun, 6=Sat
  if (dow === 0) return 'sunday';
  if (dow === 6) return 'saturday';
  return 'workday';
}

/** Get tasks that fall on a specific date (respects dayTypes, recurrence) */
export function getTasksForDate(tasks: Task[], date: string): Task[] {
  const dayType = getDayType(new Date(date));
  const dateObj = new Date(date);

  return tasks.filter(t => {
    // --- Advanced recurrence ---
    if (t.recurrence) {
      // Start/end date bounds
      if (t.startDate && date < t.startDate) return false;
      if (t.endDate && date > t.endDate) return false;

      const { pattern, interval, weekDays, monthDay, monthDate } = t.recurrence;
      switch (pattern) {
        case 'daily':
          return true;
        case 'every_x_days': {
          if (!t.startDate || !interval) return true;
          const diffDays = Math.floor((dateObj.getTime() - new Date(t.startDate).getTime()) / 86400000);
          return diffDays >= 0 && diffDays % interval === 0;
        }
        case 'weekly':
          return weekDays ? weekDays.includes(dateObj.getDay()) : true;
        case 'monthly':
          return monthDay ? dateObj.getDate() === monthDay : true;
        case 'yearly':
          return monthDate ? (dateObj.getMonth() + 1 === monthDate.month && dateObj.getDate() === monthDate.day) : true;
        default:
          return true;
      }
    }

    // --- Legacy logic (no recurrence field) ---
    // Date range check: no dates = always active (recurring)
    const dateMatch = !t.startDate || !t.endDate || (t.startDate <= date && t.endDate >= date);
    if (!dateMatch) return false;
    // Day type check (undefined = all days)
    if (t.dayTypes && t.dayTypes.length > 0) return t.dayTypes.includes(dayType);
    return true;
  });
}

/** Determine if a task is recurring (should NOT have completed set permanently) */
export function isTaskRecurring(task: Task): boolean {
  if (task.recurrence) return true;
  if (task.dayTypes && task.dayTypes.length > 0) return true;
  if (!task.startDate && !task.endDate) return true;
  return false;
}

// ===== Focus Session (Pomodoro tracking) =====
export interface FocusSession {
  id: string;
  date: string;               // YYYY-MM-DD
  taskId?: string;
  taskTitle?: string;
  category?: string;
  mode: 'focus' | 'break';
  durationPlanned: number;    // seconds
  durationActual: number;     // seconds
  completed: boolean;
  startedAt: string;          // ISO timestamp
  completedAt?: string;       // ISO timestamp
  slotStart?: string;         // HH:MM
  slotEnd?: string;           // HH:MM
}

// ===== Daily Record (historical tracking) =====
export interface DailyRecord {
  id: string;
  date: string;            // YYYY-MM-DD
  taskId?: string;         // references Task.id (optional for backward compat)
  taskTitle: string;       // snapshot of title
  category: string;        // snapshot of category
  completed: boolean;
  completedAt?: string;    // ISO timestamp
  timeStart?: string;      // HH:MM
  timeEnd?: string;        // HH:MM
  notes?: string;
  attachments?: TaskAttachment[];
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  emoji: string;
  color: string;              // GROUP_COLORS key
  streak: number;
  bestStreak: number;
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom';
  customDays?: number[];      // for 'custom': 0=อา, 1=จ, ..., 6=ส
  createdAt: string;          // ISO timestamp
  history: Record<string, boolean>; // { 'YYYY-MM-DD': true }
}

export interface TimeEntry {
  category: string;
  hours: number;
}

export type View = 'dashboard' | 'tasks' | 'focus' | 'analytics' | 'ai-coach' | 'planner' | 'habits' | 'calendar' | 'search' | 'projects' | 'expenses';

// ===== Expense Tracker =====

export interface Expense {
  id: string;
  title: string;
  amount: number;
  flow: 'income' | 'expense';       // รายรับ หรือ รายจ่าย
  category: ExpenseCategoryKey;
  type: 'recurring' | 'one-time';
  date: string;                    // YYYY-MM-DD (วันที่จ่าย / วันครบกำหนด)
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dueDay?: number;                 // วันที่ครบกำหนดจ่ายในเดือน (1-31)
  paymentMethod?: PaymentMethod;     // วิธีจ่าย
  borrowFrom?: string;               // ยืมจากใคร
  borrowRepayDate?: string;           // วันที่จะคืน YYYY-MM-DD
  borrowRepayAmount?: number;         // จำนวนที่จะคืน
  borrowRepaid?: boolean;             // คืนแล้วหรือยัง
  paid?: boolean;
  paidAt?: string;                 // ISO timestamp
  notes?: string;
  createdAt: string;               // ISO timestamp
  paidHistory?: Record<string, { amount: number; paidAt: string; method?: PaymentMethod }>;  // "YYYY-MM" → actual payment
}

export type ExpenseCategoryKey = string;  // allow custom categories

export type PaymentMethod = 'cash' | 'transfer' | 'credit' | 'debit' | 'ewallet' | 'auto' | 'borrow';

export const PAYMENT_METHODS: { key: PaymentMethod; label: string; emoji: string }[] = [
  { key: 'transfer', label: 'โอนเงิน', emoji: '📱' },
  { key: 'cash', label: 'เงินสด', emoji: '💵' },
  { key: 'credit', label: 'บัตรเครดิต', emoji: '💳' },
  { key: 'debit', label: 'บัตรเดบิต', emoji: '🏧' },
  { key: 'ewallet', label: 'E-Wallet', emoji: '📲' },
  { key: 'auto', label: 'หักอัตโนมัติ', emoji: '🔄' },
  { key: 'borrow', label: 'ยืม', emoji: '🤲' },
];

export interface ExpenseCategory {
  key: ExpenseCategoryKey;
  label: string;
  emoji: string;
  color: string;
  flow: 'income' | 'expense';
  group?: string;
  isCustom?: boolean;  // user-created
}

// กลุ่มค่าใช้จ่าย — เรียงจากจำเป็นสุด
export const EXPENSE_GROUPS = [
  { key: 'จำเป็น', label: 'ค่าใช้จ่ายจำเป็น', emoji: '📌' },
  { key: 'อื่นๆ', label: 'ค่าใช้จ่ายอื่นๆ', emoji: '📋' },
  { key: 'ชำระหนี้', label: 'ชำระหนี้สิน', emoji: '🏦' },
  { key: 'ลงทุน', label: 'เงินลงทุน/ออม', emoji: '📊' },
];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  // ══ รายรับ ══
  { key: 'salary', label: 'เงินเดือน/ค่าจ้าง', emoji: '💰', color: 'green', flow: 'income' },
  { key: 'side_income', label: 'รายได้เสริม/ฟรีแลนซ์', emoji: '💻', color: 'teal', flow: 'income' },
  { key: 'invest_income', label: 'ผลตอบแทนลงทุน', emoji: '📈', color: 'indigo', flow: 'income' },
  { key: 'other_income', label: 'รายรับอื่นๆ', emoji: '🎁', color: 'cyan', flow: 'income' },

  // ══ ค่าใช้จ่ายจำเป็น (ปัจจัย 4) ══
  { key: 'housing', label: 'ที่อยู่อาศัย', emoji: '🏠', color: 'amber', flow: 'expense', group: 'จำเป็น' },
  { key: 'food', label: 'อาหาร/เครื่องดื่ม (หลัก)', emoji: '🍚', color: 'orange', flow: 'expense', group: 'จำเป็น' },
  { key: 'food_extra', label: 'อาหาร/เครื่องดื่ม (เสริม)', emoji: '☕', color: 'orange', flow: 'expense', group: 'จำเป็น' },
  { key: 'clothing', label: 'เครื่องนุ่งห่ม', emoji: '👕', color: 'pink', flow: 'expense', group: 'จำเป็น' },
  { key: 'health', label: 'ยารักษาโรค', emoji: '💊', color: 'rose', flow: 'expense', group: 'จำเป็น' },

  // ══ ค่าใช้จ่ายอื่นๆ (เรียงจากจำเป็น) ══
  { key: 'transport', label: 'เดินทาง', emoji: '🚗', color: 'blue', flow: 'expense', group: 'อื่นๆ' },
  { key: 'family', label: 'ครอบครัว/ให้พ่อแม่', emoji: '👨‍👩‍👧', color: 'rose', flow: 'expense', group: 'อื่นๆ' },
  { key: 'subscription', label: 'Subscription', emoji: '📺', color: 'violet', flow: 'expense', group: 'อื่นๆ' },
  { key: 'social', label: 'สังคม/งานเลี้ยง', emoji: '🤝', color: 'green', flow: 'expense', group: 'อื่นๆ' },
  { key: 'self_dev', label: 'พัฒนาตัวเอง/สัมมนา', emoji: '📚', color: 'indigo', flow: 'expense', group: 'อื่นๆ' },
  { key: 'luxury', label: 'ของฟุ่มเฟือย', emoji: '✨', color: 'pink', flow: 'expense', group: 'อื่นๆ' },
  { key: 'repair', label: 'ซ่อมแซมต่างๆ', emoji: '🔨', color: 'amber', flow: 'expense', group: 'อื่นๆ' },
  { key: 'work_expense', label: 'จ่ายในงาน', emoji: '🧾', color: 'blue', flow: 'expense', group: 'อื่นๆ' },
  { key: 'phone', label: 'ค่าโทรศัพท์/เน็ต', emoji: '📱', color: 'indigo', flow: 'expense', group: 'อื่นๆ' },
  { key: 'unexpected', label: 'ไม่คาดคิด', emoji: '⚡', color: 'rose', flow: 'expense', group: 'อื่นๆ' },
  { key: 'other_expense', label: 'อื่นๆ', emoji: '📦', color: 'purple', flow: 'expense', group: 'อื่นๆ' },

  // ══ ชำระหนี้สิน ══
  { key: 'debt_credit', label: 'บัตรเครดิต/กดเงินสด', emoji: '💳', color: 'rose', flow: 'expense', group: 'ชำระหนี้' },
  { key: 'debt_loan', label: 'สินเชื่อ/ผ่อนชำระ', emoji: '🏦', color: 'rose', flow: 'expense', group: 'ชำระหนี้' },
  { key: 'debt_mortgage', label: 'ผ่อนบ้าน/ผ่อนรถ', emoji: '🏡', color: 'amber', flow: 'expense', group: 'ชำระหนี้' },
  { key: 'debt_friend', label: 'คืนเงินยืม', emoji: '🤝', color: 'orange', flow: 'expense', group: 'ชำระหนี้' },

  // ══ เงินลงทุน/ออม ══
  { key: 'insurance', label: 'ประกันภัย/ประกันชีวิต', emoji: '🛡️', color: 'teal', flow: 'expense', group: 'ลงทุน' },
  { key: 'invest_out', label: 'ลงทุนหลักทรัพย์/ธุรกิจ', emoji: '📊', color: 'indigo', flow: 'expense', group: 'ลงทุน' },
  { key: 'saving', label: 'เงินออม/กองทุน', emoji: '🐷', color: 'green', flow: 'expense', group: 'ลงทุน' },
];

// ===== Project Management =====

export interface ProjectProcess {
  id: string;
  title: string;
  order: number;
  emoji: string;
  color: string;           // GROUP_COLORS key
  taskIds: string[];        // references Task.id
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  emoji: string;
  color: string;              // GROUP_COLORS key
  type: 'main' | 'side';     // งานหลัก / งานรอง
  status: 'active' | 'completed' | 'archived';
  startDate?: string;         // YYYY-MM-DD
  endDate?: string;           // YYYY-MM-DD (deadline)
  taskIds: string[];          // references Task.id
  taskStatuses: Record<string, 'todo' | 'in_progress' | 'done'>;
  processes?: ProjectProcess[];   // AI-generated process/phase timeline
  createdAt: string;          // ISO timestamp
  completedAt?: string;
}

// ===== Life Category (หมวดหมู่ชีวิต) =====
export interface Category {
  key: string;
  label: string;
  emoji: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { key: 'career', label: 'อาชีพ', emoji: '💼' },
  { key: 'health', label: 'สุขภาพ', emoji: '💪' },
  { key: 'home', label: 'กิจวัตรประจำวัน', emoji: '🏠' },
  { key: 'relationship', label: 'ความสัมพันธ์', emoji: '❤️' },
  { key: 'mind', label: 'จิตใจ', emoji: '🧠' },
  { key: 'break', label: 'คั่นเวลา', emoji: '⏸️' },
  { key: 'sleep', label: 'นอน', emoji: '🌙' },
];

// ===== Task Group (กลุ่มงาน) =====
export interface TaskGroup {
  key: string;
  label: string;
  emoji: string;
  color: string;   // key into GROUP_COLORS
  icon: string;    // icon key for planner ('code','home', etc.)
  size: number;    // circle size in TaskManager (px)
  categoryKey?: string; // references Category.key
}

export const GROUP_COLORS: Record<string, {
  bg: string; border: string; text: string;
  badge: string; dot: string; ring: string; iconBg: string;
  plannerBg: string; plannerText: string; plannerBorder: string;
}> = {
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400', ring: 'ring-orange-300', iconBg: 'bg-orange-400', plannerBg: 'bg-orange-100', plannerText: 'text-orange-700', plannerBorder: 'border-orange-300' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400', ring: 'ring-yellow-300', iconBg: 'bg-yellow-400', plannerBg: 'bg-yellow-100', plannerText: 'text-yellow-700', plannerBorder: 'border-yellow-300' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400', ring: 'ring-blue-300', iconBg: 'bg-blue-400', plannerBg: 'bg-blue-100', plannerText: 'text-blue-700', plannerBorder: 'border-blue-300' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', badge: 'bg-green-100 text-green-700', dot: 'bg-green-400', ring: 'ring-green-300', iconBg: 'bg-green-400', plannerBg: 'bg-green-100', plannerText: 'text-green-700', plannerBorder: 'border-green-300' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400', ring: 'ring-amber-300', iconBg: 'bg-amber-400', plannerBg: 'bg-amber-100', plannerText: 'text-amber-700', plannerBorder: 'border-amber-300' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-600', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-400', ring: 'ring-rose-300', iconBg: 'bg-rose-400', plannerBg: 'bg-rose-100', plannerText: 'text-rose-700', plannerBorder: 'border-rose-300' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-600', badge: 'bg-cyan-100 text-cyan-700', dot: 'bg-cyan-400', ring: 'ring-cyan-300', iconBg: 'bg-cyan-400', plannerBg: 'bg-cyan-100', plannerText: 'text-cyan-700', plannerBorder: 'border-cyan-300' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-600', badge: 'bg-violet-100 text-violet-700', dot: 'bg-violet-400', ring: 'ring-violet-300', iconBg: 'bg-violet-400', plannerBg: 'bg-violet-100', plannerText: 'text-violet-700', plannerBorder: 'border-violet-300' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-600', badge: 'bg-pink-100 text-pink-700', dot: 'bg-pink-400', ring: 'ring-pink-300', iconBg: 'bg-pink-400', plannerBg: 'bg-pink-100', plannerText: 'text-pink-700', plannerBorder: 'border-pink-300' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-600', badge: 'bg-teal-100 text-teal-700', dot: 'bg-teal-400', ring: 'ring-teal-300', iconBg: 'bg-teal-400', plannerBg: 'bg-teal-100', plannerText: 'text-teal-700', plannerBorder: 'border-teal-300' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400', ring: 'ring-indigo-300', iconBg: 'bg-indigo-400', plannerBg: 'bg-indigo-100', plannerText: 'text-indigo-700', plannerBorder: 'border-indigo-300' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400', ring: 'ring-purple-300', iconBg: 'bg-purple-400', plannerBg: 'bg-purple-100', plannerText: 'text-purple-700', plannerBorder: 'border-purple-300' },
};

// ===== Balance Sheet (งบดุล) =====

export interface BalanceItem {
  id: string;
  title: string;
  amount: number;           // ยอดคงเหลือปัจจุบัน
  category: string;         // key ของหมวด
  notes?: string;
  updatedAt: string;        // ISO timestamp
  linkedDebtCat?: string;   // ผูกกับหมวดชำระหนี้ (auto ลดยอดเมื่อจ่าย)
}

export interface BalanceCategory {
  key: string;
  label: string;
  emoji: string;
  side: 'asset' | 'liability';
  group: string;
}

// Default sub-account suggestions per balance category
export const BALANCE_SUGGESTIONS: Record<string, string[]> = {
  cash: ['เงินสดติดตัว', 'เงินสดที่บ้าน'],
  bank_saving: ['กสิกร', 'กรุงไทย', 'ไทยพาณิชย์', 'กรุงเทพ', 'ออมสิน', 'กรุงศรี', 'ทหารไทยธนชาต'],
  bank_fixed: ['กสิกร', 'กรุงไทย', 'ไทยพาณิชย์', 'กรุงเทพ', 'ออมสิน'],
  ewallet_balance: ['พร้อมเพย์', 'True Wallet', 'LINE Pay', 'Shopee Pay', 'Rabbit LINE Pay'],
  lend_friend: [],   // กรอกชื่อเอง
  lend_family: [],
  invest_stock: ['SET หุ้นไทย', 'กองทุนรวม', 'US Stock', 'SSF/RMF', 'LTF'],
  invest_crypto: ['Bitcoin', 'Ethereum', 'Bitkub', 'Binance'],
  invest_bond: ['พันธบัตรรัฐบาล', 'ตราสารหนี้'],
  invest_gold: ['ทองคำแท่ง', 'ทองรูปพรรณ', 'Gold Spot'],
  invest_insurance: [],
  invest_other: [],
  property_house: ['บ้าน', 'คอนโด', 'ทาวน์เฮ้าส์', 'ห้องเช่า'],
  property_land: [],
  property_car: ['รถยนต์', 'มอเตอร์ไซค์'],
  property_jewelry: [],
  property_other: [],
  credit_card: ['KBANK', 'SCB', 'KTC', 'Citibank', 'กรุงเทพ', 'กรุงศรี'],
  cash_card: ['KBANK', 'SCB', 'KTC', 'กรุงศรี'],
  personal_loan: ['KBANK', 'SCB', 'กรุงศรี', 'ทหารไทยธนชาต'],
  borrow_friend: [],
  borrow_family: ['พ่อ', 'แม่', 'แฟน', 'พี่', 'น้อง'],
  borrow_other: [],
  mortgage: [],
  car_loan: [],
  education_loan: ['กยศ.', 'กรอ.'],
  business_loan: [],
};

export const BALANCE_CATEGORIES: BalanceCategory[] = [
  // ═══ สินทรัพย์ (Assets) ═══
  // สินทรัพย์หมุนเวียน (เป็นเงินสดได้เร็ว)
  { key: 'cash', label: 'เงินสด', emoji: '💵', side: 'asset', group: 'หมุนเวียน' },
  { key: 'bank_saving', label: 'เงินฝากออมทรัพย์', emoji: '🏦', side: 'asset', group: 'หมุนเวียน' },
  { key: 'bank_fixed', label: 'เงินฝากประจำ', emoji: '📋', side: 'asset', group: 'หมุนเวียน' },
  { key: 'ewallet_balance', label: 'E-Wallet (พร้อมเพย์/True)', emoji: '📲', side: 'asset', group: 'หมุนเวียน' },
  { key: 'lend_friend', label: 'เงินให้ยืม (เพื่อน/คนรู้จัก)', emoji: '🤝', side: 'asset', group: 'หมุนเวียน' },
  { key: 'lend_family', label: 'เงินให้ยืม (ครอบครัว)', emoji: '👨‍👩‍👧', side: 'asset', group: 'หมุนเวียน' },
  // สินทรัพย์ลงทุน
  { key: 'invest_stock', label: 'หุ้น/กองทุน', emoji: '📈', side: 'asset', group: 'ลงทุน' },
  { key: 'invest_crypto', label: 'คริปโต', emoji: '₿', side: 'asset', group: 'ลงทุน' },
  { key: 'invest_bond', label: 'พันธบัตร/ตราสารหนี้', emoji: '📜', side: 'asset', group: 'ลงทุน' },
  { key: 'invest_gold', label: 'ทองคำ', emoji: '🥇', side: 'asset', group: 'ลงทุน' },
  { key: 'invest_insurance', label: 'ประกันชีวิต (มูลค่าเวนคืน)', emoji: '🛡️', side: 'asset', group: 'ลงทุน' },
  { key: 'invest_other', label: 'ลงทุนอื่นๆ', emoji: '💼', side: 'asset', group: 'ลงทุน' },
  // สินทรัพย์ถาวร
  { key: 'property_house', label: 'บ้าน/คอนโด', emoji: '🏠', side: 'asset', group: 'ถาวร' },
  { key: 'property_land', label: 'ที่ดิน', emoji: '🏞️', side: 'asset', group: 'ถาวร' },
  { key: 'property_car', label: 'รถยนต์/รถมอเตอร์ไซค์', emoji: '🚗', side: 'asset', group: 'ถาวร' },
  { key: 'property_jewelry', label: 'เครื่องประดับ/ของมีค่า', emoji: '💎', side: 'asset', group: 'ถาวร' },
  { key: 'property_other', label: 'ทรัพย์สินอื่นๆ', emoji: '📦', side: 'asset', group: 'ถาวร' },

  // ═══ หนี้สิน (Liabilities) ═══
  // หนี้ระยะสั้น
  { key: 'credit_card', label: 'หนี้บัตรเครดิต', emoji: '💳', side: 'liability', group: 'ระยะสั้น' },
  { key: 'cash_card', label: 'บัตรกดเงินสด', emoji: '🏧', side: 'liability', group: 'ระยะสั้น' },
  { key: 'personal_loan', label: 'สินเชื่อส่วนบุคคล', emoji: '📝', side: 'liability', group: 'ระยะสั้น' },
  { key: 'borrow_friend', label: 'ยืมเพื่อน/คนรู้จัก', emoji: '🤝', side: 'liability', group: 'ระยะสั้น' },
  { key: 'borrow_family', label: 'ยืมครอบครัว/แฟน', emoji: '👨‍👩‍👧', side: 'liability', group: 'ระยะสั้น' },
  { key: 'borrow_other', label: 'หนี้อื่นๆ', emoji: '📋', side: 'liability', group: 'ระยะสั้น' },
  // หนี้ระยะยาว
  { key: 'mortgage', label: 'ผ่อนบ้าน/คอนโด', emoji: '🏠', side: 'liability', group: 'ระยะยาว' },
  { key: 'car_loan', label: 'ผ่อนรถ', emoji: '🚗', side: 'liability', group: 'ระยะยาว' },
  { key: 'education_loan', label: 'กยศ./สินเชื่อการศึกษา', emoji: '🎓', side: 'liability', group: 'ระยะยาว' },
  { key: 'business_loan', label: 'สินเชื่อธุรกิจ', emoji: '🏢', side: 'liability', group: 'ระยะยาว' },
];
