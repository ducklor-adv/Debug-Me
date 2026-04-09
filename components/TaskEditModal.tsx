
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Task, TaskAttachment, SubTask, Recurrence, TaskGroup, GROUP_COLORS, DayType, PRIORITY_DEFAULT, PRIORITY_LEVELS, getPriorityMeta } from '../types';
import {
  Plus, Trash2, CheckCircle2, Circle, X, Camera, Mic, Video, Phone, User as UserIcon, MapPin,
  Square, Image, Paperclip, Save, FileText, ListTodo, Clock, ChevronDown,
  Sun, Moon, Coffee, Code, Home, Wrench, Dumbbell, BookOpen, Brain,
  Pencil, Heart, HeartPulse, Users, Zap, Briefcase, ShoppingCart, Star,
  Calendar, Target, TrendingUp, Lightbulb, Music, Gamepad2, Utensils, Bike,
  Palette, Rocket, CloudLightning, Handshake, Bot, Copy, Check,
} from 'lucide-react';
import { generateTaskBreakdownPrompt } from '../services/aiPromptGenerator';

// Custom SVG icons
const BroomIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="13" />
    <rect x="9.5" y="12.5" width="5" height="2" rx="0.5" />
    <line x1="8" y1="14.5" x2="6" y2="22" /><line x1="9.5" y1="14.5" x2="8.5" y2="22" /><line x1="11" y1="14.5" x2="10.5" y2="22" />
    <line x1="12" y1="14.5" x2="12" y2="22" /><line x1="13" y1="14.5" x2="13.5" y2="22" /><line x1="14.5" y1="14.5" x2="15.5" y2="22" /><line x1="16" y1="14.5" x2="18" y2="22" />
  </svg>
);
const FlexIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 17 L10 13" /><path d="M10 13 L7 5" /><path d="M7 8 Q5 10 8 12" /><circle cx="7" cy="4.5" r="1.5" fill="currentColor" />
  </svg>
);
const BrainIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4 Q2 4 3 12 Q2 18 6 20 Q9 22 12 20" /><path d="M12 4 Q22 4 21 12 Q22 18 18 20 Q15 22 12 20" />
    <path d="M12 4 L12 20" /><path d="M5 10 Q8 9 9 12" /><path d="M6 16 Q8 14 10 16" /><path d="M19 10 Q16 9 15 12" /><path d="M18 16 Q16 14 14 16" />
  </svg>
);
const FamilyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7" cy="5" r="2" /><circle cx="17" cy="5" r="2" /><circle cx="12" cy="9" r="1.5" />
    <path d="M5 10c0 0-1 2-1 4h6" /><path d="M19 10c0 0 1 2 1 4h-6" /><path d="M10.5 12c0 0-.5 1.5-.5 3h4c0-1.5-.5-3-.5-3" />
    <line x1="4" y1="14" x2="4" y2="20" /><line x1="10" y1="14" x2="10" y2="20" /><line x1="14" y1="15" x2="14" y2="20" /><line x1="20" y1="14" x2="20" y2="20" />
  </svg>
);

