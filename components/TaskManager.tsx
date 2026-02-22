
import React, { useState, useRef } from 'react';
import { Task, TaskAttachment, Priority, TaskGroup, GROUP_COLORS } from '../types';
import { Plus, Trash2, CheckCircle2, Circle, Sparkles, X, Camera, Mic, Video, Phone, User as UserIcon, MapPin, Square, Image, Paperclip, ChevronDown, ChevronUp, Save, Sun, Moon, Coffee, Code, FileText, Home, Wrench, Dumbbell, BookOpen, Brain } from 'lucide-react';
import { getAIPrioritization } from '../services/geminiService';

interface TaskManagerProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  taskGroups: TaskGroup[];
  setTaskGroups: React.Dispatch<React.SetStateAction<TaskGroup[]>>;
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

const emptyForm = (): Omit<Task, 'id'> => ({
  title: '',
  description: '',
  priority: Priority.MEDIUM,
  completed: false,
  dueDate: new Date().toISOString().split('T')[0],
  category: 'งานหลัก',
  notes: '',
  attachments: [],
});

const TaskManager: React.FC<TaskManagerProps> = ({ tasks, setTasks, taskGroups, setTaskGroups }) => {
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
      dueDate: task.dueDate,
      category: task.category,
      notes: task.notes || '',
      attachments: task.attachments || [],
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
    setTasks(tasks.filter(t => t.id !== id));
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 md:p-6 rounded-2xl border border-emerald-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-1">My Tasks</h2>
          <p className="text-sm text-blue-400 font-medium">Organize your life, one step at a time.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button onClick={handleAIAnalyze} disabled={isAnalyzing} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-fuchsia-50 text-fuchsia-600 rounded-xl font-bold text-sm hover:bg-fuchsia-100 transition-colors disabled:opacity-50 border border-fuchsia-100">
            <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Analyzing...' : 'AI Strategy'}
          </button>
          <button onClick={openGroupForm} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200">
            <Plus className="w-4 h-4" /> Add Group
          </button>
        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl animate-fadeIn overflow-hidden flex flex-col max-h-[90vh]">
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

              {/* Date */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">Due Date</label>
                <input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" />
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
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
              <button onClick={closeForm} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm rounded-xl transition-colors">ยกเลิก</button>
              <button onClick={saveForm} disabled={!form.title.trim()} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-200 transition-colors disabled:opacity-40 flex items-center gap-2">
                <Save className="w-4 h-4" /> {editId ? 'บันทึก' : 'สร้าง Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Circular Overview ===== */}
      <div className="flex justify-center py-2">
        <div className="relative" style={{ width: 300, height: 300 }}>
          {/* Center summary */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[88px] h-[88px] rounded-full bg-white shadow-lg border border-emerald-100 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-800">{tasks.filter(t => !t.completed).length}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">เหลือ</span>
            </div>
          </div>

          {/* category circles */}
          {groupStyles.map((type, i) => {
            const angle = (i * (360 / groupStyles.length) - 90) * Math.PI / 180;
            const r = 108;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            const group = tasks.filter(t => t.category === type.key);
            const doneCount = group.filter(t => t.completed).length;
            const isActive = selectedCat === type.key;

            return (
              <button
                key={type.key}
                onClick={() => { setSelectedCat(isActive ? null : type.key); setExpandedId(null); }}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${isActive ? 'scale-110 z-10' : selectedCat ? 'opacity-50 scale-90' : 'hover:scale-105'}`}
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                }}
              >
                <div
                  className={`rounded-full ${type.bg} border-2 ${type.border} flex flex-col items-center justify-center shadow-md transition-all duration-300 ${isActive ? `${type.ring} ring-4 ring-offset-2 shadow-lg` : ''}`}
                  style={{ width: type.size, height: type.size }}
                >
                  <span className={`font-black ${type.text} leading-none ${type.size >= 80 ? 'text-2xl' : type.size >= 66 ? 'text-xl' : 'text-lg'}`}>{group.length}</span>
                  <span className={`font-bold ${type.text} leading-tight mt-0.5 ${type.size >= 80 ? 'text-[9px]' : 'text-[7px]'}`}>{type.key}</span>
                  {doneCount > 0 && <span className={`text-slate-400 font-bold ${type.size >= 80 ? 'text-[8px]' : 'text-[6px]'}`}>✓{doneCount}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== Wake / Sleep Markers ===== */}
      <div className="flex justify-center gap-4 -mt-1">
        <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 border-2 border-amber-200 rounded-full shadow-sm">
          <span className="text-lg">🌅</span>
          <span className="text-sm font-black text-amber-700">ตื่นนอน</span>
        </div>
        <div className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 border-2 border-indigo-200 rounded-full shadow-sm">
          <span className="text-lg">🌙</span>
          <span className="text-sm font-black text-indigo-700">นอน</span>
        </div>
      </div>

      {/* ===== Selected Category Detail ===== */}
      {selectedCat && (() => {
        const style = getTypeStyle(selectedCat);
        const group = tasks.filter(t => t.category === selectedCat);
        return (
          <div className="space-y-3 animate-fadeIn">
            {/* Category header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${style.dot}`} />
                <span className={`text-lg font-black ${style.text}`}>{style.label}</span>
                <span className="text-xs text-slate-400 font-bold">({group.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openNewFormWithCategory(selectedCat)} className={`px-3 py-1.5 ${style.bg} ${style.border} border ${style.text} rounded-xl text-xs font-bold transition-colors active:scale-95`}>
                  <Plus className="w-3.5 h-3.5 inline mr-1" />เพิ่ม
                </button>
                <button onClick={() => setSelectedCat(null)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {group.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-8">ยังไม่มี task ในหมวดนี้</p>
            ) : (
              group.map(task => (
                <div key={task.id} className={`${style.bg} border ${style.border} rounded-2xl transition-all ${task.completed ? 'opacity-50' : 'hover:shadow-md'}`}>
                  {/* Main row */}
                  <div className="flex items-center gap-3 p-4">
                    <button onClick={() => toggleTask(task.id)} className="shrink-0 transition-transform active:scale-90">
                      {task.completed ? (
                        <CheckCircle2 className={`w-7 h-7 ${style.text}`} />
                      ) : (
                        <Circle className={`w-7 h-7 ${style.text} opacity-40 hover:opacity-70 transition-opacity`} />
                      )}
                    </button>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}>
                      <span className={`text-base font-bold block ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {task.title}
                      </span>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-bold">{task.dueDate}</span>
                        {(task.attachments?.length ?? 0) > 0 && (
                          <>
                            <span className="w-1 h-1 bg-slate-200 rounded-full" />
                            <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5"><Paperclip className="w-2.5 h-2.5" /> {task.attachments!.length}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setExpandedId(expandedId === task.id ? null : task.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-slate-500 transition-colors shrink-0">
                      {expandedId === task.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Expanded details */}
                  {expandedId === task.id && (
                    <div className="px-4 pb-4 pt-0 border-t border-current/10 space-y-2 animate-fadeIn">
                      {task.description && <p className="text-sm text-slate-600 mt-3">{task.description}</p>}
                      {task.notes && (
                        <div className="bg-white/60 rounded-xl p-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Notes</span>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{task.notes}</p>
                        </div>
                      )}
                      {(task.attachments?.length ?? 0) > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ไฟล์แนบ</span>
                          {task.attachments!.map((att, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white/60 border border-slate-200 rounded-lg px-3 py-2">
                              <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${att.type === 'photo' ? 'bg-emerald-100 text-emerald-600' : att.type === 'audio' ? 'bg-rose-100 text-rose-600' : att.type === 'video' ? 'bg-emerald-100 text-emerald-600' : att.type === 'phone' ? 'bg-sky-100 text-sky-600' : att.type === 'contact' ? 'bg-violet-100 text-violet-600' : 'bg-amber-100 text-amber-600'}`}>
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
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => openEditForm(task)} className="px-4 py-2 bg-white/70 hover:bg-white text-slate-700 border border-slate-200 rounded-xl text-sm font-bold transition-colors">แก้ไข</button>
                        <button onClick={() => deleteTask(task.id)} className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-500 border border-rose-200 rounded-xl text-sm font-bold transition-colors">ลบ</button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default TaskManager;
