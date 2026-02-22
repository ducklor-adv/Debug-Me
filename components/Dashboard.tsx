import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../types';
import { CheckCircle2, Circle, Trophy, Zap, Flame, CheckCircle, Clock, Camera, Mic, Video, Phone, User as UserIcon, MapPin, Edit3, X, ChevronRight, Trash2, Square, Image, Coffee, Code, Sun, Moon, Dumbbell, BookOpen, Brain, FileText, Play, Pause, RotateCcw, Volume2, VolumeX, Target, SkipForward, AlertTriangle } from 'lucide-react';
import { ScheduleBlock } from './DailyPlanner';

interface Attachment {
  type: 'photo' | 'video' | 'audio' | 'phone' | 'contact' | 'gps';
  label: string;
  value: string;
  preview?: string;
}

interface DashboardProps {
  tasks: Task[];
  schedule: ScheduleBlock[];
}

const Dashboard: React.FC<DashboardProps> = ({ tasks, schedule }) => {
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

  const completedTasksCount = tasks.filter(t => t.completed).length;

  const currentUrgentTask = tasks.find(t => !t.completed && t.priority === 'High');
  const remainingTasks = tasks.filter(t => !t.completed && t !== currentUrgentTask);

  // Countdown timer
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Schedule helpers
  const now = new Date(tick);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowSec = now.getSeconds();
  const fmtTime = (h: number, m: number) => `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
  const getDur = (b: ScheduleBlock) => (b.endHour * 60 + b.endMin) - (b.startHour * 60 + b.startMin);
  const currentBlock = schedule.find(b => nowMin >= b.startHour * 60 + b.startMin && nowMin < b.endHour * 60 + b.endMin);
  const upcomingBlocks = schedule.filter(b => (b.startHour * 60 + b.startMin) > nowMin);

  // Countdown: remaining time in current block
  const countdownStr = (() => {
    if (!currentBlock) return '';
    const endTotalSec = (currentBlock.endHour * 60 + currentBlock.endMin) * 60;
    const nowTotalSec = (now.getHours() * 60 + now.getMinutes()) * 60 + nowSec;
    const remaining = Math.max(0, endTotalSec - nowTotalSec);
    const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
    const ss = (remaining % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  })();

  const scheduleIcon = (icon: string, size = 'w-3.5 h-3.5') => {
    if (icon === 'code') return <Code className={size} />;
    if (icon === 'coffee') return <Coffee className={size} />;
    if (icon === 'sun') return <Sun className={size} />;
    if (icon === 'moon') return <Moon className={size} />;
    if (icon === 'gym') return <Dumbbell className={size} />;
    if (icon === 'book') return <BookOpen className={size} />;
    if (icon === 'brain') return <Brain className={size} />;
    if (icon === 'file') return <FileText className={size} />;
    return <Clock className={size} />;
  };

  const handleMarkAsDoneClick = () => {
    setShowDoneModal(true);
  };

  const handleConfirmDone = () => {
    setShowDoneModal(false);
  };

  const handleSaveDetails = () => {
    setShowDoneModal(false);
    setShowEditView(true);
  };

  const resetEditState = () => {
    setShowEditView(false);
    setSkipMode(false);
    setNotes('');
    setAttachments([]);
    setShowPhoneInput(false);
    setShowContactInput(false);
    setPhoneValue('');
    setContactValue('');
  };

  const handleSkipClick = () => {
    setSkipMode(true);
    setShowEditView(true);
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

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
        setAttachments(prev => [...prev, {
          type: 'audio',
          label: `เสียงบันทึก ${timeStr}`,
          value: url,
        }]);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      alert('ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตการใช้งาน');
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleAddPhone = () => {
    if (phoneValue.trim()) {
      setAttachments(prev => [...prev, { type: 'phone', label: `เบอร์โทร: ${phoneValue}`, value: phoneValue }]);
      setPhoneValue('');
      setShowPhoneInput(false);
    }
  };

  const handleAddContact = () => {
    if (contactValue.trim()) {
      setAttachments(prev => [...prev, { type: 'contact', label: `ผู้ติดต่อ: ${contactValue}`, value: contactValue }]);
      setContactValue('');
      setShowContactInput(false);
    }
  };

  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ไม่รองรับ GPS');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setAttachments(prev => [...prev, {
          type: 'gps',
          label: `พิกัด: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          value: `${latitude},${longitude}`,
        }]);
        setGpsLoading(false);
      },
      () => {
        alert('ไม่สามารถดึงพิกัด GPS ได้ กรุณาอนุญาตการใช้งาน');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const priorityStyle = (p: string) => {
    if (p === 'High') return 'bg-rose-100 text-rose-600 border-rose-200';
    if (p === 'Medium') return 'bg-amber-100 text-amber-600 border-amber-200';
    return 'bg-slate-100 text-slate-500 border-slate-200';
  };

  return (
    <div className="animate-fadeIn w-full min-h-full bg-emerald-50">

      {/* MODALS */}
      {showDoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-emerald-100 transform animate-fadeIn">
            <h3 className="text-xl font-bold text-slate-800 mb-2">ข้อมูลเพิ่มเติม?</h3>
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
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 h-28 resize-none shadow-inner"
                  placeholder="พิมพ์รายละเอียดที่เจอมา..."
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-3 block">Quick Attachments / เครื่องมือด่วน</label>
                <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileSelect(e, 'photo')} />
                <input ref={videoInputRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => handleFileSelect(e, 'video')} />

                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => photoInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 py-4 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 text-blue-500 hover:text-emerald-600 rounded-xl border border-emerald-100 transition-all active:scale-95 shadow-sm">
                    <Camera className="w-6 h-6" /> <span className="text-[10px] font-bold">ถ่ายรูป</span>
                  </button>
                  <button
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-all active:scale-95 shadow-sm ${isRecording ? 'bg-rose-100 border-rose-300 text-rose-600 animate-pulse' : 'bg-slate-50 hover:bg-rose-50 hover:border-rose-200 text-blue-500 hover:text-rose-600 border-emerald-100'}`}
                  >
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
              <button onClick={resetEditState} className={`px-5 py-3 font-semibold text-sm rounded-xl shadow-lg transition-colors ${skipMode ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-300'}`}>
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
            {/* Close button */}
            <button onClick={() => setShowFocus(false)} className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors z-10">
              <X className="w-4 h-4" />
            </button>
            {/* Focus/Break Tabs */}
            <div className="flex items-center justify-center gap-2 pt-8 pb-4">
              <button
                onClick={() => switchFocusMode('focus')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${focusMode === 'focus' ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                <Brain className="w-4 h-4" /> Focus
              </button>
              <button
                onClick={() => switchFocusMode('break')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${focusMode === 'break' ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                <Coffee className="w-4 h-4" /> Break
              </button>
            </div>

            {/* Big Timer */}
            <div className="text-center py-8">
              <div className="text-7xl font-black text-slate-800 tracking-tight tabular-nums">
                {focusMM}<span className="text-slate-300">:</span>{focusSS}
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                {focusMode === 'focus'
                  ? (currentBlock ? `Deep Work: ${currentBlock.title}` : 'Deep Work: Coding Time')
                  : 'Break Time'}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-5 pb-10">
              <button onClick={focusReset} className="w-12 h-12 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center text-slate-500 transition-all active:scale-90">
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setFocusRunning(!focusRunning)}
                className="w-16 h-16 bg-indigo-500 hover:bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 transition-all active:scale-90"
              >
                {focusRunning ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
              </button>
              <button onClick={() => setSoundOn(!soundOn)} className="w-12 h-12 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center text-slate-500 transition-all active:scale-90">
                {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== NOW: Current Schedule Block ===== */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-green-500 p-6 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-yellow-300" />
            <span className="text-xs font-bold tracking-widest uppercase text-emerald-100">ตอนนี้ทำอะไร</span>
          </div>

          {currentBlock ? (
            <div className="bg-white rounded-2xl p-5 shadow-xl">
              {/* Countdown ตัวใหญ่ ตรงกลาง บนสุด */}
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">NOW</span>
                </div>
                <div className="text-4xl font-black text-slate-800 tabular-nums tracking-tight">
                  {countdownStr}
                </div>
              </div>

              {/* ชื่อกิจกรรม + ช่วงเวลา + เวลาทั้งหมด ในแถวเดียวกัน */}
              <div className="flex items-center gap-2 mb-1">
                <div className="text-emerald-500 shrink-0">{scheduleIcon(currentBlock.icon, 'w-5 h-5')}</div>
                <h3 className="text-base font-bold text-slate-800 leading-tight truncate flex-1">{currentBlock.title}</h3>
                <span className="text-xs font-mono font-bold text-blue-500 shrink-0">{fmtTime(currentBlock.startHour, currentBlock.startMin)}–{fmtTime(currentBlock.endHour, currentBlock.endMin)}</span>
                <span className="text-xs font-bold text-blue-600 shrink-0">{getDur(currentBlock)}m</span>
              </div>
              {currentBlock.subtitle && <p className="text-sm text-blue-400 leading-relaxed mb-3 ml-[28px]">{currentBlock.subtitle}</p>}

              {/* ปุ่มต่าง ๆ */}
              <div className="flex flex-wrap gap-2 mt-3 justify-center">
                <button onClick={() => setShowFocus(true)} className="py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 active:scale-95">
                  <Target className="w-4 h-4" /> Focus
                </button>
                <button onClick={handleMarkAsDoneClick} className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-emerald-300">
                  <CheckCircle className="w-4 h-4" /> Done
                </button>
                <button onClick={handleSkipClick} className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 rounded-xl font-semibold text-sm transition-all active:scale-95 flex items-center gap-1.5">
                  <SkipForward className="w-4 h-4" /> เลื่อน
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 shadow-xl text-center">
              <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800 mb-1">เก่งมาก!</h3>
              <p className="text-sm text-blue-400">ไม่มีกิจกรรมในช่วงเวลานี้</p>
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

      {/* ===== Schedule: Next Up + Remaining ===== */}
      <div className="px-4 pt-6 pb-16 max-w-lg mx-auto space-y-4">

        {/* Next Up - ตัวถัดไป */}
        {upcomingBlocks.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100">
            <div className="flex items-center gap-2 text-emerald-500 mb-3">
              <Clock className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Next Up</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="shrink-0 opacity-60">{scheduleIcon(upcomingBlocks[0].icon)}</div>
              <span className="text-base font-bold text-slate-800 truncate flex-1">{upcomingBlocks[0].title}</span>
              <span className="text-xs font-mono font-bold text-emerald-600 shrink-0">{fmtTime(upcomingBlocks[0].startHour, upcomingBlocks[0].startMin)}–{fmtTime(upcomingBlocks[0].endHour, upcomingBlocks[0].endMin)}</span>
              <span className="text-xs font-bold text-blue-400 shrink-0">{getDur(upcomingBlocks[0])}m</span>
            </div>
          </div>
        )}

        {/* ตารางที่เหลือ — scrollable */}
        {upcomingBlocks.length > 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100">
            <div className="px-4 py-2.5 border-b border-emerald-100">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">อีก {upcomingBlocks.length - 1} รายการวันนี้</span>
            </div>
            <div className="max-h-[320px] overflow-y-auto divide-y divide-emerald-50">
              {upcomingBlocks.slice(1).map((block, idx) => (
                <div key={idx} className="flex items-center gap-2.5 px-4 py-2.5">
                  <div className={`shrink-0 ${block.isBreak ? 'text-slate-300' : block.icon === 'code' ? 'text-blue-400' : 'text-emerald-500'}`}>{scheduleIcon(block.icon)}</div>
                  <span className="text-sm text-slate-700 font-medium truncate flex-1">{block.title}</span>
                  <span className="text-[11px] font-mono text-blue-400 shrink-0">{fmtTime(block.startHour, block.startMin)}–{fmtTime(block.endHour, block.endMin)}</span>
                  <span className="text-[11px] font-bold text-blue-400 shrink-0 w-10 text-right">{getDur(block)}m</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

export default Dashboard;
