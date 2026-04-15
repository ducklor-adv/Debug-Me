
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Task, SubTask, TaskGroup, Milestone, TimeSlot, DayType, ScheduleTemplates, CustomScheduleTemplate, GROUP_COLORS, DailyRecord, getTasksForDate, getDayType, getScheduleForDay, DEFAULT_CATEGORIES, Category, isTaskRecurring, CLEAR_OVERRIDE } from '../types';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Plus, Pencil, Trash2, X, ChevronDown, RefreshCw, GripVertical, Save, AlertTriangle, Loader2, Layers, RotateCcw, CalendarDays } from 'lucide-react';
import TimePicker from './TimePicker';
import TaskEditModal from './TaskEditModal';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

// สีประจำวัน (ไทย)
const DAY_COLORS: Record<number, { bg: string; text: string; border: string; activeBg: string; activeText: string }> = {
  0: { bg: 'bg-red-50',    text: 'text-red-500',    border: 'border-red-200',    activeBg: 'bg-red-500',    activeText: 'text-red-600' },    // อาทิตย์ — แดง
  1: { bg: 'bg-yellow-50', text: 'text-yellow-600',  border: 'border-yellow-200', activeBg: 'bg-yellow-400', activeText: 'text-yellow-600' }, // จันทร์ — เหลือง
  2: { bg: 'bg-pink-50',   text: 'text-pink-500',   border: 'border-pink-200',   activeBg: 'bg-pink-400',   activeText: 'text-pink-600' },   // อังคาร — ชมพู
  3: { bg: 'bg-green-50',  text: 'text-green-500',  border: 'border-green-200',  activeBg: 'bg-green-500',  activeText: 'text-green-600' },  // พุธ — เขียว
  4: { bg: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-200', activeBg: 'bg-orange-400', activeText: 'text-orange-600' }, // พฤหัสบดี — ส้ม
  5: { bg: 'bg-blue-50',   text: 'text-blue-500',   border: 'border-blue-200',   activeBg: 'bg-blue-500',   activeText: 'text-blue-600' },   // ศุกร์ — ฟ้า
  6: { bg: 'bg-purple-50', text: 'text-purple-500', border: 'border-purple-200', activeBg: 'bg-purple-500', activeText: 'text-purple-600' }, // เสาร์ — ม่วง
};

const DAY_TAB_CONFIG: { dayOfWeek: number; label: string; shortLabel: string }[] = [
  { dayOfWeek: 1, label: 'จันทร์',   shortLabel: 'จ' },
  { dayOfWeek: 2, label: 'อังคาร',   shortLabel: 'อ' },
  { dayOfWeek: 3, label: 'พุธ',      shortLabel: 'พ' },
  { dayOfWeek: 4, label: 'พฤหัสบดี', shortLabel: 'พฤ' },
  { dayOfWeek: 5, label: 'ศุกร์',    shortLabel: 'ศ' },
  { dayOfWeek: 6, label: 'เสาร์',    shortLabel: 'ส' },
  { dayOfWeek: 0, label: 'อาทิตย์',  shortLabel: 'อา' },
];

function getDurationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60; // ข้ามเที่ยงคืน
  return diff;
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h} ชม. ${m} น.`;
  if (h > 0) return `${h} ชม.`;
  return `${m} น.`;
}

interface DailyPlannerProps {
  tasks: Task[];
  setTasks?: React.Dispatch<React.SetStateAction<Task[]>>;
  taskGroups: TaskGroup[];
  milestones: Milestone[];
  scheduleTemplates: ScheduleTemplates;
  setScheduleTemplates: React.Dispatch<React.SetStateAction<ScheduleTemplates>>;
  todayRecords?: DailyRecord[];
  onSaveDailyRecord?: (record: DailyRecord) => void;
  deletedDefaultTaskIds?: string[];
  setDeletedDefaultTaskIds?: React.Dispatch<React.SetStateAction<string[]>>;
  onImmediateSave?: (updatedTasks?: Task[], updatedDeletedIds?: string[]) => Promise<void>;
  pendingSlot?: { startTime: string; endTime: string } | null;
  onPendingSlotHandled?: () => void;
  defaultScheduleTemplates?: ScheduleTemplates;
}

/** Get tasks explicitly assigned to a slot */
function getTasksForSlot(tasks: Task[], slot: TimeSlot): Task[] {
  const assigned = slot.assignedTaskIds || [];
  if (assigned.length === 0) return [];
  const assignedSet = new Set(assigned);
  // Preserve order from assignedTaskIds
  return assigned
    .map(id => tasks.find(t => t.id === id))
    .filter((t): t is Task => t !== undefined);
}

// Sortable wrapper for slot/hour items in hour grid
const SortableGridItem: React.FC<{ id: string; showHandle?: boolean; children: React.ReactNode }> = ({ id, showHandle, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} className={`transition-shadow ${isDragging ? 'shadow-lg rounded-xl ring-2 ring-emerald-300 bg-white' : ''} flex items-stretch`}>
      <div {...listeners} className="w-6 shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-300 hover:text-emerald-500 transition-colors touch-none">
        {showHandle && <GripVertical className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};

// Sortable wrapper for task items inside a slot
const SortableTaskItem: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 30 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} className={`flex items-stretch transition-shadow ${isDragging ? 'shadow-md rounded-lg ring-2 ring-emerald-300 bg-white' : ''}`}>
      <div {...listeners} className="w-8 shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-300 hover:text-emerald-500 active:text-emerald-600 transition-colors touch-none">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};

const DailyPlanner: React.FC<DailyPlannerProps> = ({
  tasks, setTasks, taskGroups, milestones, scheduleTemplates, setScheduleTemplates, todayRecords = [], onSaveDailyRecord,
  deletedDefaultTaskIds = [], setDeletedDefaultTaskIds, onImmediateSave,
  pendingSlot, onPendingSlotHandled, defaultScheduleTemplates,
}) => {
  // Date navigation
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const selectedDateStr = toLocalDateStr(selectedDate);
  const todayStr = toLocalDateStr(new Date());
  const isToday = selectedDateStr === todayStr;

  const dateLabel = `${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear() + 543}`;

  const prevDay = () => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
  const nextDay = () => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });
  const goToday = () => setSelectedDate(new Date());

  // Move selectedDate to the correct day within the same week when switching day tabs
  const syncDateToTab = (tab: string) => {
    if (!/^[0-6]$/.test(tab)) return;
    const targetDow = parseInt(tab);
    setSelectedDate(prev => {
      const diff = targetDow - prev.getDay();
      if (diff === 0) return prev;
      const next = new Date(prev);
      next.setDate(prev.getDate() + diff);
      return next;
    });
  };

  // Day detection & active tab ("0"-"6" for day tabs, custom template ID for custom tabs)
  const selectedDayOfWeek = selectedDate.getDay();
  const [activeTab, setActiveTab] = useState<string>(String(selectedDayOfWeek));

  // Auto-switch tab when date changes (respect dirty state)
  useEffect(() => {
    const newTab = String(selectedDate.getDay());
    if (scheduleDirty && newTab !== activeTab) {
      pendingTabRef.current = newTab;
      setShowUnsavedWarning(true);
    } else {
      setActiveTab(newTab);
    }
  }, [selectedDate]);

  // Custom template state
  const customTemplates = scheduleTemplates.customTemplates || [];
  const [customFormOpen, setCustomFormOpen] = useState(false);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [customForm, setCustomForm] = useState({ name: '', emoji: '📋' });
  const [deleteCustomConfirm, setDeleteCustomConfirm] = useState<string | null>(null);

  const isDayTab = /^[0-6]$/.test(activeTab);
  const isCustomTab = !isDayTab;
  const activeDayOfWeek = isDayTab ? parseInt(activeTab) : -1;
  const isShowingToday = isToday && isDayTab && activeTab === String(selectedDayOfWeek);
  const activeDayColor = isDayTab ? DAY_COLORS[activeDayOfWeek] : null;
  const activeCustomTemplate = isCustomTab ? customTemplates.find(t => t.id === activeTab) : null;

  // Schedule save tracking (dirty + status)
  const [scheduleDirty, setScheduleDirty] = useState(false);
  const [scheduleSaveStatus, setScheduleSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const pendingTabRef = useRef<string | null>(null);

  // Reset dirty state when switching tabs (after save or discard)
  useEffect(() => {
    setScheduleDirty(false);
    setScheduleSaveStatus('idle');
  }, [activeTab]);

  // Resolve schedule: day tab → getScheduleForDay(), custom tab → template slots
  const resolvedDay = isDayTab ? getScheduleForDay(scheduleTemplates, parseInt(activeTab), selectedDateStr) : null;
  const schedule = isDayTab
    ? (resolvedDay?.slots || [])
    : (activeCustomTemplate?.slots || []);

  // Use schedule template slots directly (tasks are grouped by category)
  const rawSchedule = [...schedule].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  const mergedSchedule = rawSchedule;

  // Auto-fill removed — user adds slots manually via "+ เพิ่ม Slot"

  // Wrapper to update only the active tab's template (+ mark dirty)
  const setScheduleForTab = useCallback((updater: (prev: TimeSlot[]) => TimeSlot[]) => {
    setScheduleDirty(true);
    setScheduleSaveStatus('idle');
    if (isDayTab) {
      const dow = parseInt(activeTab);
      setScheduleTemplates(prev => {
        const resolved = getScheduleForDay(prev, dow);
        if (resolved.source === 'custom' && resolved.templateId) {
          // Editing a custom template overlay — edit the custom template itself
          const newSlots = updater(resolved.slots || []);
          return {
            ...prev,
            customTemplates: (prev.customTemplates || []).map(t =>
              t.id === resolved.templateId ? { ...t, slots: newSlots } : t
            ),
          };
        } else {
          // For 'base', 'dayPlan', or 'cleared' — write to dayPlans[dow]
          const currentSlots = resolved.slots || [];
          const newSlots = updater(currentSlots);
          return {
            ...prev,
            dayPlans: {
              ...(prev.dayPlans || {}),
              [String(dow)]: newSlots,
            },
          };
        }
      });
    } else {
      // Custom tab: edit the custom template directly
      setScheduleTemplates(prev => ({
        ...prev,
        customTemplates: (prev.customTemplates || []).map(t =>
          t.id === activeTab ? { ...t, slots: updater(t.slots) } : t
        ),
      }));
    }
  }, [activeTab, isDayTab, setScheduleTemplates]);

  // Save schedule explicitly with verification
  const handleSaveSchedule = useCallback(async () => {
    if (!onImmediateSave) return;
    setScheduleSaveStatus('saving');
    try {
      await onImmediateSave();
      setScheduleSaveStatus('saved');
      setScheduleDirty(false);
      setTimeout(() => setScheduleSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('[Planner] Save failed:', err);
      setScheduleSaveStatus('error');
    }
  }, [onImmediateSave]);

  // Guard tab switch: if dirty, show warning instead of switching
  // When switching to a day tab, also move selectedDate to the correct day in the same week
  const handleTabSwitch = useCallback((newTab: string) => {
    if (scheduleDirty && newTab !== activeTab) {
      pendingTabRef.current = newTab;
      setShowUnsavedWarning(true);
    } else {
      setActiveTab(newTab);
      syncDateToTab(newTab);
    }
  }, [scheduleDirty, activeTab]);

  // Confirm discard unsaved changes
  const confirmDiscardAndSwitch = useCallback(() => {
    setScheduleDirty(false);
    setScheduleSaveStatus('idle');
    setShowUnsavedWarning(false);
    if (pendingTabRef.current !== null) {
      setActiveTab(pendingTabRef.current);
      syncDateToTab(pendingTabRef.current);
      pendingTabRef.current = null;
    }
  }, []);

  // Save then switch tab
  const saveAndSwitch = useCallback(async () => {
    if (!onImmediateSave) return;
    setScheduleSaveStatus('saving');
    try {
      await onImmediateSave();
      setScheduleSaveStatus('saved');
      setScheduleDirty(false);
      setShowUnsavedWarning(false);
      if (pendingTabRef.current !== null) {
        setActiveTab(pendingTabRef.current);
        syncDateToTab(pendingTabRef.current);
        pendingTabRef.current = null;
      }
    } catch (err) {
      console.error('[Planner] Save failed:', err);
      setScheduleSaveStatus('error');
    }
  }, [onImmediateSave]);

  // Custom template CRUD
  const openCustomForm = () => {
    setEditingCustomId(null);
    setCustomForm({ name: '', emoji: '📋' });
    setCustomFormOpen(true);
  };
  const openEditCustom = (ct: CustomScheduleTemplate) => {
    setEditingCustomId(ct.id);
    setCustomForm({ name: ct.name, emoji: ct.emoji });
    setCustomFormOpen(true);
  };
  const saveCustomTemplate = () => {
    const name = customForm.name.trim();
    if (!name) return;
    if (editingCustomId) {
      setScheduleTemplates(prev => ({
        ...prev,
        customTemplates: (prev.customTemplates || []).map(t =>
          t.id === editingCustomId ? { ...t, name, emoji: customForm.emoji } : t
        ),
      }));
    } else {
      const newTemplate: CustomScheduleTemplate = {
        id: `custom-${Date.now()}`,
        name,
        emoji: customForm.emoji,
        slots: saveAsCustomSlots
          ? saveAsCustomSlots.map(s => ({ ...s, id: `${s.id}-copy-${Date.now()}` }))
          : [],
      };
      setScheduleTemplates(prev => ({
        ...prev,
        customTemplates: [...(prev.customTemplates || []), newTemplate],
      }));
      setActiveTab(newTemplate.id);
    }
    setSaveAsCustomSlots(null);
    setCustomFormOpen(false);
    setScheduleDirty(true);
  };
  const deleteCustomTemplate = (id: string) => {
    setScheduleTemplates(prev => {
      const newDayOverrides = { ...(prev.dayOverrides || {}) };
      Object.keys(newDayOverrides).forEach(key => {
        if (newDayOverrides[key] === id) delete newDayOverrides[key];
      });
      const newDateOverrides = { ...(prev.dateOverrides || {}) };
      Object.keys(newDateOverrides).forEach(key => {
        if (newDateOverrides[key] === id) delete newDateOverrides[key];
      });
      return {
        ...prev,
        customTemplates: (prev.customTemplates || []).filter(t => t.id !== id),
        dayOverrides: Object.keys(newDayOverrides).length > 0 ? newDayOverrides : {},
        dateOverrides: Object.keys(newDateOverrides).length > 0 ? newDateOverrides : {},
      };
    });
    if (activeTab === id) handleTabSwitch(String(selectedDayOfWeek));
    setDeleteCustomConfirm(null);
  };

  // Apply/remove custom template override for a day-of-week
  const applyCustomToDay = (dayOfWeek: number, templateId: string) => {
    setScheduleTemplates(prev => ({
      ...prev,
      dayOverrides: { ...(prev.dayOverrides || {}), [String(dayOfWeek)]: templateId },
    }));
    setScheduleDirty(true);
  };

  const removeCustomFromDay = (dayOfWeek: number) => {
    setScheduleTemplates(prev => {
      const newOverrides = { ...(prev.dayOverrides || {}) };
      delete newOverrides[String(dayOfWeek)];
      return {
        ...prev,
        dayOverrides: Object.keys(newOverrides).length > 0 ? newOverrides : {},
      };
    });
    setScheduleDirty(true);
  };

  // Apply/remove custom template override for a specific date
  const applyCustomToDate = (dateStr: string, templateId: string) => {
    setScheduleTemplates(prev => ({
      ...prev,
      dateOverrides: { ...(prev.dateOverrides || {}), [dateStr]: templateId },
    }));
    setScheduleDirty(true);
  };

  const removeCustomFromDate = (dateStr: string) => {
    setScheduleTemplates(prev => {
      const newOverrides = { ...(prev.dateOverrides || {}) };
      delete newOverrides[dateStr];
      return {
        ...prev,
        dateOverrides: Object.keys(newOverrides).length > 0 ? newOverrides : {},
      };
    });
    setScheduleDirty(true);
  };

  // State for custom apply mode (day vs date) + pending selections
  const [customApplyMode, setCustomApplyMode] = useState<'day' | 'date'>('day');
  const [customDateInput, setCustomDateInput] = useState('');
  const [pendingDays, setPendingDays] = useState<Set<number>>(new Set());
  const [pendingDates, setPendingDates] = useState<string[]>([]);
  const [showApplySuccess, setShowApplySuccess] = useState(false);

  // Initialize pending state when switching to a custom tab
  useEffect(() => {
    if (isCustomTab && activeCustomTemplate) {
      const currentDays = new Set<number>();
      Object.entries(scheduleTemplates.dayOverrides || {}).forEach(([k, v]) => {
        if (v === activeCustomTemplate.id) currentDays.add(parseInt(k));
      });
      setPendingDays(currentDays);

      const currentDates = Object.entries(scheduleTemplates.dateOverrides || {})
        .filter(([, v]) => v === activeCustomTemplate.id)
        .map(([k]) => k)
        .sort();
      setPendingDates(currentDates);
      setShowApplySuccess(false);
    }
  }, [activeTab]);

  // Confirm apply days
  const confirmApplyDays = () => {
    if (!activeCustomTemplate) return;
    const templateId = activeCustomTemplate.id;
    setScheduleTemplates(prev => {
      const newOverrides = { ...(prev.dayOverrides || {}) };
      // Remove days that were using this template but are now deselected
      Object.keys(newOverrides).forEach(k => {
        if (newOverrides[k] === templateId && !pendingDays.has(parseInt(k))) {
          delete newOverrides[k];
        }
      });
      // Add newly selected days
      pendingDays.forEach(d => {
        newOverrides[String(d)] = templateId;
      });
      return {
        ...prev,
        dayOverrides: Object.keys(newOverrides).length > 0 ? newOverrides : {},
      };
    });
    setShowApplySuccess(true);
    setTimeout(() => setShowApplySuccess(false), 3000);
  };

  // Confirm apply dates
  const confirmApplyDates = () => {
    if (!activeCustomTemplate) return;
    const templateId = activeCustomTemplate.id;
    setScheduleTemplates(prev => {
      const newOverrides = { ...(prev.dateOverrides || {}) };
      // Remove dates that were using this template but are now removed
      Object.keys(newOverrides).forEach(k => {
        if (newOverrides[k] === templateId && !pendingDates.includes(k)) {
          delete newOverrides[k];
        }
      });
      // Add newly selected dates
      pendingDates.forEach(d => {
        newOverrides[d] = templateId;
      });
      return {
        ...prev,
        dateOverrides: Object.keys(newOverrides).length > 0 ? newOverrides : {},
      };
    });
    setShowApplySuccess(true);
    setTimeout(() => setShowApplySuccess(false), 3000);
  };

  // Check if pending state differs from current
  const hasPendingChanges = (() => {
    if (!activeCustomTemplate) return false;
    if (customApplyMode === 'day') {
      const currentDays = new Set(
        Object.entries(scheduleTemplates.dayOverrides || {})
          .filter(([, v]) => v === activeCustomTemplate.id)
          .map(([k]) => parseInt(k))
      );
      if (pendingDays.size !== currentDays.size) return true;
      for (const d of pendingDays) if (!currentDays.has(d)) return true;
      return false;
    } else {
      const currentDates = Object.entries(scheduleTemplates.dateOverrides || {})
        .filter(([, v]) => v === activeCustomTemplate.id)
        .map(([k]) => k)
        .sort();
      const sortedPending = [...pendingDates].sort();
      if (sortedPending.length !== currentDates.length) return true;
      return sortedPending.some((d, i) => d !== currentDates[i]);
    }
  })();

  // Current time for "now" indicator
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Expanded slots
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());
  const toggleSlot = (id: string) => {
    setExpandedSlots(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Check-off state
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set());

  // Slot editor modal
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [isAddingSlot, setIsAddingSlot] = useState(false);

  // Task editor modal
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [fullEditTask, setFullEditTask] = useState<Task | null>(null);
  const [taskEditForm, setTaskEditForm] = useState({ estimatedDuration: 0 });
  const [slotForm, setSlotForm] = useState({ startTime: '09:00', endTime: '10:00', groupKey: '', duration: 60 });

  // Delete confirmation
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<{ taskId: string; slotId: string } | null>(null);
  const [confirmDeleteSlotId, setConfirmDeleteSlotId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmReload, setConfirmReload] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveAsCustomSlots, setSaveAsCustomSlots] = useState<TimeSlot[] | null>(null);

  // Task Picker for adding tasks to a slot
  const [pickerSlot, setPickerSlot] = useState<TimeSlot | null>(null);
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());

  // Determine wake/sleep times
  const currentWakeTime = scheduleTemplates.wakeTime || '05:00';
  const currentSleepTime = scheduleTemplates.sleepTime || '22:00';

  // Sorted schedule — filter and sort by startTime
  const sortedSchedule = [...mergedSchedule]
    .filter(s => s.startTime && s.endTime && s.groupKey && s.groupKey !== '_free' && s.type !== 'free')
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  const resolvedSchedule = sortedSchedule.map(s => ({ ...s, startTime: s.startTime!, endTime: s.endTime!, duration: s.duration || getDurationMinutes(s.startTime!, s.endTime!) }));

  // Hour grid from wakeTime to sleepTime
  const wakeMinutes = parseInt(currentWakeTime.split(':')[0]) * 60 + parseInt(currentWakeTime.split(':')[1]);
  const sleepMinutes = parseInt(currentSleepTime.split(':')[0]) * 60 + parseInt(currentSleepTime.split(':')[1]);
  const totalDayMinutes = ((sleepMinutes - wakeMinutes) + 1440) % 1440;
  const hourGrid: { startTime: string; endTime: string }[] = [];
  for (let m = 0; m < totalDayMinutes; m += 60) {
    const sMin = (wakeMinutes + m) % 1440;
    const eMin = (wakeMinutes + m + 60) % 1440;
    hourGrid.push({
      startTime: `${String(Math.floor(sMin / 60)).padStart(2, '0')}:${String(sMin % 60).padStart(2, '0')}`,
      endTime: `${String(Math.floor(eMin / 60)).padStart(2, '0')}:${String(eMin % 60).padStart(2, '0')}`,
    });
  }

  // Map: which slots cover each hour
  const slotsByHour = new Map<string, typeof resolvedSchedule>();
  resolvedSchedule.forEach(slot => {
    const sMin = parseInt(slot.startTime.split(':')[0]) * 60 + parseInt(slot.startTime.split(':')[1]);
    const eMin = parseInt(slot.endTime.split(':')[0]) * 60 + parseInt(slot.endTime.split(':')[1]);
    hourGrid.forEach(h => {
      const hStart = parseInt(h.startTime.split(':')[0]) * 60 + parseInt(h.startTime.split(':')[1]);
      const hEnd = hStart + 60;
      if (sMin < hEnd && eMin > hStart) {
        const arr = slotsByHour.get(h.startTime) || [];
        if (!arr.find(s => s.id === slot.id)) arr.push(slot);
        slotsByHour.set(h.startTime, arr);
      }
    });
  });

  // All tasks for the day (for summary)
  const dayTasks = getTasksForDate(tasks, selectedDateStr);

  // Restore checked state from todayRecords — run only ONCE on initial load
  const hasRestoredChecks = useRef(false);
  useEffect(() => {
    if (hasRestoredChecks.current) return;
    if (!isToday || todayRecords.length === 0) return;
    hasRestoredChecks.current = true;
    const checked = new Set<string>();
    todayRecords.forEach(r => {
      if (!r.timeStart || !r.timeEnd) return;
      // Prefer taskId match (new records), fallback to title+category (old records)
      const matchTask = r.taskId
        ? dayTasks.find(t => t.id === r.taskId)
        : dayTasks.find(t => t.title === r.taskTitle && t.category === r.category);
      if (!matchTask) return;
      const matchSlot = resolvedSchedule.find(s =>
        s.startTime === r.timeStart && s.endTime === r.timeEnd &&
        (s.assignedTaskIds || []).includes(matchTask.id)
      );
      if (matchSlot) checked.add(matchTask.id);
    });
    setCheckedTasks(checked);
  }, [todayRecords]);


  // Toggle check (slotStart/slotEnd from the slot containing this task)
  const toggleCheck = useCallback((taskId: string, slotStart?: string, slotEnd?: string) => {
    if (!isToday) return;
    setCheckedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
        const task = dayTasks.find(t => t.id === taskId);
        if (task) {
          if (onSaveDailyRecord) {
            onSaveDailyRecord({
              id: `${todayStr}-${task.id}`,
              date: todayStr,
              taskId: task.id,
              taskTitle: task.title,
              category: task.category,
              completed: true,
              completedAt: new Date().toISOString(),
              timeStart: slotStart,
              timeEnd: slotEnd,
            });
          }
          // Mark non-recurring tasks as completed
          if (setTasks && !isTaskRecurring(task)) {
            setTasks(prev => prev.map(t =>
              t.id === task.id ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
            ));
          }
        }
      }
      return next;
    });
  }, [isToday, dayTasks, todayStr, onSaveDailyRecord, setTasks]);

  // Auto-open slot form from Dashboard navigation
  useEffect(() => {
    if (pendingSlot) {
      const dur = getDurationMinutes(pendingSlot.startTime, pendingSlot.endTime);
      setSlotForm({ startTime: pendingSlot.startTime, endTime: pendingSlot.endTime, groupKey: '', duration: dur });
      setEditingSlot(null);
      setIsAddingSlot(true);
      onPendingSlotHandled?.();
    }
  }, [pendingSlot]);

  // Helper: add minutes to HH:MM string
  const addMinutesToTime = (time: string, mins: number): string => {
    const [h, m] = time.split(':').map(Number);
    let total = h * 60 + m + mins;
    if (total < 0) total += 24 * 60;
    total = total % (24 * 60);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };

  // Slot CRUD
  const openAddSlot = () => {
    // Default start time = end time of last slot, or 09:00
    const lastSlot = sortedSchedule.length > 0 ? sortedSchedule[sortedSchedule.length - 1] : null;
    const defaultStart = lastSlot ? lastSlot.endTime : '09:00';
    const defaultDuration = 60;
    setSlotForm({
      startTime: defaultStart,
      endTime: addMinutesToTime(defaultStart, defaultDuration),
      groupKey: '',
      duration: defaultDuration,
    });
    setEditingSlot(null);
    setIsAddingSlot(true);
  };

  const openEditSlot = (slot: TimeSlot) => {
    const dur = slot.duration || (slot.startTime && slot.endTime ? getDurationMinutes(slot.startTime, slot.endTime) : 60);
    setSlotForm({ startTime: slot.startTime || '09:00', endTime: slot.endTime || '10:00', groupKey: slot.groupKey, duration: dur });
    setEditingSlot(slot);
    setIsAddingSlot(true);
  };

  const saveSlot = () => {
    if (!slotForm.groupKey) return;
    const { groupKey, duration } = slotForm;

    if (editingSlot) {
      const { startTime, endTime } = slotForm;
      setScheduleForTab(prev => prev.map(s =>
        s.id === editingSlot.id ? { ...s, startTime, endTime, groupKey, duration } : s
      ));
    } else {
      const newSlot: TimeSlot = {
        id: `${activeTab}-${Date.now()}`,
        startTime: slotForm.startTime,
        endTime: slotForm.endTime,
        groupKey,
        duration,
      };
      setScheduleForTab(prev => [...prev, newSlot]);
    }
    setIsAddingSlot(false);
    setEditingSlot(null);
  };

  // Task Picker: open picker for a slot
  const openTaskPicker = (slot: TimeSlot) => {
    setPickerSlot(slot);
    setPickerSelected(new Set());
  };

  // Task Picker: show ALL tasks from matching groups (no dayType filter), exclude tasks already in slot
  const getPickerTasks = (slot: TimeSlot): Task[] => {
    const alreadyInSlot = new Set(getFullTasksForSlot(slot).map(t => t.id));
    const matchKeys = new Set(getGroupKeysForSlot(slot.groupKey));
    return tasks.filter(t => matchKeys.has(t.category) && !alreadyInSlot.has(t.id));
  };

  // Task Picker: confirm selection
  const confirmTaskPicker = () => {
    if (!pickerSlot || pickerSelected.size === 0) {
      setPickerSlot(null);
      return;
    }
    setScheduleForTab(prev => prev.map(s => {
      if (s.id !== pickerSlot.id) return s;
      const existing = s.assignedTaskIds || [];
      return { ...s, assignedTaskIds: [...existing, ...Array.from(pickerSelected)] };
    }));
    // Clear checked state for newly added tasks (start fresh)
    setCheckedTasks(prev => {
      const next = new Set(prev);
      pickerSelected.forEach(id => next.delete(id));
      return next;
    });
    // Auto-expand the slot
    setExpandedSlots(prev => new Set(prev).add(pickerSlot.id));
    setPickerSlot(null);
    setPickerSelected(new Set());
  };

  const showDeleteTaskConfirm = (taskId: string, slotId: string) => {
    setConfirmDeleteTaskId({ taskId, slotId });
  };

  const confirmDeleteTask = () => {
    if (!confirmDeleteTaskId) return;

    const { taskId, slotId } = confirmDeleteTaskId;

    // Remove from assignedTaskIds
    setScheduleForTab(prev => prev.map(s => {
      if (s.id !== slotId) return s;
      const newAssigned = (s.assignedTaskIds || []).filter(id => id !== taskId);
      return { ...s, assignedTaskIds: newAssigned };
    }));

    setConfirmDeleteTaskId(null);
  };

  const showDeleteSlotConfirm = (slotId: string) => {
    setConfirmDeleteSlotId(slotId);
  };

  const confirmDeleteSlot = () => {
    if (!confirmDeleteSlotId) return;
    setScheduleForTab(prev => prev.filter(s => s.id !== confirmDeleteSlotId));
    setConfirmDeleteSlotId(null);
  };

  // Task editing handlers
  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskEditForm({ estimatedDuration: task.estimatedDuration || 0 });
  };

  const saveTaskEdit = () => {
    if (!editingTask || !setTasks) return;

    setTasks(prev => prev.map(t =>
      t.id === editingTask.id
        ? { ...t, estimatedDuration: taskEditForm.estimatedDuration || undefined }
        : t
    ));
    setEditingTask(null);
  };

  const closeTaskEdit = () => {
    setEditingTask(null);
  };

  // Maps for resolving slot groupKey (can be a category key or a group key)
  const groupMap = new Map<string, TaskGroup>(taskGroups.map(g => [g.key, g]));
  const categoryMap = new Map<string, Category>(DEFAULT_CATEGORIES.map(c => [c.key, c]));

  // Fallback colors for categories without task groups
  const categoryColorMap: Record<string, string> = { break: 'cyan', sleep: 'indigo' };

  // Resolve a slot's groupKey to display info { label, emoji, color }
  const resolveSlotInfo = (key: string): { label: string; emoji: string; color: string } => {
    if (key === 'ว่าง') return { label: 'ว่าง', emoji: '⬜', color: 'slate' };
    // Check group task first (new style)
    const g = groupMap.get(key);
    if (g) return { label: g.label, emoji: g.emoji, color: g.color };
    // Fallback to category (legacy)
    const cat = categoryMap.get(key);
    if (cat) {
      const firstGroup = taskGroups.find(g => g.categoryKey === key);
      return { label: cat.label, emoji: cat.emoji, color: firstGroup?.color || categoryColorMap[key] || 'orange' };
    }
    return { label: key, emoji: '', color: 'orange' };
  };

  // Get group keys that belong to a category (or just the key itself if it's a group)
  const getGroupKeysForSlot = (key: string): string[] => {
    if (categoryMap.has(key)) {
      return taskGroups.filter(g => g.categoryKey === key).map(g => g.key);
    }
    return [key];
  };

  // Full tasks for slot: explicitly assigned + auto-matched appointments (by time)
  const getFullTasksForSlot = (slot: TimeSlot): Task[] => {
    const assigned = slot.assignedTaskIds || [];
    const excludedIds = new Set(slot.excludedTaskIds || []);
    const manualTasks = assigned
      .map(id => tasks.find(t => t.id === id))
      .filter((t): t is Task => t !== undefined && !excludedIds.has(t.id));

    // Auto-match appointments whose startTime falls in this slot on selectedDate
    if (!slot.startTime || !slot.endTime) return manualTasks;
    const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
    const slotStart = toMin(slot.startTime);
    const slotEnd = toMin(slot.endTime);
    const manualIds = new Set(manualTasks.map(t => t.id));
    const autoTasks = tasks.filter(t => {
      if ((t.category !== 'นัดหมาย' && t.category !== 'งานด่วน') || !t.startTime) return false;
      // Date match: exact match, or (no date set AND viewing today)
      const dateOk = t.startDate ? t.startDate === selectedDateStr : selectedDateStr === todayStr;
      if (!dateOk) return false;
      if (manualIds.has(t.id) || excludedIds.has(t.id)) return false;
      const tMin = toMin(t.startTime);
      if (slotEnd > slotStart) return tMin >= slotStart && tMin < slotEnd;
      return tMin >= slotStart || tMin < slotEnd; // midnight crossing
    });
    return [...manualTasks, ...autoTasks];
  };

  // Summary: time per group from schedule slots (skip free slots)
  const summaryMap = new Map<string, { totalMins: number; doneMins: number }>();

  resolvedSchedule.forEach(slot => {
    if (slot.type === 'free') return;
    const slotMins = slot.duration || 0;
    const prev = summaryMap.get(slot.groupKey) || { totalMins: 0, doneMins: 0 };
    const slotTasks = getFullTasksForSlot(slot);
    const doneMins = slotTasks
      .filter(t => checkedTasks.has(t.id))
      .reduce((s, t) => s + (t.estimatedDuration || 0), 0);
    summaryMap.set(slot.groupKey, { totalMins: prev.totalMins + slotMins, doneMins: prev.doneMins + doneMins });
  });

  const slotSummary: { key: string; label: string; emoji: string; color: string; totalMins: number; doneMins: number }[] = [];
  summaryMap.forEach((val, key) => {
    const info = resolveSlotInfo(key);
    slotSummary.push({ key, ...info, ...val });
  });

  // Add sleep to summary (sleepTime → wakeTime crossing midnight)
  const sleepDurMins = ((wakeMinutes - sleepMinutes) + 1440) % 1440;
  if (!summaryMap.has('sleep') && sleepDurMins > 0) {
    slotSummary.push({ key: 'sleep', label: 'นอน', emoji: '🌙', color: 'indigo', totalMins: sleepDurMins, doneMins: 0 });
  }

  const totalAllMins = slotSummary.reduce((s, c) => s + c.totalMins, 0);
  const doneAllMins = slotSummary.reduce((s, c) => s + c.doneMins, 0);
  const progressPct = totalAllMins > 0 ? Math.round((doneAllMins / totalAllMins) * 100) : 0;

  // DnD: swap groupKeys between slots when reordered
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
  );

  // Recalculate all slot times sequentially from wakeTime, keeping each slot's duration
  const recalcSlotTimes = (slots: TimeSlot[]): TimeSlot[] => {
    let cursor = parseInt(currentWakeTime.split(':')[0]) * 60 + parseInt(currentWakeTime.split(':')[1]);
    return slots.map(s => {
      const dur = s.duration || getDurationMinutes(s.startTime || '00:00', s.endTime || '01:00');
      const newStart = `${String(Math.floor(cursor / 60) % 24).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`;
      cursor += dur;
      const newEnd = `${String(Math.floor(cursor / 60) % 24).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`;
      return { ...s, startTime: newStart, endTime: newEnd, duration: dur };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIdx = sortedSchedule.findIndex(s => s.id === active.id);
    const overIdx = sortedSchedule.findIndex(s => s.id === over.id);
    if (activeIdx === -1 || overIdx === -1) return;

    // Reorder and recalc times for ALL slots (including empty)
    const reordered = arrayMove([...sortedSchedule], activeIdx, overIdx);
    setScheduleForTab(() => recalcSlotTimes(reordered));
  };

  // DnD: reorder tasks within a slot (updates slot's assignedTaskIds)
  const taskSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
  );

  const handleTaskDragEnd = (slotId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find the slot and its current task list
    const slot = sortedSchedule.find(s => s.id === slotId);
    if (!slot) return;
    const currentTasks = getFullTasksForSlot(slot);

    const oldIndex = currentTasks.findIndex(t => t.id === active.id);
    const newIndex = currentTasks.findIndex(t => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(currentTasks, oldIndex, newIndex);

    // Save the new order as assignedTaskIds on this slot
    setScheduleForTab(prev => prev.map(s => {
      if (s.id !== slotId) return s;
      return { ...s, assignedTaskIds: reordered.map(t => t.id) };
    }));
  };

  // Merge milestones and slots
  const buildTimeline = () => {
    const items: { type: 'slot' | 'milestone'; data: TimeSlot | Milestone }[] = [];
    const usedMilestones = new Set<string>();

    // Filter out milestones that are now standalone slots (ms-1 to ms-5 are wake up, meals, sleep)
    const milestonesToHide = ['ms-1', 'ms-2', 'ms-3', 'ms-4', 'ms-5'];
    const visibleMilestones = milestones.filter(ms => !milestonesToHide.includes(ms.id));

    sortedSchedule.forEach((slot, i) => {
      // Insert milestones before this slot
      visibleMilestones.forEach(ms => {
        if (usedMilestones.has(ms.id)) return;
        if (ms.time < slot.startTime || (i === 0 && ms.time <= slot.startTime)) {
          items.push({ type: 'milestone', data: ms });
          usedMilestones.add(ms.id);
        }
      });

      items.push({ type: 'slot', data: slot });

      const nextSlot = sortedSchedule[i + 1];

      // Insert milestones after this slot
      visibleMilestones.forEach(ms => {
        if (usedMilestones.has(ms.id)) return;
        if (ms.time >= slot.endTime && (!nextSlot || ms.time < nextSlot.startTime)) {
          items.push({ type: 'milestone', data: ms });
          usedMilestones.add(ms.id);
        }
      });
    });

    // Add remaining milestones
    visibleMilestones.forEach(ms => {
      if (!usedMilestones.has(ms.id)) {
        items.push({ type: 'milestone', data: ms });
      }
    });

    return items;
  };

  const timeline = buildTimeline();

  return (
    <div className="space-y-3">
      {/* Day tabs + Custom days moved to TemplateSettings view */}

      {/* 2. Context Bar — shows current view + template type */}
      <div className={`rounded-xl border p-3 flex items-center justify-between transition-all ${
        isCustomTab
          ? 'bg-violet-50 border-violet-200'
          : activeDayColor
            ? `${activeDayColor.bg} ${activeDayColor.border}`
            : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-1.5 w-40 justify-center">
          <button onClick={prevDay} className="p-1.5 rounded-lg hover:bg-white/60 text-slate-400 transition-colors shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </button>
          {isCustomTab && activeCustomTemplate ? (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-violet-500 text-white shadow-sm text-center min-w-[70px]">
              {activeCustomTemplate.emoji} {activeCustomTemplate.name}
            </span>
          ) : isShowingToday ? (
            <button onClick={goToday} className={`text-xs font-bold px-3 py-1 rounded-full transition-all text-center min-w-[70px] ${activeDayColor ? `${activeDayColor.activeBg} text-white shadow-sm` : 'bg-emerald-500 text-white'}`}>
              วันนี้
            </button>
          ) : (
            <span className={`text-xs font-bold px-3 py-1 rounded-full shadow-sm text-center min-w-[70px] ${activeDayColor ? `${activeDayColor.activeBg} text-white` : 'bg-slate-500 text-white'}`}>
              {dayNames[activeDayOfWeek]}
            </span>
          )}
          <button onClick={nextDay} className="p-1.5 rounded-lg hover:bg-white/60 text-slate-400 transition-colors shrink-0">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {isDayTab && (
          <div className="flex-1 flex items-center justify-center gap-2">
            <span className={`text-sm font-bold ${activeDayColor ? activeDayColor.activeText : 'text-slate-700'}`}>{dateLabel}</span>
            {resolvedDay?.source === 'custom' && (
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-400 via-violet-400 to-blue-400 text-white text-[9px] font-bold shadow-sm">
                Custom : {resolvedDay.templateEmoji} {resolvedDay.templateName}
              </span>
            )}
            {resolvedDay?.source === 'cleared' && (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[9px] font-bold">Cleared</span>
            )}
            {resolvedDay?.source === 'dayPlan' && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 text-[9px] font-bold">แก้ไขแล้ว</span>
            )}
          </div>
        )}
        {isCustomTab && (
          <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-400 via-violet-400 to-blue-400 text-white text-[10px] font-bold shadow-sm">Custom Template</span>
        )}
        {/* Calendar date picker — right side */}
        <label className="p-1.5 rounded-lg hover:bg-white/60 text-slate-400 transition-colors shrink-0 cursor-pointer relative">
          <CalendarDays className="w-4.5 h-4.5" />
          <input
            type="date"
            value={selectedDateStr}
            onChange={e => {
              if (e.target.value) {
                const d = new Date(e.target.value + 'T00:00:00');
                setSelectedDate(d);
                setActiveTab(String(d.getDay()));
              }
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>
      </div>

      {/* Wake/Sleep Time Editor */}
      {isDayTab && (() => {
        const wMins = parseInt(currentWakeTime.split(':')[0]) * 60 + parseInt(currentWakeTime.split(':')[1]);
        const sMins = parseInt(currentSleepTime.split(':')[0]) * 60 + parseInt(currentSleepTime.split(':')[1]);
        const sleepHours = ((wMins - sMins) + 1440) % 1440;
        return (
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl px-3 py-2 space-y-1.5">
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">☀️</span>
                <span className="text-[10px] font-bold text-indigo-400">ตื่น</span>
                <TimePicker
                  value={currentWakeTime}
                  onChange={(val) => {
                    setScheduleTemplates(prev => ({ ...prev, wakeTime: val }));
                    setScheduleDirty(true);
                  }}
                  compact
                />
              </div>
              <span className="bg-indigo-100 border border-indigo-300 text-indigo-600 text-xs font-black px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1"><span className="text-sm leading-none">😴</span> {formatDuration(sleepHours)}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">🌙</span>
                <span className="text-[10px] font-bold text-indigo-400">นอน</span>
                <TimePicker
                  value={currentSleepTime}
                  onChange={(val) => {
                    setScheduleTemplates(prev => ({ ...prev, sleepTime: val }));
                    setScheduleDirty(true);
                  }}
                  compact
                />
              </div>
            </div>
            <button
              onClick={async () => {
                setScheduleTemplates(prev => ({ ...prev, wakeTime: currentWakeTime, sleepTime: currentSleepTime }));
                if (onImmediateSave) await onImmediateSave();
              }}
              className="w-full text-center text-[10px] font-bold text-indigo-400 hover:text-indigo-600 transition-colors py-0.5"
            >
              ✓ ตั้งเวลาตื่น-นอน เป็นค่ามาตรฐานทุกวัน
            </button>
          </div>
        );
      })()}

      {/* Save bar — shows when dirty */}
      {scheduleDirty && isDayTab && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-xs font-bold text-amber-600 flex-1">มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก</span>
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={scheduleSaveStatus === 'saving'}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors disabled:opacity-60 shadow-sm"
          >
            {scheduleSaveStatus === 'saving' ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> กำลังบันทึก...</>
            ) : (
              <><Save className="w-3.5 h-3.5" /> บันทึก</>
            )}
          </button>
        </div>
      )}
      {scheduleDirty && isCustomTab && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-xs font-bold text-amber-600 flex-1">มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก</span>
          <button
            onClick={handleSaveSchedule}
            disabled={scheduleSaveStatus === 'saving'}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors disabled:opacity-60 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" /> บันทึก
          </button>
        </div>
      )}
      {/* Save success notification */}
      {scheduleSaveStatus === 'saved' && !scheduleDirty && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-xs font-bold text-emerald-600">บันทึกสำเร็จแล้ว!</span>
        </div>
      )}
      {/* Save error notification */}
      {scheduleSaveStatus === 'error' && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="text-xs font-bold text-rose-600 flex-1">บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง</span>
          <button
            onClick={handleSaveSchedule}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> ลองใหม่
          </button>
        </div>
      )}

      {/* Slot header + Add button */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-slate-500">📋 Slots ({sortedSchedule.length})</span>
        <button
          onClick={openAddSlot}
          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-600 transition-colors"
        >
          <Plus className="w-3 h-3" /> เพิ่ม Slot
        </button>
      </div>

      {/* Hour Grid — Planner style */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sortedSchedule.map(s => s.id)} strategy={verticalListSortingStrategy}>
      <div className="space-y-1.5">
        {sortedSchedule.map(item => {
            {
              const startingSlot = item;
              const info = resolveSlotInfo(startingSlot.groupKey);
              const colors = GROUP_COLORS[info.color] || GROUP_COLORS.orange;
              const dur = startingSlot.duration || getDurationMinutes(startingSlot.startTime, startingSlot.endTime);
              const spanHours = Math.max(1, Math.ceil(dur / 60));
              const slotTasks = getFullTasksForSlot(startingSlot);
              const checkedCount = slotTasks.filter(t => checkedTasks.has(t.id)).length;
              const isExpanded = expandedSlots.has(startingSlot.id);
              const nowH = new Date().getHours() * 60 + new Date().getMinutes();
              const sMin = parseInt(startingSlot.startTime.split(':')[0]) * 60 + parseInt(startingSlot.startTime.split(':')[1]);
              const eMin = parseInt(startingSlot.endTime.split(':')[0]) * 60 + parseInt(startingSlot.endTime.split(':')[1]);
              const isCurrent = isToday && nowH >= sMin && nowH < eMin;

              return (
                <SortableGridItem key={item.id} id={startingSlot.id} showHandle>
                <div className="bg-white rounded-xl border overflow-hidden" style={{ minHeight: spanHours * 44 }}>
                  <div className="flex-1 min-w-0">
                    <div onClick={() => toggleSlot(startingSlot.id)} className={`flex items-center gap-1.5 px-2.5 py-2 cursor-pointer select-none ${colors.plannerBg} ${isCurrent ? 'ring-2 ring-emerald-400 ring-inset' : ''}`}>
                      <span className="text-[10px] font-black text-slate-500">{startingSlot.startTime}–{startingSlot.endTime}</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                      <span className={`text-xs font-black ${colors.plannerText}`}>{info.emoji} {info.label}</span>
                      <div className="flex-1" />
                      <span className="text-[10px] text-slate-400 font-bold">{formatDuration(dur)}</span>
                      {slotTasks.length > 0 && <span className={`text-[10px] font-black ${colors.plannerText} opacity-60`}>{checkedCount}/{slotTasks.length}</span>}
                      {isCurrent && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                      <button onClick={(e) => { e.stopPropagation(); openEditSlot(startingSlot); }} className="p-1 rounded hover:bg-white/60 text-slate-400 hover:text-slate-600"><Pencil className="w-3 h-3" /></button>
                      <button onClick={(e) => { e.stopPropagation(); showDeleteSlotConfirm(startingSlot.id); }} className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                    {/* Always show tasks (no expand needed) */}
                    <div className="border-t border-slate-100 px-2 py-1 space-y-0.5">
                      {slotTasks.length > 0 ? slotTasks.map(task => {
                        const checked = checkedTasks.has(task.id);
                        return (
                          <div key={task.id} className={`flex items-center gap-1.5 px-1 py-1 rounded hover:bg-slate-50 ${checked ? 'opacity-40' : ''}`}>
                            <div onClick={() => toggleCheck(task.id, startingSlot.startTime, startingSlot.endTime)} className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer">
                              {checked ? <CheckCircle2 className={`w-3.5 h-3.5 ${colors.plannerText}`} /> : <Circle className={`w-3.5 h-3.5 ${colors.plannerText} opacity-30`} />}
                              <span className={`text-xs flex-1 truncate ${checked ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</span>
                            </div>
                            <button onClick={() => setFullEditTask(task)} className="p-0.5 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-600"><Pencil className="w-2.5 h-2.5" /></button>
                            <button onClick={() => showDeleteTaskConfirm(task.id, startingSlot.id)} className="p-0.5 rounded hover:bg-rose-50 text-slate-300 hover:text-rose-500"><Trash2 className="w-2.5 h-2.5" /></button>
                          </div>
                        );
                      }) : null}
                      <div className="flex items-center gap-1.5 px-1">
                        <button onClick={() => openTaskPicker(startingSlot)} className={`flex-1 flex items-center justify-center gap-1 py-1 rounded border border-dashed text-[10px] font-bold ${colors.plannerBorder} ${colors.plannerText}`}>
                          <Plus className="w-3 h-3" /> + task
                        </button>
                        {/* Spacers to keep + task aligned with task title column (mirror edit/delete icon widths) */}
                        <span className="w-4 shrink-0" />
                        <span className="w-4 shrink-0" />
                      </div>
                    </div>
                  </div>
                </div>
                </SortableGridItem>
              );
            }

        })}
      </div>
      </SortableContext>
      </DndContext>

      <div className={`${isCustomTab ? 'rounded-xl border-2 border-blue-300 bg-blue-50/30 p-3 space-y-3' : ''}`}>
        {/* Summary */}
        <div className="space-y-3">
          {slotSummary.length > 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">สรุปเวลา</h4>
              <div className="space-y-2">
                {slotSummary.map(c => {
                  const clr = GROUP_COLORS[c.color] || GROUP_COLORS.orange;
                  const pct = totalAllMins > 0 ? Math.round((c.totalMins / totalAllMins) * 100) : 0;
                  return (
                    <div key={c.key}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-bold text-slate-600">{c.emoji} {c.label}</span>
                        <span className="text-[10px] font-black text-slate-400">{formatDuration(c.totalMins)} <span className="text-slate-300">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${clr.iconBg}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-center">
                <span className="text-sm font-black text-emerald-600">{formatDuration(totalAllMins)}</span>
                <span className="text-[10px] text-slate-400 font-bold ml-1">ทั้งวัน</span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400">
              <p className="text-xs font-bold">ไม่มี Slot</p>
            </div>
          )}

          {/* Custom Day tabs moved to TemplateSettings view */}

          {/* Template management buttons */}
          <div className="flex flex-col gap-1.5 mt-2">
            <button
              onClick={() => setConfirmClearAll(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 text-[11px] font-bold hover:bg-rose-100 transition-colors active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" /> เคลียร์ Slot ทั้งหมด
            </button>
            {isDayTab && customTemplates.length > 0 && (
              <button
                onClick={() => setShowCustomPicker(true)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 text-[11px] font-bold hover:bg-blue-100 transition-colors active:scale-95"
              >
                <Layers className="w-3.5 h-3.5" /> ใช้ Custom Template
              </button>
            )}
            {isDayTab && schedule.length > 0 && (
              <button
                onClick={() => {
                  const dayLabel = dayNames[parseInt(activeTab)];
                  setEditingCustomId(null);
                  setCustomForm({ name: `ตาราง${dayLabel}`, emoji: '💾' });
                  setSaveAsCustomSlots([...schedule]);
                  setCustomFormOpen(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-violet-200 bg-violet-50 text-violet-600 text-[11px] font-bold hover:bg-violet-100 transition-colors active:scale-95"
              >
                <Save className="w-3.5 h-3.5" /> บันทึกเป็น Custom Day
              </button>
            )}
            {isDayTab && defaultScheduleTemplates && (
              <button
                onClick={() => setConfirmReload(true)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 text-[11px] font-bold hover:bg-emerald-100 transition-colors active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reload Default
              </button>
            )}
            {/* Edit/Delete custom template moved to TemplateSettings */}
          </div>
        </div>
      </div>

      {/* ใช้ Custom Day นี้ — day/date selector (only when viewing custom template) */}
      {isCustomTab && activeCustomTemplate && (
        <div className="border-t-2 border-blue-200 pt-3 mt-1">
          <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1 mb-3">
            <span className="text-[11px] font-black text-blue-600">ใช้ Custom Day นี้ โดยเลือก :</span>
            <button
              onClick={() => setCustomApplyMode('day')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                customApplyMode === 'day' ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:text-blue-500 hover:border-blue-300'
              }`}
            >
              วัน
            </button>
            <span className="text-[11px] font-bold text-slate-400">หรือ</span>
            <button
              onClick={() => setCustomApplyMode('date')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                customApplyMode === 'date' ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:text-blue-500 hover:border-blue-300'
              }`}
            >
              วันที่
            </button>
          </div>

          {customApplyMode === 'day' ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {DAY_TAB_CONFIG.map(tab => {
                  const isSelected = pendingDays.has(tab.dayOfWeek);
                  return (
                    <button
                      key={tab.dayOfWeek}
                      onClick={() => {
                        setPendingDays(prev => {
                          const next = new Set(prev);
                          if (next.has(tab.dayOfWeek)) next.delete(tab.dayOfWeek);
                          else next.add(tab.dayOfWeek);
                          return next;
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        isSelected
                          ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                          : 'bg-orange-50 text-orange-500 border-orange-200 hover:bg-orange-100 hover:border-orange-300'
                      }`}
                    >
                      {tab.shortLabel}
                    </button>
                  );
                })}
              </div>
              {pendingDays.size > 0 ? (
                <p className="text-[10px] text-blue-500 font-bold mt-2">
                  เลือก: {DAY_TAB_CONFIG.filter(tab => pendingDays.has(tab.dayOfWeek)).map(d => d.label).join(', ')}
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 mt-2">กดเลือกวันที่ต้องการใช้ template นี้ (ทุกสัปดาห์)</p>
              )}
              {/* Confirm button for day mode */}
              <button
                onClick={confirmApplyDays}
                disabled={!hasPendingChanges}
                className={`mt-2 w-full py-2 rounded-xl text-xs font-bold transition-all ${
                  hasPendingChanges
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                ยืนยัน
              </button>
            </>
          ) : (
            <>
              <div className="flex gap-2 mb-2">
                <input
                  type="date"
                  value={customDateInput}
                  onChange={e => setCustomDateInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                />
                <button
                  onClick={() => {
                    if (customDateInput && !pendingDates.includes(customDateInput)) {
                      setPendingDates(prev => [...prev, customDateInput].sort());
                      setCustomDateInput('');
                    }
                  }}
                  disabled={!customDateInput}
                  className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors disabled:opacity-40"
                >
                  เพิ่ม
                </button>
              </div>
              {pendingDates.length > 0 ? (
                <div className="space-y-1">
                  {pendingDates.map(dateStr => {
                    const d = new Date(dateStr);
                    const label = `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear() + 543}`;
                    return (
                      <div key={dateStr} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-1.5 border border-blue-200">
                        <span className="text-xs font-bold text-blue-600">{label}</span>
                        <button
                          onClick={() => setPendingDates(prev => prev.filter(d => d !== dateStr))}
                          className="text-blue-400 hover:text-rose-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400">เลือกวันที่เฉพาะเจาะจงที่ต้องการใช้ template นี้</p>
              )}
              {/* Confirm button for date mode */}
              <button
                onClick={confirmApplyDates}
                disabled={!hasPendingChanges}
                className={`mt-2 w-full py-2 rounded-xl text-xs font-bold transition-all ${
                  hasPendingChanges
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                ยืนยัน
              </button>
            </>
          )}

          {/* Success notification */}
          {showApplySuccess && (
            <div className="mt-2 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs font-bold text-emerald-600">บันทึกสำเร็จแล้ว!</span>
            </div>
          )}
        </div>
      )}

      {/* Save Mode Dialog — ask: save for all same-day or specific date */}
      {showSaveDialog && isDayTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowSaveDialog(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black text-slate-800 text-center">บันทึกตารางนี้</h3>
            <p className="text-xs text-slate-500 text-center">เลือกรูปแบบการบันทึก</p>

            <button
              onClick={() => {
                // Save for all same day-of-week (dayPlans)
                setShowSaveDialog(false);
                handleSaveSchedule();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <span className="text-2xl">📋</span>
              <div className="text-left flex-1">
                <p className="text-xs font-black text-blue-700">ทุกวัน{dayNames[parseInt(activeTab)]}</p>
                <p className="text-[10px] text-blue-500">ใช้ตารางนี้ทุกสัปดาห์</p>
              </div>
            </button>

            <button
              onClick={() => {
                // Save for specific date only (datePlans)
                setShowSaveDialog(false);
                const currentSlots = sortedSchedule.filter(s => s.groupKey !== 'sleep');
                setScheduleTemplates(prev => ({
                  ...prev,
                  datePlans: { ...(prev.datePlans || {}), [selectedDateStr]: currentSlots },
                }));
                setScheduleDirty(false);
                handleSaveSchedule();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors"
            >
              <span className="text-2xl">📅</span>
              <div className="text-left flex-1">
                <p className="text-xs font-black text-amber-700">เฉพาะวันที่ {selectedDate.getDate()} {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear() + 543}</p>
                <p className="text-[10px] text-amber-500">แก้เฉพาะวันนี้วันเดียว</p>
              </div>
            </button>

            <button
              onClick={() => setShowSaveDialog(false)}
              className="w-full py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-400 hover:bg-slate-50 transition-colors"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Slot Editor Modal */}
      {isAddingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4" onClick={() => setIsAddingSlot(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-sm p-5 space-y-4 my-auto max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">
                {editingSlot ? 'แก้ไข Slot' : 'เพิ่ม Slot ใหม่'}
              </h3>
              <button onClick={() => setIsAddingSlot(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* 1. Duration — ระยะเวลากิจกรรม */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ระยะเวลากิจกรรม</label>
              <div className="mt-1.5 flex items-center justify-center gap-3">
                <button
                  onClick={() => setSlotForm(f => {
                    const d = Math.max(15, f.duration - 15);
                    return { ...f, duration: d, endTime: addMinutesToTime(f.startTime, d) };
                  })}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-lg flex items-center justify-center transition-colors"
                >
                  −
                </button>
                <div className="text-center min-w-[80px]">
                  <span className="text-2xl font-black text-emerald-600">{formatDuration(slotForm.duration)}</span>
                </div>
                <button
                  onClick={() => setSlotForm(f => {
                    const d = Math.min(480, f.duration + 15);
                    return { ...f, duration: d, endTime: addMinutesToTime(f.startTime, d) };
                  })}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-lg flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
              {/* Quick duration buttons */}
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {[30, 60, 90, 120, 180].map(mins => (
                  <button
                    key={mins}
                    onClick={() => setSlotForm(f => ({ ...f, duration: mins, endTime: addMinutesToTime(f.startTime, mins) }))}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                      slotForm.duration === mins
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300'
                    }`}
                  >
                    {formatDuration(mins)}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Start time — เวลาเริ่ม */}
            <div>
              <TimePicker
                label="เวลาเริ่ม"
                value={slotForm.startTime}
                onChange={value => setSlotForm(f => ({ ...f, startTime: value, endTime: addMinutesToTime(value, f.duration) }))}
              />
            </div>

            {/* 3. End time — คำนวณอัตโนมัติ (read-only display) */}
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">เวลาจบ</span>
              <span className="flex-1" />
              <span className="text-sm font-black text-slate-700">{slotForm.endTime}</span>
              <span className="text-[10px] text-slate-400">(คำนวณอัตโนมัติ)</span>
            </div>

            {/* 4. Group task selector — จัดตาม Category */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">กลุ่มงาน</label>
              <div className="mt-1.5 space-y-2">
                {DEFAULT_CATEGORIES.map(cat => {
                  const catGroups = taskGroups.filter(g => g.categoryKey === cat.key);
                  if (catGroups.length === 0) return null;
                  return (
                    <div key={cat.key}>
                      <p className="text-[9px] font-bold text-slate-400 mb-1">{cat.emoji} {cat.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {catGroups.map(g => {
                          const clr = GROUP_COLORS[g.color] || GROUP_COLORS.orange;
                          const isActive = slotForm.groupKey === g.key;
                          return (
                            <button key={g.key} onClick={() => setSlotForm(f => ({ ...f, groupKey: g.key }))}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                isActive ? `${clr.bg} ${clr.border} ${clr.text} ring-2 ${clr.ring}` : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}>
                              {g.emoji} {g.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {/* Uncategorized groups (งานด่วน, นัดหมาย) */}
                {taskGroups.filter(g => !g.categoryKey).length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 mb-1">⚡ อื่นๆ</p>
                    <div className="flex flex-wrap gap-1.5">
                      {taskGroups.filter(g => !g.categoryKey).map(g => {
                        const clr = GROUP_COLORS[g.color] || GROUP_COLORS.orange;
                        const isActive = slotForm.groupKey === g.key;
                        return (
                          <button key={g.key} onClick={() => setSlotForm(f => ({ ...f, groupKey: g.key }))}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                              isActive ? `${clr.bg} ${clr.border} ${clr.text} ring-2 ${clr.ring}` : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}>
                            {g.emoji} {g.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 5. Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsAddingSlot(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveSlot}
                disabled={!slotForm.groupKey}
                className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors disabled:opacity-40"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Task Editor Modal (edit any task detail from a slot) */}
      <TaskEditModal
        isOpen={!!fullEditTask}
        editId={fullEditTask?.id || null}
        initialTask={fullEditTask ? {
          title: fullEditTask.title, description: fullEditTask.description, priority: fullEditTask.priority,
          completed: fullEditTask.completed, startDate: fullEditTask.startDate, endDate: fullEditTask.endDate,
          startTime: fullEditTask.startTime, endTime: fullEditTask.endTime,
          category: fullEditTask.category, notes: fullEditTask.notes || '', attachments: fullEditTask.attachments || [],
          dayTypes: fullEditTask.dayTypes, estimatedDuration: fullEditTask.estimatedDuration,
        } : null}
        initialSubtasks={fullEditTask?.subtasks || []}
        initialAttachments={fullEditTask?.attachments || []}
        initialRecurrence={fullEditTask?.recurrence}
        taskGroups={taskGroups}
        onClose={() => setFullEditTask(null)}
        onSave={({ form, subtasks, attachments, recurrence }) => {
          if (!fullEditTask || !setTasks) { setFullEditTask(null); return; }
          setTasks(prev => prev.map(t => t.id === fullEditTask.id ? { ...t, ...form, attachments, subtasks: subtasks.length > 0 ? subtasks : undefined, recurrence } : t));
          setFullEditTask(null);
        }}
      />

      {/* Task Duration Editor Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={closeTaskEdit}>
          <div className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">แก้ไข Task</h3>
              <button onClick={closeTaskEdit} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Task title */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <p className="text-xs font-bold text-slate-600">{editingTask.title}</p>
              {editingTask.description && (
                <p className="text-[11px] text-slate-400 mt-1">{editingTask.description}</p>
              )}
            </div>

            {/* Duration input */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ระยะเวลาโดยประมาณ (นาที)</label>
              <input
                type="number"
                min="0"
                value={taskEditForm.estimatedDuration || ''}
                onChange={e => setTaskEditForm(f => ({ ...f, estimatedDuration: parseInt(e.target.value) || 0 }))}
                placeholder="เช่น 30"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 outline-none"
              />
              {taskEditForm.estimatedDuration > 0 && (
                <p className="text-xs text-emerald-600 font-bold mt-1 text-center">
                  {formatDuration(taskEditForm.estimatedDuration)}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={closeTaskEdit}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveTaskEdit}
                className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation */}
      {confirmDeleteTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl animate-fadeIn p-5">
            <h3 className="text-lg font-black text-slate-800 mb-2">นำ Task ออกจาก Slot นี้</h3>
            <p className="text-sm text-slate-600 mb-6">Task จะถูกนำออกจาก slot นี้ แต่ยังอยู่ในกลุ่ม Task เดิม<br/><span className="text-xs text-slate-400">สามารถเพิ่มกลับได้ด้วยปุ่ม +</span></p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteTaskId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDeleteTask}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-colors"
              >
                นำออก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Picker Modal */}
      {pickerSlot && (() => {
        const pInfo = resolveSlotInfo(pickerSlot.groupKey);
        const pColors = GROUP_COLORS[pInfo.color] || GROUP_COLORS.orange;
        const available = getPickerTasks(pickerSlot);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setPickerSlot(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className={`${pColors.plannerBg} px-5 py-4 flex items-center justify-between`}>
                <div>
                  <h3 className={`text-sm font-black ${pColors.plannerText}`}>
                    เพิ่ม Task ใน Slot
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                    {pInfo.emoji} {pInfo.label} • {pickerSlot.startTime}–{pickerSlot.endTime}
                  </p>
                </div>
                <button onClick={() => setPickerSlot(null)} className="p-1 rounded-lg hover:bg-white/60">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="max-h-[50vh] overflow-y-auto p-3 space-y-1">
                {available.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">
                    ไม่มี Task ในหมวด "{pInfo.label}" ที่ยังไม่ได้เพิ่ม
                    <br/>
                    <span className="text-[10px]">สร้าง Task ใหม่ได้ที่หน้า Task Manager</span>
                  </p>
                ) : (
                  available.map(task => {
                    const isSelected = pickerSelected.has(task.id);
                    return (
                      <button
                        key={task.id}
                        onClick={() => setPickerSelected(prev => {
                          const next = new Set(prev);
                          if (next.has(task.id)) next.delete(task.id); else next.add(task.id);
                          return next;
                        })}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? `${pColors.bg} ${pColors.border} ring-2 ${pColors.ring}`
                            : 'bg-white border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <div className="shrink-0">
                          {isSelected
                            ? <CheckCircle2 className={`w-4.5 h-4.5 ${pColors.text}`} />
                            : <Circle className="w-4.5 h-4.5 text-slate-300" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[13px] font-bold text-slate-700 truncate block">{task.title}</span>
                          {task.description && (
                            <span className="text-[10px] text-slate-400 truncate block">{task.description}</span>
                          )}
                        </div>
                        {task.estimatedDuration && (
                          <span className="text-[10px] font-mono text-blue-400 shrink-0">{task.estimatedDuration}น.</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {available.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => setPickerSlot(null)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={confirmTaskPicker}
                    disabled={pickerSelected.size === 0}
                    className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors disabled:opacity-40"
                  >
                    เพิ่ม {pickerSelected.size > 0 ? `(${pickerSelected.size})` : ''}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Delete Slot Confirmation */}
      {confirmDeleteSlotId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl animate-fadeIn p-5">
            <h3 className="text-lg font-black text-slate-800 mb-2">ยืนยันการลบ Slot</h3>
            <p className="text-sm text-slate-600 mb-6">คุณแน่ใจหรือไม่ว่าต้องการลบ slot นี้?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteSlotId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDeleteSlot}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm rounded-xl transition-colors"
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Slots Confirmation */}
      {confirmClearAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl animate-fadeIn p-5">
            <h3 className="text-lg font-black text-slate-800 mb-2">เคลียร์ Slot ทั้งหมด</h3>
            <p className="text-sm text-slate-600 mb-6">ลบ slot ทั้งหมดในตารางนี้ เพื่อสร้างใหม่ตั้งแต่ต้น?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmClearAll(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-xl transition-colors">ยกเลิก</button>
              <button onClick={() => {
                if (isDayTab) {
                  const dow = parseInt(activeTab);
                  setScheduleTemplates(prev => {
                    const newDayOverrides = { ...(prev.dayOverrides || {}) };
                    delete newDayOverrides[String(dow)];
                    return {
                      ...prev,
                      dayPlans: {
                        ...(prev.dayPlans || {}),
                        [String(dow)]: [],
                      },
                      dayOverrides: Object.keys(newDayOverrides).length > 0 ? newDayOverrides : {},
                    };
                  });
                  setScheduleDirty(true);
                } else {
                  // Custom tab: directly clear the template's slots
                  setScheduleForTab(() => []);
                }
                setConfirmClearAll(false);
              }} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm rounded-xl transition-colors">เคลียร์ทั้งหมด</button>
            </div>
          </div>
        </div>
      )}

      {/* Reload Default Confirmation */}
      {confirmReload && defaultScheduleTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl animate-fadeIn p-5">
            <h3 className="text-lg font-black text-slate-800 mb-2">Reload Default Template</h3>
            <p className="text-sm text-slate-600 mb-6">โหลดตาราง default ใหม่ จะเขียนทับ slot ปัจจุบันทั้งหมด</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmReload(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-xl transition-colors">ยกเลิก</button>
              <button onClick={() => {
                const dow = parseInt(activeTab);
                setScheduleTemplates(prev => {
                  const newDayPlans = { ...(prev.dayPlans || {}) };
                  delete newDayPlans[String(dow)];
                  const newDayOverrides = { ...(prev.dayOverrides || {}) };
                  delete newDayOverrides[String(dow)];
                  const newDateOverrides = { ...(prev.dateOverrides || {}) };
                  delete newDateOverrides[selectedDateStr];
                  return {
                    ...prev,
                    dayPlans: Object.keys(newDayPlans).length > 0 ? newDayPlans : undefined,
                    dayOverrides: Object.keys(newDayOverrides).length > 0 ? newDayOverrides : {},
                    dateOverrides: Object.keys(newDateOverrides).length > 0 ? newDateOverrides : {},
                  };
                });
                setScheduleDirty(true);
                setConfirmReload(false);
              }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl transition-colors">โหลด Default</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Template Picker */}
      {showCustomPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl animate-fadeIn overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-blue-50">
              <h3 className="font-bold text-blue-800 text-base">เลือก Custom Template</h3>
              <button onClick={() => setShowCustomPicker(false)} className="p-2 bg-white/80 hover:bg-white rounded-full text-slate-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
              {customTemplates.length > 0 ? customTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    const dow = parseInt(activeTab);
                    applyCustomToDay(dow, t.id);
                    setShowCustomPicker(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left active:scale-[0.98]"
                >
                  <span className="text-xl">{t.emoji}</span>
                  <div>
                    <span className="text-sm font-bold text-slate-700 block">{t.name}</span>
                    <span className="text-[10px] text-slate-400">{t.slots.length} slots</span>
                  </div>
                </button>
              )) : (
                <p className="text-xs text-slate-400 text-center py-4">ยังไม่มี custom template<br />สร้างได้จากแท็บ + ด้านบน</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Template Form Modal */}
      {customFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl animate-fadeIn overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">{editingCustomId ? 'แก้ไข Template' : 'สร้าง Template ใหม่'}</h3>
              <button onClick={() => { setCustomFormOpen(false); setSaveAsCustomSlots(null); }} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {saveAsCustomSlots && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 text-[11px] font-bold text-violet-600">
                  💾 คัดลอก {saveAsCustomSlots.length} slots จากตารางปัจจุบัน
                </div>
              )}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">ชื่อ Template</label>
                <input
                  type="text"
                  autoFocus
                  value={customForm.name}
                  onChange={e => setCustomForm({ ...customForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="เช่น Trip Travel, วัน WFH, วันลา..."
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">Emoji</label>
                <div className="flex flex-wrap gap-1.5">
                  {['📋', '🏠', '💻', '🎉', '🏖️', '📚', '🏃', '🧘', '🎯', '⚡', '🌙', '🔥', '🎨', '🎮', '🛫', '✨'].map(em => (
                    <button
                      key={em}
                      onClick={() => setCustomForm({ ...customForm, emoji: em })}
                      className={`w-10 h-10 rounded-xl border-2 text-lg flex items-center justify-center transition-all ${
                        customForm.emoji === em ? 'border-emerald-400 bg-emerald-50 scale-110' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button onClick={() => { setCustomFormOpen(false); setSaveAsCustomSlots(null); }} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm rounded-xl transition-colors">ยกเลิก</button>
              <button
                onClick={saveCustomTemplate}
                disabled={!customForm.name.trim()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-200 transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                {editingCustomId ? <><Save className="w-4 h-4" /> บันทึก</> : <><Plus className="w-4 h-4" /> สร้าง</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl animate-fadeIn p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก</h3>
                <p className="text-sm text-slate-500 mt-0.5">คุณต้องการบันทึกก่อนเปลี่ยนหน้าหรือไม่?</p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setShowUnsavedWarning(false); pendingTabRef.current = null; }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDiscardAndSwitch}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                ไม่บันทึก
              </button>
              <button
                onClick={saveAndSwitch}
                disabled={scheduleSaveStatus === 'saving'}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-1"
              >
                {scheduleSaveStatus === 'saving' ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> บันทึก...</>
                ) : (
                  <><Save className="w-3.5 h-3.5" /> บันทึก</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Custom Template Confirm */}
      {deleteCustomConfirm && (() => {
        const ct = customTemplates.find(t => t.id === deleteCustomConfirm);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl animate-fadeIn p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mx-auto">
                <Trash2 className="w-7 h-7 text-rose-500" />
              </div>
              <h3 className="font-black text-lg text-slate-800">ลบ template "{ct?.emoji} {ct?.name}"?</h3>
              <p className="text-sm text-slate-500">Slot ทั้งหมดใน template นี้จะถูกลบด้วย</p>
              <div className="flex gap-3 justify-center pt-2">
                <button onClick={() => setDeleteCustomConfirm(null)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm rounded-xl transition-colors">ยกเลิก</button>
                <button onClick={() => deleteCustomTemplate(deleteCustomConfirm)} className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm rounded-xl transition-colors flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> ลบเลย
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default DailyPlanner;
