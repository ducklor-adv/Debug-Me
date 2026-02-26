import React, { useState, useRef, useEffect } from 'react';
import { Task, SubTask, Milestone, TaskGroup, GROUP_COLORS, getTasksForDate, getDayType, ScheduleTemplates, TimeSlot, DailyRecord } from '../types';
import { CheckCircle2, Circle, Trophy, Zap, Flame, CheckCircle, Clock, Camera, Mic, Video, Phone, User as UserIcon, MapPin, Edit3, X, ChevronRight, Trash2, Square, Image, Coffee, Code, Sun, Moon, Dumbbell, BookOpen, Brain, FileText, Play, Pause, RotateCcw, Volume2, VolumeX, Target, SkipForward, AlertTriangle, Plus, Handshake, RefreshCw } from 'lucide-react';

interface Attachment {
  type: 'photo' | 'video' | 'audio' | 'phone' | 'contact' | 'gps';
  label: string;
  value: string;
  preview?: string;
}

interface DashboardProps {
  tasks: Task[];
  milestones: Milestone[];
  taskGroups: TaskGroup[];
  scheduleTemplates: ScheduleTemplates;
  todayRecords?: DailyRecord[];
  onSaveDailyRecord?: (record: DailyRecord) => void;
  onNavigateToPlanner?: (startTime: string, endTime: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ tasks, milestones, taskGroups, scheduleTemplates, todayRecords = [], onSaveDailyRecord, onNavigateToPlanner }) => {
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [showEditView, setShowEditView] = useState(false);
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
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

  // Focus Timer
  const [showFocus, setShowFocus] = useState(false);
  const [focusMode, setFocusMode] = useState<'focus' | 'break'>('focus');
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const focusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (focusRunning && focusSeconds > 0) {
      focusIntervalRef.current = setInterval(() => {
        setFocusSeconds(prev => {
          if (prev <= 1) {
            setFocusRunning(false);
            if (soundOn) {
              try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczHjqIt9jNdUQtQYS11c16Ri5ChrPTzX1IMEKD').play(); } catch {}
            }
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

  // Restore checked state from todayRecords — run only ONCE on initial load
  const hasRestoredChecks = useRef(false);
  useEffect(() => {
    if (hasRestoredChecks.current) return;
    if (todayRecords.length === 0) return;
    hasRestoredChecks.current = true;
    const checked = new Set<string>();
    todayRecords.forEach(r => {
      if (!r.timeStart || !r.timeEnd) return;
      const matchTask = todayTasks.find(t => t.title === r.taskTitle && t.category === r.category);
      if (!matchTask) return;
      const matchSlot = todaySlots.find(s =>
        s.startTime === r.timeStart && s.endTime === r.timeEnd &&
        (s.assignedTaskIds || []).includes(matchTask.id)
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
        if (onSaveDailyRecord) {
          const task = todayTasks.find(t => t.id === taskId);
          if (task) {
            onSaveDailyRecord({
              id: `${todayStr}-${task.id}`,
              date: todayStr,
              taskTitle: task.title,
              category: task.category,
              completed: true,
              completedAt: new Date().toISOString(),
              timeStart: slotStart,
              timeEnd: slotEnd,
            });
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

  // Get today's schedule slots
  const dayType = getDayType(new Date());
  const todaySlots = (scheduleTemplates[dayType] || []).slice().sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Find current slot (handles midnight-crossing slots like 22:00-05:00)
  const currentSlot = todaySlots.find(s => {
    const start = toMin(s.startTime);
    const end = toMin(s.endTime);
    if (end > start) return nowMin >= start && nowMin < end;
    // Crosses midnight: e.g. 22:00-05:00
    return nowMin >= start || nowMin < end;
  });

  // Tasks in current slot (by assignedTaskIds whitelist)
  const slotTasks = currentSlot
    ? (currentSlot.assignedTaskIds || [])
        .map(id => todayTasks.find(t => t.id === id))
        .filter((t): t is Task => t !== undefined)
    : [];

  // Upcoming slots (after current time)
  const upcomingSlots = todaySlots.filter(s => toMin(s.startTime) > nowMin);

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

  // Get group style for a slot
  const getSlotGroup = (s: TimeSlot) => taskGroups.find(g => g.key === s.groupKey);
  const getSlotColor = (s: TimeSlot) => GROUP_COLORS[getSlotGroup(s)?.color || 'orange'] || GROUP_COLORS.orange;

  const scheduleIcon = (cat: string, size = 'w-3.5 h-3.5') => {
    const group = taskGroups.find(g => g.key === cat);
    const icon = group?.icon || 'code';
    if (icon === 'code') return <Code className={size} />;
    if (icon === 'coffee') return <Coffee className={size} />;
    if (icon === 'sun') return <Sun className={size} />;
    if (icon === 'moon') return <Moon className={size} />;
    if (icon === 'gym') return <Dumbbell className={size} />;
    if (icon === 'book') return <BookOpen className={size} />;
    if (icon === 'brain') return <Brain className={size} />;
    if (icon === 'file') return <FileText className={size} />;
    if (icon === 'handshake') return <Handshake className={size} />;
    return <Clock className={size} />;
  };

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

      {/* ===== Focus Timer Popup ===== */}
      {showFocus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-emerald-100 animate-fadeIn overflow-hidden relative">
            <button onClick={() => setShowFocus(false)} className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors z-10">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-center gap-2 pt-8 pb-4">
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
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                {focusMode === 'focus' ? (currentSlot ? `Deep Work: ${getSlotGroup(currentSlot)?.label || currentSlot.groupKey}` : 'Deep Work: Coding Time') : 'Break Time'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-5 pb-10">
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
          </div>
        </div>
      )}

      {/* ===== NOW: Current Slot ===== */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-green-500 p-6 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-yellow-300" />
            <span className="text-xs font-bold tracking-widest uppercase text-emerald-100">ตอนนี้ทำอะไร</span>
          </div>

          {currentSlot ? (() => {
            const group = getSlotGroup(currentSlot);
            const clr = getSlotColor(currentSlot);
            return (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Slot header */}
                <div className={`${clr.bg} ${clr.border} border-b-2 p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg ${clr.iconBg} flex items-center justify-center`}>
                        {scheduleIcon(currentSlot.groupKey, 'w-4 h-4 text-white')}
                      </div>
                      <div>
                        <h3 className={`text-base font-black ${clr.text}`}>{group?.label || currentSlot.groupKey}</h3>
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
                              {!isDone && (
                                <>
                                  <span className="text-slate-200">|</span>
                                  <button onClick={() => setShowFocus(true)} className="text-[11px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors">Focus</button>
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

      {/* ===== Stats ===== */}
      <div className="px-4 -mt-4 max-w-lg mx-auto">
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

      {/* ===== Upcoming Slots ===== */}
      <div className="px-4 pt-6 pb-16 max-w-lg mx-auto space-y-4">

        {upcomingSlots.length > 0 && (() => {
          const next = upcomingSlots[0];
          const nextGroup = getSlotGroup(next);
          const nextClr = getSlotColor(next);
          const nextTasks = (next.assignedTaskIds || [])
            .map(id => todayTasks.find(t => t.id === id))
            .filter((t): t is Task => t !== undefined);
          return (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-500 mb-3">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Next Up</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${nextClr.iconBg} flex items-center justify-center shrink-0`}>
                  {scheduleIcon(next.groupKey, 'w-4 h-4 text-white')}
                </div>
                <span className="text-base font-bold text-slate-800 truncate flex-1">{nextGroup?.label || next.groupKey}</span>
                <span className="text-xs font-mono font-bold text-emerald-600 shrink-0">{next.startTime}–{next.endTime}</span>
                <span className="text-xs font-bold text-blue-400 shrink-0">{getSlotDur(next)}น.</span>
              </div>
              {nextTasks.length > 0 && (
                <div className="mt-2 pl-11 space-y-1">
                  {nextTasks.map((t, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <p className="text-xs text-slate-500 truncate flex-1">• {t.title}</p>
                      {t.recurrence && (
                        <span className="text-[8px] font-black bg-violet-100 text-violet-600 px-1 py-0.5 rounded shrink-0">
                          <RefreshCw className="w-2 h-2 inline" />
                        </span>
                      )}
                      {t.subtasks && t.subtasks.length > 0 && (
                        <span className="text-[9px] font-bold text-slate-400 shrink-0">{t.subtasks.filter((s: SubTask) => s.completed).length}/{t.subtasks.length}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {upcomingSlots.length > 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100">
            <div className="px-4 py-2.5 border-b border-emerald-100">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">อีก {upcomingSlots.length - 1} ช่วงเวลาวันนี้</span>
            </div>
            <div className="max-h-[420px] overflow-y-auto divide-y divide-emerald-50">
              {upcomingSlots.slice(1).map((slot, idx) => {
                const g = getSlotGroup(slot);
                const c = getSlotColor(slot);
                const sTaskList = (slot.assignedTaskIds || [])
                  .map(id => todayTasks.find(t => t.id === id))
                  .filter((t): t is Task => t !== undefined);
                return (
                  <div key={idx} className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg ${c.iconBg} flex items-center justify-center shrink-0`}>
                        {scheduleIcon(slot.groupKey, 'w-3.5 h-3.5 text-white')}
                      </div>
                      <span className="text-sm text-slate-700 font-medium truncate flex-1">{g?.label || slot.groupKey}</span>
                      <span className="text-[11px] font-mono text-blue-400 shrink-0">{slot.startTime}–{slot.endTime}</span>
                      <span className="text-[11px] font-bold text-blue-400 shrink-0 w-10 text-right">{getSlotDur(slot)}น.</span>
                    </div>
                    {sTaskList.length > 0 && (
                      <div className="mt-1.5 pl-9 space-y-0.5">
                        {sTaskList.map((t, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400 truncate flex-1">• {t.title}</span>
                            {t.recurrence && <RefreshCw className="w-2.5 h-2.5 text-violet-400 shrink-0" />}
                            {t.subtasks && t.subtasks.length > 0 && (
                              <span className="text-[9px] font-bold text-slate-300 shrink-0">{t.subtasks.filter((s: SubTask) => s.completed).length}/{t.subtasks.length}</span>
                            )}
                            {t.estimatedDuration && <span className="text-[9px] font-mono text-blue-300 shrink-0">{t.estimatedDuration}น.</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default Dashboard;
