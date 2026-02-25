
import React, { useState, useRef } from 'react';
import { Task, TaskAttachment, Priority, TaskGroup, GROUP_COLORS } from '../types';
import { Plus, Trash2, CheckCircle2, Circle, Sparkles, X, Camera, Mic, Video, Phone, User as UserIcon, MapPin, Square, Image, Paperclip, Save, Sun, Moon, Coffee, Code, FileText, Home, Wrench, Dumbbell, BookOpen, Brain, RefreshCw, Pencil, Heart, Users, Zap, Briefcase, ShoppingCart, Star, Calendar, Clock, Target, TrendingUp, Lightbulb, Music, Gamepad2, Book, Utensils, Bike, Palette, Rocket } from 'lucide-react';
import { getAIPrioritization } from '../services/geminiService';
import TimePicker from './TimePicker';

interface TaskManagerProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  taskGroups: TaskGroup[];
  setTaskGroups: React.Dispatch<React.SetStateAction<TaskGroup[]>>;
  deletedDefaultTaskIds: string[];
  setDeletedDefaultTaskIds: React.Dispatch<React.SetStateAction<string[]>>;
  onImmediateSave?: (updatedTasks?: Task[], updatedDeletedIds?: string[]) => Promise<void>;
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
};

const todayStr = new Date().toISOString().split('T')[0];

const emptyForm = (): Omit<Task, 'id'> => ({
  title: '',
  description: '',
  priority: Priority.MEDIUM,
  completed: false,
  startDate: todayStr,
  endDate: todayStr,
  startTime: '09:00',
  endTime: '10:00',
  category: 'งานหลัก',
  notes: '',
  attachments: [],
  recurring: undefined,
});

