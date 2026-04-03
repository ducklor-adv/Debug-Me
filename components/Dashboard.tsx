import React, { useState, useRef, useEffect } from 'react';
import { Task, SubTask, TaskAttachment, TaskGroup, GROUP_COLORS, getTasksForDate, ScheduleTemplates, TimeSlot, DailyRecord, DEFAULT_CATEGORIES, Category, isTaskRecurring, FocusSession, getScheduleForDay, Expense, EXPENSE_CATEGORIES, resolveSlotTimes } from '../types';
import { CheckCircle2, Circle, Clock, Camera, Mic, Video, Phone, User as UserIcon, MapPin, Edit3, X, Trash2, Square, Image, Coffee, Brain, Play, Pause, RotateCcw, Volume2, VolumeX, AlertTriangle, Plus, RefreshCw, ChevronDown, Wallet, ChevronUp } from 'lucide-react';

interface DashboardProps {
  tasks: Task[];
  taskGroups: TaskGroup[];
  scheduleTemplates: ScheduleTemplates;
  todayRecords?: DailyRecord[];
  onSaveDailyRecord?: (record: DailyRecord) => void;
  onTaskComplete?: (taskId: string, completed: boolean) => void;
  onSaveFocusSession?: (session: FocusSession) => void;
  onNavigateToPlanner?: (startTime: string, endTime: string) => void;
  onNavigateToGroup?: (groupKey: string) => void;
  expenses?: Expense[];
}

