
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Download,
  Upload,
  Database,
  ShieldCheck,
  Cloud,
} from 'lucide-react';
import { View, Task, Priority, TaskGroup, Milestone, DailyRecord, ScheduleTemplates } from './types';
import { subscribeAppData, saveAppData, addDailyRecordFS, getDailyRecordsByDate, getDailyRecordCount } from './lib/firestoreDB';
import Dashboard from './components/Dashboard';
import TaskManager from './components/TaskManager';
import FocusTimer from './components/FocusTimer';
import Analytics from './components/Analytics';
import AICoach from './components/AICoach';
import DailyPlanner from './components/DailyPlanner';
import Login from './components/Login';

const VIEW_KEY = 'debugme-view';

const DEFAULT_GROUPS: TaskGroup[] = [
  { key: 'กิจวัตร', label: 'กิจวัตร', emoji: '🌅', color: 'teal', icon: 'sun', size: 68 },
  { key: 'งานหลัก', label: 'งานหลัก', emoji: '💼', color: 'orange', icon: 'briefcase', size: 92 },
  { key: 'งานบ้าน', label: 'งานบ้าน', emoji: '🏠', color: 'yellow', icon: 'home', size: 66 },
  { key: 'พัฒนาตัวเอง', label: 'พัฒนาตัวเอง', emoji: '🧠', color: 'amber', icon: 'rocket', size: 72 },
  { key: 'สุขภาพ', label: 'สุขภาพ', emoji: '💪', color: 'green', icon: 'dumbbell', size: 62 },
  { key: 'ครอบครัว', label: 'ครอบครัว', emoji: '👨‍👩‍👧', color: 'violet', icon: 'users', size: 62 },
  { key: 'งานด่วน', label: 'งานด่วน', emoji: '⚡', color: 'rose', icon: 'zap', size: 82 },
  { key: 'พักผ่อน', label: 'พักผ่อน', emoji: '☕', color: 'cyan', icon: 'game', size: 56 },
  { key: 'ธุระส่วนตัว', label: 'ธุระส่วนตัว', emoji: '🔧', color: 'blue', icon: 'calendar', size: 62 },
  // Legacy groups (kept for existing users' tasks)
  { key: 'งานรอง', label: 'งานรอง', emoji: '🏠', color: 'yellow', icon: 'home', size: 66 },
  { key: 'เฉพาะกิจ', label: 'เฉพาะกิจ', emoji: '🔧', color: 'blue', icon: 'wrench', size: 62 },
];

const DEFAULT_MILESTONES: Milestone[] = [
  { id: 'ms-1', title: 'ตื่นนอน', emoji: '🌅', time: '05:00', icon: 'sun', color: 'bg-amber-50 border-amber-300 text-amber-700' },
  { id: 'ms-2', title: 'กินข้าว (เช้า)', emoji: '🍚', time: '07:00', icon: 'coffee', color: 'bg-orange-50 border-orange-300 text-orange-700' },
  { id: 'ms-3', title: 'กินข้าว (เที่ยง)', emoji: '🍚', time: '12:00', icon: 'coffee', color: 'bg-orange-50 border-orange-300 text-orange-700' },
  { id: 'ms-4', title: 'กินข้าว (เย็น)', emoji: '🍚', time: '19:00', icon: 'coffee', color: 'bg-orange-50 border-orange-300 text-orange-700' },
  { id: 'ms-5', title: 'นอน', emoji: '🌙', time: '22:00', icon: 'moon', color: 'bg-indigo-50 border-indigo-300 text-indigo-700' },
];

