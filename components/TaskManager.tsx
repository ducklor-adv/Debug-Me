
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Task, TaskAttachment, SubTask, Recurrence, TaskGroup, GROUP_COLORS, LocationReminder, DEFAULT_CATEGORIES, PRIORITY_DEFAULT, getPriorityMeta, Expense, EXPENSE_CATEGORIES, EXPENSE_GROUPS, PAYMENT_METHODS, PaymentMethod } from '../types';
import { Plus, Trash2, CheckCircle2, Circle, X, Camera, Mic, Video, Phone, User as UserIcon, MapPin, Square, Image, Paperclip, Save, Sun, Moon, Coffee, Code, FileText, Home, Wrench, Dumbbell, BookOpen, Brain, RefreshCw, Pencil, Heart, HeartPulse, Users, Zap, Briefcase, ShoppingCart, Star, Calendar, Clock, Target, TrendingUp, Lightbulb, Music, Gamepad2, Book, Utensils, Bike, Palette, Rocket, CloudLightning, Handshake, GripVertical, ListTodo, AlertTriangle, Loader2, ChevronDown } from 'lucide-react';
import TaskEditModal from './TaskEditModal';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { arrayMove } from '@dnd-kit/sortable';

// Default recurring bills — common expenses grouped by financial statement categories
const DEFAULT_BILLS: { title: string; amount: number; category: string; group: string; recurrence: string; dueDay?: number }[] = [
  // ═══════════════════════════════════════
  // รายวัน
  // ═══════════════════════════════════════
  // 📌 จำเป็น
  { title: 'ค่าอาหาร 3 มื้อ', amount: 300, category: 'food', group: 'จำเป็น', recurrence: 'daily' },
  { title: 'ค่ากาแฟ/ของว่าง', amount: 50, category: 'food_extra', group: 'จำเป็น', recurrence: 'daily' },
  // 📋 อื่นๆ
  { title: 'ค่าเดินทาง/น้ำมัน/ทางด่วน', amount: 150, category: 'transport', group: 'จำเป็น', recurrence: 'daily' },

  // ═══════════════════════════════════════
  // รายเดือน
  // ═══════════════════════════════════════
  // 📌 จำเป็น — ที่อยู่อาศัย
  { title: 'ค่าเช่าบ้าน/ผ่อนบ้าน', amount: 8000, category: 'housing', group: 'จำเป็น', recurrence: 'monthly', dueDay: 1 },
  { title: 'ค่าไฟฟ้า', amount: 1500, category: 'housing', group: 'จำเป็น', recurrence: 'monthly', dueDay: 15 },
  { title: 'ค่าน้ำประปา', amount: 200, category: 'housing', group: 'จำเป็น', recurrence: 'monthly', dueDay: 15 },
  { title: 'ค่าส่วนกลาง/นิติบุคคล', amount: 1500, category: 'housing', group: 'จำเป็น', recurrence: 'monthly', dueDay: 5 },
  // 📌 จำเป็น — สุขภาพ
  { title: 'ค่ายา/อาหารเสริม', amount: 500, category: 'health', group: 'จำเป็น', recurrence: 'monthly' },
  // 📋 อื่นๆ — สื่อสาร
  { title: 'ค่าอินเทอร์เน็ตบ้าน', amount: 600, category: 'phone', group: 'อื่นๆ', recurrence: 'monthly', dueDay: 25 },
  { title: 'ค่ามือถือ (เบอร์หลัก)', amount: 500, category: 'phone', group: 'อื่นๆ', recurrence: 'monthly', dueDay: 25 },
  // 📋 อื่นๆ — Subscription
  { title: 'ค่า Netflix/YouTube/Spotify', amount: 350, category: 'subscription', group: 'อื่นๆ', recurrence: 'monthly', dueDay: 1 },
  { title: 'ค่า Cloud/iCloud/Google One', amount: 100, category: 'subscription', group: 'อื่นๆ', recurrence: 'monthly', dueDay: 1 },
  // 📋 อื่นๆ — ครอบครัว/สังคม
  { title: 'ให้เงินพ่อแม่', amount: 3000, category: 'family', group: 'อื่นๆ', recurrence: 'monthly', dueDay: 1 },
  { title: 'ค่าเรียนลูก/ค่าเลี้ยงดู', amount: 3000, category: 'family', group: 'อื่นๆ', recurrence: 'monthly', dueDay: 1 },
  // 📋 อื่นๆ — พัฒนาตัวเอง
  { title: 'ค่าคอร์สเรียน/สัมมนา', amount: 500, category: 'self_dev', group: 'อื่นๆ', recurrence: 'monthly' },
  // 🏦 ชำระหนี้
  { title: 'ค่าผ่อนบ้าน (สินเชื่อ)', amount: 10000, category: 'debt_mortgage', group: 'ชำระหนี้', recurrence: 'monthly', dueDay: 5 },
  { title: 'ค่าผ่อนรถ', amount: 7000, category: 'debt_mortgage', group: 'ชำระหนี้', recurrence: 'monthly', dueDay: 5 },
  { title: 'ค่าบัตรเครดิต', amount: 5000, category: 'debt_credit', group: 'ชำระหนี้', recurrence: 'monthly', dueDay: 10 },
  { title: 'ค่าสินเชื่อส่วนบุคคล', amount: 3000, category: 'debt_loan', group: 'ชำระหนี้', recurrence: 'monthly', dueDay: 15 },
  { title: 'ค่าผ่อนมือถือ/อุปกรณ์', amount: 1000, category: 'debt_loan', group: 'ชำระหนี้', recurrence: 'monthly', dueDay: 20 },
  // 📊 ลงทุน/ออม
  { title: 'เงินออมอัตโนมัติ', amount: 3000, category: 'saving', group: 'ลงทุน', recurrence: 'monthly', dueDay: 1 },
  { title: 'กองทุนรวม/DCA', amount: 2000, category: 'invest_out', group: 'ลงทุน', recurrence: 'monthly', dueDay: 1 },
  { title: 'ค่าประกันสุขภาพ (รายเดือน)', amount: 1500, category: 'insurance', group: 'ลงทุน', recurrence: 'monthly', dueDay: 1 },
  { title: 'กองทุนสำรองเลี้ยงชีพ/SSF/RMF', amount: 2000, category: 'saving', group: 'ลงทุน', recurrence: 'monthly', dueDay: 1 },

  // ═══════════════════════════════════════
  // รายไตรมาส
  // ═══════════════════════════════════════
  // 📌 จำเป็น
  { title: 'ค่าบำรุงรักษาคอนโด/หมู่บ้าน (รายไตรมาส)', amount: 3000, category: 'housing', group: 'จำเป็น', recurrence: 'quarterly' },
  { title: 'ค่าตรวจสุขภาพ/ทันตแพทย์', amount: 1500, category: 'health', group: 'จำเป็น', recurrence: 'quarterly' },
  // 📋 อื่นๆ
  { title: 'ค่าซ่อมบำรุงรถ/เช็คระยะ', amount: 2500, category: 'repair', group: 'อื่นๆ', recurrence: 'quarterly' },
  { title: 'ค่าทำความสะอาดบ้าน (ใหญ่)', amount: 1500, category: 'repair', group: 'อื่นๆ', recurrence: 'quarterly' },
  { title: 'ค่าสังสรรค์/งานเลี้ยง', amount: 2000, category: 'social', group: 'อื่นๆ', recurrence: 'quarterly' },

  // ═══════════════════════════════════════
  // รายปี
  // ═══════════════════════════════════════
  // 📌 จำเป็น
  { title: 'ค่าภาษีที่ดิน/สิ่งปลูกสร้าง', amount: 2000, category: 'housing', group: 'จำเป็น', recurrence: 'yearly' },
  { title: 'ค่าเสื้อผ้า/รองเท้า (ซื้อใหม่)', amount: 5000, category: 'clothing', group: 'จำเป็น', recurrence: 'yearly' },
  { title: 'ค่าตรวจสุขภาพประจำปี', amount: 3000, category: 'health', group: 'จำเป็น', recurrence: 'yearly' },
  // 📋 อื่นๆ
  { title: 'ต่อทะเบียนรถ/ภาษีรถ', amount: 3000, category: 'transport', group: 'จำเป็น', recurrence: 'yearly' },
  { title: 'ค่าต่ออายุสมาชิก/ลิขสิทธิ์ซอฟต์แวร์', amount: 3000, category: 'subscription', group: 'อื่นๆ', recurrence: 'yearly' },
  { title: 'ค่าซ่อมแซมบ้าน/เครื่องใช้ไฟฟ้า', amount: 5000, category: 'repair', group: 'อื่นๆ', recurrence: 'yearly' },
  { title: 'ค่าท่องเที่ยว/พักผ่อนประจำปี', amount: 15000, category: 'luxury', group: 'อื่นๆ', recurrence: 'yearly' },
  { title: 'ค่าของขวัญ/งานบุญ/กฐิน', amount: 3000, category: 'social', group: 'อื่นๆ', recurrence: 'yearly' },
  // 🏦 ชำระหนี้
  { title: 'ค่าธรรมเนียมบัตรเครดิต (รายปี)', amount: 2000, category: 'debt_credit', group: 'ชำระหนี้', recurrence: 'yearly' },
  // 📊 ลงทุน/ออม
  { title: 'ต่อ พ.ร.บ. + ประกันรถชั้น 1', amount: 15000, category: 'insurance', group: 'ลงทุน', recurrence: 'yearly' },
  { title: 'ค่าประกันชีวิต (รายปี)', amount: 15000, category: 'insurance', group: 'ลงทุน', recurrence: 'yearly' },
  { title: 'ค่าประกันอัคคีภัย/บ้าน', amount: 3000, category: 'insurance', group: 'ลงทุน', recurrence: 'yearly' },
  { title: 'ภาษีเงินได้บุคคลธรรมดา', amount: 10000, category: 'other_expense', group: 'อื่นๆ', recurrence: 'yearly' },
];

// Custom SVG icons (lucide style: 24x24 viewBox, stroke-based)
const BroomIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Handle */}
    <line x1="12" y1="2" x2="12" y2="13" />
    {/* Binding */}
    <rect x="9.5" y="12.5" width="5" height="2" rx="0.5" />
    {/* Bristles */}
    <line x1="8" y1="14.5" x2="6" y2="22" />
    <line x1="9.5" y1="14.5" x2="8.5" y2="22" />
    <line x1="11" y1="14.5" x2="10.5" y2="22" />
    <line x1="12" y1="14.5" x2="12" y2="22" />
    <line x1="13" y1="14.5" x2="13.5" y2="22" />
    <line x1="14.5" y1="14.5" x2="15.5" y2="22" />
    <line x1="16" y1="14.5" x2="18" y2="22" />
  </svg>
);

const FlexIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {/* Arm: shoulder to elbow */}
    <path d="M4 17 L10 13" />
    {/* Arm: elbow to fist (flexed up) */}
    <path d="M10 13 L7 5" />
    {/* Bicep bulge */}
    <path d="M7 8 Q5 10 8 12" />
    {/* Fist */}
    <circle cx="7" cy="4.5" r="1.5" fill="currentColor" />
  </svg>
);

const BrainIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Left hemisphere outer */}
    <path d="M12 4 Q2 4 3 12 Q2 18 6 20 Q9 22 12 20" />
    {/* Right hemisphere outer */}
    <path d="M12 4 Q22 4 21 12 Q22 18 18 20 Q15 22 12 20" />
    {/* Center divide */}
    <path d="M12 4 L12 20" />
    {/* Left wrinkle */}
    <path d="M5 10 Q8 9 9 12" />
    <path d="M6 16 Q8 14 10 16" />
    {/* Right wrinkle */}
    <path d="M19 10 Q16 9 15 12" />
    <path d="M18 16 Q16 14 14 16" />
  </svg>
);

const FamilyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7" cy="5" r="2" />
    <circle cx="17" cy="5" r="2" />
    <circle cx="12" cy="9" r="1.5" />
    <path d="M5 10c0 0-1 2-1 4h6" />
    <path d="M19 10c0 0 1 2 1 4h-6" />
    <path d="M10.5 12c0 0-.5 1.5-.5 3h4c0-1.5-.5-3-.5-3" />
    <line x1="4" y1="14" x2="4" y2="20" />
    <line x1="10" y1="14" x2="10" y2="20" />
    <line x1="14" y1="15" x2="14" y2="20" />
    <line x1="20" y1="14" x2="20" y2="20" />
  </svg>
);

interface TaskManagerProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  taskGroups: TaskGroup[];
  setTaskGroups: React.Dispatch<React.SetStateAction<TaskGroup[]>>;
  deletedDefaultTaskIds: string[];
  setDeletedDefaultTaskIds: React.Dispatch<React.SetStateAction<string[]>>;
  onImmediateSave?: (updatedTasks?: Task[], updatedDeletedIds?: string[]) => Promise<void>;
  initialGroupKey?: string | null;
  initialQuickAdd?: string | null;
  defaultTasks?: Task[];
  expenses?: Expense[];
  setExpenses?: React.Dispatch<React.SetStateAction<Expense[]>>;
}

// Derive style from a TaskGroup using GROUP_COLORS
const getGroupStyle = (g: TaskGroup) => {
  const c = GROUP_COLORS[g.color] || GROUP_COLORS.orange;
  return { key: g.key, label: g.label, emoji: g.emoji, icon: g.icon, size: g.size, ...c };
};

const EMOJI_OPTIONS = ['🔥','🏠','🔧','☕','🧠','⚡','💼','❤️','🎯','📌','🌟','🎓','💪','🙏','🌱','🎨','👨‍👩‍👧','🤝'];

const COLOR_OPTIONS = Object.keys(GROUP_COLORS);

const GROUP_ICON_MAP: Record<string, React.ReactNode> = {
  code: <Code className="w-3.5 h-3.5" />,
  home: <Home className="w-3.5 h-3.5" />,
  coffee: <Coffee className="w-3.5 h-3.5" />,
  brain: <Brain className="w-3.5 h-3.5" />,
  book: <BookOpen className="w-3.5 h-3.5" />,
  gym: <Dumbbell className="w-3.5 h-3.5" />,
  file: <FileText className="w-3.5 h-3.5" />,
  wrench: <Wrench className="w-3.5 h-3.5" />,
  sun: <Sun className="w-3.5 h-3.5" />,
  moon: <Moon className="w-3.5 h-3.5" />,
  lightning: <CloudLightning className="w-3.5 h-3.5" />,
  broom: <BroomIcon className="w-3.5 h-3.5" />,
  family: <FamilyIcon className="w-3.5 h-3.5" />,
  flex: <FlexIcon className="w-3.5 h-3.5" />,
  brain2: <BrainIcon className="w-3.5 h-3.5" />,
  target: <Target className="w-3.5 h-3.5" />,
  pencil: <Pencil className="w-3.5 h-3.5" />,
  heart: <Heart className="w-3.5 h-3.5" />,
  heartpulse: <HeartPulse className="w-3.5 h-3.5" />,
  dumbbell: <Dumbbell className="w-3.5 h-3.5" />,
  users: <Users className="w-3.5 h-3.5" />,
  zap: <Zap className="w-3.5 h-3.5" />,
  briefcase: <Briefcase className="w-3.5 h-3.5" />,
  cart: <ShoppingCart className="w-3.5 h-3.5" />,
  star: <Star className="w-3.5 h-3.5" />,
  calendar: <Calendar className="w-3.5 h-3.5" />,
  clock: <Clock className="w-3.5 h-3.5" />,
  trending: <TrendingUp className="w-3.5 h-3.5" />,
  lightbulb: <Lightbulb className="w-3.5 h-3.5" />,
  music: <Music className="w-3.5 h-3.5" />,
  game: <Gamepad2 className="w-3.5 h-3.5" />,
  utensils: <Utensils className="w-3.5 h-3.5" />,
  bike: <Bike className="w-3.5 h-3.5" />,
  palette: <Palette className="w-3.5 h-3.5" />,
  rocket: <Rocket className="w-3.5 h-3.5" />,
  handshake: <Handshake className="w-3.5 h-3.5" />,
};

// Sortable wrapper for task items in category modal
const SortableTaskItem: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} className={`flex items-stretch transition-shadow ${isDragging ? 'shadow-lg rounded-xl ring-2 ring-emerald-300 bg-white' : ''}`}>
      <div {...listeners} className="w-10 shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-300 hover:text-emerald-500 active:text-emerald-600 transition-colors touch-none">
        <GripVertical className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};

const emptyForm = (): Omit<Task, 'id'> => ({
  title: '',
  description: '',
  priority: PRIORITY_DEFAULT,
  completed: false,
  category: 'งานหลัก',
  notes: '',
  attachments: [],
  dayTypes: ['workday', 'saturday', 'sunday'],
});