const GROUP_ICON_MAP: Record<string, React.ReactNode> = {
  code: <Code className="w-3.5 h-3.5" />, home: <Home className="w-3.5 h-3.5" />, coffee: <Coffee className="w-3.5 h-3.5" />,
  brain: <Brain className="w-3.5 h-3.5" />, book: <BookOpen className="w-3.5 h-3.5" />, gym: <Dumbbell className="w-3.5 h-3.5" />,
  file: <FileText className="w-3.5 h-3.5" />, wrench: <Wrench className="w-3.5 h-3.5" />, sun: <Sun className="w-3.5 h-3.5" />,
  moon: <Moon className="w-3.5 h-3.5" />, lightning: <CloudLightning className="w-3.5 h-3.5" />,
  broom: <BroomIcon className="w-3.5 h-3.5" />, family: <FamilyIcon className="w-3.5 h-3.5" />,
  flex: <FlexIcon className="w-3.5 h-3.5" />, brain2: <BrainIcon className="w-3.5 h-3.5" />,
  target: <Target className="w-3.5 h-3.5" />, pencil: <Pencil className="w-3.5 h-3.5" />,
  heart: <Heart className="w-3.5 h-3.5" />, heartpulse: <HeartPulse className="w-3.5 h-3.5" />,
  dumbbell: <Dumbbell className="w-3.5 h-3.5" />, users: <Users className="w-3.5 h-3.5" />,
  zap: <Zap className="w-3.5 h-3.5" />, briefcase: <Briefcase className="w-3.5 h-3.5" />,
  cart: <ShoppingCart className="w-3.5 h-3.5" />, star: <Star className="w-3.5 h-3.5" />,
  calendar: <Calendar className="w-3.5 h-3.5" />, clock: <Clock className="w-3.5 h-3.5" />,
  trending: <TrendingUp className="w-3.5 h-3.5" />, lightbulb: <Lightbulb className="w-3.5 h-3.5" />,
  music: <Music className="w-3.5 h-3.5" />, game: <Gamepad2 className="w-3.5 h-3.5" />,
  utensils: <Utensils className="w-3.5 h-3.5" />, bike: <Bike className="w-3.5 h-3.5" />,
  palette: <Palette className="w-3.5 h-3.5" />, rocket: <Rocket className="w-3.5 h-3.5" />,
  handshake: <Handshake className="w-3.5 h-3.5" />,
};

const getGroupStyle = (g: TaskGroup) => {
  const c = GROUP_COLORS[g.color] || GROUP_COLORS.orange;
  return { key: g.key, label: g.label, emoji: g.emoji, icon: g.icon, size: g.size, ...c };
};

const emptyForm = (): Omit<Task, 'id'> => ({
  title: '', description: '', priority: PRIORITY_DEFAULT, completed: false,
  category: 'งานหลัก', notes: '', attachments: [], dayTypes: ['workday', 'saturday', 'sunday'],
});

export interface TaskEditModalProps {
  isOpen: boolean;
  editId: string | null;
  initialTask: Omit<Task, 'id'> | null;
  initialSubtasks?: SubTask[];
  initialAttachments?: TaskAttachment[];
  initialRecurrence?: Recurrence;
  taskGroups: TaskGroup[];
  onClose: () => void;
  onSave: (data: { form: Omit<Task, 'id'>; subtasks: SubTask[]; attachments: TaskAttachment[]; recurrence?: Recurrence }) => void;
  onDelete?: (taskId: string) => void;
}

