
import React, { useState, useEffect, useCallback } from 'react';
import { Task, TaskGroup, Milestone, TimeSlot, DayType, ScheduleTemplates, GROUP_COLORS, DailyRecord, getTasksForDate, getDayType } from '../types';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Plus, Pencil, Trash2, X, ChevronDown } from 'lucide-react';
import TimePicker from './TimePicker';

const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const TAB_CONFIG: { key: DayType; label: string; emoji: string }[] = [
  { key: 'workday',  label: 'จันทร์-ศุกร์',    emoji: '💼' },
  { key: 'saturday', label: 'วันเสาร์',        emoji: '🌴' },
  { key: 'sunday',   label: 'อาทิตย์/วันหยุด', emoji: '☀️' },
];

function getDurationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}ชม. ${m}น.`;
  if (h > 0) return `${h}ชม.`;
  return `${m}น.`;
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
}

/** Get tasks matching a slot's groupKey for a given date */
function getTasksForSlot(tasks: Task[], date: string, groupKey: string): Task[] {
  return getTasksForDate(tasks, date)
    .filter(t => t.category === groupKey)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

const DailyPlanner: React.FC<DailyPlannerProps> = ({
  tasks, setTasks, taskGroups, milestones, scheduleTemplates, setScheduleTemplates, todayRecords = [], onSaveDailyRecord,
  deletedDefaultTaskIds = [], setDeletedDefaultTaskIds, onImmediateSave,
}) => {
  // Date navigation
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDateStr === todayStr;

  const dateLabel = `${dayNames[selectedDate.getDay()]} ${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear() + 543}`;

  const prevDay = () => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
  const nextDay = () => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });
  const goToday = () => setSelectedDate(new Date());

  // Day type detection & active tab
  const autoDayType = getDayType(selectedDate);
  const [activeTab, setActiveTab] = useState<DayType>(autoDayType);

  // Auto-switch tab when date changes
  useEffect(() => {
    setActiveTab(getDayType(selectedDate));
  }, [selectedDate]);

  // Derive active schedule from template
  const schedule = scheduleTemplates[activeTab] || [];

  // Standalone task IDs that should be displayed as slots (routine tasks)
  const standaloneTaskIds = ['d-1', 'd-2', 'd-3', 'd-16', 'd-17', 'd-18', 'd-21', 'd-22']; // wake up, meals, meditation, family time, rest

  // Get standalone tasks for the selected date
  const standaloneTasks = getTasksForDate(tasks, selectedDateStr).filter(t => standaloneTaskIds.includes(t.id));

  // Convert standalone tasks to TimeSlots
  const standaloneSlots: TimeSlot[] = standaloneTasks.map(t => ({
    id: `task-slot-${t.id}`,
    startTime: t.startTime,
    endTime: t.endTime,
    groupKey: t.category,
  }));

  // Merge template schedule with standalone task slots and sort by time
  const mergedSchedule = [...schedule, ...standaloneSlots].sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Wrapper to update only the active tab's template
  const setScheduleForTab = useCallback((updater: (prev: TimeSlot[]) => TimeSlot[]) => {
    setScheduleTemplates(prev => ({
      ...prev,
      [activeTab]: updater(prev[activeTab] || []),
    }));
  }, [activeTab, setScheduleTemplates]);

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
  const [taskEditForm, setTaskEditForm] = useState({ startTime: '', endTime: '' });
  const [slotForm, setSlotForm] = useState({ startTime: '09:00', endTime: '10:00', groupKey: '' });

  // Delete confirmation
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(null);
  const [confirmDeleteSlotId, setConfirmDeleteSlotId] = useState<string | null>(null);

  // Sorted schedule (filter out malformed entries)
  const sortedSchedule = [...mergedSchedule]
    .filter(s => s.startTime && s.endTime && s.groupKey)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // All tasks for the day (for summary)
  const dayTasks = getTasksForDate(tasks, selectedDateStr);

  // Restore checked state from todayRecords
  useEffect(() => {
    if (!isToday || todayRecords.length === 0) return;
    const checked = new Set<string>();
    todayRecords.forEach(r => {
      const matchTask = dayTasks.find(t => t.title === r.taskTitle && t.startTime === r.timeStart);
      if (matchTask) checked.add(matchTask.id);
    });
    if (checked.size > 0) setCheckedTasks(checked);
  }, [todayRecords]);

  // Auto-expand current slot
  useEffect(() => {
    if (!isToday) return;
    const currentSlot = sortedSchedule.find(s => {
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      return nowMinutes >= sh * 60 + sm && nowMinutes < eh * 60 + em;
    });
    if (currentSlot) {
      setExpandedSlots(prev => new Set(prev).add(currentSlot.id));
    }
  }, [isToday, activeTab]);

  // Toggle check
  const toggleCheck = useCallback((taskId: string) => {
    if (!isToday) return;
    setCheckedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
        if (onSaveDailyRecord) {
          const task = dayTasks.find(t => t.id === taskId);
          if (task) {
            onSaveDailyRecord({
              id: `${todayStr}-${task.id}`,
              date: todayStr,
              taskTitle: task.title,
              category: task.category,
              completed: true,
              completedAt: new Date().toISOString(),
              timeStart: task.startTime,
              timeEnd: task.endTime,
            });
          }
        }
      }
      return next;
    });
  }, [isToday, dayTasks, todayStr, onSaveDailyRecord]);

  // Slot CRUD
  const openAddSlot = () => {
    setSlotForm({ startTime: '09:00', endTime: '10:00', groupKey: taskGroups[0]?.key || '' });
    setEditingSlot(null);
    setIsAddingSlot(true);
  };

  const openEditSlot = (slot: TimeSlot) => {
    setSlotForm({ startTime: slot.startTime, endTime: slot.endTime, groupKey: slot.groupKey });
    setEditingSlot(slot);
    setIsAddingSlot(true);
  };

  const saveSlot = () => {
    if (!slotForm.groupKey || !slotForm.startTime || !slotForm.endTime) return;
    if (editingSlot) {
      setScheduleForTab(prev => prev.map(s => s.id === editingSlot.id ? { ...s, ...slotForm } : s));
    } else {
      const newSlot: TimeSlot = {
        id: `${activeTab}-${Date.now()}`,
        startTime: slotForm.startTime,
        endTime: slotForm.endTime,
        groupKey: slotForm.groupKey,
      };
      setScheduleForTab(prev => [...prev, newSlot]);
    }
    setIsAddingSlot(false);
    setEditingSlot(null);
  };

  const showDeleteTaskConfirm = (taskId: string) => {
    setConfirmDeleteTaskId(taskId);
  };

  const confirmDeleteTask = async () => {
    if (!confirmDeleteTaskId || !setTasks) return;

    const taskId = confirmDeleteTaskId;
    const updatedTasks = tasks.filter(t => t.id !== taskId);

    // If deleting a default task (id starts with 'd-'), track it
    let updatedDeletedIds = deletedDefaultTaskIds;
    if (taskId.startsWith('d-') && !deletedDefaultTaskIds.includes(taskId) && setDeletedDefaultTaskIds) {
      updatedDeletedIds = [...deletedDefaultTaskIds, taskId];
      setDeletedDefaultTaskIds(updatedDeletedIds);
    }

    setTasks(updatedTasks);
    setConfirmDeleteTaskId(null);

    // Save to Firestore immediately to prevent the task from coming back
    if (onImmediateSave) {
      await onImmediateSave(updatedTasks, updatedDeletedIds);
    }
  };

  const showDeleteSlotConfirm = (slotId: string) => {
    setConfirmDeleteSlotId(slotId);
  };

  const confirmDeleteSlot = () => {
    if (!confirmDeleteSlotId) return;

    const slotId = confirmDeleteSlotId;

    // Check if this is a standalone task slot (from default tasks)
    if (slotId.startsWith('task-slot-')) {
      const taskId = slotId.replace('task-slot-', '');
      // Delete the underlying task instead
      setConfirmDeleteSlotId(null);
      showDeleteTaskConfirm(taskId);
    } else {
      // Delete from schedule template
      setScheduleForTab(prev => prev.filter(s => s.id !== slotId));
      setConfirmDeleteSlotId(null);
    }
  };

  // Task editing handlers
  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskEditForm({ startTime: task.startTime, endTime: task.endTime });
  };

  const saveTaskEdit = () => {
    if (!editingTask || !setTasks) return;
    if (!taskEditForm.startTime || !taskEditForm.endTime) return;

    setTasks(prev => prev.map(t =>
      t.id === editingTask.id
        ? { ...t, startTime: taskEditForm.startTime, endTime: taskEditForm.endTime }
        : t
    ));
    setEditingTask(null);
  };

  const closeTaskEdit = () => {
    setEditingTask(null);
  };

  // Summary: time per group from schedule slots
  const groupMap = new Map<string, TaskGroup>(taskGroups.map(g => [g.key, g]));
  const summaryMap = new Map<string, { totalMins: number; doneMins: number }>();

  sortedSchedule.forEach(slot => {
    const slotMins = Math.max(0, getDurationMinutes(slot.startTime, slot.endTime));
    const prev = summaryMap.get(slot.groupKey) || { totalMins: 0, doneMins: 0 };
    const slotTasks = getTasksForSlot(tasks, selectedDateStr, slot.groupKey);
    const doneMins = slotTasks
      .filter(t => checkedTasks.has(t.id))
      .reduce((s, t) => s + Math.max(0, getDurationMinutes(t.startTime, t.endTime)), 0);
    summaryMap.set(slot.groupKey, { totalMins: prev.totalMins + slotMins, doneMins: prev.doneMins + doneMins });
  });

  const slotSummary: { key: string; label: string; emoji: string; color: string; totalMins: number; doneMins: number }[] = [];
  summaryMap.forEach((val, key) => {
    const g = groupMap.get(key);
    if (g) slotSummary.push({ key, label: g.label, emoji: g.emoji, color: g.color, ...val });
  });

  const totalAllMins = slotSummary.reduce((s, c) => s + c.totalMins, 0);
  const doneAllMins = slotSummary.reduce((s, c) => s + c.doneMins, 0);
  const progressPct = totalAllMins > 0 ? Math.round((doneAllMins / totalAllMins) * 100) : 0;

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
      {/* Date Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button onClick={prevDay} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={goToday} className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${isToday ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-emerald-100'}`}>
            วันนี้
          </button>
          <button onClick={nextDay} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <span className="text-sm font-bold text-slate-700">{dateLabel}</span>
      </div>

      {/* Schedule Template Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-1 flex gap-1">
        {TAB_CONFIG.map(tab => {
          const isActive = activeTab === tab.key;
          const isAutoMatch = autoDayType === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              <span>{tab.emoji}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.key === 'workday' ? 'จ-ศ' : tab.key === 'saturday' ? 'ส.' : 'อา.'}</span>
              {isAutoMatch && !isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Progress (today only) */}
      {isToday && dayTasks.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">ความคืบหน้าวันนี้</span>
            <span className="text-xs font-black text-emerald-600">{progressPct}%</span>
          </div>
          <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        {/* Left: Slot Timeline */}
        <div className="flex-[2] space-y-2">
          {timeline.map((item) => {
            if (item.type === 'milestone') {
              const ms = item.data as Milestone;
              return (
                <div key={`ms-${ms.id}`} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${ms.color}`}>
                  <span>{ms.emoji}</span>
                  <span>{ms.time}</span>
                  <span className="opacity-70">{ms.title}</span>
                </div>
              );
            }

            const slot = item.data as TimeSlot;
            const group = groupMap.get(slot.groupKey);
            const colors = GROUP_COLORS[group?.color || 'orange'] || GROUP_COLORS.orange;
            const slotTasks = getTasksForSlot(tasks, selectedDateStr, slot.groupKey);
            const checkedCount = slotTasks.filter(t => checkedTasks.has(t.id)).length;
            const slotDur = getDurationMinutes(slot.startTime, slot.endTime);
            const isExpanded = expandedSlots.has(slot.id);

            const [ssh, ssm] = slot.startTime.split(':').map(Number);
            const [seh, sem] = slot.endTime.split(':').map(Number);
            const slotStartMin = ssh * 60 + ssm;
            const slotEndMin = seh * 60 + sem;
            const isCurrentSlot = isToday && nowMinutes >= slotStartMin && nowMinutes < slotEndMin;

            return (
              <div
                key={slot.id}
                className={`bg-white rounded-xl border overflow-hidden transition-all ${
                  isCurrentSlot ? 'ring-2 ring-emerald-400 ring-offset-1' : ''
                } ${colors.plannerBorder}`}
              >
                {/* Slot Header */}
                <div
                  onClick={() => toggleSlot(slot.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none ${colors.plannerBg}`}
                >
                  <span className="text-xs font-black text-slate-500">{slot.startTime}–{slot.endTime}</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                  <span className={`text-xs font-black ${colors.plannerText}`}>
                    {group?.emoji} {group?.label || slot.groupKey}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {slotDur > 0 && formatDuration(slotDur)}
                  </span>
                  <div className="flex-1" />
                  {slotTasks.length > 0 && (
                    <span className={`text-[10px] font-black ${colors.plannerText} opacity-60`}>
                      {checkedCount}/{slotTasks.length}
                    </span>
                  )}
                  {isCurrentSlot && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditSlot(slot); }}
                    className="p-1 rounded hover:bg-white/60 text-slate-400 hover:text-slate-600"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); showDeleteSlotConfirm(slot.id); }}
                    className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                {/* Expanded Task List */}
                {isExpanded && (
                  <div className="border-t px-3 py-2 space-y-1" style={{ borderColor: 'inherit' }}>
                    {slotTasks.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-1">ไม่มี Task ในกลุ่มนี้</p>
                    ) : (
                      slotTasks.map(task => {
                        const checked = checkedTasks.has(task.id);
                        const dur = getDurationMinutes(task.startTime, task.endTime);
                        const [tsh, tsm] = task.startTime.split(':').map(Number);
                        const taskStart = tsh * 60 + tsm;
                        const [teh, tem] = task.endTime.split(':').map(Number);
                        const taskEnd = teh * 60 + tem;
                        const isNow = isToday && nowMinutes >= taskStart && nowMinutes < taskEnd;

                        return (
                          <div
                            key={task.id}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all hover:bg-slate-50 ${
                              checked ? 'opacity-40' : ''
                            } ${isNow ? 'bg-emerald-50' : ''}`}
                          >
                            <div
                              onClick={() => toggleCheck(task.id)}
                              className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                            >
                              <div className="shrink-0">
                                {checked
                                  ? <CheckCircle2 className={`w-4 h-4 ${colors.plannerText}`} />
                                  : <Circle className={`w-4 h-4 ${colors.plannerText} opacity-30`} />
                                }
                              </div>
                              <span className={`text-[13px] font-bold flex-1 min-w-0 truncate ${checked ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                {task.title}
                              </span>
                            </div>
                            {task.recurring === 'daily' && (
                              <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-1 rounded shrink-0">ทุกวัน</span>
                            )}
                            <span className="text-[10px] font-bold text-blue-500 shrink-0">{task.startTime}–{task.endTime}</span>
                            {dur > 0 && <span className="text-[9px] text-slate-400 font-bold shrink-0">{formatDuration(dur)}</span>}
                            {isNow && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
                            {setTasks && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); openEditTask(task); }}
                                  className="p-1 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 shrink-0"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); showDeleteTaskConfirm(task.id); }}
                                  className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-500 shrink-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Slot Button */}
          <button
            onClick={openAddSlot}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-500 hover:bg-emerald-50/50 transition-all text-xs font-bold"
          >
            <Plus className="w-4 h-4" /> เพิ่ม Slot
          </button>
        </div>

        {/* Right: Summary */}
        <div className="flex-1 space-y-3">
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
                        <span className="text-[10px] font-black text-slate-400">{formatDuration(c.totalMins)}</span>
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
        </div>
      </div>

      {/* Slot Editor Modal */}
      {isAddingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setIsAddingSlot(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">
                {editingSlot ? 'แก้ไข Slot' : 'เพิ่ม Slot ใหม่'}
              </h3>
              <button onClick={() => setIsAddingSlot(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Time inputs */}
            <div className="flex gap-3">
              <TimePicker
                label="เริ่ม"
                value={slotForm.startTime}
                onChange={value => setSlotForm(f => ({ ...f, startTime: value }))}
                className="flex-1"
              />
              <TimePicker
                label="จบ"
                value={slotForm.endTime}
                onChange={value => setSlotForm(f => ({ ...f, endTime: value }))}
                className="flex-1"
              />
            </div>

            {/* Group selector */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ประเภทกิจกรรม</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {taskGroups.map(g => {
                  const clr = GROUP_COLORS[g.color] || GROUP_COLORS.orange;
                  const isActive = slotForm.groupKey === g.key;
                  return (
                    <button
                      key={g.key}
                      onClick={() => setSlotForm(f => ({ ...f, groupKey: g.key }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        isActive
                          ? `${clr.bg} ${clr.border} ${clr.text} ring-2 ${clr.ring}`
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {g.emoji} {g.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
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

      {/* Task Time Editor Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={closeTaskEdit}>
          <div className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">แก้ไขเวลา Task</h3>
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

            {/* Time inputs */}
            <div className="flex gap-3">
              <TimePicker
                label="เวลาเริ่ม"
                value={taskEditForm.startTime}
                onChange={value => setTaskEditForm(f => ({ ...f, startTime: value }))}
                className="flex-1"
              />
              <TimePicker
                label="เวลาจบ"
                value={taskEditForm.endTime}
                onChange={value => setTaskEditForm(f => ({ ...f, endTime: value }))}
                className="flex-1"
              />
            </div>

            {/* Duration display */}
            {taskEditForm.startTime && taskEditForm.endTime && (
              <div className="text-center text-xs text-slate-500">
                ระยะเวลา: <span className="font-bold text-emerald-600">
                  {formatDuration(getDurationMinutes(taskEditForm.startTime, taskEditForm.endTime))}
                </span>
              </div>
            )}

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
                disabled={!taskEditForm.startTime || !taskEditForm.endTime}
                className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors disabled:opacity-40"
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
            <h3 className="text-lg font-black text-slate-800 mb-2">ยืนยันการลบ Task</h3>
            <p className="text-sm text-slate-600 mb-6">คุณแน่ใจหรือไม่ว่าต้องการลบ task นี้?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteTaskId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDeleteTask}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm rounded-xl transition-colors"
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default DailyPlanner;