const DEFAULT_SCHEDULE_TEMPLATES: ScheduleTemplates = {
  workday: [
    { id: 'wd-1',  startTime: '05:00', endTime: '06:00', groupKey: 'กิจวัตร' },
    { id: 'wd-2',  startTime: '06:00', endTime: '07:00', groupKey: 'สุขภาพ' },
    { id: 'wd-3',  startTime: '07:00', endTime: '08:00', groupKey: 'กิจวัตร' },
    { id: 'wd-4',  startTime: '08:00', endTime: '12:00', groupKey: 'งานหลัก' },
    { id: 'wd-5',  startTime: '12:00', endTime: '13:00', groupKey: 'พักผ่อน' },
    { id: 'wd-6',  startTime: '13:00', endTime: '17:00', groupKey: 'งานหลัก' },
    { id: 'wd-7',  startTime: '17:00', endTime: '18:00', groupKey: 'ธุระส่วนตัว' },
    { id: 'wd-8',  startTime: '18:00', endTime: '19:00', groupKey: 'งานบ้าน' },
    { id: 'wd-9',  startTime: '19:00', endTime: '20:00', groupKey: 'ครอบครัว' },
    { id: 'wd-10', startTime: '20:00', endTime: '21:00', groupKey: 'พัฒนาตัวเอง' },
    { id: 'wd-11', startTime: '21:00', endTime: '22:00', groupKey: 'พักผ่อน' },
  ],
  saturday: [
    { id: 'sat-1',  startTime: '05:00', endTime: '06:30', groupKey: 'กิจวัตร' },
    { id: 'sat-2',  startTime: '06:30', endTime: '07:30', groupKey: 'สุขภาพ' },
    { id: 'sat-3',  startTime: '07:30', endTime: '08:30', groupKey: 'กิจวัตร' },
    { id: 'sat-4',  startTime: '08:30', endTime: '10:30', groupKey: 'งานบ้าน' },
    { id: 'sat-5',  startTime: '10:30', endTime: '12:00', groupKey: 'ธุระส่วนตัว' },
    { id: 'sat-6',  startTime: '12:00', endTime: '13:00', groupKey: 'พักผ่อน' },
    { id: 'sat-7',  startTime: '13:00', endTime: '15:00', groupKey: 'พัฒนาตัวเอง' },
    { id: 'sat-8',  startTime: '15:00', endTime: '17:00', groupKey: 'ครอบครัว' },
    { id: 'sat-9',  startTime: '17:00', endTime: '18:00', groupKey: 'สุขภาพ' },
    { id: 'sat-10', startTime: '18:00', endTime: '19:30', groupKey: 'พักผ่อน' },
    { id: 'sat-11', startTime: '19:30', endTime: '21:00', groupKey: 'พักผ่อน' },
    { id: 'sat-12', startTime: '21:00', endTime: '22:00', groupKey: 'กิจวัตร' },
  ],
  sunday: [
    { id: 'sun-1',  startTime: '05:00', endTime: '07:00', groupKey: 'กิจวัตร' },
    { id: 'sun-2',  startTime: '07:00', endTime: '08:00', groupKey: 'สุขภาพ' },
    { id: 'sun-3',  startTime: '08:00', endTime: '09:00', groupKey: 'กิจวัตร' },
    { id: 'sun-4',  startTime: '09:00', endTime: '11:00', groupKey: 'ครอบครัว' },
    { id: 'sun-5',  startTime: '11:00', endTime: '12:00', groupKey: 'ธุระส่วนตัว' },
    { id: 'sun-6',  startTime: '12:00', endTime: '13:30', groupKey: 'พักผ่อน' },
    { id: 'sun-7',  startTime: '13:30', endTime: '15:00', groupKey: 'พักผ่อน' },
    { id: 'sun-8',  startTime: '15:00', endTime: '17:00', groupKey: 'พัฒนาตัวเอง' },
    { id: 'sun-9',  startTime: '17:00', endTime: '18:00', groupKey: 'ครอบครัว' },
    { id: 'sun-10', startTime: '18:00', endTime: '19:00', groupKey: 'กิจวัตร' },
    { id: 'sun-11', startTime: '19:00', endTime: '20:30', groupKey: 'พักผ่อน' },
    { id: 'sun-12', startTime: '20:30', endTime: '22:00', groupKey: 'กิจวัตร' },
  ],
};

const NAV_ITEMS: { view: View; icon: string; label: string }[] = [
  { view: 'dashboard', icon: 'Activity', label: 'TODAY' },
  { view: 'tasks', icon: 'CheckSquare', label: 'Tasks' },
  { view: 'planner', icon: 'BookOpen', label: 'Planner' },
  { view: 'focus', icon: 'Timer', label: 'Focus' },
  { view: 'analytics', icon: 'BarChart3', label: 'Stats' },
];

// Merge any missing default groups into loaded groups
const mergeDefaultGroups = (loaded: TaskGroup[]): TaskGroup[] => {
  const existingKeys = new Set(loaded.map(g => g.key));
  const missing = DEFAULT_GROUPS.filter(g => !existingKeys.has(g.key));
  return missing.length > 0 ? [...loaded, ...missing] : loaded;
};

// Merge any missing default tasks into loaded tasks (by id prefix 'd-')
// Exclude tasks that user has explicitly deleted
const mergeDefaultTasks = (loaded: Task[], defaults: Task[], deletedIds: string[] = []): Task[] => {
  const deletedSet = new Set(deletedIds);
  // CRITICAL: Filter out deleted default tasks from loaded tasks first!
  const filtered = loaded.filter(t => !deletedSet.has(t.id));

  const existingIds = new Set(filtered.map(t => t.id));
  const missing = defaults.filter(t => !existingIds.has(t.id) && !deletedSet.has(t.id));
  return missing.length > 0 ? [...filtered, ...missing] : filtered;
};