const TaskEditModal: React.FC<TaskEditModalProps> = ({
  isOpen, editId, initialTask, initialSubtasks, initialAttachments, initialRecurrence,
  taskGroups, onClose, onSave, onDelete,
}) => {
  const [form, setForm] = useState<Omit<Task, 'id'>>(emptyForm());
  const [formAttachments, setFormAttachments] = useState<TaskAttachment[]>([]);
  const [formSubtasks, setFormSubtasks] = useState<SubTask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [formRecurrence, setFormRecurrence] = useState<Recurrence | undefined>(undefined);
  const [expandedSubtaskId, setExpandedSubtaskId] = useState<string | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<'time' | 'plan' | 'detail'>('detail');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

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

  const groupStyles = taskGroups.map(getGroupStyle);

  // Sync form from props when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm(initialTask || emptyForm());
      setFormAttachments(initialAttachments || []);
      setFormSubtasks(initialSubtasks || []);
      setFormRecurrence(initialRecurrence);
      setNewSubtaskTitle('');
      setExpandedSubtaskId(null);
      setShowPhoneInput(false);
      setShowContactInput(false);
      setShowCategoryPicker(false);
      setActiveFormTab('detail');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Subtask helpers
  const addSubtask = () => {
    const title = newSubtaskTitle.trim();
    if (!title) return;
    setFormSubtasks(prev => [...prev, { id: Date.now().toString(), title, completed: false }]);
    setNewSubtaskTitle('');
  };
  const toggleSubtask = (id: string) => setFormSubtasks(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  const removeSubtask = (id: string) => setFormSubtasks(prev => prev.filter(s => s.id !== id));
  const updateSubtaskNote = (id: string, note: string) => setFormSubtasks(prev => prev.map(s => s.id === id ? { ...s, note: note || undefined } : s));
  const removeAttachment = (index: number) => setFormAttachments(prev => prev.filter((_, i) => i !== index));

  // Attachment handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setFormAttachments(prev => [...prev, { type, label: type === 'photo' ? `รูปภาพ: ${file.name}` : `วิดีโอ: ${file.name}`, value: file.name, preview: type === 'photo' ? url : undefined }]);
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

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({ form, subtasks: formSubtasks, attachments: formAttachments, recurrence: formRecurrence });
  };

  return createPortal(
    <div style={{ zIndex: 9000 }} className="fixed inset-0 flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-4 pt-16 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl animate-fadeIn overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <h3 className="font-bold text-slate-800 text-base">{editId ? 'แก้ไข Task' : 'เพิ่ม Task ใหม่'}</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sticky Title + Description */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 shrink-0 bg-white space-y-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">ชื่อ Task</label>
            <input type="text" autoFocus value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="What needs to be done?" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">คำอธิบาย</label>
            <textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} placeholder="รายละเอียดของงาน..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 h-20 resize-none" />
          </div>
        </div>

        {/* Scrollable body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* ประเภท — popup picker */}
          <div className="relative">
            <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">ประเภท</label>
            {(() => {
              const selected = groupStyles.find(t => t.key === form.category);
              return (
                <button onClick={() => setShowCategoryPicker(true)} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all flex items-center gap-2 ${selected ? `${selected.bg} ${selected.border} ${selected.text}` : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                  {selected && <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg ${selected.iconBg} text-white`}>{GROUP_ICON_MAP[selected.icon] || selected.emoji}</span>}
                  {selected ? selected.label : 'เลือกประเภท'}
                  <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-50" />
                </button>
              );
            })()}
            {showCategoryPicker && (
              <>
                <div className="fixed inset-0 z-50" onClick={() => setShowCategoryPicker(false)} />
                <div className="absolute left-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 w-72">
                  <div className="flex flex-wrap gap-1.5">
                    {groupStyles.filter(t => { const tg = taskGroups.find(g => g.key === t.key); return tg?.categoryKey; }).map(t => (
                      <button key={t.key} onClick={() => { setForm({...form, category: t.key}); setShowCategoryPicker(false); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${form.category === t.key ? `${t.bg} ${t.border} ${t.text}` : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}>
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${form.category === t.key ? t.iconBg : 'bg-slate-300'} text-white`}>{GROUP_ICON_MAP[t.icon] || t.emoji}</span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ═══════ Priority Picker ═══════ */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-blue-500">Priority</label>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${getPriorityMeta(form.priority).color} ${getPriorityMeta(form.priority).textColor}`}>
                {form.priority} — {getPriorityMeta(form.priority).label}
              </span>
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {PRIORITY_LEVELS.map(p => {
                const isSelected = form.priority === p.level;
                return (
                  <button
                    key={p.level}
                    onClick={() => setForm({ ...form, priority: p.level })}
                    className={`h-9 rounded-xl text-xs font-black transition-all ${
                      isSelected
                        ? `${p.color} ${p.textColor} ring-2 ring-offset-1 ${p.level >= 7 ? 'ring-orange-300' : p.level >= 5 ? 'ring-yellow-300' : 'ring-emerald-300'} scale-105`
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                    }`}
                  >
                    {p.level}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══════ Folder Tabs ═══════ */}
          <div>
            <div className="flex items-end gap-0.5 px-1">
              <button onClick={() => setActiveFormTab('detail')} className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold transition-all rounded-t-xl border border-b-0 ${activeFormTab === 'detail' ? 'bg-emerald-50 border-emerald-300 text-emerald-700 relative z-10 -mb-px pb-2.5' : 'bg-emerald-100/60 border-emerald-200/60 text-emerald-400 hover:bg-emerald-100 hover:text-emerald-500 -mb-px pb-1.5 scale-[0.97] origin-bottom'}`}>
                <Paperclip className="w-3.5 h-3.5" />
                <span>รายละเอียด</span>
                {formAttachments.length > 0 && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeFormTab === 'detail' ? 'bg-emerald-200 text-emerald-700' : 'bg-emerald-200/60 text-emerald-500'}`}>{formAttachments.length}</span>}
              </button>
              <button onClick={() => setActiveFormTab('plan')} className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold transition-all rounded-t-xl border border-b-0 ${activeFormTab === 'plan' ? 'bg-amber-50 border-amber-300 text-amber-700 relative z-10 -mb-px pb-2.5' : 'bg-amber-100/60 border-amber-200/60 text-amber-400 hover:bg-amber-100 hover:text-amber-500 -mb-px pb-1.5 scale-[0.97] origin-bottom'}`}>
                <ListTodo className="w-3.5 h-3.5" />
                <span>แผนงาน</span>
                {formSubtasks.length > 0 && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeFormTab === 'plan' ? 'bg-amber-200 text-amber-700' : 'bg-amber-200/60 text-amber-500'}`}>{formSubtasks.length}</span>}
              </button>
              <button onClick={() => setActiveFormTab('time')} className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold transition-all rounded-t-xl border border-b-0 ${activeFormTab === 'time' ? 'bg-blue-50 border-blue-300 text-blue-700 relative z-10 -mb-px pb-2.5' : 'bg-blue-100/60 border-blue-200/60 text-blue-400 hover:bg-blue-100 hover:text-blue-500 -mb-px pb-1.5 scale-[0.97] origin-bottom'}`}>
                <Clock className="w-3.5 h-3.5" />
                <span>จัดการเวลา</span>
              </button>
            </div>

            <div className={`p-4 rounded-b-xl border ${activeFormTab === 'detail' ? 'bg-emerald-50/40 border-emerald-300 rounded-tr-xl' : activeFormTab === 'plan' ? 'bg-amber-50/40 border-amber-300 rounded-tl-xl rounded-tr-xl' : 'bg-blue-50/40 border-blue-300 rounded-tl-xl'}`}>
              {/* ── Tab: จัดการเวลา ── */}
              {activeFormTab === 'time' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">การทำซ้ำ</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {([{ key: undefined, label: 'ไม่ซ้ำ' }, { key: 'daily', label: 'ทุกวัน' }, { key: 'every_x_days', label: 'ทุก X วัน' }, { key: 'weekly', label: 'รายสัปดาห์' }, { key: 'monthly', label: 'รายเดือน' }, { key: 'yearly', label: 'รายปี' }] as { key: Recurrence['pattern'] | undefined; label: string }[]).map(opt => (
                        <button key={opt.label} onClick={() => setFormRecurrence(opt.key ? { pattern: opt.key } : undefined)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${(formRecurrence?.pattern || undefined) === opt.key ? 'bg-violet-100 text-violet-700 border-violet-300' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}>{opt.label}</button>
                      ))}
                    </div>
                    {formRecurrence?.pattern === 'every_x_days' && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-slate-500 font-bold">ทุก</span>
                        <input type="number" min="2" max="365" value={formRecurrence.interval || 2} onChange={e => setFormRecurrence({ ...formRecurrence, interval: parseInt(e.target.value) || 2 })} className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-violet-400" />
                        <span className="text-sm text-slate-500 font-bold">วัน</span>
                      </div>
                    )}
                    {formRecurrence?.pattern === 'weekly' && (
                      <div className="mt-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">เลือกวัน</span>
                        <div className="flex gap-1.5">
                          {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => {
                            const isOn = (formRecurrence.weekDays || []).includes(i);
                            return <button key={i} onClick={() => { const days = formRecurrence.weekDays || []; setFormRecurrence({ ...formRecurrence, weekDays: isOn ? days.filter(x => x !== i) : [...days, i] }); }} className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${isOn ? 'bg-violet-500 text-white' : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100'}`}>{d}</button>;
                          })}
                        </div>
                      </div>
                    )}
                    {formRecurrence?.pattern === 'monthly' && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-slate-500 font-bold">ทุกวันที่</span>
                        <input type="number" min="1" max="31" value={formRecurrence.monthDay || 1} onChange={e => setFormRecurrence({ ...formRecurrence, monthDay: parseInt(e.target.value) || 1 })} className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-violet-400" />
                        <span className="text-sm text-slate-500 font-bold">ของเดือน</span>
                      </div>
                    )}
                    {formRecurrence?.pattern === 'yearly' && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-slate-500 font-bold">เดือน</span>
                        <select value={formRecurrence.monthDate?.month || 1} onChange={e => setFormRecurrence({ ...formRecurrence, monthDate: { month: parseInt(e.target.value), day: formRecurrence.monthDate?.day || 1 } })} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-400">
                          {['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'].map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                        </select>
                        <span className="text-sm text-slate-500 font-bold">วันที่</span>
                        <input type="number" min="1" max="31" value={formRecurrence.monthDate?.day || 1} onChange={e => setFormRecurrence({ ...formRecurrence, monthDate: { month: formRecurrence.monthDate?.month || 1, day: parseInt(e.target.value) || 1 } })} className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-violet-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">ระยะเวลาโดยประมาณ (นาที)</label>
                    <input type="number" min="0" step="5" value={form.estimatedDuration || ''} onChange={e => setForm({...form, estimatedDuration: e.target.value ? parseInt(e.target.value) : undefined})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="เช่น 30" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">ทำวันไหน</label>
                    <div className="flex gap-2">
                      {([['workday', 'จ-ศ'], ['saturday', 'เสาร์'], ['sunday', 'อาทิตย์']] as [string, string][]).map(([key, label]) => {
                        const isOn = !form.dayTypes || form.dayTypes.length === 0 || form.dayTypes.includes(key as DayType);
                        return <button key={key} onClick={() => { const current = form.dayTypes || ['workday', 'saturday', 'sunday'] as DayType[]; const next = isOn ? current.filter(d => d !== key) : [...current, key as DayType]; setForm({ ...form, dayTypes: next.length > 0 ? next : undefined }); }} className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${isOn ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}>{label}</button>;
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">ช่วงวัน (ถ้ามี deadline)</label>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="date" value={form.startDate || ''} onChange={e => setForm({...form, startDate: e.target.value || undefined, endDate: !form.endDate || (e.target.value > (form.endDate || '')) ? e.target.value || undefined : form.endDate})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      <input type="date" value={form.endDate || ''} min={form.startDate || ''} onChange={e => setForm({...form, endDate: e.target.value || undefined})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">เว้นว่างไว้ = ทำซ้ำทุกวัน (ตาม dayTypes)</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">กำหนดเวลา</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div><span className="text-[10px] text-slate-400 font-bold block mb-1">เริ่ม</span><input type="time" value={form.startTime || ''} onChange={e => setForm({...form, startTime: e.target.value || undefined})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                      <div><span className="text-[10px] text-slate-400 font-bold block mb-1">ถึง</span><input type="time" value={form.endTime || ''} onChange={e => setForm({...form, endTime: e.target.value || undefined})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">เว้นว่าง = ไม่กำหนดเวลา</p>
                  </div>
                </div>
              )}

              {/* ── Tab: แผนงาน ── */}
              {activeFormTab === 'plan' && (
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">To do List ({formSubtasks.length})</label>
                  <div className="flex gap-2 mb-2">
                    <input type="text" value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubtask())} placeholder="เพิ่มรายการ..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    <button onClick={addSubtask} disabled={!newSubtaskTitle.trim()} className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-40 active:scale-95"><Plus className="w-4 h-4" /></button>
                  </div>
                  {formSubtasks.length > 0 && (
                    <div className="space-y-1.5">
                      {formSubtasks.map(sub => (
                        <div key={sub.id} className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2">
                            <button onClick={() => toggleSubtask(sub.id)} className="shrink-0 active:scale-90">
                              {sub.completed ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-300" />}
                            </button>
                            <span className={`text-sm flex-1 ${sub.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{sub.title}</span>
                            <button onClick={() => setExpandedSubtaskId(expandedSubtaskId === sub.id ? null : sub.id)} className={`p-1 rounded transition-colors shrink-0 ${expandedSubtaskId === sub.id || sub.note ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'}`}><FileText className="w-3.5 h-3.5" /></button>
                            <button onClick={() => removeSubtask(sub.id)} className="p-1 hover:bg-rose-50 rounded text-slate-300 hover:text-rose-500 transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                          {expandedSubtaskId === sub.id && (
                            <div className="px-3 pb-2 pt-0">
                              <textarea value={sub.note || ''} onChange={e => updateSubtaskNote(sub.id, e.target.value)} placeholder="รายละเอียดเพิ่มเติม..." className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 h-16 resize-none" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: รายละเอียด ── */}
              {activeFormTab === 'detail' && (
                <div className="space-y-3">
                  <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFileSelect(e, 'photo')} />
                  <input ref={videoInputRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={e => handleFileSelect(e, 'video')} />
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => photoInputRef.current?.click()} className="flex flex-col items-center justify-center gap-1.5 py-3 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 text-blue-500 hover:text-emerald-600 rounded-xl border border-emerald-100 transition-all active:scale-95"><Camera className="w-5 h-5" /> <span className="text-[10px] font-bold">ถ่ายรูป</span></button>
                    <button onClick={isRecording ? handleStopRecording : handleStartRecording} className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all active:scale-95 ${isRecording ? 'bg-rose-100 border-rose-300 text-rose-600 animate-pulse' : 'bg-slate-50 hover:bg-rose-50 hover:border-rose-200 text-blue-500 hover:text-rose-600 border-emerald-100'}`}>{isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}<span className="text-[10px] font-bold">{isRecording ? 'หยุดอัด' : 'อัดเสียง'}</span></button>
                    <button onClick={() => videoInputRef.current?.click()} className="flex flex-col items-center justify-center gap-1.5 py-3 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 text-blue-500 hover:text-emerald-600 rounded-xl border border-emerald-100 transition-all active:scale-95"><Video className="w-5 h-5" /> <span className="text-[10px] font-bold">วิดีโอ</span></button>
                    <button onClick={() => setShowPhoneInput(!showPhoneInput)} className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all active:scale-95 ${showPhoneInput ? 'bg-sky-50 border-sky-300 text-sky-600' : 'bg-slate-50 hover:bg-sky-50 hover:border-sky-200 text-blue-500 hover:text-sky-600 border-emerald-100'}`}><Phone className="w-5 h-5" /> <span className="text-[10px] font-bold">เบอร์โทร</span></button>
                    <button onClick={() => setShowContactInput(!showContactInput)} className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all active:scale-95 ${showContactInput ? 'bg-violet-50 border-violet-300 text-violet-600' : 'bg-slate-50 hover:bg-violet-50 hover:border-violet-200 text-blue-500 hover:text-violet-600 border-emerald-100'}`}><UserIcon className="w-5 h-5" /> <span className="text-[10px] font-bold">ผู้ติดต่อ</span></button>
                    <button onClick={handleGetGPS} disabled={gpsLoading} className={`flex flex-col items-center justify-center gap-1.5 py-3 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 text-blue-500 hover:text-amber-600 rounded-xl border border-emerald-100 transition-all active:scale-95 ${gpsLoading ? 'opacity-50' : ''}`}><MapPin className={`w-5 h-5 ${gpsLoading ? 'animate-pulse' : ''}`} /> <span className="text-[10px] font-bold">{gpsLoading ? 'กำลังหา...' : 'พิกัด GPS'}</span></button>
                  </div>
                  {showPhoneInput && (<div className="mt-2 flex gap-2"><input type="tel" value={phoneValue} onChange={e => setPhoneValue(e.target.value)} placeholder="0812345678" className="flex-1 bg-slate-50 border border-sky-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" onKeyDown={e => e.key === 'Enter' && handleAddPhone()} /><button onClick={handleAddPhone} className="px-3 py-2 bg-sky-500 text-white rounded-xl text-sm font-bold active:scale-95">เพิ่ม</button></div>)}
                  {showContactInput && (<div className="mt-2 flex gap-2"><input type="text" value={contactValue} onChange={e => setContactValue(e.target.value)} placeholder="ชื่อผู้ติดต่อ" className="flex-1 bg-slate-50 border border-violet-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" onKeyDown={e => e.key === 'Enter' && handleAddContact()} /><button onClick={handleAddContact} className="px-3 py-2 bg-violet-500 text-white rounded-xl text-sm font-bold active:scale-95">เพิ่ม</button></div>)}
                  {formAttachments.length > 0 && (
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">ไฟล์แนบ ({formAttachments.length})</label>
                      <div className="space-y-1.5">
                        {formAttachments.map((att, i) => (
                          <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${att.type === 'photo' ? 'bg-emerald-100 text-emerald-600' : att.type === 'audio' ? 'bg-rose-100 text-rose-600' : att.type === 'video' ? 'bg-emerald-100 text-emerald-600' : att.type === 'phone' ? 'bg-sky-100 text-sky-600' : att.type === 'contact' ? 'bg-violet-100 text-violet-600' : 'bg-amber-100 text-amber-600'}`}>
                              {att.type === 'photo' && <Image className="w-3.5 h-3.5" />}{att.type === 'audio' && <Mic className="w-3.5 h-3.5" />}{att.type === 'video' && <Video className="w-3.5 h-3.5" />}{att.type === 'phone' && <Phone className="w-3.5 h-3.5" />}{att.type === 'contact' && <UserIcon className="w-3.5 h-3.5" />}{att.type === 'gps' && <MapPin className="w-3.5 h-3.5" />}
                            </div>
                            {att.preview && <img src={att.preview} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />}
                            {att.type === 'audio' && <audio src={att.value} controls className="h-7 flex-1 min-w-0" />}
                            <span className="text-xs text-blue-600 font-medium truncate flex-1">{att.label}</span>
                            {att.type === 'gps' && <a href={`https://maps.google.com/?q=${att.value}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-600 font-bold shrink-0">แผนที่</a>}
                            <button onClick={() => removeAttachment(i)} className="p-1 hover:bg-rose-50 rounded-lg text-blue-400 hover:text-rose-500 transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between gap-3 pt-2">
            <div className="flex gap-2">
              {editId && onDelete && (
                <button onClick={() => { onClose(); onDelete(editId); }} className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm rounded-xl transition-colors flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> ลบ
                </button>
              )}
              {form.title.trim() && (
                <button onClick={() => { setShowPromptModal(true); setPromptCopied(false); }} className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-semibold text-sm rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-lg shadow-violet-200">
                  <Bot className="w-4 h-4" /> AI Prompt
                </button>
              )}
            </div>
            <div className="flex gap-3 ml-auto">
              <button onClick={onClose} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm rounded-xl transition-colors">ยกเลิก</button>
              <button onClick={handleSave} disabled={!form.title.trim()} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-200 transition-colors disabled:opacity-40 flex items-center gap-2">
                <Save className="w-4 h-4" /> {editId ? 'บันทึก' : 'สร้าง Task'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Prompt Modal Overlay */}
      {showPromptModal && (
        <div style={{ zIndex: 9100 }} className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl animate-fadeIn overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">AI Prompt</h3>
                  <p className="text-[10px] text-slate-400">คัดลอกไปวาง AI chatbot</p>
                </div>
              </div>
              <button onClick={() => setShowPromptModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
                <p className="text-xs text-violet-700 leading-relaxed">
                  คัดลอก prompt นี้ไปวางใน AI chatbot (ChatGPT, Claude, Gemini ฯลฯ) แล้วนำ JSON ที่ได้กลับมา import ในหน้า Project
                </p>
              </div>

              <textarea
                readOnly
                value={generateTaskBreakdownPrompt(form, formSubtasks)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono text-slate-600 leading-relaxed focus:outline-none resize-none"
                style={{ minHeight: '200px' }}
                onClick={e => (e.target as HTMLTextAreaElement).select()}
              />
            </div>

            <div className="px-4 py-3 border-t border-slate-100 shrink-0 flex gap-3">
              <button
                onClick={async () => {
                  const prompt = generateTaskBreakdownPrompt(form, formSubtasks);
                  await navigator.clipboard.writeText(prompt);
                  setPromptCopied(true);
                  setTimeout(() => setPromptCopied(false), 3000);
                }}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                  promptCopied
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                    : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-200'
                }`}
              >
                {promptCopied ? <><Check className="w-4 h-4" /> คัดลอกแล้ว!</> : <><Copy className="w-4 h-4" /> คัดลอก Prompt</>}
              </button>
              <button onClick={() => setShowPromptModal(false)} className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm rounded-xl transition-colors">
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default TaskEditModal;
