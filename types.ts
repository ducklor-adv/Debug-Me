
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

// SubTask — งานย่อยภายใน Task
export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

// Recurrence — การทำซ้ำขั้นสูง
export interface Recurrence {
  pattern: 'daily' | 'every_x_days' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;        // every_x_days: ทุก X วัน
  weekDays?: number[];      // weekly: 0=อา, 1=จ, ..., 6=ส
  monthDay?: number;        // monthly: วันที่ 1-31
  monthDate?: { month: number; day: number }; // yearly
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
  estimatedDuration?: number;  // minutes
  completedAt?: string;        // ISO timestamp
  subtasks?: SubTask[];         // งานย่อย
  recurrence?: Recurrence;      // การทำซ้ำขั้นสูง
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
}

export type DayType = 'workday' | 'saturday' | 'sunday';

export interface ScheduleTemplates {
  workday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
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

// ===== Daily Record (historical tracking) =====
export interface DailyRecord {
  id: string;
  date: string;            // YYYY-MM-DD
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

export type View = 'dashboard' | 'tasks' | 'focus' | 'analytics' | 'ai-coach' | 'planner' | 'habits' | 'calendar' | 'search';

// ===== Task Group (category) =====
export interface TaskGroup {
  key: string;
  label: string;
  emoji: string;
  color: string;   // key into GROUP_COLORS
  icon: string;    // icon key for planner ('code','home', etc.)
  size: number;    // circle size in TaskManager (px)
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