const TaskManager: React.FC<TaskManagerProps> = ({ tasks, setTasks, taskGroups, setTaskGroups, deletedDefaultTaskIds, setDeletedDefaultTaskIds, onImmediateSave, initialGroupKey, initialQuickAdd, defaultTasks = [], expenses = [], setExpenses }) => {
  // DnD sensors for task reordering
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
  );

  const handleTaskDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex(t => t.id === active.id);
    const newIndex = tasks.findIndex(t => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const updatedTasks = arrayMove(tasks, oldIndex, newIndex);
    setTasks(updatedTasks);
    if (onImmediateSave) await withSaveStatus(() => onImmediateSave(updatedTasks));
  };

  // Derive style objects from dynamic groups
  const groupStyles = taskGroups.map(getGroupStyle);
  const getTypeStyle = (cat: string) => groupStyles.find(s => s.key === cat) || groupStyles[0];

  // Group form state
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', emoji: '📌', color: 'cyan', icon: 'code', categoryKey: 'career' });
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState<string | null>(null);
  const [showClearDefaultConfirm, setShowClearDefaultConfirm] = useState(false);
  const [defaultPickerGroup, setDefaultPickerGroup] = useState<string | null>(null);
  const [selectedDefaultIds, setSelectedDefaultIds] = useState<Set<string>>(new Set());
  const [recurrenceEditTaskId, setRecurrenceEditTaskId] = useState<string | null>(null);
  const [recurrenceForm, setRecurrenceForm] = useState<Recurrence | undefined>(undefined);
  const [recurrenceStartDate, setRecurrenceStartDate] = useState<string>('');
  const [durationEditTaskId, setDurationEditTaskId] = useState<string | null>(null);
  const [durationValue, setDurationValue] = useState<number>(0);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<Set<string>>(new Set());
  // Expense quick-add/edit popup
  const [expensePopup, setExpensePopup] = useState<{ category: string; title: string; recurrence: string; dueDay?: number; editId?: string } | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    title: '', amount: '', date: new Date().toISOString().split('T')[0],
    isRecurring: true, method: 'transfer' as PaymentMethod, notes: '', slipUrl: '',
    dueDay: 0,
  });
  const slipInputRef = React.useRef<HTMLInputElement>(null);

  // Form state (shared modal)
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [initialTask, setInitialTask] = useState<Omit<Task, 'id'> | null>(null);
  const [initialSubtasks, setInitialSubtasks] = useState<SubTask[]>([]);
  const [initialAttachments, setInitialAttachments] = useState<TaskAttachment[]>([]);
  const [initialRecurrence, setInitialRecurrence] = useState<Recurrence | undefined>(undefined);
  const [activeQuickTab, setActiveQuickTab] = useState<string>('_categories');
  const [activeBillsTab, setActiveBillsTab] = useState<string>('monthly');

  // Save status tracking
  const [taskSaveStatus, setTaskSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const withSaveStatus = async (action: () => Promise<void>) => {
    setTaskSaveStatus('saving');
    try {
      await action();
      setTaskSaveStatus('saved');
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
      saveStatusTimerRef.current = setTimeout(() => setTaskSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('[TaskManager] Save failed:', err);
      setTaskSaveStatus('error');
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
      saveStatusTimerRef.current = setTimeout(() => setTaskSaveStatus('idle'), 5000);
    }
  };

  // Expanded card & selected category
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const savedCatRef = useRef<string | null>(null);

  const openNewForm = () => {
    setEditId(null);
    setInitialTask(emptyForm());
    setInitialSubtasks([]);
    setInitialAttachments([]);
    setInitialRecurrence(undefined);
    setFormOpen(true);
  };

  const openNewFormWithCategory = (cat: string) => {
    savedCatRef.current = selectedCat;
    setSelectedCat(null);
    setEditId(null);
    setInitialTask({ ...emptyForm(), category: cat });
    setInitialSubtasks([]);
    setInitialAttachments([]);
    setInitialRecurrence(undefined);
    setFormOpen(true);
  };

  // Auto-select group tab when navigated from Dashboard (don't open form)
  useEffect(() => {
    if (initialGroupKey) setSelectedCat(initialGroupKey);
  }, [initialGroupKey]);

  // Auto-open new-task form with preset category (quick add from Dashboard popup)
  useEffect(() => {
    if (initialQuickAdd) {
      setActiveQuickTab(initialQuickAdd);
      openNewFormWithCategory(initialQuickAdd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuickAdd]);

  const openEditForm = (task: Task) => {
    savedCatRef.current = selectedCat;
    setSelectedCat(null);
    setEditId(task.id);
    setInitialTask({
      title: task.title, description: task.description, priority: task.priority,
      completed: task.completed, startDate: task.startDate, endDate: task.endDate,
      startTime: task.startTime, endTime: task.endTime,
      category: task.category, notes: task.notes || '', attachments: task.attachments || [],
      dayTypes: task.dayTypes, estimatedDuration: task.estimatedDuration,
    });
    setInitialAttachments(task.attachments || []);
    setInitialSubtasks(task.subtasks || []);
    setInitialRecurrence(task.recurrence);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditId(null);
    setInitialTask(null);
    if (savedCatRef.current) {
      setSelectedCat(savedCatRef.current);
      savedCatRef.current = null;
    }
  };

  const handleModalSave = async (data: { form: Omit<Task, 'id'>; subtasks: SubTask[]; attachments: TaskAttachment[]; recurrence?: Recurrence }) => {
    const subtasks = data.subtasks.length > 0 ? data.subtasks : undefined;
    let updatedTasks: Task[];
    if (editId) {
      updatedTasks = tasks.map(t => t.id === editId ? { ...t, ...data.form, attachments: data.attachments, subtasks, recurrence: data.recurrence } : t);
    } else {
      const newTask: Task = { id: Date.now().toString(), ...data.form, attachments: data.attachments, subtasks, recurrence: data.recurrence };
      updatedTasks = [newTask, ...tasks];
    }
    setTasks(updatedTasks);
    closeForm();
    if (onImmediateSave) {
      await withSaveStatus(() => onImmediateSave(updatedTasks));
    }
  };

  // (subtask helpers moved to TaskEditModal)

  const toggleTask = async (id: string) => {
    const updatedTasks = tasks.map(t => t.id === id ? {
      ...t,
      completed: !t.completed,
      completedAt: !t.completed ? new Date().toISOString() : undefined,
    } : t);
    setTasks(updatedTasks);
    if (onImmediateSave) await withSaveStatus(() => onImmediateSave(updatedTasks));
  };

  const deleteTask = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (confirmDeleteId) {
      console.log('🗑️ Deleting task:', confirmDeleteId);
      const updatedTasks = tasks.filter(t => t.id !== confirmDeleteId);

      // If deleting a default task (id starts with 'd-'), track it
      let updatedDeletedIds = deletedDefaultTaskIds;
      if (confirmDeleteId.startsWith('d-') && !deletedDefaultTaskIds.includes(confirmDeleteId)) {
        updatedDeletedIds = [...deletedDefaultTaskIds, confirmDeleteId];
        console.log('📝 Updated deletedDefaultTaskIds:', updatedDeletedIds);
      }

      setTasks(updatedTasks);
      setDeletedDefaultTaskIds(updatedDeletedIds);
      setConfirmDeleteId(null);

      if (onImmediateSave) {
        await withSaveStatus(() => onImmediateSave(updatedTasks, updatedDeletedIds));
      }
    }
  };

  // (attachment handlers moved to TaskEditModal)

  // Group CRUD
  const openGroupForm = () => {
    setEditingGroupKey(null);
    setGroupForm({ name: '', emoji: '📌', color: 'cyan', icon: 'code', categoryKey: 'career' });
    setGroupFormOpen(true);
  };
  const openEditGroup = (g: TaskGroup) => {
    setEditingGroupKey(g.key);
    setGroupForm({ name: g.label, emoji: g.emoji, color: g.color, icon: g.icon, categoryKey: g.categoryKey || 'career' });
    setGroupFormOpen(true);
  };
  const saveGroup = async () => {
    const name = groupForm.name.trim();
    if (!name) return;

    if (editingGroupKey) {
      // Edit mode: update group and rename tasks' category
      const oldKey = editingGroupKey;
      setTaskGroups(prev => prev.map(g => g.key === oldKey ? { ...g, key: name, label: name, emoji: groupForm.emoji, color: groupForm.color, icon: groupForm.icon, categoryKey: groupForm.categoryKey } : g));
      if (name !== oldKey) {
        const updatedTasks = tasks.map(t => t.category === oldKey ? { ...t, category: name } : t);
        setTasks(updatedTasks);
        if (onImmediateSave) await withSaveStatus(() => onImmediateSave(updatedTasks));
      } else {
        if (onImmediateSave) await withSaveStatus(() => onImmediateSave());
      }
      setEditingGroupKey(null);
    } else {
      // Create mode
      if (taskGroups.some(g => g.key === name)) return; // duplicate
      const newGroup: TaskGroup = {
        key: name,
        label: name,
        emoji: groupForm.emoji,
        color: groupForm.color,
        icon: groupForm.icon,
        size: 64,
        categoryKey: groupForm.categoryKey,
      };
      setTaskGroups(prev => [...prev, newGroup]);
      if (onImmediateSave) await withSaveStatus(() => onImmediateSave());
    }
    setGroupFormOpen(false);
  };
  const deleteGroup = async (key: string) => {
    const updatedTasks = tasks.filter(t => t.category !== key);
    setTaskGroups(prev => prev.filter(g => g.key !== key));
    setTasks(updatedTasks);
    setDeleteGroupConfirm(null);
    if (selectedCat === key) setSelectedCat(null);
    if (onImmediateSave) await withSaveStatus(() => onImmediateSave(updatedTasks));
  };

  return (
    <div className="space-y-6 pb-10">


      {/* ===== Clear Default Confirm Modal ===== */}
      {showClearDefaultConfirm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowClearDefaultConfirm(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl animate-fadeIn overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 text-center">
              <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-rose-500" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">ล้าง Default Tasks?</h3>
              <p className="text-sm text-slate-500 mb-1">จะลบ task ตัวอย่างทั้งหมด <span className="font-bold text-rose-600">{tasks.filter(t => t.id.startsWith('d-')).length} รายการ</span></p>
              <p className="text-xs text-slate-400">task ที่คุณสร้างเองจะไม่ถูกลบ</p>
            </div>
            <div className="flex border-t border-slate-100">
              <button onClick={() => setShowClearDefaultConfirm(false)} className="flex-1 py-3.5 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors">
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  const defaultIds = tasks.filter(t => t.id.startsWith('d-')).map(t => t.id);
                  const updatedDeletedIds = [...new Set([...deletedDefaultTaskIds, ...defaultIds])];
                  const updatedTasks = tasks.filter(t => !t.id.startsWith('d-'));
                  setTasks(updatedTasks);
                  setDeletedDefaultTaskIds(updatedDeletedIds);
                  setShowClearDefaultConfirm(false);
                  if (onImmediateSave) await withSaveStatus(() => onImmediateSave(updatedTasks, updatedDeletedIds));
                }}
                className="flex-1 py-3.5 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors border-l border-slate-100"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ===== Default Task Picker Modal ===== */}
      {defaultPickerGroup !== null && createPortal(
        <div style={{ zIndex: 9100 }} className="fixed inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setDefaultPickerGroup(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-fadeIn overflow-hidden" onClick={e => e.stopPropagation()}>
            {(() => {
              const groupData = taskGroups.find(g => g.key === defaultPickerGroup);
              const style = getTypeStyle(defaultPickerGroup);
              const allDefaults = defaultTasks.filter(t => t.category === defaultPickerGroup);
              const existingIds = new Set(tasks.map(t => t.id));
              const selectableDefaults = allDefaults.filter(t => !existingIds.has(t.id));
              const dayTypeLabel = (dt?: string[]) => {
                if (!dt || dt.length === 0) return 'ทุกวัน';
                return dt.map(d => d === 'workday' ? 'วันทำงาน' : d === 'saturday' ? 'เสาร์' : d === 'sunday' ? 'อาทิตย์' : d).join(', ');
              };

              return (
                <>
                  {/* Header */}
                  <div className={`p-4 ${style.bg} border-b ${style.border}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{groupData?.emoji || '📋'}</span>
                        <div>
                          <h3 className={`font-black text-base ${style.text}`}>{groupData?.label || defaultPickerGroup}</h3>
                          <p className="text-xs text-slate-500">เลือก Default Tasks ที่ต้องการ</p>
                        </div>
                      </div>
                      <button onClick={() => setDefaultPickerGroup(null)} className="p-2 rounded-xl hover:bg-white/50 text-slate-400 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    {/* Select all / none */}
                    {selectableDefaults.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => setSelectedDefaultIds(new Set(selectableDefaults.map(t => t.id)))}
                          className="px-2.5 py-1 bg-white/80 border border-white rounded-lg text-[11px] font-bold text-slate-600 hover:bg-white transition-colors"
                        >
                          เลือกทั้งหมด ({selectableDefaults.length})
                        </button>
                        <button
                          onClick={() => setSelectedDefaultIds(new Set())}
                          className="px-2.5 py-1 bg-white/50 border border-white/80 rounded-lg text-[11px] font-bold text-slate-400 hover:bg-white/70 transition-colors"
                        >
                          ยกเลิกทั้งหมด
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Task list */}
                  <div className="p-3 max-h-[50vh] overflow-y-auto space-y-0.5">
                    {allDefaults.length === 0 ? (
                      <p className="text-center text-sm text-slate-400 py-8">ไม่มี Default Tasks สำหรับกลุ่มนี้</p>
                    ) : allDefaults.map(task => {
                      const alreadyAdded = existingIds.has(task.id);
                      const isSelected = selectedDefaultIds.has(task.id);
                      return (
                        <div
                          key={task.id}
                          onClick={() => {
                            if (alreadyAdded) return;
                            setSelectedDefaultIds(prev => {
                              const next = new Set(prev);
                              if (next.has(task.id)) next.delete(task.id); else next.add(task.id);
                              return next;
                            });
                          }}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                            alreadyAdded ? 'opacity-40 cursor-default' : isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          {alreadyAdded ? (
                            <CheckCircle2 className="w-4 h-4 text-slate-300 shrink-0" />
                          ) : isSelected ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <span className={`text-xs ${alreadyAdded ? 'text-slate-400 line-through' : isSelected ? 'text-emerald-700' : 'text-slate-700'}`}>{task.title}</span>
                          {task.description && <span className="text-[10px] text-slate-300 truncate flex-1">— {task.description}</span>}
                          <span className="text-[9px] text-slate-300 shrink-0">{dayTypeLabel(task.dayTypes)}</span>
                          {task.estimatedDuration && <span className="text-[9px] text-blue-400 shrink-0">{task.estimatedDuration} น.</span>}
                          {alreadyAdded && <span className="text-[9px] text-slate-400 shrink-0">เพิ่มแล้ว</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between p-3 border-t border-slate-100 bg-slate-50/50">
                    <button
                      onClick={() => setDefaultPickerGroup(null)}
                      className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      ยกเลิก
                    </button>
                    <button
                      disabled={selectedDefaultIds.size === 0}
                      onClick={async () => {
                        const selectedTasks = allDefaults.filter(t => selectedDefaultIds.has(t.id));
                        const idsToRestore = selectedTasks.map(t => t.id);
                        const updatedDeletedIds = deletedDefaultTaskIds.filter(id => !idsToRestore.includes(id));
                        const updatedTasks = [...tasks, ...selectedTasks];
                        setTasks(updatedTasks);
                        setDeletedDefaultTaskIds(updatedDeletedIds);
                        setDefaultPickerGroup(null);
                        setSelectedDefaultIds(new Set());
                        if (onImmediateSave) await withSaveStatus(() => onImmediateSave(updatedTasks, updatedDeletedIds));
                      }}
                      className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        selectedDefaultIds.size > 0
                          ? 'bg-emerald-500 text-white shadow-md hover:bg-emerald-600 active:scale-95'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      เพิ่ม ({selectedDefaultIds.size} รายการ)
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* ===== Group Form ===== */}
      {groupFormOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-4 pt-20 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-fadeIn overflow-hidden my-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">{editingGroupKey ? 'แก้ไข Task Group' : 'สร้าง Task Group ใหม่'}</h3>
              <button onClick={() => setGroupFormOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">ชื่อกลุ่ม</label>
                <input type="text" autoFocus value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="เช่น ครอบครัว, การกุศล..." />
              </div>

              {/* Category picker */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">หมวดหมู่</label>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_CATEGORIES.map(cat => (
                    <button key={cat.key} onClick={() => setGroupForm({ ...groupForm, categoryKey: cat.key })} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-all ${groupForm.categoryKey === cat.key ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                      <span>{cat.emoji}</span> {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Emoji picker */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">Emoji</label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_OPTIONS.map(em => (
                    <button key={em} onClick={() => setGroupForm({ ...groupForm, emoji: em })} className={`w-10 h-10 rounded-xl border-2 text-lg flex items-center justify-center transition-all ${groupForm.emoji === em ? 'border-emerald-400 bg-emerald-50 scale-110' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">สี</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map(c => {
                    const theme = GROUP_COLORS[c];
                    return (
                      <button key={c} onClick={() => setGroupForm({ ...groupForm, color: c })} className={`w-9 h-9 rounded-full ${theme.iconBg} border-2 transition-all ${groupForm.color === c ? 'border-slate-800 scale-125 ring-2 ring-offset-2 ring-slate-300' : 'border-white hover:scale-110'}`} />
                    );
                  })}
                </div>
              </div>

              {/* Icon picker */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">ไอคอน (สำหรับ Planner)</label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(GROUP_ICON_MAP).map(([key, icon]) => (
                    <button key={key} onClick={() => setGroupForm({ ...groupForm, icon: key })} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-all ${groupForm.icon === key ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                      {icon} {key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {groupForm.name.trim() && (() => {
                const theme = GROUP_COLORS[groupForm.color] || GROUP_COLORS.cyan;
                return (
                  <div className={`p-4 rounded-xl border-2 ${theme.border} ${theme.bg} flex items-center gap-3`}>
                    <div className={`w-12 h-12 rounded-full ${theme.iconBg} flex items-center justify-center text-white text-xl`}>{groupForm.emoji}</div>
                    <div>
                      <span className={`text-sm font-black ${theme.text}`}>{groupForm.name}</span>
                      <div className="text-[10px] text-slate-400 font-bold">Preview</div>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button onClick={() => setGroupFormOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm rounded-xl transition-colors">ยกเลิก</button>
              <button onClick={saveGroup} disabled={!groupForm.name.trim() || (!editingGroupKey && taskGroups.some(g => g.key === groupForm.name.trim())) || (!!editingGroupKey && groupForm.name.trim() !== editingGroupKey && taskGroups.some(g => g.key === groupForm.name.trim()))} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-200 transition-colors disabled:opacity-40 flex items-center gap-2">
                {editingGroupKey ? <><Save className="w-4 h-4" /> บันทึก</> : <><Plus className="w-4 h-4" /> สร้างกลุ่ม</>}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ===== Delete Group Confirm ===== */}
      {deleteGroupConfirm && createPortal((() => {
        const g = taskGroups.find(x => x.key === deleteGroupConfirm);
        const count = tasks.filter(t => t.category === deleteGroupConfirm).length;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl animate-fadeIn p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mx-auto">
                <Trash2 className="w-7 h-7 text-rose-500" />
              </div>
              <h3 className="font-black text-lg text-slate-800">ลบกลุ่ม "{g?.label}"?</h3>
              {count > 0 && (
                <p className="text-sm text-rose-500 font-bold">task ทั้งหมด {count} รายการในกลุ่มนี้จะถูกลบด้วย</p>
              )}
              <div className="flex gap-3 justify-center pt-2">
                <button onClick={() => setDeleteGroupConfirm(null)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm rounded-xl transition-colors">ยกเลิก</button>
                <button onClick={() => deleteGroup(deleteGroupConfirm)} className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm rounded-xl transition-colors flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> ลบเลย
                </button>
              </div>
            </div>
          </div>
        );
      })(), document.body)}

      {/* ===== Task Form (Add / Edit) — Shared Modal ===== */}
      <TaskEditModal
        isOpen={formOpen}
        editId={editId}
        initialTask={initialTask}
        initialSubtasks={initialSubtasks}
        initialAttachments={initialAttachments}
        initialRecurrence={initialRecurrence}
        taskGroups={taskGroups}
        onClose={closeForm}
        onSave={handleModalSave}
        onDelete={deleteTask}
      />



      {/* ===== หมวดกิจกรรม + งานด่วน + นัดหมาย — File Folder Tabs ===== */}
      {(() => {
        const uncatGroups = taskGroups.filter(g => !g.categoryKey);

        const effectiveTab = activeQuickTab;
        const activeGroup = effectiveTab ? uncatGroups.find(g => g.key === effectiveTab) : null;
        const activeColor = activeGroup ? (GROUP_COLORS[activeGroup.color] || GROUP_COLORS.rose) : null;
        const activeGroupTasks = activeGroup ? tasks.filter(t => t.category === activeGroup.key).sort((a, b) => (b.priority as number) - (a.priority as number)) : [];

        // Thai date helpers
        const thaiDayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
        const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const todayStr = new Date().toISOString().slice(0, 10);
        const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

        const formatThaiDate = (dateStr: string) => {
          const d = new Date(dateStr);
          const day = d.getDate();
          const month = thaiMonths[d.getMonth()];
          const dow = thaiDayNames[d.getDay()];
          if (dateStr === todayStr) return `วันนี้ — ${dow} ${day} ${month}`;
          if (dateStr === tomorrowStr) return `พรุ่งนี้ — ${dow} ${day} ${month}`;
          return `${dow} ${day} ${month}`;
        };

        // Group tasks by startDate
        const dateMap: Record<string, Task[]> = {};
        const noDateTasks: Task[] = [];
        activeGroupTasks.forEach(t => {
          if (!t.startDate) { noDateTasks.push(t); return; }
          if (!dateMap[t.startDate]) dateMap[t.startDate] = [];
          dateMap[t.startDate].push(t);
        });
        const dateGroups = Object.entries(dateMap).sort(([a], [b]) => a.localeCompare(b));

        const renderTask = (t: Task) => (
          <div
            key={t.id}
            onClick={() => openEditForm(t)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-slate-50 transition-all ${
              t.completed ? 'opacity-50' : ''
            }`}
          >
            {t.completed
              ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              : <Circle className={`w-4 h-4 shrink-0 ${activeColor!.text} opacity-40`} />
            }
            <span className={`text-xs flex-1 truncate ${t.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
              {t.title}
            </span>
            {t.startTime && (
              <span className="text-[10px] text-slate-400 shrink-0">{t.startTime}</span>
            )}
            {(t.priority as number) >= 6 && (
              <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${getPriorityMeta(t.priority).color} ${getPriorityMeta(t.priority).textColor}`}>{t.priority}</span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); deleteTask(t.id); }}
              className="p-0.5 rounded text-slate-300 hover:text-rose-500 transition-colors shrink-0"
              title="ลบรายการ"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );

        return (
          <div className="mb-3 animate-fadeIn">
            {/* Tabs */}
            <div className="flex items-end gap-0.5">
              {/* หมวดกิจกรรม tab (first) */}
              <button
                onClick={() => setActiveQuickTab('_categories')}
                className={`flex-1 whitespace-nowrap text-center px-1 pt-2 pb-2 rounded-t-xl border border-b-0 text-xs font-black transition-all ${
                  effectiveTab === '_categories'
                    ? 'bg-blue-50 border-blue-200 text-blue-600 relative z-10 -mb-px pb-2.5'
                    : 'bg-slate-100/60 border-slate-200/60 text-blue-400 hover:text-blue-500 scale-[0.97] origin-bottom'
                }`}
              >
                หมวดกิจกรรม
              </button>
              {/* งานด่วน / นัดหมาย tabs */}
              {uncatGroups.map(g => {
                const c = GROUP_COLORS[g.color] || GROUP_COLORS.rose;
                const isActive = effectiveTab === g.key;
                const count = tasks.filter(t => t.category === g.key).length;

                return (
                  <button
                    key={g.key}
                    onClick={() => setActiveQuickTab(g.key)}
                    className={`flex-1 whitespace-nowrap flex items-center justify-center gap-1 px-1 pt-2 pb-2 rounded-t-xl border border-b-0 text-xs font-black transition-all ${
                      isActive
                        ? 'bg-blue-50 border-blue-200 text-blue-600 relative z-10 -mb-px pb-2.5'
                        : 'bg-slate-100/60 border-slate-200/60 text-blue-400 hover:text-blue-500 scale-[0.97] origin-bottom'
                    }`}
                  >
                    {g.label}
                    {count > 0 && (
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${isActive ? 'bg-blue-200 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
              {/* อย่าลืมจ่าย tab */}
              <button
                onClick={() => setActiveQuickTab('_bills')}
                className={`flex-1 whitespace-nowrap flex items-center justify-center gap-1 px-1 pt-2 pb-2 rounded-t-xl border border-b-0 text-xs font-black transition-all ${
                  effectiveTab === '_bills'
                    ? 'bg-blue-50 border-blue-200 text-blue-600 relative z-10 -mb-px pb-2.5'
                    : 'bg-slate-100/60 border-slate-200/60 text-blue-400 hover:text-blue-500 scale-[0.97] origin-bottom'
                }`}
              >
                อย่าลืมจ่าย
                {(() => { const c = expenses.filter(e => e.type === 'recurring' && e.flow === 'expense').length; return c > 0 ? <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${effectiveTab === '_bills' ? 'bg-blue-200 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>{c}</span> : null; })()}
              </button>
            </div>

            {/* Content */}
            {effectiveTab === '_categories' ? (
              <div className="rounded-b-xl rounded-tr-xl border p-3 bg-emerald-50 border-emerald-200">
                {/* Controls */}
                <div className="flex justify-end gap-1.5 mb-2">
                  {tasks.some(t => t.id.startsWith('d-')) && (
                    <button onClick={() => setShowClearDefaultConfirm(true)} className="px-1.5 py-1 bg-white border border-rose-200 text-rose-500 rounded text-[9px] font-bold active:scale-95">
                      <Trash2 className="w-2.5 h-2.5 inline mr-0.5" />ล้าง Default ({tasks.filter(t => t.id.startsWith('d-')).length})
                    </button>
                  )}
                  <button onClick={openGroupForm} className="px-1.5 py-1 bg-emerald-500 text-white rounded text-[9px] font-bold active:scale-95">
                    <Plus className="w-2.5 h-2.5 inline mr-0.5" />เพิ่มกลุ่ม
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {DEFAULT_CATEGORIES.map(cat => {
                    const catGroups = groupStyles.filter(g => {
                      const tg = taskGroups.find(t => t.key === g.key);
                      return tg?.categoryKey === cat.key;
                    });
                    if (catGroups.length === 0) return null;
                    return (
                      <div key={cat.key} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                          <span className="text-sm font-black text-slate-600">{cat.emoji} {cat.label}</span>
                        </div>
                        <div className="p-2 flex flex-wrap gap-1.5">
                          {catGroups.map((type) => {
                            const groupData = taskGroups.find(g => g.key === type.key);
                            const taskCount = tasks.filter(t => t.category === type.key).length;
                            const IconComponent = type.icon === 'sun' ? Sun : type.icon === 'moon' ? Moon : type.icon === 'code' ? Code : type.icon === 'home' ? Home : type.icon === 'brain' ? Brain : type.icon === 'heart' ? Heart : type.icon === 'heartpulse' ? HeartPulse : type.icon === 'dumbbell' ? Dumbbell : type.icon === 'users' ? Users : type.icon === 'user' ? UserIcon : type.icon === 'file' ? FileText : type.icon === 'coffee' ? Coffee : type.icon === 'wrench' ? Wrench : type.icon === 'zap' ? Zap : type.icon === 'lightning' ? CloudLightning : type.icon === 'briefcase' ? Briefcase : type.icon === 'cart' ? ShoppingCart : type.icon === 'star' ? Star : type.icon === 'calendar' ? Calendar : type.icon === 'clock' ? Clock : type.icon === 'target' ? Target : type.icon === 'pencil' ? Pencil : type.icon === 'trending' ? TrendingUp : type.icon === 'lightbulb' ? Lightbulb : type.icon === 'music' ? Music : type.icon === 'game' ? Gamepad2 : type.icon === 'book' ? Book : type.icon === 'utensils' ? Utensils : type.icon === 'bike' ? Bike : type.icon === 'palette' ? Palette : type.icon === 'rocket' ? Rocket : null;
                            return (
                              <div key={type.key} onClick={() => setSelectedCat(type.key)} className={`group/card flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all hover:shadow-md active:scale-95 ${type.bg} ${type.border} border`}>
                                <div className={`w-6 h-6 rounded-md ${type.iconBg} flex items-center justify-center`}>
                                  {type.icon === 'broom' ? <BroomIcon className="w-3.5 h-3.5 text-white" /> : type.icon === 'family' ? <FamilyIcon className="w-3.5 h-3.5 text-white" /> : type.icon === 'flex' ? <FlexIcon className="w-3.5 h-3.5 text-white" /> : type.icon === 'brain2' ? <BrainIcon className="w-3.5 h-3.5 text-white" /> : IconComponent ? <IconComponent className="w-3.5 h-3.5 text-white" /> : <Briefcase className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-600 leading-tight">{type.label}</span>
                                  {taskCount > 0 && <span className="text-[10px] text-slate-400 leading-tight">{taskCount} งาน</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : effectiveTab === '_bills' ? (
              <div className="rounded-b-xl border p-3 bg-amber-50 border-amber-200">
                {/* Sub-tabs: รายวัน / รายเดือน / รายไตรมาส / รายปี */}
                <div className="flex gap-1 mb-3">
                  {([
                    { key: 'daily', label: 'รายวัน', emoji: '📅' },
                    { key: 'monthly', label: 'รายเดือน', emoji: '🗓️' },
                    { key: 'quarterly', label: 'รายไตรมาส', emoji: '📊' },
                    { key: 'yearly', label: 'รายปี', emoji: '🎯' },
                  ] as const).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveBillsTab(tab.key)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        activeBillsTab === tab.key
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-white text-amber-600 border border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {tab.emoji} {tab.label}
                    </button>
                  ))}
                </div>

                {/* Recurring expenses filtered by recurrence type */}
                {(() => {
                  const recurrenceMap: Record<string, string> = { daily: 'daily', monthly: 'monthly', quarterly: 'quarterly', yearly: 'yearly' };
                  const filtered = expenses.filter(e =>
                    e.type === 'recurring' && e.flow === 'expense' && e.recurrence === recurrenceMap[activeBillsTab]
                  );
                  const catMap = new Map(EXPENSE_CATEGORIES.map(c => [c.key, c]));
                  const now = new Date();
                  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

                  // Show default suggestions if no user expenses for this recurrence
                  const defaults = DEFAULT_BILLS.filter(b => b.recurrence === recurrenceMap[activeBillsTab]);
                  const periodLabel = activeBillsTab === 'daily' ? 'วัน' : activeBillsTab === 'monthly' ? 'เดือน' : activeBillsTab === 'quarterly' ? 'ไตรมาส' : 'ปี';
                  const groupEmojiMap: Record<string, string> = { 'จำเป็น': '📌', 'อื่นๆ': '📋', 'ชำระหนี้': '🏦', 'ลงทุน': '📊' };

                  // Helper: record payment for an expense
                  const handlePayNow = (exp: Expense) => {
                    if (!setExpenses) return;
                    const todayISO = now.toISOString();
                    setExpenses(prev => prev.map(e => e.id === exp.id ? {
                      ...e,
                      paidHistory: { ...(e.paidHistory || {}), [currentMonth]: { amount: e.amount, paidAt: todayISO } },
                      paid: true,
                      paidAt: todayISO,
                    } : e));
                  };

                  // Render expense rows (shared between defaults and real)
                  const isDaily = activeBillsTab === 'daily';
                  const renderExpenseRow = (exp: Expense) => {
                    const cat = catMap.get(exp.category);
                    const isPaid = !!(exp.paidHistory?.[currentMonth]);
                    const lastEntry = exp.paidHistory ? Object.entries(exp.paidHistory).sort(([a], [b]) => b.localeCompare(a))[0] : null;
                    const monthTotal = exp.paidHistory ? Object.entries(exp.paidHistory).filter(([k]) => k === currentMonth).reduce((s, [, v]) => s + v.amount, 0) : 0;
                    // รายวันไม่ขีดฆ่า, รายอื่นขีดเฉพาะชื่อ
                    const showStrike = isPaid && !isDaily;
                    return (
                      <div key={exp.id} className="flex items-center gap-1.5 px-1 py-1">
                        <span className="text-[9px] text-slate-700 w-5 text-center shrink-0">{exp.dueDay || '-'}</span>
                        <span className="text-sm shrink-0">{cat?.emoji || '📦'}</span>
                        <span onClick={() => { setExpensePopup({ category: exp.category, title: exp.title, recurrence: exp.recurrence || 'monthly', dueDay: exp.dueDay, editId: exp.id }); setExpenseForm({ title: exp.title, amount: String(exp.amount), date: exp.date || new Date().toISOString().split('T')[0], isRecurring: exp.type === 'recurring', method: (exp.paymentMethod || 'transfer') as PaymentMethod, notes: exp.notes || '', slipUrl: '', dueDay: exp.dueDay || 0 }); }} className={`text-xs flex-1 truncate cursor-pointer hover:underline ${showStrike ? 'line-through text-slate-400' : 'text-slate-700'}`}>{exp.title}</span>
                        {isPaid ? (
                          <span className="text-[9px] text-emerald-500 shrink-0 w-6 text-center">✓</span>
                        ) : (
                          <button onClick={() => { setExpensePopup({ category: exp.category, title: exp.title, recurrence: exp.recurrence || 'monthly', dueDay: exp.dueDay }); setExpenseForm({ title: exp.title, amount: String(exp.amount), date: new Date().toISOString().split('T')[0], isRecurring: true, method: (exp.paymentMethod || 'transfer') as PaymentMethod, notes: '', slipUrl: '' }); }} className="text-[9px] font-bold text-blue-500 hover:text-blue-700 shrink-0 w-6 text-center">+</button>
                        )}
                        {/* วันที่จ่าย */}
                        <span className="text-[9px] text-slate-700 shrink-0 w-10 text-center">{(() => {
                          const thisMonth = exp.paidHistory?.[currentMonth];
                          if (!thisMonth) return '-';
                          const d = new Date(thisMonth.paidAt);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        })()}</span>
                        <span className="text-[9px] text-slate-700 shrink-0 w-14 text-right">{lastEntry ? lastEntry[1].amount.toLocaleString() : '-'}</span>
                        <span className="text-[9px] text-slate-700 shrink-0 w-12 text-right">{monthTotal > 0 ? monthTotal.toLocaleString() : '-'}</span>
                        <span className="text-[10px] text-slate-700 shrink-0 w-12 text-right">{exp.amount.toLocaleString()}</span>
                      </div>
                    );
                  };

                  // Merge defaults with real expenses — show all, use real data when available
                  const defaultGrouped: Record<string, typeof defaults> = {};
                  defaults.forEach(d => { if (!defaultGrouped[d.group]) defaultGrouped[d.group] = []; defaultGrouped[d.group].push(d); });

                  // Also add real expenses not in defaults
                  const defaultTitles = new Set(defaults.map(d => `${d.title}|${d.category}`));
                  const extraExpenses = filtered.filter(e => !defaultTitles.has(`${e.title}|${e.category}`));

                  if (defaults.length === 0 && filtered.length === 0) {
                    return (
                      <div className="text-center py-6">
                        <span className="text-3xl block mb-2">💸</span>
                        <p className="text-xs text-slate-400">ไม่มีรายจ่ายประจำ{periodLabel}</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {/* Column headers */}
                      <div className="flex items-center gap-1.5 px-1 pb-1 border-b border-amber-200">
                        <span className="text-[7px] font-bold text-slate-500 w-5 text-center shrink-0">ครบ</span>
                        <span className="text-[7px] font-bold text-slate-500 shrink-0 w-5" />
                        <span className="text-[7px] font-bold text-slate-500 flex-1">รายการ</span>
                        <span className="text-[7px] font-bold text-slate-500 w-6 text-center shrink-0">จ่าย</span>
                        <span className="text-[7px] font-bold text-slate-500 w-10 text-center shrink-0">วันที่</span>
                        <span className="text-[7px] font-bold text-slate-500 w-14 text-right shrink-0">ล่าสุด</span>
                        <span className="text-[7px] font-bold text-slate-500 w-12 text-right shrink-0">เดือนนี้</span>
                        <span className="text-[7px] font-bold text-slate-500 w-12 text-right shrink-0">งบ</span>
                      </div>
                      {EXPENSE_GROUPS.filter(g => defaultGrouped[g.key]?.length).map(group => (
                        <div key={group.key}>
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-[9px]">{group.emoji}</span>
                            <span className="text-[9px] font-bold text-amber-700">{group.label}</span>
                            <div className="flex-1 h-px bg-amber-200" />
                            <span className="text-[9px] text-amber-400">{defaultGrouped[group.key].reduce((s, e) => s + e.amount, 0).toLocaleString()}</span>
                          </div>
                          {defaultGrouped[group.key].map((d, i) => {
                            // Check if real expense exists for this item
                            const realExp = filtered.find(e => e.title === d.title && e.category === d.category);
                            if (realExp) return renderExpenseRow(realExp);
                            // Show default with + button
                            const cat = catMap.get(d.category);
                            return (
                              <div key={i} className="flex items-center gap-1.5 px-1 py-1">
                                <span className="text-[9px] text-slate-400 w-5 text-center shrink-0">{d.dueDay || '-'}</span>
                                <span className="text-sm shrink-0">{cat?.emoji || '📦'}</span>
                                <span className="text-xs text-slate-500 flex-1 truncate">{d.title}</span>
                                <button onClick={() => { setExpensePopup({ category: d.category, title: d.title, recurrence: d.recurrence, dueDay: d.dueDay }); setExpenseForm({ title: d.title, amount: String(d.amount), date: new Date().toISOString().split('T')[0], isRecurring: true, method: 'transfer', notes: '', slipUrl: '' }); }} className="text-[9px] font-bold text-blue-500 hover:text-blue-700 shrink-0 w-6 text-center">+</button>
                                <span className="text-[9px] text-slate-300 shrink-0 w-10 text-center">-</span>
                                <span className="text-[9px] text-slate-300 shrink-0 w-14 text-right">-</span>
                                <span className="text-[9px] text-slate-300 shrink-0 w-12 text-right">-</span>
                                <span className="text-[10px] text-slate-600 shrink-0 w-12 text-right">{d.amount.toLocaleString()}</span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      {/* Extra expenses not in defaults */}
                      {extraExpenses.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-[9px]">📝</span>
                            <span className="text-[9px] font-bold text-amber-700">รายการเพิ่มเติม</span>
                            <div className="flex-1 h-px bg-amber-200" />
                          </div>
                          {extraExpenses.map(exp => renderExpenseRow(exp))}
                        </div>
                      )}
                      <div className="pt-1 border-t border-amber-200 flex justify-between items-center">
                        <span className="text-[10px] text-amber-700">{filtered.length} รายการจ่ายแล้ว</span>
                        <span className="text-[10px] text-amber-600">รวม {filtered.reduce((s, e) => {
                          const m = e.paidHistory?.[currentMonth];
                          return s + (m ? m.amount : 0);
                        }, 0).toLocaleString()}/{periodLabel}</span>
                      </div>
                      {/* เพิ่มรายการใหม่ */}
                      <button
                        onClick={() => {
                          const defaultCat = defaults.length > 0 ? defaults[0].category : 'other_expense';
                          setExpensePopup({ category: defaultCat, title: '', recurrence: recurrenceMap[activeBillsTab], dueDay: undefined });
                          setExpenseForm({ title: '', amount: '', date: new Date().toISOString().split('T')[0], isRecurring: true, method: 'transfer', notes: '', slipUrl: '', dueDay: 0 });
                        }}
                        className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-amber-300 text-[10px] font-bold text-amber-500 hover:bg-amber-50"
                      >
                        <Plus className="w-3 h-3" /> เพิ่มรายการ
                      </button>
                    </div>
                  );
                })()}
              </div>
            ) : activeGroup && activeColor ? (
              <div className={`rounded-b-xl border p-3 ${activeColor.bg} ${activeColor.border} rounded-t-xl`}>
                {activeGroupTasks.length > 0 ? (
                  <div className="space-y-2">
                    {dateGroups.map(([dateKey, dateTasks]) => (
                      <div key={dateKey}>
                        {/* Date separator */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <Calendar className={`w-3 h-3 ${activeColor.text}`} />
                          <span className={`text-[11px] font-black ${activeColor.text}`}>{formatThaiDate(dateKey)}</span>
                          <div className={`flex-1 h-px ${activeColor.border} border-t border-dashed`} />
                        </div>
                        <div className="space-y-1.5 ml-1">
                          {dateTasks.map(renderTask)}
                        </div>
                      </div>
                    ))}
                    {noDateTasks.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Clock className={`w-3 h-3 ${activeColor.text}`} />
                          <span className={`text-[11px] font-black ${activeColor.text}`}>ไม่ระบุวัน</span>
                          <div className={`flex-1 h-px ${activeColor.border} border-t border-dashed`} />
                        </div>
                        <div className="space-y-1.5 ml-1">
                          {noDateTasks.map(renderTask)}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-xs text-slate-400 mb-2">ยังไม่มีรายการ</p>
                    {defaultTasks.filter(t => t.category === activeGroup.key).length > 0 && (
                      <button
                        onClick={() => { setDefaultPickerGroup(activeGroup.key); setSelectedDefaultIds(new Set()); }}
                        className={`px-3 py-1.5 ${activeColor.bg} ${activeColor.border} border ${activeColor.text} rounded-lg text-xs font-bold transition-colors active:scale-95`}
                      >
                        <Plus className="w-3 h-3 inline mr-1" />from Default list
                      </button>
                    )}
                  </div>
                )}

                {/* Add button */}
                <button
                  onClick={() => openNewFormWithCategory(activeGroup.key)}
                  className={`mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 border-dashed text-xs font-bold transition-all hover:shadow-sm ${activeColor.border} ${activeColor.text} hover:bg-white/60`}
                >
                  <Plus className="w-3.5 h-3.5" /> เพิ่มรายการ
                </button>
              </div>
            ) : null}
          </div>
        );
      })()}

      {/* ===== Expense Quick-Add Popup ===== */}
      {expensePopup && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setExpensePopup(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800">{expensePopup.editId ? 'แก้ไขรายจ่าย' : 'บันทึกรายจ่าย'}</h3>
                <p className="text-[10px] text-slate-400">{EXPENSE_CATEGORIES.find(c => c.key === expensePopup.category)?.emoji} {EXPENSE_CATEGORIES.find(c => c.key === expensePopup.category)?.label} · {expensePopup.recurrence === 'daily' ? 'รายวัน' : expensePopup.recurrence === 'monthly' ? 'รายเดือน' : expensePopup.recurrence === 'quarterly' ? 'รายไตรมาส' : 'รายปี'}</p>
              </div>
              <button onClick={() => setExpensePopup(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="p-4 space-y-3">
              {/* ชื่อรายการ */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">ชื่อรายการ</label>
                <input type="text" value={expenseForm.title} onChange={e => setExpenseForm(f => ({ ...f, title: e.target.value }))} placeholder="เช่น ค่าเช่า, Netflix, กาแฟ..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              {/* หมวดค่าใช้จ่าย */}
              {!expensePopup.editId && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">หมวด</label>
                  <select
                    value={expensePopup.category}
                    onChange={e => setExpensePopup(p => p ? { ...p, category: e.target.value } : p)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {EXPENSE_GROUPS.map(g => {
                      const groupCats = EXPENSE_CATEGORIES.filter(c => c.group === g.key && c.flow === 'expense').sort((a, b) => a.label.localeCompare(b.label, 'th'));
                      if (groupCats.length === 0) return null;
                      return (
                        <optgroup key={g.key} label={`${g.emoji} ${g.label}`}>
                          {groupCats.map(c => (
                            <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
              )}
              {/* จำนวนเงิน + วันที่ */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">จำนวนเงิน (บาท)</label>
                  <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">วันที่</label>
                  <input type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>
              {/* รายการประจำ */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={expenseForm.isRecurring} onChange={e => setExpenseForm(f => ({ ...f, isRecurring: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-300" />
                <div>
                  <span className="text-xs font-bold text-slate-700">รายการประจำ</span>
                  <p className="text-[9px] text-slate-400">ติ๊กเพื่อตั้งเป็น Budget ประจำ</p>
                </div>
              </label>
              {/* วันครบกำหนดจ่าย (สำหรับรายเดือน/ไตรมาส/ปี) */}
              {expenseForm.isRecurring && expensePopup.recurrence !== 'daily' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">วันครบกำหนดจ่าย (1-31)</label>
                  <input type="number" min="1" max="31" value={expenseForm.dueDay || ''} onChange={e => setExpenseForm(f => ({ ...f, dueDay: parseInt(e.target.value) || 0 }))} placeholder="เช่น 5 = วันที่ 5 ของเดือน" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              )}
              {/* วิธีจ่าย */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">วิธีจ่าย</label>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.key} onClick={() => setExpenseForm(f => ({ ...f, method: m.key }))}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                        expenseForm.method === m.key ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}>
                      <span>{m.emoji}</span> {m.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* ถ่ายรูป / Upload Slip */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">สลิป / ใบเสร็จ</label>
                <input ref={slipInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = URL.createObjectURL(file);
                    setExpenseForm(f => ({ ...f, slipUrl: url }));
                  }
                  e.target.value = '';
                }} />
                {expenseForm.slipUrl ? (
                  <div className="relative">
                    <img src={expenseForm.slipUrl} alt="slip" className="w-full max-h-40 object-contain rounded-xl border border-slate-200" />
                    <button onClick={() => setExpenseForm(f => ({ ...f, slipUrl: '' }))} className="absolute top-1 right-1 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs">✕</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => slipInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100">
                      📷 ถ่ายรูป / Upload
                    </button>
                  </div>
                )}
              </div>
              {/* หมายเหตุ */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">หมายเหตุ</label>
                <input type="text" value={expenseForm.notes} onChange={e => setExpenseForm(f => ({ ...f, notes: e.target.value }))} placeholder="ไม่บังคับ" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            {/* Footer */}
            <div className="flex border-t border-slate-100">
              <button onClick={() => setExpensePopup(null)} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50">ยกเลิก</button>
              <button
                onClick={() => {
                  if (!setExpenses || !expenseForm.title.trim() || !expenseForm.amount) return;
                  const now = new Date();
                  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                  const amount = parseFloat(expenseForm.amount) || 0;
                  if (amount <= 0) return;
                  const dueDayVal = expenseForm.dueDay > 0 && expenseForm.dueDay <= 31 ? expenseForm.dueDay : undefined;

                  if (expensePopup.editId) {
                    // Edit existing expense
                    setExpenses(prev => prev.map(e => e.id === expensePopup.editId ? {
                      ...e, title: expenseForm.title.trim(), amount,
                      type: expenseForm.isRecurring ? 'recurring' : 'one-time',
                      recurrence: expenseForm.isRecurring ? expensePopup.recurrence as Expense['recurrence'] : undefined,
                      dueDay: dueDayVal, paymentMethod: expenseForm.method,
                      notes: expenseForm.notes.trim() || undefined,
                    } : e));
                  } else {
                    // Check if exists
                    const existing = expenses.find(e => e.title === expenseForm.title && e.category === expensePopup.category && e.type === 'recurring');
                    if (existing) {
                      setExpenses(prev => prev.map(e => e.id === existing.id ? {
                        ...e, amount, dueDay: dueDayVal,
                        paidHistory: { ...(e.paidHistory || {}), [currentMonth]: { amount, paidAt: now.toISOString(), method: expenseForm.method } },
                        paid: true, paidAt: now.toISOString(), paymentMethod: expenseForm.method,
                        notes: expenseForm.notes || e.notes,
                      } : e));
                    } else {
                      const newExp: Expense = {
                        id: `exp-${Date.now()}`,
                        title: expenseForm.title.trim(), amount, flow: 'expense',
                        category: expensePopup.category,
                        type: expenseForm.isRecurring ? 'recurring' : 'one-time',
                        date: expenseForm.date,
                        recurrence: expenseForm.isRecurring ? expensePopup.recurrence as Expense['recurrence'] : undefined,
                        dueDay: dueDayVal, paymentMethod: expenseForm.method,
                        notes: expenseForm.notes.trim() || undefined,
                        createdAt: now.toISOString(),
                        paidHistory: { [currentMonth]: { amount, paidAt: now.toISOString(), method: expenseForm.method } },
                        paid: true, paidAt: now.toISOString(),
                      };
                      setExpenses(prev => [newExp, ...prev]);
                    }
                  }
                  setExpensePopup(null);
                }}
                disabled={!expenseForm.title.trim() || !expenseForm.amount || parseFloat(expenseForm.amount) <= 0}
                className="flex-1 py-3 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 border-l border-slate-100 disabled:opacity-40"
              >
                {expensePopup.editId ? 'บันทึก' : 'เพิ่มรายจ่าย'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Category Cards (old standalone section removed — now inside หมวดกิจกรรม tab) ===== */}
      {false && <div className="grid grid-cols-2 gap-2.5 animate-fadeIn">
        {DEFAULT_CATEGORIES.map(cat => {
          const catGroups = groupStyles.filter(g => {
            const tg = taskGroups.find(t => t.key === g.key);
            return tg?.categoryKey === cat.key;
          });
          if (catGroups.length === 0) return null;

          return (
            <div key={cat.key} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Category header */}
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                <span className="text-sm font-black text-slate-600">{cat.emoji} {cat.label}</span>
              </div>

              {/* Group chips inside card */}
              <div className="p-2 flex flex-wrap gap-1.5">
                {catGroups.map((type) => {
                  const isActive = selectedCat === type.key;
                  const groupData = taskGroups.find(g => g.key === type.key);
                  const taskCount = tasks.filter(t => t.category === type.key).length;

                  // Icon mapping
                  const IconComponent = type.icon === 'sun' ? Sun
                    : type.icon === 'moon' ? Moon
                    : type.icon === 'code' ? Code
                    : type.icon === 'home' ? Home
                    : type.icon === 'brain' ? Brain
                    : type.icon === 'heart' ? Heart
                    : type.icon === 'heartpulse' ? HeartPulse
                    : type.icon === 'dumbbell' ? Dumbbell
                    : type.icon === 'users' ? Users
                    : type.icon === 'user' ? UserIcon
                    : type.icon === 'file' ? FileText
                    : type.icon === 'coffee' ? Coffee
                    : type.icon === 'wrench' ? Wrench
                    : type.icon === 'zap' ? Zap
                    : type.icon === 'lightning' ? CloudLightning
                    : type.icon === 'briefcase' ? Briefcase
                    : type.icon === 'cart' ? ShoppingCart
                    : type.icon === 'star' ? Star
                    : type.icon === 'calendar' ? Calendar
                    : type.icon === 'clock' ? Clock
                    : type.icon === 'target' ? Target
                    : type.icon === 'pencil' ? Pencil
                    : type.icon === 'trending' ? TrendingUp
                    : type.icon === 'lightbulb' ? Lightbulb
                    : type.icon === 'music' ? Music
                    : type.icon === 'game' ? Gamepad2
                    : type.icon === 'book' ? Book
                    : type.icon === 'utensils' ? Utensils
                    : type.icon === 'bike' ? Bike
                    : type.icon === 'palette' ? Palette
                    : type.icon === 'rocket' ? Rocket
                    : type.icon === 'handshake' ? Handshake
                    : null;

                  return (
                    <div key={type.key} className={`group/card relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
                      isActive ? `${type.bg} ${type.border} border shadow-sm` : 'hover:bg-slate-50 border border-transparent'
                    }`}
                      onClick={() => { setSelectedCat(isActive ? null : type.key); setExpandedId(null); }}
                    >
                      <div className={`w-6 h-6 rounded-md ${type.iconBg} flex items-center justify-center`}>
                        {type.icon === 'broom' ? <BroomIcon className="w-3.5 h-3.5 text-white" />
                        : type.icon === 'family' ? <FamilyIcon className="w-3.5 h-3.5 text-white" />
                        : type.icon === 'flex' ? <FlexIcon className="w-3.5 h-3.5 text-white" />
                        : type.icon === 'brain2' ? <BrainIcon className="w-3.5 h-3.5 text-white" />
                        : IconComponent ? <IconComponent className="w-3.5 h-3.5 text-white" />
                        : <Briefcase className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-600 leading-tight">{type.label}</span>
                        {taskCount > 0 && <span className="text-[10px] text-slate-400 leading-tight">{taskCount} งาน</span>}
                      </div>

                      {/* Edit / Delete on hover */}
                      <div className="hidden group-hover/card:flex gap-0.5 ml-auto">
                        <button
                          onClick={(e) => { e.stopPropagation(); if (groupData) openEditGroup(groupData); }}
                          className="w-4 h-4 rounded bg-white/80 hover:bg-blue-100 flex items-center justify-center"
                          title="แก้ไขกลุ่ม"
                        >
                          <Pencil className="w-2.5 h-2.5 text-blue-500" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteGroupConfirm(type.key); }}
                          className="w-4 h-4 rounded bg-white/80 hover:bg-rose-100 flex items-center justify-center"
                          title="ลบกลุ่ม"
                        >
                          <Trash2 className="w-2.5 h-2.5 text-rose-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>}


      {/* ===== Selected Category Modal ===== */}
      {selectedCat && (() => {
        const style = getTypeStyle(selectedCat);
        const group = tasks.filter(t => t.category === selectedCat).sort((a, b) => (b.priority as number) - (a.priority as number));

        // Icon mapping for modal
        const IconComponent = style.icon === 'sun' ? Sun
          : style.icon === 'moon' ? Moon
          : style.icon === 'code' ? Code
          : style.icon === 'home' ? Home
          : style.icon === 'brain' ? Brain
          : style.icon === 'heart' ? Heart
          : style.icon === 'heartpulse' ? HeartPulse
          : style.icon === 'dumbbell' ? Dumbbell
          : style.icon === 'users' ? Users
          : style.icon === 'user' ? UserIcon
          : style.icon === 'file' ? FileText
          : style.icon === 'coffee' ? Coffee
          : style.icon === 'wrench' ? Wrench
          : style.icon === 'zap' ? Zap
          : style.icon === 'lightning' ? CloudLightning
          : style.icon === 'briefcase' ? Briefcase
          : style.icon === 'cart' ? ShoppingCart
          : style.icon === 'star' ? Star
          : style.icon === 'calendar' ? Calendar
          : style.icon === 'clock' ? Clock
          : style.icon === 'target' ? Target
          : style.icon === 'pencil' ? Pencil
          : style.icon === 'trending' ? TrendingUp
          : style.icon === 'lightbulb' ? Lightbulb
          : style.icon === 'music' ? Music
          : style.icon === 'game' ? Gamepad2
          : style.icon === 'book' ? Book
          : style.icon === 'utensils' ? Utensils
          : style.icon === 'bike' ? Bike
          : style.icon === 'palette' ? Palette
          : style.icon === 'rocket' ? Rocket
          : style.icon === 'handshake' ? Handshake
          : null;

        return (
          <div className="fixed inset-x-0 top-0 bottom-[56px] z-50 flex flex-col bg-white overflow-hidden">
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Modal Header */}
              <div className={`${style.bg} border-b ${style.border} px-3 py-2 shrink-0`}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{style.emoji}</span>
                  <span className={`text-sm font-black ${style.text} flex-1`}>{style.label} <span className="text-[10px] font-bold text-slate-400">({group.length})</span></span>
                  {(() => {
                    const availableDefaults = defaultTasks.filter(t => t.category === selectedCat);
                    if (availableDefaults.length === 0) return null;
                    return (
                      <button
                        onClick={() => { setDefaultPickerGroup(selectedCat); setSelectedDefaultIds(new Set()); }}
                        className="px-1.5 py-1 bg-white border border-emerald-200 text-emerald-600 rounded text-[9px] font-bold active:scale-95"
                      >
                        +Default
                      </button>
                    );
                  })()}
                  <button onClick={() => openNewFormWithCategory(selectedCat)} className="px-1.5 py-1 bg-white border border-blue-200 text-blue-600 rounded text-[9px] font-bold active:scale-95">
                    +เพิ่ม
                  </button>
                  {group.length > 0 && (
                    <button
                      onClick={() => { setBulkDeleteMode(!bulkDeleteMode); setBulkDeleteIds(new Set()); }}
                      className={`px-1.5 py-1 rounded text-[9px] font-bold active:scale-95 ${
                        bulkDeleteMode ? 'bg-rose-500 text-white' : 'bg-white border border-rose-200 text-rose-500'
                      }`}
                    >
                      {bulkDeleteMode ? 'ยกเลิก' : 'ลบ'}
                    </button>
                  )}
                  <button onClick={() => { setSelectedCat(null); setBulkDeleteMode(false); setBulkDeleteIds(new Set()); }} className="p-1 rounded bg-white hover:bg-slate-100 text-slate-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="px-2 py-3 sm:p-4 flex-1 overflow-y-auto">
                {group.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-slate-400 mb-4">ยังไม่มี task ในหมวดนี้</p>
                    {(() => {
                      const availableDefaults = defaultTasks.filter(t => t.category === selectedCat);
                      if (availableDefaults.length === 0) return null;
                      return (
                        <button
                          onClick={() => { setDefaultPickerGroup(selectedCat); setSelectedDefaultIds(new Set()); }}
                          className={`px-4 py-2.5 ${style.bg} ${style.border} border ${style.text} rounded-xl text-sm font-bold transition-colors active:scale-95 hover:shadow-md`}
                        >
                          <Plus className="w-3.5 h-3.5 inline mr-1.5" />from Default list
                        </button>
                      );
                    })()}
                  </div>
                ) : (
                  <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleTaskDragEnd}>
                  <SortableContext items={group.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-0.5">
                    {/* Column headers */}
                    <div className="flex items-center gap-1.5 px-1 pb-1 mb-1 border-b border-slate-200">
                      {bulkDeleteMode ? (
                        <button onClick={() => setBulkDeleteIds(prev => prev.size === group.length ? new Set() : new Set(group.map(t => t.id)))} className="w-4 h-4 shrink-0 flex items-center justify-center">
                          {bulkDeleteIds.size === group.length ? <CheckCircle2 className="w-4 h-4 text-rose-500" /> : <Circle className="w-4 h-4 text-rose-300" />}
                        </button>
                      ) : <span className="w-4 shrink-0" />}
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest flex-1">รายการ</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest shrink-0 hidden sm:inline">ทำซ้ำ</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest shrink-0 hidden sm:inline">วัน</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest shrink-0">เวลา</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest shrink-0 hidden sm:inline">กำหนดวัน</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest shrink-0 w-14 text-center">จัดการ</span>
                    </div>
                    {group.map(task => (
                      <SortableTaskItem key={task.id} id={task.id}>
                      <div className={`transition-all ${task.completed ? 'opacity-40' : ''}`}>
                        <div className="flex items-center gap-1.5 px-1 py-1.5 cursor-pointer rounded-lg hover:bg-white/60" onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}>
                          {/* checkbox */}
                          {bulkDeleteMode ? (
                            <button onClick={(e) => { e.stopPropagation(); setBulkDeleteIds(prev => { const next = new Set(prev); if (next.has(task.id)) next.delete(task.id); else next.add(task.id); return next; }); }} className="shrink-0 active:scale-90">
                              {bulkDeleteIds.has(task.id) ? <CheckCircle2 className="w-4 h-4 text-rose-500" /> : <Circle className="w-4 h-4 text-rose-300" />}
                            </button>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }} className="shrink-0 active:scale-90">
                              {task.completed ? <CheckCircle2 className={`w-4 h-4 ${style.text}`} /> : <Circle className={`w-4 h-4 ${style.text} opacity-40`} />}
                            </button>
                          )}
                          {/* รายการ */}
                          <span className={`text-xs flex-1 truncate min-w-0 ${task.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</span>
                          {task.subtasks && task.subtasks.length > 0 && <span className="text-[9px] text-slate-400 shrink-0">{task.subtasks.filter((s: SubTask) => s.completed).length}/{task.subtasks.length}</span>}
                          {/* ทำซ้ำ — ซ่อนบนมือถือ */}
                          {task.recurrence ? (
                            <span onClick={(e) => { e.stopPropagation(); setRecurrenceEditTaskId(task.id); setRecurrenceForm(task.recurrence); setRecurrenceStartDate(task.startDate || new Date().toISOString().slice(0, 10)); }} className="text-[8px] font-black text-violet-500 shrink-0 cursor-pointer hover:text-violet-700 hidden sm:inline">
                              {task.recurrence.pattern === 'daily' ? 'ทุกวัน' : task.recurrence.pattern === 'every_x_days' ? `${task.recurrence.interval || 2}วัน` : task.recurrence.pattern === 'weekly' ? 'สัปดาห์' : task.recurrence.pattern === 'monthly' ? 'เดือน' : 'ปี'}
                            </span>
                          ) : null}
                          {/* วัน — ซ่อนบนมือถือ */}
                          {task.dayTypes && task.dayTypes.length > 0 && task.dayTypes.length < 3
                            ? <span className="text-[8px] text-blue-400 shrink-0 hidden sm:inline">{task.dayTypes.map(d => d === 'workday' ? 'จ-ศ' : d === 'saturday' ? 'ส.' : 'อา.').join(',')}</span>
                            : null}
                          {/* เวลา */}
                          {task.estimatedDuration
                            ? <span onClick={(e) => { e.stopPropagation(); setDurationEditTaskId(task.id); setDurationValue(task.estimatedDuration || 30); }} className="text-[9px] text-blue-400 shrink-0 cursor-pointer hover:text-blue-600">{task.estimatedDuration} น.</span>
                            : null}
                          {/* กำหนดวัน — ซ่อนบนมือถือ */}
                          {task.startDate
                            ? <span className="text-[9px] text-emerald-500 shrink-0 hidden sm:inline">{task.startDate}{task.endDate && task.endDate !== task.startDate ? `→${task.endDate}` : ''}</span>
                            : null}
                          {/* จัดการ */}
                          <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => openEditForm(task)} className="p-1 text-slate-300 hover:text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteTask(task.id)} className="p-1 text-slate-300 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {expandedId === task.id && (
                          <div className="px-3 pb-3 border-t border-slate-100 space-y-2 animate-fadeIn mt-2">
                            {task.description && <p className="text-xs text-slate-500 mt-2">{task.description}</p>}
                            {task.notes && (
                              <div className="bg-slate-50 rounded-lg p-2.5">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Notes</span>
                                <p className="text-xs text-slate-600 whitespace-pre-wrap">{task.notes}</p>
                              </div>
                            )}
                            {(task.attachments?.length ?? 0) > 0 && (
                              <div className="space-y-1.5">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">ไฟล์แนบ</span>
                                {task.attachments!.map((att, i) => (
                                  <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${att.type === 'photo' ? 'bg-emerald-100 text-emerald-600' : att.type === 'audio' ? 'bg-rose-100 text-rose-600' : att.type === 'video' ? 'bg-emerald-100 text-emerald-600' : att.type === 'phone' ? 'bg-sky-100 text-sky-600' : att.type === 'contact' ? 'bg-violet-100 text-violet-600' : 'bg-amber-100 text-amber-600'}`}>
                                      {att.type === 'photo' && <Image className="w-3 h-3" />}
                                      {att.type === 'audio' && <Mic className="w-3 h-3" />}
                                      {att.type === 'video' && <Video className="w-3 h-3" />}
                                      {att.type === 'phone' && <Phone className="w-3 h-3" />}
                                      {att.type === 'contact' && <UserIcon className="w-3 h-3" />}
                                      {att.type === 'gps' && <MapPin className="w-3 h-3" />}
                                    </div>
                                    <span className="text-xs text-slate-600 font-medium truncate flex-1">{att.label}</span>
                                    {att.type === 'gps' && <a href={`https://maps.google.com/?q=${att.value}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-600 font-bold">แผนที่</a>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      </SortableTaskItem>
                    ))}
                  </div>
                  </SortableContext>
                  </DndContext>
                )}
              </div>

              {/* Bulk delete bar */}
              {bulkDeleteMode && bulkDeleteIds.size > 0 && (
                <div className="shrink-0 px-3 py-2.5 border-t border-rose-200 bg-rose-50 flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-600 flex-1">เลือก {bulkDeleteIds.size} รายการ</span>
                  <button
                    onClick={() => { setBulkDeleteIds(new Set()); }}
                    className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                  >ยกเลิก</button>
                  <button
                    onClick={async () => {
                      const idsToDelete = [...bulkDeleteIds];
                      const isDefaultIds = idsToDelete.filter(id => id.startsWith('d-'));
                      const updatedTasks = tasks.filter(t => !bulkDeleteIds.has(t.id));
                      const updatedDeletedIds = [...deletedDefaultTaskIds, ...isDefaultIds];
                      setTasks(updatedTasks);
                      setDeletedDefaultTaskIds(updatedDeletedIds);
                      setBulkDeleteIds(new Set());
                      setBulkDeleteMode(false);
                      if (onImmediateSave) await onImmediateSave(updatedTasks, updatedDeletedIds);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-rose-500 rounded-lg hover:bg-rose-600 active:scale-95"
                  >
                    <Trash2 className="w-3 h-3 inline mr-1" />ลบ {bulkDeleteIds.size} รายการ
                  </button>
                </div>
              )}

              {/* Save button bar + status */}
              <div className={`shrink-0 px-3 py-2.5 border-t flex items-center gap-2 sm:rounded-b-2xl ${
                taskSaveStatus === 'saved' ? 'bg-emerald-50 border-emerald-200'
                  : taskSaveStatus === 'error' ? 'bg-rose-50 border-rose-200'
                  : 'bg-white border-slate-200'
              }`}>
                {taskSaveStatus === 'saved' ? (
                  <><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /><span className="text-xs font-bold text-emerald-600 flex-1">บันทึกสำเร็จแล้ว!</span></>
                ) : taskSaveStatus === 'error' ? (
                  <><AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" /><span className="text-xs font-bold text-rose-600 flex-1">บันทึกไม่สำเร็จ</span></>
                ) : (
                  <span className="flex-1" />
                )}
                <button
                  onClick={async () => {
                    if (onImmediateSave) await withSaveStatus(() => onImmediateSave());
                  }}
                  disabled={taskSaveStatus === 'saving'}
                  className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                    taskSaveStatus === 'saving'
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'
                  }`}
                >
                  {taskSaveStatus === 'saving' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก...</>
                  ) : (
                    <><Save className="w-4 h-4" /> บันทึก</>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== Recurrence Quick Edit Popup ===== */}
      {recurrenceEditTaskId !== null && createPortal(
        <div style={{ zIndex: 9200 }} className="fixed inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setRecurrenceEditTaskId(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl animate-fadeIn overflow-hidden" onClick={e => e.stopPropagation()}>
            {(() => {
              const editTask = tasks.find(t => t.id === recurrenceEditTaskId);
              if (!editTask) return null;
              return (
                <>
                  {/* Header */}
                  <div className="p-4 border-b border-slate-100 bg-violet-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                          <RefreshCw className="w-4 h-4 text-violet-600" />
                        </div>
                        <div>
                          <h3 className="font-black text-sm text-slate-800">ตั้งค่าการทำซ้ำ</h3>
                          <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{editTask.title}</p>
                        </div>
                      </div>
                      <button onClick={() => setRecurrenceEditTaskId(null)} className="p-2 rounded-xl hover:bg-white/70 text-slate-400 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-4">
                    {/* Start date */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">วันเริ่มต้นนับการทำซ้ำ</label>
                      <input
                        type="date"
                        value={recurrenceStartDate}
                        onChange={e => setRecurrenceStartDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                    </div>

                    {/* Pattern selector */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">รูปแบบการทำซ้ำ</label>
                      <div className="flex flex-wrap gap-1.5">
                        {([
                          { key: undefined, label: 'ไม่ซ้ำ' },
                          { key: 'daily', label: 'ทุกวัน' },
                          { key: 'every_x_days', label: 'ทุก X วัน' },
                          { key: 'weekly', label: 'รายสัปดาห์' },
                          { key: 'monthly', label: 'รายเดือน' },
                          { key: 'yearly', label: 'รายปี' },
                        ] as { key: Recurrence['pattern'] | undefined; label: string }[]).map(opt => (
                          <button
                            key={opt.label}
                            onClick={() => setRecurrenceForm(opt.key ? { pattern: opt.key } : undefined)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              (recurrenceForm?.pattern || undefined) === opt.key
                                ? 'bg-violet-100 text-violet-700 border-violet-300'
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pattern-specific settings */}
                    {recurrenceForm?.pattern === 'every_x_days' && (
                      <div className="flex items-center gap-2 bg-violet-50 rounded-xl p-3">
                        <span className="text-sm text-slate-600 font-bold">ทุก</span>
                        <input type="number" min="2" max="365" value={recurrenceForm.interval || 2} onChange={e => setRecurrenceForm({ ...recurrenceForm, interval: parseInt(e.target.value) || 2 })} className="w-20 bg-white border border-violet-200 rounded-lg px-3 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-violet-400" />
                        <span className="text-sm text-slate-600 font-bold">วัน</span>
                      </div>
                    )}

                    {recurrenceForm?.pattern === 'weekly' && (
                      <div className="bg-violet-50 rounded-xl p-3">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2">เลือกวันในสัปดาห์</span>
                        <div className="flex gap-1.5">
                          {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => {
                            const isOn = (recurrenceForm.weekDays || []).includes(i);
                            return (
                              <button
                                key={i}
                                onClick={() => {
                                  const days = recurrenceForm.weekDays || [];
                                  const next = isOn ? days.filter(x => x !== i) : [...days, i];
                                  setRecurrenceForm({ ...recurrenceForm, weekDays: next });
                                }}
                                className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                                  isOn ? 'bg-violet-500 text-white shadow-sm' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {d}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {recurrenceForm?.pattern === 'monthly' && (
                      <div className="flex items-center gap-2 bg-violet-50 rounded-xl p-3">
                        <span className="text-sm text-slate-600 font-bold">ทุกวันที่</span>
                        <input type="number" min="1" max="31" value={recurrenceForm.monthDay || 1} onChange={e => setRecurrenceForm({ ...recurrenceForm, monthDay: parseInt(e.target.value) || 1 })} className="w-20 bg-white border border-violet-200 rounded-lg px-3 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-violet-400" />
                        <span className="text-sm text-slate-600 font-bold">ของเดือน</span>
                      </div>
                    )}

                    {recurrenceForm?.pattern === 'yearly' && (
                      <div className="flex items-center gap-2 bg-violet-50 rounded-xl p-3 flex-wrap">
                        <span className="text-sm text-slate-600 font-bold">เดือน</span>
                        <select value={recurrenceForm.monthDate?.month || 1} onChange={e => setRecurrenceForm({ ...recurrenceForm, monthDate: { month: parseInt(e.target.value), day: recurrenceForm.monthDate?.day || 1 } })} className="bg-white border border-violet-200 rounded-lg px-2 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-400">
                          {['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'].map((m, i) => (
                            <option key={i} value={i + 1}>{m}</option>
                          ))}
                        </select>
                        <span className="text-sm text-slate-600 font-bold">วันที่</span>
                        <input type="number" min="1" max="31" value={recurrenceForm.monthDate?.day || 1} onChange={e => setRecurrenceForm({ ...recurrenceForm, monthDate: { month: recurrenceForm.monthDate?.month || 1, day: parseInt(e.target.value) || 1 } })} className="w-16 bg-white border border-violet-200 rounded-lg px-2 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-violet-400" />
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex border-t border-slate-100">
                    <button onClick={() => setRecurrenceEditTaskId(null)} className="flex-1 py-3.5 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors">
                      ยกเลิก
                    </button>
                    <button
                      onClick={async () => {
                        const updatedTasks = tasks.map(t =>
                          t.id === recurrenceEditTaskId
                            ? {
                                ...t,
                                recurrence: recurrenceForm,
                                startDate: recurrenceForm ? recurrenceStartDate : undefined,
                              }
                            : t
                        );
                        setTasks(updatedTasks);
                        setRecurrenceEditTaskId(null);
                        if (onImmediateSave) await withSaveStatus(() => onImmediateSave(updatedTasks));
                      }}
                      className="flex-1 py-3.5 text-sm font-bold text-violet-600 hover:bg-violet-50 transition-colors border-l border-slate-100"
                    >
                      บันทึก
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* ===== Duration Quick Edit Popup ===== */}
      {durationEditTaskId !== null && createPortal(
        <div style={{ zIndex: 9200 }} className="fixed inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setDurationEditTaskId(null)}>
          <div className="bg-white rounded-2xl max-w-xs w-full shadow-2xl animate-fadeIn overflow-hidden" onClick={e => e.stopPropagation()}>
            {(() => {
              const editTask = tasks.find(t => t.id === durationEditTaskId);
              if (!editTask) return null;
              return (
                <>
                  <div className="p-4 border-b border-slate-100 bg-blue-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Clock className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-black text-sm text-slate-800">ตั้งเวลา</h3>
                          <p className="text-[11px] text-slate-500 truncate max-w-[180px]">{editTask.title}</p>
                        </div>
                      </div>
                      <button onClick={() => setDurationEditTaskId(null)} className="p-2 rounded-xl hover:bg-white/70 text-slate-400 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => setDurationValue(Math.max(5, durationValue - 5))}
                        className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 font-black text-xl hover:bg-blue-200 active:scale-95 transition-all flex items-center justify-center"
                      >−</button>
                      <div className="text-center min-w-[80px]">
                        <span className="text-3xl font-black text-slate-800">{durationValue}</span>
                        <span className="text-sm font-bold text-slate-400 ml-1">นาที</span>
                      </div>
                      <button
                        onClick={() => setDurationValue(Math.min(480, durationValue + 5))}
                        className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 font-black text-xl hover:bg-blue-200 active:scale-95 transition-all flex items-center justify-center"
                      >+</button>
                    </div>

                    {/* Quick presets */}
                    <div className="flex gap-1.5 justify-center mt-4">
                      {[15, 30, 45, 60, 90, 120].map(v => (
                        <button
                          key={v}
                          onClick={() => setDurationValue(v)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            durationValue === v
                              ? 'bg-blue-100 text-blue-700 border-blue-300'
                              : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {v >= 60 ? `${v / 60}ชม.` : `${v}น.`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex border-t border-slate-100">
                    <button onClick={() => setDurationEditTaskId(null)} className="flex-1 py-3.5 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors">
                      ยกเลิก
                    </button>
                    <button
                      onClick={async () => {
                        const updatedTasks = tasks.map(t =>
                          t.id === durationEditTaskId
                            ? { ...t, estimatedDuration: durationValue }
                            : t
                        );
                        setTasks(updatedTasks);
                        setDurationEditTaskId(null);
                        if (onImmediateSave) await withSaveStatus(() => onImmediateSave(updatedTasks));
                      }}
                      className="flex-1 py-3.5 text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors border-l border-slate-100"
                    >
                      บันทึก
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDeleteId && createPortal(
        <div style={{ zIndex: 9500 }} className="fixed inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl animate-fadeIn overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">ยืนยันการลบ</h3>
              <p className="text-sm text-slate-500">
                คุณต้องการลบ task "<span className="font-bold text-slate-700">{tasks.find(t => t.id === confirmDeleteId)?.title}</span>" ใช่หรือไม่?
              </p>
            </div>
            <div className="flex border-t border-slate-100">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-3.5 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors">
                ยกเลิก
              </button>
              <button onClick={confirmDelete} className="flex-1 py-3.5 text-sm font-bold text-rose-500 hover:bg-rose-50 transition-colors border-l border-slate-100">
                ลบ
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
};

export default TaskManager;