const TaskManager: React.FC<TaskManagerProps> = ({ tasks, setTasks, taskGroups, setTaskGroups, deletedDefaultTaskIds, setDeletedDefaultTaskIds, onImmediateSave }) => {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Derive style objects from dynamic groups
  const groupStyles = taskGroups.map(getGroupStyle);
  const getTypeStyle = (cat: string) => groupStyles.find(s => s.key === cat) || groupStyles[0];

  // Group form state
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', emoji: '📌', color: 'cyan', icon: 'code' });

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null); // null = new, string = editing
  const [form, setForm] = useState<Omit<Task, 'id'>>(emptyForm());
  const [formAttachments, setFormAttachments] = useState<TaskAttachment[]>([]);

  // Attachment helpers
  const [isRecording, setIsRecording] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [showContactInput, setShowContactInput] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');
  const [contactValue, setContactValue] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Expanded card & selected category
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openNewForm = () => {
    setEditId(null);
    setForm(emptyForm());
    setFormAttachments([]);
    setShowPhoneInput(false);
    setShowContactInput(false);
    setFormOpen(true);
  };

  const openNewFormWithCategory = (cat: string) => {
    setEditId(null);
    setForm({ ...emptyForm(), category: cat });
    setFormAttachments([]);
    setShowPhoneInput(false);
    setShowContactInput(false);
    setFormOpen(true);
  };

  const openEditForm = (task: Task) => {
    setEditId(task.id);
    setForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      completed: task.completed,
      startDate: task.startDate,
      endDate: task.endDate,
      startTime: task.startTime,
      endTime: task.endTime,
      category: task.category,
      notes: task.notes || '',
      attachments: task.attachments || [],
      recurring: task.recurring,
    });
    setFormAttachments(task.attachments || []);
    setShowPhoneInput(false);
    setShowContactInput(false);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditId(null);
    setForm(emptyForm());
    setFormAttachments([]);
    setShowPhoneInput(false);
    setShowContactInput(false);
  };

  const saveForm = () => {
    if (!form.title.trim()) return;
    if (editId) {
      setTasks(prev => prev.map(t => t.id === editId ? { ...t, ...form, attachments: formAttachments } : t));
    } else {
      const newTask: Task = { id: Date.now().toString(), ...form, attachments: formAttachments };
      setTasks(prev => [newTask, ...prev]);
    }
    closeForm();
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
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

      // Save to Firestore immediately to prevent the task from coming back
      if (onImmediateSave) {
        console.log('💾 Calling immediate save with:', { taskCount: updatedTasks.length, deletedIds: updatedDeletedIds });
        await onImmediateSave(updatedTasks, updatedDeletedIds);
        console.log('✅ Immediate save completed');
      }
    }
  };

  // Attachment handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setFormAttachments(prev => [...prev, {
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
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
        setFormAttachments(prev => [...prev, { type: 'audio', label: `เสียงบันทึก ${timeStr}`, value: url }]);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch { alert('ไม่สามารถเข้าถึงไมโครโฟนได้'); }
  };

  const handleStopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); };

  const handleAddPhone = () => {
    if (phoneValue.trim()) {
      setFormAttachments(prev => [...prev, { type: 'phone', label: `เบอร์โทร: ${phoneValue}`, value: phoneValue }]);
      setPhoneValue(''); setShowPhoneInput(false);
    }
  };

  const handleAddContact = () => {
    if (contactValue.trim()) {
      setFormAttachments(prev => [...prev, { type: 'contact', label: `ผู้ติดต่อ: ${contactValue}`, value: contactValue }]);
      setContactValue(''); setShowContactInput(false);
    }
  };

  const handleGetGPS = () => {
    if (!navigator.geolocation) { alert('เบราว์เซอร์ไม่รองรับ GPS'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setFormAttachments(prev => [...prev, { type: 'gps', label: `พิกัด: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, value: `${latitude},${longitude}` }]);
        setGpsLoading(false);
      },
      () => { alert('ไม่สามารถดึงพิกัด GPS ได้'); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const removeAttachment = (index: number) => {
    setFormAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleAIAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const insight = await getAIPrioritization(tasks);
      setAiInsight(insight || "I don't have enough information to analyze your tasks yet.");
    } catch {
      setAiInsight("Failed to connect to the productivity strategist. Please try again later.");
    } finally { setIsAnalyzing(false); }
  };

  // Group CRUD
  const openGroupForm = () => {
    setGroupForm({ name: '', emoji: '📌', color: 'cyan', icon: 'code' });
    setGroupFormOpen(true);
  };
  const saveGroup = () => {
    const name = groupForm.name.trim();
    if (!name) return;
    if (taskGroups.some(g => g.key === name)) return; // duplicate
    const newGroup: TaskGroup = {
      key: name,
      label: name,
      emoji: groupForm.emoji,
      color: groupForm.color,
      icon: groupForm.icon,
      size: 64,
    };
    setTaskGroups(prev => [...prev, newGroup]);
    setGroupFormOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10">

      {/* Header - Add Group Button */}
      <div className="flex justify-end">
        <button onClick={openGroupForm} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200">
          <Plus className="w-4 h-4" /> เพิ่มกลุ่ม
        </button>
      </div>

      {/* AI Insight */}
      {aiInsight && (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl relative animate-fadeIn shadow-sm">
          <button onClick={() => setAiInsight(null)} className="absolute top-3 right-3 p-2 bg-amber-100 rounded-xl text-amber-600 hover:bg-amber-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="font-black text-base mb-1.5 text-amber-900">AI Strategy Recommendation</p>
              <p className="text-sm text-amber-800 whitespace-pre-wrap leading-relaxed">{aiInsight}</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== Group Form ===== */}
      {groupFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-fadeIn overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">สร้าง Task Group ใหม่</h3>
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
              <button onClick={saveGroup} disabled={!groupForm.name.trim() || taskGroups.some(g => g.key === groupForm.name.trim())} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-200 transition-colors disabled:opacity-40 flex items-center gap-2">
                <Plus className="w-4 h-4" /> สร้างกลุ่ม
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Task Form (Add / Edit) ===== */}
      {formOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-4 pt-16 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl animate-fadeIn overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <h3 className="font-bold text-slate-800 text-base">{editId ? 'แก้ไข Task' : 'เพิ่ม Task ใหม่'}</h3>
              <button onClick={closeForm} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">ชื่อ Task</label>
                <input type="text" autoFocus value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="What needs to be done?" />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">รายละเอียด</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 h-20 resize-none" placeholder="รายละเอียดเพิ่มเติม..." />
              </div>

              {/* ประเภทกิจกรรม */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">ประเภท</label>
                <div className="flex flex-wrap gap-1.5">
                  {groupStyles.map(t => (
                    <button key={t.key} onClick={() => setForm({...form, category: t.key})} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${form.category === t.key ? `${t.bg} ${t.border} ${t.text}` : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}>
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">วันเริ่ม</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value, endDate: e.target.value > form.endDate ? e.target.value : form.endDate})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">วันจบ</label>
                  <input type="date" value={form.endDate} min={form.startDate} onChange={e => setForm({...form, endDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-3">
                <TimePicker
                  label="เวลาเริ่ม"
                  value={form.startTime}
                  onChange={value => setForm({...form, startTime: value})}
                />
                <TimePicker
                  label="เวลาจบ"
                  value={form.endTime}
                  onChange={value => setForm({...form, endTime: value})}
                />
              </div>

              {/* Recurring Toggle */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">ทำซ้ำ (Recurring)</label>
                <button
                  onClick={() => setForm({ ...form, recurring: form.recurring === 'daily' ? undefined : 'daily' })}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all w-full ${
                    form.recurring === 'daily'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${form.recurring === 'daily' ? 'text-emerald-500' : 'text-slate-300'}`} />
                  <span className="text-sm font-bold">ทุกวัน (Daily)</span>
                  {form.recurring === 'daily' && (
                    <span className="ml-auto text-[10px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">ON</span>
                  )}
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">Notes / บันทึกเพิ่มเติม</label>
                <textarea value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 h-24 resize-none shadow-inner" placeholder="พิมพ์บันทึก..." />
              </div>

              {/* Quick Attachments */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-2 block">Quick Attachments</label>
                <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFileSelect(e, 'photo')} />
                <input ref={videoInputRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={e => handleFileSelect(e, 'video')} />

                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => photoInputRef.current?.click()} className="flex flex-col items-center justify-center gap-1.5 py-3 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 text-blue-500 hover:text-emerald-600 rounded-xl border border-emerald-100 transition-all active:scale-95">
                    <Camera className="w-5 h-5" /> <span className="text-[10px] font-bold">ถ่ายรูป</span>
                  </button>
                  <button onClick={isRecording ? handleStopRecording : handleStartRecording} className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all active:scale-95 ${isRecording ? 'bg-rose-100 border-rose-300 text-rose-600 animate-pulse' : 'bg-slate-50 hover:bg-rose-50 hover:border-rose-200 text-blue-500 hover:text-rose-600 border-emerald-100'}`}>
                    {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    <span className="text-[10px] font-bold">{isRecording ? 'หยุดอัด' : 'อัดเสียง'}</span>
                  </button>
                  <button onClick={() => videoInputRef.current?.click()} className="flex flex-col items-center justify-center gap-1.5 py-3 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 text-blue-500 hover:text-emerald-600 rounded-xl border border-emerald-100 transition-all active:scale-95">
                    <Video className="w-5 h-5" /> <span className="text-[10px] font-bold">วิดีโอ</span>
                  </button>
                  <button onClick={() => setShowPhoneInput(!showPhoneInput)} className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all active:scale-95 ${showPhoneInput ? 'bg-sky-50 border-sky-300 text-sky-600' : 'bg-slate-50 hover:bg-sky-50 hover:border-sky-200 text-blue-500 hover:text-sky-600 border-emerald-100'}`}>
                    <Phone className="w-5 h-5" /> <span className="text-[10px] font-bold">เบอร์โทร</span>
                  </button>
                  <button onClick={() => setShowContactInput(!showContactInput)} className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all active:scale-95 ${showContactInput ? 'bg-violet-50 border-violet-300 text-violet-600' : 'bg-slate-50 hover:bg-violet-50 hover:border-violet-200 text-blue-500 hover:text-violet-600 border-emerald-100'}`}>
                    <UserIcon className="w-5 h-5" /> <span className="text-[10px] font-bold">ผู้ติดต่อ</span>
                  </button>
                  <button onClick={handleGetGPS} disabled={gpsLoading} className={`flex flex-col items-center justify-center gap-1.5 py-3 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 text-blue-500 hover:text-amber-600 rounded-xl border border-emerald-100 transition-all active:scale-95 ${gpsLoading ? 'opacity-50' : ''}`}>
                    <MapPin className={`w-5 h-5 ${gpsLoading ? 'animate-pulse' : ''}`} /> <span className="text-[10px] font-bold">{gpsLoading ? 'กำลังหา...' : 'พิกัด GPS'}</span>
                  </button>
                </div>

                {showPhoneInput && (
                  <div className="mt-2 flex gap-2">
                    <input type="tel" value={phoneValue} onChange={e => setPhoneValue(e.target.value)} placeholder="0812345678" className="flex-1 bg-slate-50 border border-sky-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" onKeyDown={e => e.key === 'Enter' && handleAddPhone()} />
                    <button onClick={handleAddPhone} className="px-3 py-2 bg-sky-500 text-white rounded-xl text-sm font-bold active:scale-95">เพิ่ม</button>
                  </div>
                )}

                {showContactInput && (
                  <div className="mt-2 flex gap-2">
                    <input type="text" value={contactValue} onChange={e => setContactValue(e.target.value)} placeholder="ชื่อผู้ติดต่อ" className="flex-1 bg-slate-50 border border-violet-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" onKeyDown={e => e.key === 'Enter' && handleAddContact()} />
                    <button onClick={handleAddContact} className="px-3 py-2 bg-violet-500 text-white rounded-xl text-sm font-bold active:scale-95">เพิ่ม</button>
                  </div>
                )}
              </div>

              {/* Attachment List */}
              {formAttachments.length > 0 && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-2 block">ไฟล์แนบ ({formAttachments.length})</label>
                  <div className="space-y-1.5">
                    {formAttachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${att.type === 'photo' ? 'bg-emerald-100 text-emerald-600' : att.type === 'audio' ? 'bg-rose-100 text-rose-600' : att.type === 'video' ? 'bg-emerald-100 text-emerald-600' : att.type === 'phone' ? 'bg-sky-100 text-sky-600' : att.type === 'contact' ? 'bg-violet-100 text-violet-600' : 'bg-amber-100 text-amber-600'}`}>
                          {att.type === 'photo' && <Image className="w-3.5 h-3.5" />}
                          {att.type === 'audio' && <Mic className="w-3.5 h-3.5" />}
                          {att.type === 'video' && <Video className="w-3.5 h-3.5" />}
                          {att.type === 'phone' && <Phone className="w-3.5 h-3.5" />}
                          {att.type === 'contact' && <UserIcon className="w-3.5 h-3.5" />}
                          {att.type === 'gps' && <MapPin className="w-3.5 h-3.5" />}
                        </div>
                        {att.preview && <img src={att.preview} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />}
                        {att.type === 'audio' && <audio src={att.value} controls className="h-7 flex-1 min-w-0" />}
                        <span className="text-xs text-blue-600 font-medium truncate flex-1">{att.label}</span>
                        {att.type === 'gps' && <a href={`https://maps.google.com/?q=${att.value}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-600 font-bold shrink-0">แผนที่</a>}
                        <button onClick={() => removeAttachment(i)} className="p-1 hover:bg-rose-50 rounded-lg text-blue-400 hover:text-rose-500 transition-colors shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Action buttons */}
              <div className="flex justify-between gap-3 pt-2">
                {editId && (
                  <button
                    onClick={() => {
                      closeForm();
                      deleteTask(editId);
                    }}
                    className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm rounded-xl transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> ลบ
                  </button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button onClick={closeForm} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm rounded-xl transition-colors">ยกเลิก</button>
                  <button onClick={saveForm} disabled={!form.title.trim()} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-200 transition-colors disabled:opacity-40 flex items-center gap-2">
                    <Save className="w-4 h-4" /> {editId ? 'บันทึก' : 'สร้าง Task'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Grid Cards Overview ===== */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {groupStyles.map((type) => {
          const group = tasks.filter(t => t.category === type.key);
          const doneCount = group.filter(t => t.completed).length;
          const isActive = selectedCat === type.key;

          // Icon mapping
          const IconComponent = type.icon === 'sun' ? Sun
            : type.icon === 'moon' ? Moon
            : type.icon === 'code' ? Code
            : type.icon === 'home' ? Home
            : type.icon === 'brain' ? Brain
            : type.icon === 'heart' ? Heart
            : type.icon === 'dumbbell' ? Dumbbell
            : type.icon === 'users' ? Users
            : type.icon === 'user' ? UserIcon
            : type.icon === 'file' ? FileText
            : type.icon === 'coffee' ? Coffee
            : type.icon === 'wrench' ? Wrench
            : type.icon === 'zap' ? Zap
            : type.icon === 'briefcase' ? Briefcase
            : type.icon === 'cart' ? ShoppingCart
            : type.icon === 'star' ? Star
            : type.icon === 'calendar' ? Calendar
            : type.icon === 'clock' ? Clock
            : type.icon === 'target' ? Target
            : type.icon === 'trending' ? TrendingUp
            : type.icon === 'lightbulb' ? Lightbulb
            : type.icon === 'music' ? Music
            : type.icon === 'game' ? Gamepad2
            : type.icon === 'book' ? Book
            : type.icon === 'utensils' ? Utensils
            : type.icon === 'bike' ? Bike
            : type.icon === 'palette' ? Palette
            : type.icon === 'rocket' ? Rocket
            : Briefcase;

          return (
            <button
              key={type.key}
              onClick={() => { setSelectedCat(isActive ? null : type.key); setExpandedId(null); }}
              className={`${type.bg} border-2 ${type.border} rounded-xl p-2.5 transition-all duration-300 hover:shadow-md ${
                isActive ? `${type.ring} ring-2 ring-offset-1 shadow-md scale-105` : 'hover:scale-102'
              }`}
            >
              <div className="flex flex-col items-center gap-1.5">
                {/* Icon */}
                <div className={`w-11 h-11 rounded-xl ${type.iconBg} flex items-center justify-center shadow-md`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>

                {/* Task count */}
                <span className={`text-2xl font-black ${type.text} leading-none`}>{group.length}</span>

                {/* Label */}
                <span className={`text-[10px] font-bold ${type.text} text-center leading-tight`}>{type.label}</span>

                {/* Done count */}
                {doneCount > 0 && (
                  <span className="text-[9px] font-black bg-white/50 px-1.5 py-0.5 rounded-full text-slate-600">
                    ✓ {doneCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ===== Selected Category Modal ===== */}
      {selectedCat && (() => {
        const style = getTypeStyle(selectedCat);
        const group = tasks.filter(t => t.category === selectedCat)
          .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate));

        // Icon mapping for modal
        const IconComponent = style.icon === 'sun' ? Sun
          : style.icon === 'moon' ? Moon
          : style.icon === 'code' ? Code
          : style.icon === 'home' ? Home
          : style.icon === 'brain' ? Brain
          : style.icon === 'heart' ? Heart
          : style.icon === 'dumbbell' ? Dumbbell
          : style.icon === 'users' ? Users
          : style.icon === 'user' ? UserIcon
          : style.icon === 'file' ? FileText
          : style.icon === 'coffee' ? Coffee
          : style.icon === 'wrench' ? Wrench
          : style.icon === 'zap' ? Zap
          : style.icon === 'briefcase' ? Briefcase
          : style.icon === 'cart' ? ShoppingCart
          : style.icon === 'star' ? Star
          : style.icon === 'calendar' ? Calendar
          : style.icon === 'clock' ? Clock
          : style.icon === 'target' ? Target
          : style.icon === 'trending' ? TrendingUp
          : style.icon === 'lightbulb' ? Lightbulb
          : style.icon === 'music' ? Music
          : style.icon === 'game' ? Gamepad2
          : style.icon === 'book' ? Book
          : style.icon === 'utensils' ? Utensils
          : style.icon === 'bike' ? Bike
          : style.icon === 'palette' ? Palette
          : style.icon === 'rocket' ? Rocket
          : Briefcase;

        return (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl animate-fadeIn my-8">
              {/* Modal Header */}
              <div className={`${style.bg} border-b-2 ${style.border} p-4 rounded-t-2xl`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center shadow-sm`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{style.emoji}</span>
                        <span className={`text-lg font-black ${style.text}`}>{style.label}</span>
                        <span className="text-xs text-slate-400 font-bold">({group.length})</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openNewFormWithCategory(selectedCat)} className={`px-3 py-2 bg-white ${style.border} border ${style.text} rounded-xl text-xs font-bold transition-colors active:scale-95 hover:shadow-md`}>
                      <Plus className="w-3.5 h-3.5 inline mr-1" />เพิ่ม Task
                    </button>
                    <button onClick={() => setSelectedCat(null)} className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-500 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                {group.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-12">ยังไม่มี task ในหมวดนี้</p>
                ) : (
                  <div className="space-y-2">
                    {group.map(task => (
                      <div key={task.id} className={`bg-white border border-slate-200 rounded-xl transition-all ${task.completed ? 'opacity-40' : 'hover:shadow-sm'}`}>
                        <div className="px-3 py-2 cursor-pointer" onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}>
                          {/* Title Row */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <button onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }} className="shrink-0 active:scale-90">
                              {task.completed ? (
                                <CheckCircle2 className={`w-5 h-5 ${style.text}`} />
                              ) : (
                                <Circle className={`w-5 h-5 ${style.text} opacity-40 hover:opacity-70`} />
                              )}
                            </button>
                            <span className={`text-sm font-bold flex-1 ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {task.title}
                            </span>
                          </div>

                          {/* Metadata Row */}
                          <div className="flex items-center gap-2 ml-7">
                            {task.recurring === 'daily' && (
                              <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded shrink-0">ทุกวัน</span>
                            )}
                            {(task.attachments?.length ?? 0) > 0 && (
                              <Paperclip className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                            )}
                            <span className="text-[10px] text-blue-500 font-bold shrink-0">{task.startTime}–{task.endTime}</span>
                            <span className="text-[10px] text-slate-200 shrink-0">|</span>
                            {task.startDate === task.endDate ? (
                              <span className="text-[10px] text-emerald-500 font-bold shrink-0">{task.startDate}</span>
                            ) : (
                              <span className="text-[10px] font-bold shrink-0">
                                <span className="text-emerald-500">{task.startDate}</span>
                                <span className="text-slate-300">→</span>
                                <span className="text-orange-500">{task.endDate}</span>
                              </span>
                            )}
                            <div className="flex items-center shrink-0 ml-auto" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => openEditForm(task)} className="p-1 rounded text-slate-300 hover:text-blue-500 transition-colors" title="แก้ไข">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteTask(task.id)} className="p-1 rounded text-slate-300 hover:text-rose-500 transition-colors" title="ลบ">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Confirmation Dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
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
      )}
    </div>
  );
};

export default TaskManager;