// Migrate old task format (dueDate) to new (startDate/endDate/startTime/endTime)
function migrateTask(t: any): Task {
  if (t.dueDate && !t.startDate) {
    return {
      ...t,
      startDate: t.dueDate,
      endDate: t.dueDate,
      startTime: '09:00',
      endTime: '10:00',
    };
  }
  return t as Task;
}

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

  // Daily records state
  const [todayRecords, setTodayRecords] = useState<DailyRecord[]>([]);
  const [totalRecordCount, setTotalRecordCount] = useState(0);

  const todayStr = new Date().toISOString().split('T')[0];
  const defaultTasks: Task[] = [
    // ===== ทุกวัน (ไม่ต้องระบุ dayTypes) =====
    // 🌅 กิจวัตร — ทุกวัน (กิจวัตรพื้นฐาน ตื่น กิน นอน)
    { id: 'd-1', title: 'ตื่นนอน อาบน้ำ แปรงฟัน', description: 'กิจวัตรเช้า เตรียมพร้อมเริ่มวัน', priority: Priority.MEDIUM, completed: false, startDate: todayStr, endDate: todayStr, startTime: '05:00', endTime: '05:30', category: 'กิจวัตร', recurring: 'daily' },
    { id: 'd-2', title: 'เตรียมอาหารเช้า / กินข้าว', description: 'ทำอาหารเช้าง่ายๆ กินให้อิ่มก่อนเริ่มงาน', priority: Priority.MEDIUM, completed: false, startDate: todayStr, endDate: todayStr, startTime: '07:00', endTime: '07:30', category: 'กิจวัตร', recurring: 'daily' },
    { id: 'd-3', title: 'อาบน้ำ เตรียมนอน', description: 'ผ่อนคลายก่อนเข้านอน ปิดหน้าจอ', priority: Priority.LOW, completed: false, startDate: todayStr, endDate: todayStr, startTime: '21:30', endTime: '22:00', category: 'กิจวัตร', recurring: 'daily' },
    // 💪 สุขภาพ — ทุกวัน
    { id: 'd-14', title: 'ออกกำลังกาย / วิ่ง / เดินเร็ว', description: 'คาร์ดิโอ 30-45 นาที หรือเดินรอบหมู่บ้าน', priority: Priority.HIGH, completed: false, startDate: todayStr, endDate: todayStr, startTime: '06:00', endTime: '06:40', category: 'สุขภาพ', recurring: 'daily' },
    { id: 'd-15', title: 'ยืดเหยียด / โยคะ', description: 'ยืดกล้ามเนื้อ ผ่อนคลายร่างกาย', priority: Priority.LOW, completed: false, startDate: todayStr, endDate: todayStr, startTime: '06:40', endTime: '07:00', category: 'สุขภาพ', recurring: 'daily' },
    { id: 'd-16', title: 'นั่งสมาธิ / หายใจลึก', description: 'นั่งสมาธิ 10-15 นาที ฝึกจิตให้สงบ', priority: Priority.MEDIUM, completed: false, startDate: todayStr, endDate: todayStr, startTime: '05:30', endTime: '05:45', category: 'สุขภาพ', recurring: 'daily' },
    // 🌅 กิจวัตร — มื้อกลางวัน
    { id: 'd-21', title: 'พักเที่ยง / กินข้าวกลางวัน', description: 'กินข้าว พักสมอง เดินเล่นสั้นๆ', priority: Priority.MEDIUM, completed: false, startDate: todayStr, endDate: todayStr, startTime: '12:00', endTime: '13:00', category: 'กิจวัตร', recurring: 'daily' },
    // ☕ พักผ่อน — ทุกวัน
    { id: 'd-22', title: 'พักผ่อน / งานอดิเรก', description: 'ดูซีรีส์ เล่นเกม ฟังเพลง หรือพักสายตา', priority: Priority.LOW, completed: false, startDate: todayStr, endDate: todayStr, startTime: '21:00', endTime: '21:30', category: 'พักผ่อน', recurring: 'daily' },
    // 🌅 กิจวัตร — มื้อเย็น
    { id: 'd-17', title: 'กินข้าวเย็นกับครอบครัว', description: 'นั่งกินข้าวด้วยกัน คุยเรื่องทั่วไป', priority: Priority.HIGH, completed: false, startDate: todayStr, endDate: todayStr, startTime: '19:00', endTime: '19:30', category: 'กิจวัตร', recurring: 'daily' },
    // 👨‍👩‍👧 ครอบครัว — ทุกวัน (เย็น)
    { id: 'd-18', title: 'เวลาครอบครัว / พูดคุย', description: 'ใช้เวลาด้วยกัน ดูทีวี เล่นเกม หรือคุยกัน', priority: Priority.MEDIUM, completed: false, startDate: todayStr, endDate: todayStr, startTime: '19:30', endTime: '20:00', category: 'ครอบครัว', recurring: 'daily' },

    // ===== จ-ศ เท่านั้น (workday) =====
    // 💼 งานหลัก
    { id: 'd-4', title: 'เช็คอีเมล / วางแผนงานวันนี้', description: 'อ่านอีเมล ดู task list จัดลำดับความสำคัญ', priority: Priority.HIGH, completed: false, startDate: todayStr, endDate: todayStr, startTime: '08:00', endTime: '08:30', category: 'งานหลัก', recurring: 'daily', dayTypes: ['workday'] },
    { id: 'd-5', title: 'Deep Work — งานหลักช่วงเช้า', description: 'ทำงานที่ต้องใช้สมาธิสูง ปิดแจ้งเตือน', priority: Priority.HIGH, completed: false, startDate: todayStr, endDate: todayStr, startTime: '08:30', endTime: '12:00', category: 'งานหลัก', recurring: 'daily', dayTypes: ['workday'] },
    { id: 'd-6', title: 'Deep Work — งานหลักช่วงบ่าย', description: 'ทำงานต่อเนื่องจากช่วงเช้า หรือประชุม', priority: Priority.HIGH, completed: false, startDate: todayStr, endDate: todayStr, startTime: '13:00', endTime: '16:30', category: 'งานหลัก', recurring: 'daily', dayTypes: ['workday'] },
    { id: 'd-7', title: 'สรุปงาน / วางแผนพรุ่งนี้', description: 'อัปเดตความคืบหน้า จดสิ่งที่ต้องทำต่อ', priority: Priority.MEDIUM, completed: false, startDate: todayStr, endDate: todayStr, startTime: '16:30', endTime: '17:00', category: 'งานหลัก', recurring: 'daily', dayTypes: ['workday'] },
    // 🏠 งานบ้าน — จ-ศ (ช่วงเย็น)
    { id: 'd-8', title: 'ล้างจาน / เก็บครัว', description: 'ทำความสะอาดหลังทำอาหาร', priority: Priority.LOW, completed: false, startDate: todayStr, endDate: todayStr, startTime: '18:00', endTime: '18:20', category: 'งานบ้าน', recurring: 'daily', dayTypes: ['workday'] },
    { id: 'd-9', title: 'กวาดบ้าน / ถูพื้น', description: 'ทำความสะอาดพื้นที่ส่วนกลาง', priority: Priority.LOW, completed: false, startDate: todayStr, endDate: todayStr, startTime: '18:20', endTime: '18:40', category: 'งานบ้าน', recurring: 'daily', dayTypes: ['workday'] },
    // 🧠 พัฒนาตัวเอง — จ-ศ (ช่วงค่ำ 1 ชม.)
    { id: 'd-11', title: 'อ่านหนังสือ / บทความ', description: 'อ่านหนังสือที่สนใจ หรือบทความเพิ่มความรู้', priority: Priority.MEDIUM, completed: false, startDate: todayStr, endDate: todayStr, startTime: '20:00', endTime: '20:30', category: 'พัฒนาตัวเอง', recurring: 'daily', dayTypes: ['workday'] },
    { id: 'd-12', title: 'เรียนออนไลน์ / ฝึกทักษะใหม่', description: 'คอร์สออนไลน์ ดู tutorial หรือฝึกปฏิบัติ', priority: Priority.MEDIUM, completed: false, startDate: todayStr, endDate: todayStr, startTime: '20:30', endTime: '21:00', category: 'พัฒนาตัวเอง', recurring: 'daily', dayTypes: ['workday'] },
    // 🔧 ธุระส่วนตัว — จ-ศ (หลังเลิกงาน)
    { id: 'd-23', title: 'ซื้อของใช้ / ของกิน', description: 'ไปตลาด ซื้อของที่จำเป็น', priority: Priority.MEDIUM, completed: false, startDate: todayStr, endDate: todayStr, startTime: '17:00', endTime: '17:45', category: 'ธุระส่วนตัว', recurring: 'daily', dayTypes: ['workday'] },

    // ===== เสาร์เท่านั้น (saturday) =====
    // 🏠 งานบ้าน — เสาร์ (ทำใหญ่ช่วงเช้า)
    { id: 'd-25', title: 'ทำความสะอาดบ้านใหญ่', description: 'ถูพื้น เช็ดกระจก จัดระเบียบ ซักผ้าปูที่นอน', priority: Priority.MEDIUM, completed: false, startDate: todayStr, endDate: todayStr, startTime: '08:30', endTime: '10:30', category: 'งานบ้าน', recurring: 'daily', dayTypes: ['saturday'] },
    // 🔧 ธุระส่วนตัว — เสาร์
    { id: 'd-26', title: 'ธุระส่วนตัว / ช้อปปิ้ง', description: 'จ่ายตลาด ซื้อของใช้ประจำสัปดาห์ ธุระธนาคาร', priority: Priority.MEDIUM, completed: false, startDate: todayStr, endDate: todayStr, startTime: '10:30', endTime: '12:00', category: 'ธุระส่วนตัว', recurring: 'daily', dayTypes: ['saturday'] },
    // 🧠 พัฒนาตัวเอง — เสาร์ (ช่วงบ่าย 2 ชม.)
    { id: 'd-27', title: 'เรียนรู้ / Side Project', description: 'คอร์สออนไลน์ อ่านหนังสือ หรือทำโปรเจกต์ส่วนตัว', priority: Priority.MEDIUM, completed: false, startDate: todayStr, endDate: todayStr, startTime: '13:00', endTime: '15:00', category: 'พัฒนาตัวเอง', recurring: 'daily', dayTypes: ['saturday'] },
    // 👨‍👩‍👧 ครอบครัว — เสาร์ (ช่วงบ่าย 2 ชม.)
    { id: 'd-28', title: 'กิจกรรมครอบครัว / เที่ยว', description: 'ออกไปเที่ยวด้วยกัน ทำกิจกรรมร่วมกัน', priority: Priority.HIGH, completed: false, startDate: todayStr, endDate: todayStr, startTime: '15:00', endTime: '17:00', category: 'ครอบครัว', recurring: 'daily', dayTypes: ['saturday'] },

    // ===== อาทิตย์เท่านั้น (sunday) =====
    // 👨‍👩‍👧 ครอบครัว — อาทิตย์ (ช่วงเช้ายาว)
    { id: 'd-29', title: 'เวลาครอบครัว / ไปวัด / ทำบุญ', description: 'กิจกรรมครอบครัวช่วงเช้า ไปวัด ทำอาหารด้วยกัน', priority: Priority.HIGH, completed: false, startDate: todayStr, endDate: todayStr, startTime: '09:00', endTime: '11:00', category: 'ครอบครัว', recurring: 'daily', dayTypes: ['sunday'] },
    // 🔧 ธุระส่วนตัว — อาทิตย์
    { id: 'd-30', title: 'จัดการธุระ / เตรียมของสัปดาห์หน้า', description: 'เตรียมเสื้อผ้า จัดกระเป๋า เตรียมอาหาร', priority: Priority.MEDIUM, completed: false, startDate: todayStr, endDate: todayStr, startTime: '11:00', endTime: '12:00', category: 'ธุระส่วนตัว', recurring: 'daily', dayTypes: ['sunday'] },
    // 🧠 พัฒนาตัวเอง — อาทิตย์ (ช่วงบ่าย 2 ชม.)
    { id: 'd-31', title: 'อ่านหนังสือ / วางแผนสัปดาห์', description: 'อ่านหนังสือ ทบทวนเป้าหมาย วางแผนสัปดาห์หน้า', priority: Priority.MEDIUM, completed: false, startDate: todayStr, endDate: todayStr, startTime: '15:00', endTime: '17:00', category: 'พัฒนาตัวเอง', recurring: 'daily', dayTypes: ['sunday'] },
    // 👨‍👩‍👧 ครอบครัว — อาทิตย์ (ช่วงเย็น)
    { id: 'd-32', title: 'กินข้าวเย็นครอบครัว / พูดคุยสัปดาห์หน้า', description: 'กินข้าวด้วยกัน คุยเรื่องสัปดาห์หน้า', priority: Priority.HIGH, completed: false, startDate: todayStr, endDate: todayStr, startTime: '17:00', endTime: '18:00', category: 'ครอบครัว', recurring: 'daily', dayTypes: ['sunday'] },

    // ===== เสาร์+อาทิตย์ (weekend) =====
    { id: 'd-33', title: 'พักผ่อนเต็มที่ / งานอดิเรก', description: 'ดูหนัง เล่นเกม ทำสวน หรืออะไรก็ได้ที่ชอบ', priority: Priority.LOW, completed: false, startDate: todayStr, endDate: todayStr, startTime: '18:00', endTime: '19:30', category: 'พักผ่อน', recurring: 'daily', dayTypes: ['saturday', 'sunday'] },

    // ===== ไม่ recurring (มี deadline) =====
    // ⚡ งานด่วน
    { id: 'd-19', title: 'จ่ายบิล / ค่าน้ำค่าไฟ', description: 'ตรวจสอบและชำระค่าใช้จ่ายรายเดือน', priority: Priority.HIGH, completed: false, startDate: todayStr, endDate: '2026-02-28', startTime: '17:00', endTime: '17:30', category: 'งานด่วน', dayTypes: ['workday'] },
    { id: 'd-20', title: 'นัดหมอ / ตรวจสุขภาพ', description: 'นัดพบแพทย์ประจำปี หรือตามนัด', priority: Priority.HIGH, completed: false, startDate: todayStr, endDate: '2026-03-15', startTime: '09:00', endTime: '10:00', category: 'งานด่วน', dayTypes: ['workday'] },
    // 🏠 งานบ้าน — ซักผ้า (ทุกวัน แต่เวลาต่างกันตาม day type ก็ใช้ทุกวัน)
    { id: 'd-10', title: 'ซักผ้า / ตากผ้า / พับผ้า', description: 'จัดการเสื้อผ้า', priority: Priority.LOW, completed: false, startDate: todayStr, endDate: todayStr, startTime: '18:40', endTime: '19:00', category: 'งานบ้าน', recurring: 'daily' },
    // 🧠 พัฒนาตัวเอง — เขียนบันทึก (ทุกวัน)
    { id: 'd-13', title: 'เขียนบันทึก / วางแผนเป้าหมาย', description: 'Journal สะท้อนตัวเอง ทบทวนเป้าหมาย', priority: Priority.LOW, completed: false, startDate: todayStr, endDate: todayStr, startTime: '21:00', endTime: '21:15', category: 'พัฒนาตัวเอง', recurring: 'daily' },
    // 🔧 ธุระส่วนตัว — เอกสาร (มี deadline)
    { id: 'd-24', title: 'จัดการเอกสาร / ธุระธนาคาร', description: 'เอกสารสำคัญ โอนเงิน หรือติดต่อหน่วยงาน', priority: Priority.MEDIUM, completed: false, startDate: todayStr, endDate: '2026-02-28', startTime: '17:00', endTime: '18:00', category: 'ธุระส่วนตัว', dayTypes: ['workday'] },
  ];

  // ===== Data state (synced via Firestore) =====
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [scheduleTemplates, setScheduleTemplates] = useState<ScheduleTemplates>(DEFAULT_SCHEDULE_TEMPLATES);
  const [deletedDefaultTaskIds, setDeletedDefaultTaskIds] = useState<string[]>([]);
  const [firestoreLoading, setFirestoreLoading] = useState(true);
  const firestoreReadyRef = useRef(false);

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

  // Dirty state: tracks unsaved local changes
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const isRemoteUpdateRef = useRef(false);

  // Subscribe to Firestore real-time updates when user logs in
  useEffect(() => {
    if (!user) {
      firestoreReadyRef.current = false;
      setFirestoreLoading(true);
      return;
    }

    loadTodayRecords();

    const unsubscribe = subscribeAppData(user.uid, (data) => {
      console.log('🔄 Firestore data received');
      firestoreReadyRef.current = true;

      // Track if this is a remote update (from our own save)
      const wasRemoteUpdate = isRemoteUpdateRef.current;
      isRemoteUpdateRef.current = true;

      if (data) {
        // Migrate old tasks if needed
        const migratedTasks = (data.tasks || []).map(migrateTask);
        const needsMigration = (data.tasks || []).some((t: any) => t.dueDate && !t.startDate);

        // Load deleted default task IDs
        const deletedIds = data.deletedDefaultTaskIds || [];
        console.log('📥 Loaded deletedDefaultTaskIds from Firestore:', deletedIds);
        setDeletedDefaultTaskIds(deletedIds);

        // Merge missing default tasks into existing user's tasks (exclude deleted ones)
        const mergedTasks = mergeDefaultTasks(migratedTasks, defaultTasks, deletedIds);
        console.log('🔀 Merged tasks. Total:', mergedTasks.length, 'Deleted IDs:', deletedIds.length, 'Was remote update:', wasRemoteUpdate);
        setTasks(mergedTasks);
        if (data.groups) setTaskGroups(mergeDefaultGroups(data.groups));
        // Milestones: merge missing defaults + fix known timing issues
        if (data.milestones?.length) {
          let ms = data.milestones as Milestone[];
          // Fix ms-2 breakfast time (was 09:00, should be 07:00)
          let msChanged = false;
          ms = ms.map(m => {
            if (m.id === 'ms-2' && m.time === '09:00') { msChanged = true; return { ...m, time: '07:00' }; }
            return m;
          });
          // Merge any missing default milestones
          const existingIds = new Set(ms.map(m => m.id));
          const missingMs = DEFAULT_MILESTONES.filter(m => !existingIds.has(m.id));
          if (missingMs.length > 0) { ms = [...ms, ...missingMs]; msChanged = true; }
          setMilestones(ms);
          if (msChanged) saveAppData(user.uid, { milestones: ms });
        } else {
          setMilestones(DEFAULT_MILESTONES);
        }
        // Schedule templates migration
        if (data.scheduleTemplates) {
          // Filter out malformed entries, replace with defaults if too few valid slots
          const tpl = data.scheduleTemplates;
          const validSlots = (arr: any[]) => (arr || []).filter((s: any) => s.startTime && s.endTime && s.groupKey);
          const vWork = validSlots(tpl.workday);
          const vSat = validSlots(tpl.saturday);
          const vSun = validSlots(tpl.sunday);
          const fixed: ScheduleTemplates = {
            workday: vWork.length >= 3 ? vWork : DEFAULT_SCHEDULE_TEMPLATES.workday,
            saturday: vSat.length >= 3 ? vSat : DEFAULT_SCHEDULE_TEMPLATES.saturday,
            sunday: vSun.length >= 3 ? vSun : DEFAULT_SCHEDULE_TEMPLATES.sunday,
          };
          setScheduleTemplates(fixed);
          // Save back if any template was replaced
          if (vWork.length < 3 || vSat.length < 3 || vSun.length < 3) {
            saveAppData(user.uid, { scheduleTemplates: fixed });
          }
        } else if (data.schedule && data.schedule.length > 0) {
          // Migrate old single schedule → workday template
          // Only use old schedule if entries have valid startTime
          const validOldSchedule = data.schedule.filter((s: any) => s.startTime && s.endTime && s.groupKey);
          const migrated: ScheduleTemplates = {
            workday: validOldSchedule.length > 0 ? validOldSchedule : DEFAULT_SCHEDULE_TEMPLATES.workday,
            saturday: DEFAULT_SCHEDULE_TEMPLATES.saturday,
            sunday: DEFAULT_SCHEDULE_TEMPLATES.sunday,
          };
          setScheduleTemplates(migrated);
          saveAppData(user.uid, { scheduleTemplates: migrated });
        } else {
          setScheduleTemplates(DEFAULT_SCHEDULE_TEMPLATES);
        }

        // Save back if migration or new default tasks were added
        // BUT ONLY if this is NOT triggered by our own save (prevent save loop)
        if ((needsMigration || mergedTasks.length > migratedTasks.length) && !wasRemoteUpdate) {
          console.log('💾 Auto-adding missing default tasks and saving...');
          saveAppData(user.uid, {
            tasks: mergedTasks,
            milestones: data.milestones || DEFAULT_MILESTONES,
            deletedDefaultTaskIds: deletedIds  // Preserve deleted task IDs
          });
        } else if (mergedTasks.length > migratedTasks.length) {
          console.log('⏭️ Skipped auto-save (was remote update, would create loop)');
        }
      } else {
        // First time user — use defaults and save to Firestore
        setTasks(defaultTasks);
        setTaskGroups(DEFAULT_GROUPS);
        setMilestones(DEFAULT_MILESTONES);
        setScheduleTemplates(DEFAULT_SCHEDULE_TEMPLATES);
        setDeletedDefaultTaskIds([]);
        saveAppData(user.uid, {
          tasks: defaultTasks,
          groups: DEFAULT_GROUPS,
          milestones: DEFAULT_MILESTONES,
          scheduleTemplates: DEFAULT_SCHEDULE_TEMPLATES,
          deletedDefaultTaskIds: []
        });
      }
      setFirestoreLoading(false);
      setTimeout(() => { isRemoteUpdateRef.current = false; }, 1000);
    });

    return () => unsubscribe();
  }, [user, loadTodayRecords]);

  // Auto-save: debounce 1.5s after any local change
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    console.log('🔄 Auto-save useEffect triggered. isRemoteUpdate:', isRemoteUpdateRef.current, 'tasks:', tasks.length);
    if (!firestoreReadyRef.current || isRemoteUpdateRef.current || !user) {
      console.log('⏭️ Auto-save skipped (not ready or remote update)');
      return;
    }

    // Clear previous timer
    if (saveTimerRef.current) {
      console.log('⏰ Auto-save: Clearing previous timer');
      clearTimeout(saveTimerRef.current);
    }

    setIsDirty(true);
    setSaveStatus('idle');
    console.log('⏱️ Auto-save: Setting timer (1.5s)...');

    saveTimerRef.current = setTimeout(async () => {
      console.log('💾 AUTO-SAVE executing! Tasks:', tasks.length, 'DeletedIds:', deletedDefaultTaskIds);
      setSaveStatus('saving');
      try {
        isRemoteUpdateRef.current = true;
        await saveAppData(user.uid, { tasks, groups: taskGroups, milestones, scheduleTemplates, deletedDefaultTaskIds });
        setIsDirty(false);
        setSaveStatus('saved');
        setTimeout(() => {
          setSaveStatus('idle');
          isRemoteUpdateRef.current = false;
        }, 500);
      } catch (err) {
        console.error('[DebugMe] Auto-save failed:', err);
        setSaveStatus('idle');
        isRemoteUpdateRef.current = false;
      }
    }, 1500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [tasks, taskGroups, milestones, scheduleTemplates, deletedDefaultTaskIds, user]);

  useEffect(() => { localStorage.setItem(VIEW_KEY, activeView); }, [activeView]);

  const handleExportData = () => {
    const data = {
      version: 3,
      exportedAt: new Date().toISOString(),
      tasks,
      groups: taskGroups,
      milestones,
      scheduleTemplates,
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
    try {
      // CRITICAL: Cancel any pending auto-save to prevent race condition
      if (saveTimerRef.current) {
        console.log('⏰ Cancelled pending auto-save timer');
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      isRemoteUpdateRef.current = true;
      const dataToSave = {
        tasks: updatedTasks || tasks,
        groups: taskGroups,
        milestones,
        scheduleTemplates,
        deletedDefaultTaskIds: updatedDeletedIds || deletedDefaultTaskIds
      };
      console.log('💾 Saving to Firestore:', {
        taskCount: dataToSave.tasks.length,
        deletedIdsCount: dataToSave.deletedDefaultTaskIds?.length || 0,
        deletedIds: dataToSave.deletedDefaultTaskIds
      });
      await saveAppData(user.uid, dataToSave);
      console.log('✅ Firestore save successful');
      setTimeout(() => { isRemoteUpdateRef.current = false; }, 1000);
    } catch (err) {
      console.error('[DebugMe] Immediate save failed:', err);
      isRemoteUpdateRef.current = false;
    }
  }, [user, tasks, taskGroups, milestones, scheduleTemplates, deletedDefaultTaskIds]);

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


  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard tasks={tasks} milestones={milestones} taskGroups={taskGroups} />;
      case 'planner': return <DailyPlanner tasks={tasks} setTasks={setTasks} taskGroups={taskGroups} milestones={milestones} scheduleTemplates={scheduleTemplates} setScheduleTemplates={setScheduleTemplates} todayRecords={todayRecords} onSaveDailyRecord={handleSaveDailyRecord} deletedDefaultTaskIds={deletedDefaultTaskIds} setDeletedDefaultTaskIds={setDeletedDefaultTaskIds} onImmediateSave={handleImmediateSave} />;
      case 'tasks': return <TaskManager tasks={tasks} setTasks={setTasks} taskGroups={taskGroups} setTaskGroups={setTaskGroups} deletedDefaultTaskIds={deletedDefaultTaskIds} setDeletedDefaultTaskIds={setDeletedDefaultTaskIds} onImmediateSave={handleImmediateSave} />;
      case 'focus': return <FocusTimer />;
      case 'analytics': return <Analytics tasks={tasks} taskGroups={taskGroups} scheduleTemplates={scheduleTemplates} todayRecords={todayRecords} totalRecordCount={totalRecordCount} userId={user!.uid} />;
      case 'ai-coach': return <AICoach tasks={tasks} />;
      default: return <Dashboard tasks={tasks} milestones={milestones} taskGroups={taskGroups} />;
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

        {/* Mobile Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 z-[60] lg:hidden">
          <div className="bg-white/90 backdrop-blur-md border-t border-slate-200 safe-bottom">
            <div className="flex items-center justify-around h-14">
              {NAV_ITEMS.map(item => {
                const isActive = activeView === item.view;
                const Icon = item.icon === 'Activity' ? Activity
                  : item.icon === 'CheckSquare' ? CheckSquare
                  : item.icon === 'BookOpen' ? BookOpen
                  : item.icon === 'Timer' ? Timer
                  : BarChart3;
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