const Dashboard: React.FC<DashboardProps> = ({ tasks, taskGroups, scheduleTemplates, todayRecords = [], onSaveDailyRecord, onTaskComplete, onSaveFocusSession, onNavigateToPlanner, onNavigateToGroup, expenses = [] }) => {
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [showEditView, setShowEditView] = useState(false);
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [showContactInput, setShowContactInput] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');
  const [contactValue, setContactValue] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [skipMode, setSkipMode] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Track which tasks are checked today (restored from DailyRecords)
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set());

  // Expand/collapse for remaining slots
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());
  const toggleSlot = (id: string) => {
    setExpandedSlots(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Focus Timer
  const [showFocus, setShowFocus] = useState(false);
  const [focusMode, setFocusMode] = useState<'focus' | 'break'>('focus');
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const focusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [showFocusPicker, setShowFocusPicker] = useState(false);
  const [showWeeklyBills, setShowWeeklyBills] = useState(false);
  const [popupGroup, setPopupGroup] = useState<string | null>(null);

  const focusStartedAtRef = useRef<string | null>(null);

  useEffect(() => {
    if (focusRunning && focusSeconds > 0) {
      if (!focusStartedAtRef.current) {
        focusStartedAtRef.current = new Date().toISOString();
      }
      focusIntervalRef.current = setInterval(() => {
        setFocusSeconds(prev => {
          if (prev <= 1) {
            setFocusRunning(false);
            if (soundOn) {
              try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczHjqIt9jNdUQtQYS11c16Ri5ChrPTzX1IMEKD').play(); } catch {}
            }
            // Save focus session on completion
            if (onSaveFocusSession) {
              const planned = focusMode === 'focus' ? 25 * 60 : 5 * 60;
              const focusedTask = focusTaskId ? todayTasks.find(t => t.id === focusTaskId) : undefined;
              onSaveFocusSession({
                id: `focus-${Date.now()}`,
                date: todayStr,
                taskId: focusedTask?.id,
                taskTitle: focusedTask?.title,
                category: focusedTask?.category,
                mode: focusMode,
                durationPlanned: planned,
                durationActual: planned,
                completed: true,
                startedAt: focusStartedAtRef.current || new Date().toISOString(),
                completedAt: new Date().toISOString(),
                slotStart: currentSlot?.startTime,
                slotEnd: currentSlot?.endTime,
              });
            }
            focusStartedAtRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (focusIntervalRef.current) clearInterval(focusIntervalRef.current); };
  }, [focusRunning, focusSeconds, soundOn]);

  const focusReset = () => {
    setFocusRunning(false);
    setFocusSeconds(focusMode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const switchFocusMode = (mode: 'focus' | 'break') => {
    setFocusMode(mode);
    setFocusRunning(false);
    setFocusSeconds(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  // Start focus for a specific task
  const startFocusForTask = (taskId: string) => {
    setFocusTaskId(taskId);
    setShowFocusPicker(false);
    setShowFocus(true);
  };

  // Handle Focus button click — if multiple tasks in slot, show picker
  const handleFocusClick = (taskId?: string) => {
    if (taskId) {
      startFocusForTask(taskId);
      return;
    }
    // No specific task — check how many undone tasks in current slot
    const undoneTasks = slotTasks.filter(t => !checkedTasks.has(t.id));
    if (undoneTasks.length === 0) {
      setFocusTaskId(null);
      setShowFocus(true);
    } else if (undoneTasks.length === 1) {
      startFocusForTask(undoneTasks[0].id);
    } else {
      setShowFocusPicker(true);
    }
  };

  // Stop focus & save partial session
  const stopFocusAndSave = () => {
    if (onSaveFocusSession && focusStartedAtRef.current && focusMode === 'focus') {
      const planned = 25 * 60;
      const actual = planned - focusSeconds;
      if (actual > 30) { // Only save if focused > 30 seconds
        const focusedTask = focusTaskId ? todayTasks.find(t => t.id === focusTaskId) : undefined;
        onSaveFocusSession({
          id: `focus-${Date.now()}`,
          date: todayStr,
          taskId: focusedTask?.id,
          taskTitle: focusedTask?.title,
          category: focusedTask?.category,
          mode: 'focus',
          durationPlanned: planned,
          durationActual: actual,
          completed: false,
          startedAt: focusStartedAtRef.current,
          completedAt: new Date().toISOString(),
          slotStart: currentSlot?.startTime,
          slotEnd: currentSlot?.endTime,
        });
      }
    }
    setFocusRunning(false);
    setFocusSeconds(focusMode === 'focus' ? 25 * 60 : 5 * 60);
    focusStartedAtRef.current = null;
    setShowFocus(false);
    setFocusTaskId(null);
  };


  const focusMM = Math.floor(focusSeconds / 60).toString().padStart(2, '0');
  const focusSS = (focusSeconds % 60).toString().padStart(2, '0');

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const completedTasksCount = checkedTasks.size;

  // Countdown timer tick
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Today's tasks
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = getTasksForDate(tasks, todayStr);
  const focusedTaskObj = focusTaskId ? todayTasks.find(t => t.id === focusTaskId) : undefined;

  // Today's appointments (นัดหมาย) — only those with startDate set to today
  const todayAppointments = tasks
    .filter((t: Task) => t.category === 'นัดหมาย' && !t.completed && t.startDate === todayStr)
    .sort((a: Task, b: Task) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));

  // Restore checked state from todayRecords — run only ONCE on initial load
  const hasRestoredChecks = useRef(false);
  useEffect(() => {
    if (hasRestoredChecks.current) return;
    if (todayRecords.length === 0) return;
    hasRestoredChecks.current = true;
    const checked = new Set<string>();
    todayRecords.forEach(r => {
      if (!r.timeStart || !r.timeEnd) return;
      // Prefer taskId match (new records), fallback to title+category (old records)
      const matchTask = r.taskId
        ? todayTasks.find(t => t.id === r.taskId)
        : todayTasks.find(t => t.title === r.taskTitle && t.category === r.category);
      if (!matchTask) return;
      const matchSlot = todaySlots.find(s =>
        s.startTime === r.timeStart && s.endTime === r.timeEnd
      );
      if (matchSlot) checked.add(matchTask.id);
    });
    setCheckedTasks(checked);
  }, [todayRecords]);

  // Toggle task check — create DailyRecord + update local checked state
  const toggleCheck = (taskId: string, slotStart?: string, slotEnd?: string) => {
    setCheckedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
        const task = todayTasks.find(t => t.id === taskId);
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
          if (onTaskComplete && !isTaskRecurring(task)) {
            onTaskComplete(task.id, true);
          }
        }
      }
      return next;
    });
  };

  // Current time
  const now = new Date(tick);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowSec = now.getSeconds();

  // --- Slot-based logic ---
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

  // Get today's schedule slots (respects dayOverrides & dateOverrides)
  const todaySchedule = getScheduleForDay(scheduleTemplates, now.getDay(), todayStr);
  const rawSlots = (todaySchedule.slots || []).filter(s => s.type !== 'free');
  const todaySlots = resolveSlotTimes(rawSlots, todaySchedule.wakeTime || '05:00', todaySchedule.sleepTime || '22:00')
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Find current slot (handles midnight-crossing slots like 22:00-05:00)
  const currentSlot = todaySlots.find(s => {
    const start = toMin(s.startTime);
    const end = toMin(s.endTime);
    if (end > start) return nowMin >= start && nowMin < end;
    // Crosses midnight: e.g. 22:00-05:00
    return nowMin >= start || nowMin < end;
  });

  // Maps for resolving slot groupKey (can be a category key or a group key)
  const groupMap = new Map<string, TaskGroup>(taskGroups.map(g => [g.key, g]));
  const categoryMap = new Map<string, Category>(DEFAULT_CATEGORIES.map(c => [c.key, c]));
  const categoryColorMap: Record<string, string> = { break: 'cyan', sleep: 'indigo' };
  const resolveSlotInfo = (key: string): { label: string; emoji: string; color: string } => {
    const cat = categoryMap.get(key);
    if (cat) {
      const firstGroup = taskGroups.find(g => g.categoryKey === key);
      return { label: cat.label, emoji: cat.emoji, color: firstGroup?.color || categoryColorMap[key] || 'orange' };
    }
    const g = groupMap.get(key);
    if (g) return { label: g.label, emoji: g.emoji, color: g.color };
    return { label: key, emoji: '', color: 'orange' };
  };
  const getSlotColor = (s: TimeSlot) => GROUP_COLORS[resolveSlotInfo(s.groupKey).color] || GROUP_COLORS.orange;

  // Full tasks for slot: explicitly assigned + auto-matched appointments
  const getFullTasksForSlot = (slot: TimeSlot): Task[] => {
    const assigned = slot.assignedTaskIds || [];
    const excludedIds = new Set(slot.excludedTaskIds || []);
    const manualTasks = assigned
      .map(id => tasks.find(t => t.id === id))
      .filter((t): t is Task => t !== undefined && !excludedIds.has(t.id));

    // Auto-include appointment tasks whose startTime falls in this slot
    const slotStart = toMin(slot.startTime);
    const slotEnd = toMin(slot.endTime);
    const manualIds = new Set(manualTasks.map(t => t.id));
    const autoTasks = todayAppointments.filter(t => {
      if (!t.startTime || excludedIds.has(t.id) || manualIds.has(t.id)) return false;
      const tMin = toMin(t.startTime);
      if (slotEnd > slotStart) return tMin >= slotStart && tMin < slotEnd;
      return tMin >= slotStart || tMin < slotEnd; // midnight crossing
    });

    return [...manualTasks, ...autoTasks];
  };

  // Tasks in current slot (assigned + auto-matched from task groups)
  const slotTasks = currentSlot ? getFullTasksForSlot(currentSlot) : [];

  // Upcoming slots (after current time, excluding current slot to prevent cross-midnight duplicates)
  const upcomingSlots = todaySlots.filter(s =>
    s.id !== currentSlot?.id && toMin(s.startTime) > nowMin
  );

  // Free slot calculation (when no current slot)
  const freeSlot = !currentSlot ? (() => {
    const h = now.getHours();
    const m = now.getMinutes();
    const startTime = `${String(h).padStart(2, '0')}:${String(m < 30 ? 0 : 30).padStart(2, '0')}`;
    const nextSlot = upcomingSlots[0];
    const endTime = nextSlot ? nextSlot.startTime : `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return { startTime, endTime };
  })() : null;

  // Slot duration in minutes
  const getSlotDur = (s: TimeSlot) => {
    let diff = toMin(s.endTime) - toMin(s.startTime);
    if (diff < 0) diff += 24 * 60; // ข้ามเที่ยงคืน
    return diff;
  };

  // Countdown for current slot (handles midnight-crossing e.g. 22:00-05:00)
  const countdownStr = (() => {
    if (!currentSlot) return '';
    let endTotalSec = toMin(currentSlot.endTime) * 60;
    const startTotalSec = toMin(currentSlot.startTime) * 60;
    const nowTotalSec = (now.getHours() * 60 + now.getMinutes()) * 60 + nowSec;
    // If slot crosses midnight, add 24h to end time
    if (endTotalSec <= startTotalSec) endTotalSec += 24 * 60 * 60;
    // If we're before midnight (nowTotalSec >= startTotalSec), use as-is
    // If we're after midnight (nowTotalSec < startTotalSec), add 24h to now too
    const adjustedNow = nowTotalSec < startTotalSec ? nowTotalSec + 24 * 60 * 60 : nowTotalSec;
    const remaining = Math.max(0, endTotalSec - adjustedNow);
    const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
    const ss = (remaining % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  })();



  const handleMarkAsDoneClick = (taskId: string) => { setActiveTaskId(taskId); setShowDoneModal(true); };
  const handleConfirmDone = () => {
    if (currentSlot && activeTaskId && !checkedTasks.has(activeTaskId)) {
      toggleCheck(activeTaskId, currentSlot.startTime, currentSlot.endTime);
    }
    setShowDoneModal(false);
    setActiveTaskId(null);
  };
  const handleSaveDetails = () => { setShowDoneModal(false); setShowEditView(true); };

  const resetEditState = () => {
    setShowEditView(false);
    setSkipMode(false);
    setActiveTaskId(null);
    setNotes('');
    setAttachments([]);
    setShowPhoneInput(false);
    setShowContactInput(false);
    setPhoneValue('');
    setContactValue('');
  };

  const handleSkipClick = (taskId: string) => { setActiveTaskId(taskId); setSkipMode(true); setShowEditView(true); };

  const handleSaveAndDone = () => {
    if (currentSlot && onSaveDailyRecord && activeTaskId) {
      const task = todayTasks.find(t => t.id === activeTaskId);
      if (task && !checkedTasks.has(activeTaskId)) {
        onSaveDailyRecord({
          id: `${todayStr}-${task.id}`,
          date: todayStr,
          taskId: task.id,
          taskTitle: task.title,
          category: task.category,
          completed: !skipMode,
          completedAt: new Date().toISOString(),
          timeStart: currentSlot.startTime,
          timeEnd: currentSlot.endTime,
          notes: notes || undefined,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
        setCheckedTasks(prev => new Set(prev).add(activeTaskId));
        // Mark non-recurring tasks as completed (only if Done, not Skip)
        if (onTaskComplete && !skipMode && !isTaskRecurring(task)) {
          onTaskComplete(task.id, true);
        }
      }
    }
    resetEditState();
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAttachments(prev => [...prev, {
      type,
      label: type === 'photo' ? `รูปภาพ: ${file.name}` : `วิดีโอ: ${file.name}`,
      value: file.name,
      preview: type === 'photo' ? url : undefined,
    }]);
    e.target.value = '';
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const n = new Date();
        const timeStr = `${n.getHours().toString().padStart(2,'0')}:${n.getMinutes().toString().padStart(2,'0')}:${n.getSeconds().toString().padStart(2,'0')}`;
        setAttachments(prev => [...prev, { type: 'audio', label: `เสียงบันทึก ${timeStr}`, value: url }]);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch { alert('ไม่สามารถเข้าถึงไมโครโฟนได้'); }
  };

  const handleStopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); };

  const handleAddPhone = () => {
    if (phoneValue.trim()) {
      setAttachments(prev => [...prev, { type: 'phone', label: `เบอร์โทร: ${phoneValue}`, value: phoneValue }]);
      setPhoneValue(''); setShowPhoneInput(false);
    }
  };

  const handleAddContact = () => {
    if (contactValue.trim()) {
      setAttachments(prev => [...prev, { type: 'contact', label: `ผู้ติดต่อ: ${contactValue}`, value: contactValue }]);
      setContactValue(''); setShowContactInput(false);
    }
  };

  const handleGetGPS = () => {
    if (!navigator.geolocation) { alert('เบราว์เซอร์ไม่รองรับ GPS'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setAttachments(prev => [...prev, { type: 'gps', label: `พิกัด: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, value: `${latitude},${longitude}` }]);
        setGpsLoading(false);
      },
      () => { alert('ไม่สามารถดึงพิกัด GPS ได้'); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="animate-fadeIn w-full min-h-full bg-emerald-50">

      {/* MODALS */}
      {showDoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-emerald-100 transform animate-fadeIn">
            <h3 className="text-xl font-bold text-slate-800 mb-2">ข้อมูลเพิ่มเติม?</h3>
            {activeTaskId && <p className="text-sm font-bold text-emerald-600 mb-2">{todayTasks.find(t => t.id === activeTaskId)?.title}</p>}
            <p className="text-sm text-blue-400 mb-6">คุณมีข้อมูลรายละเอียด, รูปภาพ, วิดีโอ หรือเสียงที่ต้องการบันทึกก่อนจะปิดกิจกรรมนี้ไหมครับ?</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleSaveDetails} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-emerald-300">
                มี, ต้องการบันทึกข้อมูล
              </button>
              <button onClick={handleConfirmDone} className="w-full py-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-semibold text-sm transition-colors">
                ไม่มี, ปิดกิจกรรมเลย
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col h-[85vh] md:h-auto animate-fadeIn">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                {skipMode ? <><AlertTriangle className="w-5 h-5 text-amber-500" /> บันทึกสาเหตุที่พลาด</> : <><Edit3 className="w-5 h-5 text-emerald-500" /> Edit & Attach Details</>}
              </h3>
              <button onClick={() => setShowEditView(false)} className="p-2 bg-blue-50 hover:bg-blue-100 rounded-full text-blue-500 transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-2 block">Notes / รายละเอียดเพิ่มเติม</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 h-28 resize-none shadow-inner" placeholder="พิมพ์รายละเอียดที่เจอมา..." />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-3 block">Quick Attachments</label>
                <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileSelect(e, 'photo')} />
                <input ref={videoInputRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => handleFileSelect(e, 'video')} />

                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => photoInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 py-4 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 text-blue-500 hover:text-emerald-600 rounded-xl border border-emerald-100 transition-all active:scale-95 shadow-sm">
                    <Camera className="w-6 h-6" /> <span className="text-[10px] font-bold">ถ่ายรูป</span>
                  </button>
                  <button onClick={isRecording ? handleStopRecording : handleStartRecording} className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-all active:scale-95 shadow-sm ${isRecording ? 'bg-rose-100 border-rose-300 text-rose-600 animate-pulse' : 'bg-slate-50 hover:bg-rose-50 hover:border-rose-200 text-blue-500 hover:text-rose-600 border-emerald-100'}`}>
                    {isRecording ? <Square className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    <span className="text-[10px] font-bold">{isRecording ? 'หยุดอัด' : 'อัดเสียง'}</span>
                  </button>
                  <button onClick={() => videoInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 py-4 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 text-blue-500 hover:text-emerald-600 rounded-xl border border-emerald-100 transition-all active:scale-95 shadow-sm">
                    <Video className="w-6 h-6" /> <span className="text-[10px] font-bold">วิดีโอ</span>
                  </button>
                  <button onClick={() => setShowPhoneInput(!showPhoneInput)} className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-all active:scale-95 shadow-sm ${showPhoneInput ? 'bg-sky-50 border-sky-300 text-sky-600' : 'bg-slate-50 hover:bg-sky-50 hover:border-sky-200 text-blue-500 hover:text-sky-600 border-emerald-100'}`}>
                    <Phone className="w-6 h-6" /> <span className="text-[10px] font-bold">เบอร์โทร</span>
                  </button>
                  <button onClick={() => setShowContactInput(!showContactInput)} className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-all active:scale-95 shadow-sm ${showContactInput ? 'bg-violet-50 border-violet-300 text-violet-600' : 'bg-slate-50 hover:bg-violet-50 hover:border-violet-200 text-blue-500 hover:text-violet-600 border-emerald-100'}`}>
                    <UserIcon className="w-6 h-6" /> <span className="text-[10px] font-bold">ผู้ติดต่อ</span>
                  </button>
                  <button onClick={handleGetGPS} disabled={gpsLoading} className={`flex flex-col items-center justify-center gap-2 py-4 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 text-blue-500 hover:text-amber-600 rounded-xl border border-emerald-100 transition-all active:scale-95 shadow-sm ${gpsLoading ? 'opacity-50' : ''}`}>
                    <MapPin className={`w-6 h-6 ${gpsLoading ? 'animate-pulse' : ''}`} /> <span className="text-[10px] font-bold">{gpsLoading ? 'กำลังหา...' : 'พิกัด GPS'}</span>
                  </button>
                </div>

                {showPhoneInput && (
                  <div className="mt-3 flex gap-2">
                    <input type="tel" value={phoneValue} onChange={(e) => setPhoneValue(e.target.value)} placeholder="0812345678" className="flex-1 bg-slate-50 border border-sky-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" onKeyDown={(e) => e.key === 'Enter' && handleAddPhone()} />
                    <button onClick={handleAddPhone} className="px-4 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-bold active:scale-95">เพิ่ม</button>
                  </div>
                )}
                {showContactInput && (
                  <div className="mt-3 flex gap-2">
                    <input type="text" value={contactValue} onChange={(e) => setContactValue(e.target.value)} placeholder="ชื่อผู้ติดต่อ" className="flex-1 bg-slate-50 border border-violet-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" onKeyDown={(e) => e.key === 'Enter' && handleAddContact()} />
                    <button onClick={handleAddContact} className="px-4 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-bold active:scale-95">เพิ่ม</button>
                  </div>
                )}
              </div>

              {attachments.length > 0 && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-3 block">ไฟล์แนบ ({attachments.length})</label>
                  <div className="space-y-2">
                    {attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${att.type === 'photo' ? 'bg-emerald-100 text-emerald-600' : att.type === 'audio' ? 'bg-rose-100 text-rose-600' : att.type === 'video' ? 'bg-emerald-100 text-emerald-600' : att.type === 'phone' ? 'bg-sky-100 text-sky-600' : att.type === 'contact' ? 'bg-violet-100 text-violet-600' : 'bg-amber-100 text-amber-600'}`}>
                          {att.type === 'photo' && <Image className="w-4 h-4" />}
                          {att.type === 'audio' && <Mic className="w-4 h-4" />}
                          {att.type === 'video' && <Video className="w-4 h-4" />}
                          {att.type === 'phone' && <Phone className="w-4 h-4" />}
                          {att.type === 'contact' && <UserIcon className="w-4 h-4" />}
                          {att.type === 'gps' && <MapPin className="w-4 h-4" />}
                        </div>
                        {att.preview && <img src={att.preview} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />}
                        {att.type === 'audio' && <audio src={att.value} controls className="h-8 flex-1 min-w-0" />}
                        <span className="text-sm text-blue-600 font-medium truncate flex-1">{att.label}</span>
                        {att.type === 'gps' && <a href={`https://maps.google.com/?q=${att.value}`} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 font-bold shrink-0">แผนที่</a>}
                        <button onClick={() => removeAttachment(i)} className="p-1.5 hover:bg-rose-50 rounded-lg text-blue-400 hover:text-rose-500 transition-colors shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
              <button onClick={resetEditState} className="px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-sm rounded-xl transition-colors">ย้อนกลับ</button>
              <button onClick={handleSaveAndDone} className={`px-5 py-3 font-semibold text-sm rounded-xl shadow-lg transition-colors ${skipMode ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-300'}`}>
                {skipMode ? 'บันทึก สาเหตุที่พลาด' : 'บันทึกข้อมูล & สำเร็จ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Focus Task Picker ===== */}
      {showFocusPicker && currentSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-indigo-100 animate-fadeIn overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-indigo-50/50">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-base">เลือก Task ที่จะ Focus</h3>
              </div>
              <button onClick={() => setShowFocusPicker(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {slotTasks.filter(t => !checkedTasks.has(t.id)).map(task => (
                <button
                  key={task.id}
                  onClick={() => startFocusForTask(task.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all active:scale-[0.98]"
                >
                  <Play className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-sm font-bold text-slate-700 truncate flex-1 text-left">{task.title}</span>
                  {task.estimatedDuration && <span className="text-[10px] font-mono text-blue-400 shrink-0">{task.estimatedDuration}น.</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== Focus Timer Popup ===== */}
      {showFocus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-emerald-100 animate-fadeIn overflow-hidden relative">
            <button onClick={() => { if (focusRunning) { stopFocusAndSave(); } else { setShowFocus(false); setFocusTaskId(null); } }} className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors z-10">
              <X className="w-4 h-4" />
            </button>

            {/* Focused task indicator */}
            {focusedTaskObj && (
              <div className="mx-6 mt-6 px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-xs font-bold text-indigo-700 truncate">{focusedTaskObj.title}</span>
                {focusRunning && <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0 ml-auto" />}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-6 pb-4">
              <button onClick={() => switchFocusMode('focus')} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${focusMode === 'focus' ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                <Brain className="w-4 h-4" /> Focus
              </button>
              <button onClick={() => switchFocusMode('break')} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${focusMode === 'break' ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                <Coffee className="w-4 h-4" /> Break
              </button>
            </div>
            <div className="text-center py-8">
              <div className="text-7xl font-black text-slate-800 tracking-tight tabular-nums">
                {focusMM}<span className="text-slate-300">:</span>{focusSS}
              </div>
              <p className={`mt-4 text-sm font-black tracking-wide ${focusMode === 'focus' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                {focusMode === 'focus'
                  ? (focusedTaskObj ? `🎯 ${focusedTaskObj.title}` : 'Deep Work')
                  : 'Break Time'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-5 pb-6">
              <button onClick={focusReset} className="w-12 h-12 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center text-slate-500 transition-all active:scale-90">
                <RotateCcw className="w-5 h-5" />
              </button>
              <button onClick={() => setFocusRunning(!focusRunning)} className="w-16 h-16 bg-indigo-500 hover:bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 transition-all active:scale-90">
                {focusRunning ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
              </button>
              <button onClick={() => setSoundOn(!soundOn)} className="w-12 h-12 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center text-slate-500 transition-all active:scale-90">
                {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>
            {/* Stop & save button when running */}
            {focusRunning && focusMode === 'focus' && (
              <div className="px-6 pb-6">
                <button onClick={stopFocusAndSave} className="w-full py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold text-sm rounded-xl transition-colors">
                  หยุด & บันทึกเวลา
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== NOW: Current Slot ===== */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-green-500 p-6 pb-8">
        <div className="max-w-lg mx-auto">
          {/* Current date & time */}
          <div className="text-center mb-4">
            <p className="text-lg font-black text-white">
              {now.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-3xl font-black text-white tabular-nums tracking-tight">
              {now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            {todaySchedule.source === 'custom' && todaySchedule.templateName && (
              <span className="inline-flex items-center gap-1 mt-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold text-white">
                {todaySchedule.templateEmoji} {todaySchedule.templateName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mb-3">

            {/* Weekly Bills Button — between label and urgent buttons */}
            {(() => {
              const today = new Date();
              const dayOfWeek = today.getDay();
              const startOfWeek = new Date(today);
              startOfWeek.setDate(today.getDate() - dayOfWeek);
              const endOfWeek = new Date(startOfWeek);
              endOfWeek.setDate(startOfWeek.getDate() + 6);
              const toStr = (d: Date) => d.toISOString().slice(0, 10);
              const wStart = toStr(startOfWeek);
              const wEnd = toStr(endOfWeek);

              const weeklyBills = expenses.filter(exp => {
                if (exp.flow !== 'expense') return false;
                if (exp.paid) return false;
                if (exp.type === 'one-time') return exp.date >= wStart && exp.date <= wEnd;
                if (exp.type === 'recurring' && exp.dueDay) {
                  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                  if (exp.paidHistory?.[thisMonth]) return false;
                  const dueDate = new Date(today.getFullYear(), today.getMonth(), exp.dueDay);
                  return toStr(dueDate) >= wStart && toStr(dueDate) <= wEnd;
                }
                return false;
              });

              const totalDue = weeklyBills.reduce((sum, e) => sum + e.amount, 0);

              // Store in ref-like variable so dropdown can access
              (window as any).__weeklyBills = weeklyBills;
              (window as any).__weeklyTotal = totalDue;
              (window as any).__weeklyRange = { wStart, wEnd };

              return (
                <button
                  onClick={() => setShowWeeklyBills(!showWeeklyBills)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all active:scale-95 shadow-sm min-w-0 justify-center ${
                    weeklyBills.length > 0
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'bg-white/20 text-white/70 hover:bg-white/30'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold truncate">
                    {weeklyBills.length > 0 ? `รายจ่าย ฿${totalDue.toLocaleString()}` : 'ไม่มีรายจ่าย'}
                  </span>
                  {weeklyBills.length > 0 && <span className="text-[9px] font-black bg-white/25 px-1 py-0.5 rounded-full">{weeklyBills.length}</span>}
                  {showWeeklyBills ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              );
            })()}

            <div className="flex-1" />
            {(() => {
              const catKeys = new Set(DEFAULT_CATEGORIES.map(c => c.key));
              const uncatGroups = taskGroups.filter(g => !g.categoryKey || !catKeys.has(g.categoryKey));
              return uncatGroups.map(g => {
                const todayCount = tasks.filter(t => t.category === g.key && !t.completed && (!t.startDate || t.startDate === todayStr)).length;
                return (
                  <button key={g.key} onClick={() => setPopupGroup(popupGroup === g.key ? null : g.key)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full transition-all active:scale-95 shadow-sm ${
                    todayCount > 0
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'bg-white/20 text-white/70 hover:bg-white/30'
                  }`}>
                    <span className="text-xs">{g.emoji}</span>
                    <span className="text-[10px] font-bold">{g.label}</span>
                    {todayCount > 0 && <span className="text-[9px] font-black bg-orange-600/40 px-1.5 py-0.5 rounded-full">{todayCount}</span>}
                  </button>
                );
              });
            })()}
          </div>

          {/* Weekly Bills Expanded List */}
          {showWeeklyBills && (() => {
            const weeklyBills = (window as any).__weeklyBills || [];
            const totalDue = (window as any).__weeklyTotal || 0;
            const range = (window as any).__weeklyRange || {};

            if (weeklyBills.length === 0) {
              return (
                <div className="mb-3 bg-white/10 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-white/60">ไม่มีรายการที่ต้องจ่ายสัปดาห์นี้ 🎉</p>
                </div>
              );
            }

            return (
              <div className="mb-3 bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-rose-50 px-4 py-2.5 border-b border-rose-100 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black text-rose-700">ต้องจ่ายสัปดาห์นี้</p>
                    <p className="text-[9px] text-rose-400">{range.wStart} — {range.wEnd}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-rose-600">฿{totalDue.toLocaleString()}</p>
                    <p className="text-[9px] text-rose-400">{weeklyBills.length} รายการ</p>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                  {weeklyBills.map((bill: Expense) => {
                    const cat = EXPENSE_CATEGORIES.find(c => c.key === bill.category);
                    return (
                      <div key={bill.id} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50">
                        <span className="text-base">{cat?.emoji || '💸'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{bill.title}</p>
                          <p className="text-[9px] text-slate-400">
                            {bill.type === 'recurring' ? `ทุกเดือน วันที่ ${bill.dueDay}` : bill.date}
                          </p>
                        </div>
                        <span className="text-xs font-black text-rose-600 shrink-0">฿{bill.amount.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Group Popup (งานด่วน / นัดหมาย) */}
          {popupGroup && (() => {
            const group = taskGroups.find(g => g.key === popupGroup);
            if (!group) return null;
            const groupTasks = tasks.filter(t => t.category === popupGroup && !t.completed && (!t.startDate || t.startDate === todayStr));

            return (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPopupGroup(null)}>
                <div className="bg-white w-full max-w-sm rounded-2xl max-h-[70vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                  {/* Header */}
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                    <span className="text-2xl">{group.emoji}</span>
                    <div className="flex-1">
                      <h3 className="text-base font-black text-slate-800">{group.label}</h3>
                      <p className="text-[10px] text-slate-400">รายการวันนี้</p>
                    </div>
                    <button onClick={() => setPopupGroup(null)} className="p-2 hover:bg-slate-100 rounded-xl">
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  {/* Tasks list */}
                  <div className="flex-1 overflow-y-auto">
                    {groupTasks.length > 0 ? (
                      <div className="divide-y divide-slate-50">
                        {groupTasks.map(task => (
                          <div key={task.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                            <button
                              onClick={() => onTaskComplete?.(task.id, true)}
                              className="shrink-0"
                            >
                              <Circle className="w-5 h-5 text-slate-300 hover:text-emerald-500" />
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-700 truncate">{task.title}</p>
                              {task.description && <p className="text-[10px] text-slate-400 truncate">{task.description}</p>}
                              <div className="flex items-center gap-2 mt-0.5">
                                {task.startTime && <span className="text-[10px] text-slate-400">{task.startTime}{task.endTime ? ` - ${task.endTime}` : ''}</span>}
                                {task.estimatedDuration && <span className="text-[10px] text-slate-300">{task.estimatedDuration} นาที</span>}
                              </div>
                            </div>
                            {task.priority === 'High' && <span className="text-[9px] font-bold bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">สำคัญ</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <span className="text-4xl block mb-2">{group.emoji}</span>
                        <p className="text-sm font-bold text-slate-400">ไม่มีรายการวันนี้</p>
                      </div>
                    )}
                  </div>

                  {/* Footer buttons */}
                  <div className="flex border-t border-slate-100 divide-x divide-slate-100">
                    <button
                      onClick={() => { setPopupGroup(null); onNavigateToGroup?.(popupGroup); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-indigo-500 hover:bg-indigo-50 transition-colors"
                    >
                      ดูทั้งหมด
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {currentSlot ? (() => {
            const slotInfo = resolveSlotInfo(currentSlot.groupKey);
            const clr = getSlotColor(currentSlot);
            return (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Slot header */}
                <div className={`${clr.bg} ${clr.border} border-b-2 p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg ${clr.iconBg} flex items-center justify-center text-lg`}>
                        {slotInfo.emoji}
                      </div>
                      <div>
                        <h3 className={`text-base font-black ${clr.text}`}>{slotInfo.label}</h3>
                        <span className="text-[11px] font-mono font-bold text-slate-500">{currentSlot.startTime} – {currentSlot.endTime} ({getSlotDur(currentSlot)} น.)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">NOW</span>
                    </div>
                  </div>
                  {/* Countdown */}
                  <div className="text-center">
                    <div className="text-3xl font-black text-slate-800 tabular-nums tracking-tight">{countdownStr}</div>
                    <p className="text-[10px] text-slate-500 font-bold">เหลือเวลา</p>
                  </div>
                </div>

                {/* Tasks in this slot */}
                <div className="p-4">
                  {slotTasks.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">กิจกรรมในช่วงนี้ ({slotTasks.length})</p>
                      {slotTasks.map((task, idx) => {
                        const isDone = checkedTasks.has(task.id);
                        return (
                        <div key={idx} className="py-1.5">
                          <div className="flex items-center gap-2">
                            <button onClick={() => toggleCheck(task.id, currentSlot.startTime, currentSlot.endTime)} className="shrink-0 active:scale-90">
                              {isDone
                                ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                : <Circle className="w-4 h-4 text-slate-300" />}
                            </button>
                            <span className={`text-sm font-medium truncate ${isDone ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</span>
                            <div className="flex items-center gap-1.5 ml-auto shrink-0">
                              {task.recurrence && (
                                <span className="text-[8px] font-black bg-violet-100 text-violet-600 px-1 py-0.5 rounded flex items-center gap-0.5">
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  {task.recurrence.pattern === 'daily' ? 'ทุกวัน' :
                                   task.recurrence.pattern === 'every_x_days' ? `ทุก ${task.recurrence.interval || 2} วัน` :
                                   task.recurrence.pattern === 'weekly' ? 'สัปดาห์' :
                                   task.recurrence.pattern === 'monthly' ? 'เดือน' : 'ปี'}
                                </span>
                              )}
                              {task.estimatedDuration && <span className="text-[10px] font-mono text-blue-400">{task.estimatedDuration}น.</span>}
                              {focusRunning && focusTaskId === task.id && (
                                <span className="text-[9px] font-black bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                                  <Brain className="w-2.5 h-2.5" /> Focusing {focusMM}:{focusSS}
                                </span>
                              )}
                              {!isDone && !(focusRunning && focusTaskId === task.id) && (
                                <>
                                  <span className="text-slate-200">|</span>
                                  <button onClick={() => handleFocusClick(task.id)} className="text-[11px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors flex items-center gap-0.5">
                                    <Play className="w-3 h-3" /> Focus
                                  </button>
                                  <button onClick={() => handleMarkAsDoneClick(task.id)} className="text-[11px] font-bold text-emerald-500 hover:text-emerald-700 transition-colors">Done</button>
                                  <button onClick={() => handleSkipClick(task.id)} className="text-[11px] font-bold text-amber-500 hover:text-amber-700 transition-colors">Skip</button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-2">ไม่มี task ย่อยในช่วงนี้</p>
                  )}
                </div>
              </div>
            );
          })() : (
            <div className="bg-white rounded-2xl p-6 shadow-xl text-center">
              <Coffee className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800 mb-1">คุณว่าง สินะ</h3>
              <p className="text-sm text-blue-400 mb-4">ไม่มีกิจกรรมในช่วงเวลานี้</p>
              {freeSlot && onNavigateToPlanner && (
                <button
                  onClick={() => onNavigateToPlanner(freeSlot.startTime, freeSlot.endTime)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่ม Task Group ({freeSlot.startTime} – {freeSlot.endTime})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== นัดหมายวันนี้ ===== */}
      <div className="px-4 -mt-4 max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
          <div className="bg-indigo-50 px-4 py-3 flex items-center gap-2">
            <span className="text-base">📅</span>
            <span className="text-xs font-black text-indigo-700">นัดหมายวันนี้</span>
            {todayAppointments.length > 0 && (
              <span className="text-[9px] font-bold bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded-full">{todayAppointments.length}</span>
            )}
          </div>
          <div className="p-3">
            {todayAppointments.length > 0 ? (
              <div className="space-y-1.5">
                {todayAppointments.map(task => {
                  const isDone = checkedTasks.has(task.id);
                  return (
                    <div key={task.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-indigo-50/50 transition-colors">
                      <button onClick={() => toggleCheck(task.id)} className="shrink-0 active:scale-90">
                        {isDone
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          : <Circle className="w-4 h-4 text-indigo-300" />}
                      </button>
                      <span className="text-[11px] font-mono font-black bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded shrink-0">
                        {task.startTime
                          ? <>{task.startTime}{task.endTime ? `–${task.endTime}` : ''}</>
                          : <span className="text-indigo-400">ไม่ระบุเวลา</span>
                        }
                      </span>
                      <span className={`text-sm font-bold truncate flex-1 ${isDone ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</span>
                      {!isDone && (
                        <button onClick={() => handleMarkAsDoneClick(task.id)} className="text-[10px] font-bold text-emerald-500 hover:text-emerald-700 transition-colors shrink-0">Done</button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">ไม่มีนัดหมายวันนี้</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick-access buttons moved to header row above */}

      {/* ===== Upcoming Slots ===== */}
      <div className="px-4 pt-4 pb-4 max-w-lg mx-auto space-y-4">

        {upcomingSlots.length > 0 && (() => {
          const next = upcomingSlots[0];
          const nextInfo = resolveSlotInfo(next.groupKey);
          const nextClr = getSlotColor(next);
          const nextTasks = getFullTasksForSlot(next);
          return (
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
              <div className={`${nextClr.bg} px-4 py-3 flex items-center gap-3`}>
                <div className="flex items-center gap-2 text-emerald-500">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Next Up</span>
                </div>
                <div className="flex-1" />
                <div className={`w-7 h-7 rounded-lg ${nextClr.iconBg} flex items-center justify-center shrink-0 text-base`}>
                  {nextInfo.emoji}
                </div>
                <span className="text-sm font-bold text-slate-800">{nextInfo.label}</span>
                <span className="text-[11px] font-mono font-bold text-slate-500 shrink-0">{next.startTime}–{next.endTime}</span>
                <span className="text-[11px] font-bold text-blue-400 shrink-0">{getSlotDur(next)}น.</span>
              </div>
              <div className="p-4">
                {nextTasks.length > 0 ? (
                  <div className="space-y-2">
                    {nextTasks.map((task, idx) => {
                      const isDone = checkedTasks.has(task.id);
                      return (
                        <div key={idx} className="py-1">
                          <div className="flex items-center gap-2">
                            <button onClick={() => toggleCheck(task.id, next.startTime, next.endTime)} className="shrink-0 active:scale-90">
                              {isDone
                                ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                : <Circle className="w-4 h-4 text-slate-300" />}
                            </button>
                            <span className={`text-sm font-medium truncate flex-1 ${isDone ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</span>
                            {task.recurrence && (
                              <span className="text-[8px] font-black bg-violet-100 text-violet-600 px-1 py-0.5 rounded shrink-0">
                                <RefreshCw className="w-2.5 h-2.5 inline" />
                              </span>
                            )}
                            {task.estimatedDuration && <span className="text-[10px] font-mono text-blue-400 shrink-0">{task.estimatedDuration}น.</span>}
                          </div>
                          {task.subtasks && task.subtasks.length > 0 && (
                            <div className="flex items-center gap-2 mt-1 ml-6">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${(task.subtasks.filter((s: SubTask) => s.completed).length / task.subtasks.length) * 100}%` }} />
                              </div>
                              <span className="text-[9px] font-bold text-slate-400 shrink-0">{task.subtasks.filter((s: SubTask) => s.completed).length}/{task.subtasks.length}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-1">ไม่มี task ย่อยในช่วงนี้</p>
                )}
              </div>
            </div>
          );
        })()}

        {upcomingSlots.length > 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100">
            <div className="px-4 py-2.5 border-b border-emerald-100">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">อีก {upcomingSlots.length - 1} ช่วงเวลาวันนี้</span>
            </div>
            <div className="max-h-[520px] overflow-y-auto divide-y divide-emerald-50">
              {upcomingSlots.slice(1).map((slot, idx) => {
                const si = resolveSlotInfo(slot.groupKey);
                const c = getSlotColor(slot);
                const sTaskList = getFullTasksForSlot(slot);
                const isExpanded = expandedSlots.has(slot.id);
                return (
                  <div key={idx}>
                    <button onClick={() => toggleSlot(slot.id)} className="w-full px-4 py-2.5 flex items-center gap-2.5 hover:bg-slate-50 transition-colors active:bg-slate-100">
                      <div className={`w-7 h-7 rounded-lg ${c.iconBg} flex items-center justify-center shrink-0 text-base`}>
                        {si.emoji}
                      </div>
                      <span className="text-sm text-slate-700 font-medium truncate flex-1 text-left">{si.label}</span>
                      {sTaskList.length > 0 && (
                        <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full shrink-0">{sTaskList.length}</span>
                      )}
                      <span className="text-[11px] font-mono text-blue-400 shrink-0">{slot.startTime}–{slot.endTime}</span>
                      <span className="text-[11px] font-bold text-blue-400 shrink-0 w-10 text-right">{getSlotDur(slot)}น.</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 pt-1">
                        {sTaskList.length > 0 ? (
                          <div className="space-y-2 ml-1">
                            {sTaskList.map((task, i) => {
                              const isDone = checkedTasks.has(task.id);
                              return (
                                <div key={i} className="py-1">
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => toggleCheck(task.id, slot.startTime, slot.endTime)} className="shrink-0 active:scale-90">
                                      {isDone
                                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        : <Circle className="w-4 h-4 text-slate-300" />}
                                    </button>
                                    <span className={`text-sm font-medium truncate flex-1 ${isDone ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</span>
                                    {task.recurrence && (
                                      <span className="text-[8px] font-black bg-violet-100 text-violet-600 px-1 py-0.5 rounded shrink-0">
                                        <RefreshCw className="w-2.5 h-2.5 inline" />
                                      </span>
                                    )}
                                    {task.estimatedDuration && <span className="text-[10px] font-mono text-blue-400 shrink-0">{task.estimatedDuration}น.</span>}
                                  </div>
                                  {task.subtasks && task.subtasks.length > 0 && (
                                    <div className="flex items-center gap-2 mt-1 ml-6">
                                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${(task.subtasks.filter((s: SubTask) => s.completed).length / task.subtasks.length) * 100}%` }} />
                                      </div>
                                      <span className="text-[9px] font-bold text-slate-400 shrink-0">{task.subtasks.filter((s: SubTask) => s.completed).length}/{task.subtasks.length}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 text-center py-1">ไม่มี task ย่อยในช่วงนี้</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ===== Stats (Tasks Done) ===== */}
      <div className="px-4 pb-16 max-w-lg mx-auto">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-2xl font-black text-slate-800">{completedTasksCount}</h4>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Tasks Done</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
