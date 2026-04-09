
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TaskGroup, TimeSlot, ScheduleTemplates, CustomScheduleTemplate, GROUP_COLORS, getScheduleForDay, DEFAULT_CATEGORIES, Category, CLEAR_OVERRIDE } from '../types';
import { ChevronDown, Plus, Pencil, Trash2, X, GripVertical, Save, AlertTriangle, Loader2, Layers, RotateCcw } from 'lucide-react';
import TimePicker from './TimePicker';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

const DAY_COLORS: Record<number, { bg: string; text: string; border: string; activeBg: string; activeText: string }> = {
  0: { bg: 'bg-red-50',    text: 'text-red-500',    border: 'border-red-200',    activeBg: 'bg-red-500',    activeText: 'text-red-600' },
  1: { bg: 'bg-yellow-50', text: 'text-yellow-600',  border: 'border-yellow-200', activeBg: 'bg-yellow-400', activeText: 'text-yellow-600' },
  2: { bg: 'bg-pink-50',   text: 'text-pink-500',   border: 'border-pink-200',   activeBg: 'bg-pink-400',   activeText: 'text-pink-600' },
  3: { bg: 'bg-green-50',  text: 'text-green-500',  border: 'border-green-200',  activeBg: 'bg-green-500',  activeText: 'text-green-600' },
  4: { bg: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-200', activeBg: 'bg-orange-400', activeText: 'text-orange-600' },
  5: { bg: 'bg-blue-50',   text: 'text-blue-500',   border: 'border-blue-200',   activeBg: 'bg-blue-500',   activeText: 'text-blue-600' },
  6: { bg: 'bg-purple-50', text: 'text-purple-500', border: 'border-purple-200', activeBg: 'bg-purple-500', activeText: 'text-purple-600' },
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
  if (diff < 0) diff += 24 * 60;
  return diff;
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}ชม. ${m}น.`;
  if (h > 0) return `${h}ชม.`;
  return `${m}น.`;
}

const EMOJI_OPTIONS = ['📋', '😴', '🤒', '🏕️', '💪', '👨‍👩‍👧‍👦', '📚', '🎉', '🧘', '☕', '🏠', '🔥', '⚡', '🌟', '🎯', '🧠'];

// Sortable wrapper for slot items
const SortableSlotItem: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
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
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};

interface TemplateSettingsProps {
  taskGroups: TaskGroup[];
  scheduleTemplates: ScheduleTemplates;
  setScheduleTemplates: React.Dispatch<React.SetStateAction<ScheduleTemplates>>;
  onImmediateSave?: () => Promise<void>;
}

const TemplateSettings: React.FC<TemplateSettingsProps> = ({
  taskGroups, scheduleTemplates, setScheduleTemplates, onImmediateSave,
}) => {
  // Active tab: "0"-"6" for day, custom template ID for custom
  const todayDow = new Date().getDay();
  const [activeTab, setActiveTab] = useState<string>(String(todayDow));

  const customTemplates = scheduleTemplates.customTemplates || [];

  const isDayTab = /^[0-6]$/.test(activeTab);
  const isCustomTab = !isDayTab;
  const activeDayOfWeek = isDayTab ? parseInt(activeTab) : -1;
  const activeDayColor = isDayTab ? DAY_COLORS[activeDayOfWeek] : null;
  const activeCustomTemplate = isCustomTab ? customTemplates.find(t => t.id === activeTab) : null;

  // Schedule save tracking
  const [scheduleDirty, setScheduleDirty] = useState(false);
  const [scheduleSaveStatus, setScheduleSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const pendingTabRef = useRef<string | null>(null);

  useEffect(() => {
    setScheduleDirty(false);
    setScheduleSaveStatus('idle');
  }, [activeTab]);

  // Resolve schedule for active tab
  const resolvedDay = isDayTab ? getScheduleForDay(scheduleTemplates, parseInt(activeTab)) : null;
  const schedule = isDayTab
    ? (resolvedDay?.slots || [])
    : (activeCustomTemplate?.slots || []);

  // Wrapper to update only the active tab's template
  const setScheduleForTab = useCallback((updater: (prev: TimeSlot[]) => TimeSlot[]) => {
    setScheduleDirty(true);
    setScheduleSaveStatus('idle');
    if (isDayTab) {
      const dow = parseInt(activeTab);
      setScheduleTemplates(prev => {
        const resolved = getScheduleForDay(prev, dow);
        if (resolved.source === 'custom' && resolved.templateId) {
          const newSlots = updater(resolved.slots || []);
          return {
            ...prev,
            customTemplates: (prev.customTemplates || []).map(t =>
              t.id === resolved.templateId ? { ...t, slots: newSlots } : t
            ),
          };
        } else {
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
      setScheduleTemplates(prev => ({
        ...prev,
        customTemplates: (prev.customTemplates || []).map(t =>
          t.id === activeTab ? { ...t, slots: updater(t.slots) } : t
        ),
      }));
    }
  }, [activeTab, isDayTab, setScheduleTemplates]);

  // Save
  const handleSaveSchedule = useCallback(async () => {
    if (!onImmediateSave) return;
    setScheduleSaveStatus('saving');
    try {
      await onImmediateSave();
      setScheduleSaveStatus('saved');
      setScheduleDirty(false);
      setTimeout(() => setScheduleSaveStatus('idle'), 3000);
    } catch {
      setScheduleSaveStatus('error');
    }
  }, [onImmediateSave]);

  // Tab switch
  const handleTabSwitch = useCallback((newTab: string) => {
    if (scheduleDirty && newTab !== activeTab) {
      pendingTabRef.current = newTab;
      setShowUnsavedWarning(true);
    } else {
      setActiveTab(newTab);
    }
  }, [scheduleDirty, activeTab]);

  const confirmDiscardAndSwitch = useCallback(() => {
    setScheduleDirty(false);
    setScheduleSaveStatus('idle');
    setShowUnsavedWarning(false);
    if (pendingTabRef.current !== null) {
      setActiveTab(pendingTabRef.current);
      pendingTabRef.current = null;
    }
  }, []);

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
        pendingTabRef.current = null;
      }
    } catch {
      setScheduleSaveStatus('error');
    }
  }, [onImmediateSave]);

  // Custom template CRUD
  const [customFormOpen, setCustomFormOpen] = useState(false);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [customForm, setCustomForm] = useState({ name: '', emoji: '📋' });
  const [deleteCustomConfirm, setDeleteCustomConfirm] = useState<string | null>(null);
  const [saveAsCustomSlots, setSaveAsCustomSlots] = useState<TimeSlot[] | null>(null);

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
    if (activeTab === id) setActiveTab(String(todayDow));
    setDeleteCustomConfirm(null);
    setScheduleDirty(true);
  };

  // Apply custom template to day
  const [customApplyMode, setCustomApplyMode] = useState<'day' | 'date'>('day');
  const [customDateInput, setCustomDateInput] = useState('');
  const [pendingDays, setPendingDays] = useState<Set<number>>(new Set());
  const [pendingDates, setPendingDates] = useState<string[]>([]);
  const [showApplySuccess, setShowApplySuccess] = useState(false);

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

  const confirmApplyDays = () => {
    if (!activeCustomTemplate) return;
    const templateId = activeCustomTemplate.id;
    setScheduleTemplates(prev => {
      const newOverrides = { ...(prev.dayOverrides || {}) };
      Object.keys(newOverrides).forEach(k => {
        if (newOverrides[k] === templateId && !pendingDays.has(parseInt(k))) delete newOverrides[k];
      });
      pendingDays.forEach(d => { newOverrides[String(d)] = templateId; });
      return { ...prev, dayOverrides: Object.keys(newOverrides).length > 0 ? newOverrides : {} };
    });
    setShowApplySuccess(true);
    setScheduleDirty(true);
    setTimeout(() => setShowApplySuccess(false), 3000);
  };

  const confirmApplyDates = () => {
    if (!activeCustomTemplate) return;
    const templateId = activeCustomTemplate.id;
    setScheduleTemplates(prev => {
      const newOverrides = { ...(prev.dateOverrides || {}) };
      Object.keys(newOverrides).forEach(k => {
        if (newOverrides[k] === templateId && !pendingDates.includes(k)) delete newOverrides[k];
      });
      pendingDates.forEach(d => { newOverrides[d] = templateId; });
      return { ...prev, dateOverrides: Object.keys(newOverrides).length > 0 ? newOverrides : {} };
    });
    setShowApplySuccess(true);
    setScheduleDirty(true);
    setTimeout(() => setShowApplySuccess(false), 3000);
  };

  // Slot editor
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [slotForm, setSlotForm] = useState({ startTime: '09:00', endTime: '10:00', groupKey: '', duration: 60 });
  const [confirmDeleteSlotId, setConfirmDeleteSlotId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const currentWakeTime = scheduleTemplates.wakeTime || '05:00';
  const currentSleepTime = scheduleTemplates.sleepTime || '22:00';

  const addMinutesToTime = (time: string, mins: number): string => {
    const [h, m] = time.split(':').map(Number);
    let total = h * 60 + m + mins;
    if (total < 0) total += 24 * 60;
    total = total % (24 * 60);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };

  const sortedSchedule = [...schedule]
    .filter(s => s.startTime && s.endTime && s.groupKey && s.groupKey !== '_free' && s.type !== 'free')
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  const openAddSlot = () => {
    const lastSlot = sortedSchedule.length > 0 ? sortedSchedule[sortedSchedule.length - 1] : null;
    const defaultStart = lastSlot ? lastSlot.endTime! : currentWakeTime;
    setSlotForm({ startTime: defaultStart, endTime: addMinutesToTime(defaultStart, 60), groupKey: '', duration: 60 });
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
    if (editingSlot) {
      setScheduleForTab(prev => prev.map(s =>
        s.id === editingSlot.id ? { ...s, startTime: slotForm.startTime, endTime: slotForm.endTime, groupKey: slotForm.groupKey, duration: slotForm.duration } : s
      ));
    } else {
      const newSlot: TimeSlot = {
        id: `${activeTab}-${Date.now()}`,
        startTime: slotForm.startTime,
        endTime: slotForm.endTime,
        groupKey: slotForm.groupKey,
        duration: slotForm.duration,
      };
      setScheduleForTab(prev => [...prev, newSlot]);
    }
    setIsAddingSlot(false);
    setEditingSlot(null);
  };

  const confirmDeleteSlot = () => {
    if (!confirmDeleteSlotId) return;
    setScheduleForTab(prev => prev.filter(s => s.id !== confirmDeleteSlotId));
    setConfirmDeleteSlotId(null);
  };

  // DnD reorder slots
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
  );

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
    const reordered = arrayMove([...sortedSchedule], activeIdx, overIdx);
    setScheduleForTab(() => recalcSlotTimes(reordered));
  };

  // Resolve slot display info
  const groupMap = new Map<string, TaskGroup>(taskGroups.map(g => [g.key, g]));
  const categoryMap = new Map<string, Category>(DEFAULT_CATEGORIES.map(c => [c.key, c]));
  const categoryColorMap: Record<string, string> = { break: 'cyan', sleep: 'indigo' };

  const resolveSlotInfo = (key: string): { label: string; emoji: string; color: string } => {
    if (key === 'ว่าง') return { label: 'ว่าง', emoji: '⬜', color: 'slate' };
    const cat = categoryMap.get(key);
    if (cat) {
      const firstGroup = taskGroups.find(g => g.categoryKey === key);
      return { label: cat.label, emoji: cat.emoji, color: firstGroup?.color || categoryColorMap[key] || 'orange' };
    }
    const g = groupMap.get(key);
    if (g) return { label: g.label, emoji: g.emoji, color: g.color };
    return { label: key, emoji: '', color: 'orange' };
  };

  // Total minutes
  const totalMins = sortedSchedule.reduce((s, slot) => s + (slot.duration || getDurationMinutes(slot.startTime!, slot.endTime!)), 0);

  return (
    <div className="space-y-3 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-800">📅 Template Settings</h2>
        {scheduleDirty && (
          <button onClick={handleSaveSchedule} disabled={scheduleSaveStatus === 'saving'} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50">
            {scheduleSaveStatus === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            บันทึก
          </button>
        )}
      </div>

      {/* Save status */}
      {scheduleSaveStatus === 'saved' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2 text-emerald-600 text-xs font-bold">
          <Save className="w-4 h-4" /> บันทึกสำเร็จแล้ว!
        </div>
      )}
      {scheduleSaveStatus === 'error' && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 flex items-center gap-2 text-rose-600 text-xs font-bold">
          <AlertTriangle className="w-4 h-4" /> บันทึกไม่สำเร็จ
          <button onClick={handleSaveSchedule} className="ml-auto px-2 py-1 bg-rose-500 text-white rounded-lg text-[10px] font-bold">ลองใหม่</button>
        </div>
      )}

      {/* 1. Template Selector — folder tab style */}
      <div className="relative">
        {/* Folder tab headers */}
        <div className="flex gap-1 px-1">
          <button
            onClick={() => { if (isCustomTab) handleTabSwitch(String(todayDow)); }}
            className={`px-4 py-2 text-xs font-black text-center transition-all rounded-t-xl border border-b-0 relative ${
              isDayTab
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 z-10 -mb-px'
                : 'bg-slate-100 text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            📅 ตั้งค่าตามวัน
          </button>
          <button
            onClick={() => { if (isDayTab && customTemplates.length > 0) handleTabSwitch(customTemplates[0].id); else if (isDayTab) openCustomForm(); }}
            className={`px-4 py-2 text-xs font-black text-center transition-all rounded-t-xl border border-b-0 relative ${
              isCustomTab
                ? 'bg-violet-50 text-violet-600 border-violet-200 z-10 -mb-px'
                : 'bg-slate-100 text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            ✨ ตั้งค่าวันพิเศษ
          </button>
        </div>
        {/* Content area — connected to active tab, fixed height to prevent layout shift */}
        <div className={`rounded-b-xl rounded-tr-xl border p-2.5 ${
          isDayTab ? 'bg-emerald-50 border-emerald-200' : 'bg-violet-50 border-violet-200'
        }`} style={{ minHeight: 105 }}>

          {isDayTab ? (
            <>
              {/* Day tabs (จ-อา) */}
              <div className="flex gap-0.5 mb-2.5">
                {DAY_TAB_CONFIG.map(tab => {
                  const isActive = activeTab === String(tab.dayOfWeek);
                  const isTodayDay = todayDow === tab.dayOfWeek;
                  const hasOverride = !!(scheduleTemplates.dayOverrides?.[String(tab.dayOfWeek)]);
                  const dc = DAY_COLORS[tab.dayOfWeek];
                  return (
                    <button
                      key={tab.dayOfWeek}
                      onClick={() => handleTabSwitch(String(tab.dayOfWeek))}
                      className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg font-bold transition-all ${
                        isTodayDay
                          ? `${dc.activeBg} text-white text-sm shadow-sm`
                          : isActive
                            ? `ring-2 ring-blue-500 ${dc.text} text-xs`
                            : `${dc.text} opacity-60 hover:opacity-100 hover:${dc.bg} text-xs`
                      }`}
                    >
                      <span>{tab.shortLabel}</span>
                      {hasOverride && (
                        <span className={`text-[7px] font-black leading-none px-1.5 py-0.5 rounded-sm ${
                          isTodayDay ? 'bg-white text-violet-600' : 'bg-violet-500 text-white'
                        }`}>📌</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Context info moved below tabs */}
            </>
          ) : (
            <>
              {/* Custom template list */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-violet-500">{customTemplates.length} templates</span>
                <button onClick={openCustomForm} className="flex items-center gap-1 px-2 py-1 bg-violet-100 text-violet-600 rounded-lg text-[10px] font-bold hover:bg-violet-200 transition-colors">
                  <Plus className="w-3 h-3" /> เพิ่ม
                </button>
              </div>
              {customTemplates.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2" style={{ scrollbarWidth: 'thin' }}>
                  {customTemplates.map(ct => {
                    const isActive = activeTab === ct.id;
                    return (
                      <button key={ct.id} onClick={() => handleTabSwitch(ct.id)} className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                        isActive ? 'bg-violet-500 text-white border-violet-500 shadow-sm' : 'bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100'
                      }`}>
                        <span>{ct.emoji}</span>
                        <span className="max-w-[80px] truncate">{ct.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Context info moved below tabs */}
            </>
          )}
        </div>
      </div>

      {/* Current selection indicator */}
      <div className={`rounded-xl border p-3 flex items-center justify-between ${
        isCustomTab ? 'bg-violet-50 border-violet-200' : activeDayColor ? `${activeDayColor.bg} ${activeDayColor.border}` : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          {isCustomTab && activeCustomTemplate ? (
            <span className="text-sm font-bold px-3 py-0.5 rounded-full bg-violet-500 text-white shadow-sm">
              {activeCustomTemplate.emoji} {activeCustomTemplate.name}
            </span>
          ) : (
            <span className={`text-sm font-bold px-3 py-0.5 rounded-full shadow-sm ${activeDayColor ? `${activeDayColor.activeBg} text-white` : 'bg-slate-500 text-white'}`}>
              {dayNames[activeDayOfWeek]}
            </span>
          )}
          {isDayTab && resolvedDay?.source === 'custom' && (
            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-400 via-violet-400 to-blue-400 text-white text-[9px] font-bold shadow-sm">
              Custom : {resolvedDay.templateEmoji} {resolvedDay.templateName}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400 font-bold">{sortedSchedule.length} slots · {formatDuration(totalMins)}</span>
      </div>

      {/* 4. Wake/Sleep Time */}
      {(() => {
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
                  onChange={(v) => { setScheduleTemplates(prev => ({ ...prev, wakeTime: v })); setScheduleDirty(true); }}
                  compact
                />
              </div>
              <span className="bg-indigo-100 border border-indigo-300 text-indigo-600 text-xs font-black px-2.5 py-1 rounded-full shadow-sm">😴 {formatDuration(sleepHours)}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">🌙</span>
                <span className="text-[10px] font-bold text-indigo-400">นอน</span>
                <TimePicker
                  value={currentSleepTime}
                  onChange={(v) => { setScheduleTemplates(prev => ({ ...prev, sleepTime: v })); setScheduleDirty(true); }}
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

      {/* 5. Slot List — Planner style */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-slate-500">📋 Slots ({sortedSchedule.length})</span>
        <button onClick={openAddSlot} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-600 transition-colors">
          <Plus className="w-3 h-3" /> เพิ่ม Slot
        </button>
      </div>

      {sortedSchedule.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedSchedule.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {sortedSchedule.map(slot => {
                const info = resolveSlotInfo(slot.groupKey);
                const colors = GROUP_COLORS[info.color] || GROUP_COLORS.orange;
                const dur = slot.duration || getDurationMinutes(slot.startTime!, slot.endTime!);
                const spanHours = Math.max(1, Math.ceil(dur / 60));

                return (
                  <SortableSlotItem key={slot.id} id={slot.id}>
                    <div className="bg-white rounded-xl border overflow-hidden" style={{ minHeight: spanHours * 44 }}>
                      <div className={`flex items-center gap-1.5 px-2.5 py-2 ${colors.plannerBg}`}>
                        <span className="text-[10px] font-black text-slate-500">{slot.startTime}–{slot.endTime}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                        <span className={`text-xs font-black ${colors.plannerText}`}>{info.emoji} {info.label}</span>
                        <div className="flex-1" />
                        <span className="text-[10px] text-slate-400 font-bold">{formatDuration(dur)}</span>
                        <button onClick={() => openEditSlot(slot)} className="p-1 rounded hover:bg-white/60 text-slate-400 hover:text-slate-600">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => setConfirmDeleteSlotId(slot.id)} className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-500">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </SortableSlotItem>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400">
          <p className="text-xs font-bold">ไม่มี Slot</p>
        </div>
      )}

      {/* Time Summary */}
      {sortedSchedule.length > 0 && (() => {
        const summaryMap = new Map<string, number>();
        sortedSchedule.forEach(slot => {
          const dur = slot.duration || getDurationMinutes(slot.startTime!, slot.endTime!);
          summaryMap.set(slot.groupKey, (summaryMap.get(slot.groupKey) || 0) + dur);
        });
        const summaryItems = Array.from(summaryMap.entries()).map(([key, mins]) => {
          const info = resolveSlotInfo(key);
          return { key, ...info, mins };
        });
        const wMins = parseInt(currentWakeTime.split(':')[0]) * 60 + parseInt(currentWakeTime.split(':')[1]);
        const sMins = parseInt(currentSleepTime.split(':')[0]) * 60 + parseInt(currentSleepTime.split(':')[1]);
        const sleepMins = ((wMins - sMins) + 1440) % 1440;

        return (
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">สรุปเวลา</h4>
            <div className="space-y-2">
              {summaryItems.map(c => {
                const clr = GROUP_COLORS[c.color] || GROUP_COLORS.orange;
                const pct = totalMins > 0 ? Math.round((c.mins / totalMins) * 100) : 0;
                return (
                  <div key={c.key}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] font-bold text-slate-600">{c.emoji} {c.label}</span>
                      <span className="text-[10px] font-black text-slate-400">{formatDuration(c.mins)} <span className="text-slate-300">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${clr.iconBg}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {sleepMins > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-bold text-slate-600">🌙 นอน</span>
                    <span className="text-[10px] font-black text-slate-400">{formatDuration(sleepMins)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-400" style={{ width: `${Math.round((sleepMins / (totalMins + sleepMins)) * 100)}%` }} />
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-center">
              <span className="text-sm font-black text-emerald-600">{formatDuration(totalMins)}</span>
              <span className="text-[10px] text-slate-400 font-bold ml-1">กิจกรรม</span>
              <span className="text-slate-300 mx-1.5">·</span>
              <span className="text-sm font-black text-indigo-500">{formatDuration(sleepMins)}</span>
              <span className="text-[10px] text-slate-400 font-bold ml-1">นอน</span>
            </div>
          </div>
        );
      })()}

      {/* 6. Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={() => setConfirmClearAll(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> เคลียร์ Slot ทั้งหมด
        </button>
        {isDayTab && customTemplates.length > 0 && (
          <button
            onClick={() => setShowCustomPicker(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-50 text-violet-600 border border-violet-200 rounded-xl text-xs font-bold hover:bg-violet-100 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" /> ใช้ Custom Template
          </button>
        )}
        <button
          onClick={() => { setSaveAsCustomSlots(schedule); openCustomForm(); }}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
        >
          <Save className="w-3.5 h-3.5" /> บันทึกเป็น Custom Day
        </button>
      </div>

      {/* 7. Custom Template Apply Section (only when custom tab active) */}
      {isCustomTab && activeCustomTemplate && (
        <div className="bg-violet-50 rounded-xl border border-violet-200 p-3 space-y-3">
          <p className="text-xs font-bold text-violet-700">📌 กำหนดให้ใช้ Template นี้</p>

          <div className="flex gap-1.5">
            <button onClick={() => setCustomApplyMode('day')} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${customApplyMode === 'day' ? 'bg-violet-500 text-white' : 'bg-white text-violet-600 border border-violet-200'}`}>
              ตามวัน (จ-อา)
            </button>
            <button onClick={() => setCustomApplyMode('date')} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${customApplyMode === 'date' ? 'bg-violet-500 text-white' : 'bg-white text-violet-600 border border-violet-200'}`}>
              ตามวันที่
            </button>
          </div>

          {customApplyMode === 'day' ? (
            <div className="space-y-2">
              <div className="flex gap-1 flex-wrap">
                {DAY_TAB_CONFIG.map(tab => {
                  const isSelected = pendingDays.has(tab.dayOfWeek);
                  const dc = DAY_COLORS[tab.dayOfWeek];
                  return (
                    <button
                      key={tab.dayOfWeek}
                      onClick={() => setPendingDays(prev => {
                        const next = new Set(prev);
                        if (next.has(tab.dayOfWeek)) next.delete(tab.dayOfWeek); else next.add(tab.dayOfWeek);
                        return next;
                      })}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        isSelected ? `${dc.activeBg} text-white shadow-sm` : `${dc.bg} ${dc.text} border ${dc.border}`
                      }`}
                    >
                      {tab.shortLabel}
                    </button>
                  );
                })}
              </div>
              <button onClick={confirmApplyDays} className="w-full py-2 bg-violet-500 text-white rounded-lg text-xs font-bold hover:bg-violet-600 transition-colors">
                บันทึกการกำหนดวัน
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-1.5">
                <input
                  type="date"
                  value={customDateInput}
                  onChange={e => setCustomDateInput(e.target.value)}
                  className="flex-1 text-xs border border-violet-200 rounded-lg px-2 py-1.5"
                />
                <button
                  onClick={() => {
                    if (customDateInput && !pendingDates.includes(customDateInput)) {
                      setPendingDates(prev => [...prev, customDateInput].sort());
                      setCustomDateInput('');
                    }
                  }}
                  className="px-3 py-1.5 bg-violet-500 text-white rounded-lg text-xs font-bold"
                >
                  เพิ่ม
                </button>
              </div>
              {pendingDates.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {pendingDates.map(d => (
                    <span key={d} className="flex items-center gap-1 px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-[10px] font-bold">
                      {d}
                      <button onClick={() => setPendingDates(prev => prev.filter(x => x !== d))} className="hover:text-rose-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <button onClick={confirmApplyDates} className="w-full py-2 bg-violet-500 text-white rounded-lg text-xs font-bold hover:bg-violet-600 transition-colors">
                บันทึกการกำหนดวันที่
              </button>
            </div>
          )}

          {showApplySuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-center text-emerald-600 text-[11px] font-bold">
              ✅ บันทึกสำเร็จ
            </div>
          )}

          {/* Edit / Delete custom template */}
          <div className="flex gap-2 pt-2 border-t border-violet-200">
            <button onClick={() => openEditCustom(activeCustomTemplate)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white text-violet-600 border border-violet-200 rounded-lg text-[11px] font-bold hover:bg-violet-50 transition-colors">
              <Pencil className="w-3 h-3" /> แก้ไข
            </button>
            <button onClick={() => setDeleteCustomConfirm(activeCustomTemplate.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white text-rose-500 border border-rose-200 rounded-lg text-[11px] font-bold hover:bg-rose-50 transition-colors">
              <Trash2 className="w-3 h-3" /> ลบ Template
            </button>
          </div>
        </div>
      )}

      {/* ===== MODALS ===== */}

      {/* Slot Form Modal */}
      {isAddingSlot && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsAddingSlot(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">{editingSlot ? 'แก้ไข Slot' : 'เพิ่ม Slot ใหม่'}</h3>
              <button onClick={() => setIsAddingSlot(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="p-4 space-y-4">
              {/* Duration */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500">ระยะเวลา</label>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => setSlotForm(f => {
                    const newDur = Math.max(15, f.duration - 15);
                    return { ...f, duration: newDur, endTime: addMinutesToTime(f.startTime, newDur) };
                  })} className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 font-bold text-lg hover:bg-slate-200 transition-colors">−</button>
                  <span className="text-2xl font-black text-slate-700 w-24 text-center">{formatDuration(slotForm.duration)}</span>
                  <button onClick={() => setSlotForm(f => {
                    const newDur = Math.min(480, f.duration + 15);
                    return { ...f, duration: newDur, endTime: addMinutesToTime(f.startTime, newDur) };
                  })} className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 font-bold text-lg hover:bg-slate-200 transition-colors">+</button>
                </div>
                <div className="flex gap-1 justify-center">
                  {[30, 60, 90, 120, 180].map(d => (
                    <button key={d} onClick={() => setSlotForm(f => ({ ...f, duration: d, endTime: addMinutesToTime(f.startTime, d) }))}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${slotForm.duration === d ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      {formatDuration(d)}
                    </button>
                  ))}
                </div>
              </div>
              {/* Start time */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-slate-500 w-16">เริ่ม</span>
                <TimePicker value={slotForm.startTime} onChange={(v) => setSlotForm(f => ({ ...f, startTime: v, endTime: addMinutesToTime(v, f.duration) }))} />
              </div>
              {/* End time (read-only) */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-slate-500 w-16">สิ้นสุด</span>
                <span className="text-sm font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg">{slotForm.endTime}</span>
              </div>
              {/* Category selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500">หมวดหมู่</label>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_CATEGORIES.map(cat => {
                    const isSelected = slotForm.groupKey === cat.key;
                    return (
                      <button key={cat.key} onClick={() => setSlotForm(f => ({ ...f, groupKey: cat.key }))}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                          isSelected ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 ring-offset-1' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}>
                        <span>{cat.emoji}</span> {cat.label}
                      </button>
                    );
                  })}
                  {/* Uncategorized groups */}
                  {taskGroups.filter(g => !g.categoryKey).map(g => {
                    const isSelected = slotForm.groupKey === g.key;
                    const gc = GROUP_COLORS[g.color] || GROUP_COLORS.orange;
                    return (
                      <button key={g.key} onClick={() => setSlotForm(f => ({ ...f, groupKey: g.key }))}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                          isSelected ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 ring-offset-1' : `${gc.bg} ${gc.text} border ${gc.border}`
                        }`}>
                        <span>{g.emoji}</span> {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex border-t border-slate-100">
              <button onClick={() => setIsAddingSlot(false)} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors">ยกเลิก</button>
              <button onClick={saveSlot} disabled={!slotForm.groupKey} className="flex-1 py-3 text-sm font-bold text-emerald-600 hover:bg-emerald-50 transition-colors border-l border-slate-100 disabled:opacity-40">
                {editingSlot ? 'บันทึก' : 'เพิ่ม'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirm */}
      {confirmClearAll && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirmClearAll(false)}>
          <div className="bg-white rounded-2xl max-w-xs w-full shadow-2xl p-5 text-center space-y-3" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto"><Trash2 className="w-6 h-6 text-rose-500" /></div>
            <h3 className="font-black text-base text-slate-800">เคลียร์ Slot ทั้งหมด?</h3>
            <p className="text-xs text-slate-400">ทุก slot ใน {isDayTab ? `วัน${dayNames[activeDayOfWeek]}` : activeCustomTemplate?.name} จะถูกลบ</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setConfirmClearAll(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">ยกเลิก</button>
              <button onClick={() => {
                if (isDayTab) {
                  const dow = parseInt(activeTab);
                  setScheduleTemplates(prev => {
                    const newDayPlans = { ...(prev.dayPlans || {}) };
                    newDayPlans[String(dow)] = [];
                    const newDayOverrides = { ...(prev.dayOverrides || {}) };
                    delete newDayOverrides[String(dow)];
                    return { ...prev, dayPlans: newDayPlans, dayOverrides: newDayOverrides };
                  });
                } else {
                  setScheduleTemplates(prev => ({
                    ...prev,
                    customTemplates: (prev.customTemplates || []).map(t =>
                      t.id === activeTab ? { ...t, slots: [] } : t
                    ),
                  }));
                }
                setScheduleDirty(true);
                setConfirmClearAll(false);
              }} className="flex-1 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition-colors">เคลียร์เลย</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Slot Confirm */}
      {confirmDeleteSlotId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirmDeleteSlotId(null)}>
          <div className="bg-white rounded-2xl max-w-xs w-full shadow-2xl p-5 text-center space-y-3" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto"><Trash2 className="w-6 h-6 text-rose-500" /></div>
            <h3 className="font-black text-base text-slate-800">ลบ Slot นี้?</h3>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setConfirmDeleteSlotId(null)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">ยกเลิก</button>
              <button onClick={confirmDeleteSlot} className="flex-1 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold">ลบเลย</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Template Picker (for day tabs) */}
      {showCustomPicker && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCustomPicker(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">เลือก Custom Template</h3>
              <button onClick={() => setShowCustomPicker(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="p-2 space-y-1 max-h-[50vh] overflow-y-auto">
              {customTemplates.map(t => (
                <button key={t.id} onClick={() => {
                  setScheduleTemplates(prev => ({
                    ...prev,
                    dayOverrides: { ...(prev.dayOverrides || {}), [String(activeDayOfWeek)]: t.id },
                  }));
                  setScheduleDirty(true);
                  setShowCustomPicker(false);
                }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-violet-50 rounded-xl transition-colors">
                  <span className="text-xl">{t.emoji}</span>
                  <div className="text-left flex-1">
                    <p className="text-xs font-bold text-slate-700">{t.name}</p>
                    <p className="text-[10px] text-slate-400">{t.slots.length} slots</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Custom Template Form Modal */}
      {customFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { setCustomFormOpen(false); setSaveAsCustomSlots(null); }}>
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800">{editingCustomId ? 'แก้ไข Template' : 'สร้าง Template ใหม่'}</h3>
              {saveAsCustomSlots && <p className="text-[10px] text-violet-500 font-bold mt-1">📋 จะคัดลอก {saveAsCustomSlots.length} slots จากตารางปัจจุบัน</p>}
            </div>
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={customForm.name}
                onChange={e => setCustomForm(f => ({ ...f, name: e.target.value }))}
                placeholder="ชื่อ Template เช่น วันขี้เกียจ"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-300 focus:border-violet-300"
                autoFocus
              />
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">Emoji</label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_OPTIONS.map(e => (
                    <button key={e} onClick={() => setCustomForm(f => ({ ...f, emoji: e }))}
                      className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                        customForm.emoji === e ? 'bg-violet-100 ring-2 ring-violet-400 scale-110' : 'bg-slate-50 hover:bg-slate-100'
                      }`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex border-t border-slate-100">
              <button onClick={() => { setCustomFormOpen(false); setSaveAsCustomSlots(null); }} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors">ยกเลิก</button>
              <button onClick={saveCustomTemplate} disabled={!customForm.name.trim()} className="flex-1 py-3 text-sm font-bold text-violet-600 hover:bg-violet-50 transition-colors border-l border-slate-100 disabled:opacity-40">
                {editingCustomId ? 'บันทึก' : 'สร้าง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Custom Template Confirm */}
      {deleteCustomConfirm && (() => {
        const ct = customTemplates.find(t => t.id === deleteCustomConfirm);
        return (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteCustomConfirm(null)}>
            <div className="bg-white rounded-2xl max-w-xs w-full shadow-2xl p-5 text-center space-y-3" onClick={e => e.stopPropagation()}>
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto"><Trash2 className="w-6 h-6 text-rose-500" /></div>
              <h3 className="font-black text-base text-slate-800">ลบ "{ct?.name}"?</h3>
              <p className="text-xs text-slate-400">Slot ทั้งหมดใน template นี้จะถูกลบด้วย</p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setDeleteCustomConfirm(null)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">ยกเลิก</button>
                <button onClick={() => deleteCustomTemplate(deleteCustomConfirm)} className="flex-1 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold">ลบเลย</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Unsaved Warning */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xs w-full shadow-2xl p-5 text-center space-y-3">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto"><AlertTriangle className="w-6 h-6 text-amber-500" /></div>
            <h3 className="font-black text-base text-slate-800">มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก</h3>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowUnsavedWarning(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">ยกเลิก</button>
              <button onClick={confirmDiscardAndSwitch} className="flex-1 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold">ไม่บันทึก</button>
              <button onClick={saveAndSwitch} className="flex-1 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold">บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateSettings;
