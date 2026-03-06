
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Task, TaskAttachment, SubTask, Recurrence, Priority, TaskGroup, GROUP_COLORS, LocationReminder, DEFAULT_CATEGORIES, Category } from '../types';
import { Plus, Trash2, CheckCircle2, Circle, Sparkles, X, Camera, Mic, Video, Phone, User as UserIcon, MapPin, Square, Image, Paperclip, Save, Sun, Moon, Coffee, Code, FileText, Home, Wrench, Dumbbell, BookOpen, Brain, RefreshCw, Pencil, Heart, HeartPulse, Users, Zap, Briefcase, ShoppingCart, Star, Calendar, Clock, Target, TrendingUp, Lightbulb, Music, Gamepad2, Book, Utensils, Bike, Palette, Rocket, CloudLightning, Handshake, GripVertical, ListTodo } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { arrayMove } from '@dnd-kit/sortable';

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
import { getAIPrioritization } from '../services/geminiService';
// TimePicker no longer needed (tasks don't have individual times)

interface TaskManagerProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  taskGroups: TaskGroup[];
  setTaskGroups: React.Dispatch<React.SetStateAction<TaskGroup[]>>;
  deletedDefaultTaskIds: string[];
  setDeletedDefaultTaskIds: React.Dispatch<React.SetStateAction<string[]>>;
  onImmediateSave?: (updatedTasks?: Task[], updatedDeletedIds?: string[]) => Promise<void>;
  initialGroupKey?: string | null;
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
  priority: Priority.MEDIUM,
  completed: false,
  category: 'งานหลัก',
  notes: '',
  attachments: [],
  dayTypes: ['workday', 'saturday', 'sunday'],
});

const TaskManager: React.FC<TaskManagerProps> = ({ tasks, setTasks, taskGroups, setTaskGroups, deletedDefaultTaskIds, setDeletedDefaultTaskIds, onImmediateSave, initialGroupKey }) => {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // DnD sensors for task reordering
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
  );

  const handleTaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setTasks(prev => {
      const oldIndex = prev.findIndex(t => t.id === active.id);
      const newIndex = prev.findIndex(t => t.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  // Derive style objects from dynamic groups
  const groupStyles = taskGroups.map(getGroupStyle);
  const getTypeStyle = (cat: string) => groupStyles.find(s => s.key === cat) || groupStyles[0];

  // Group form state
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', emoji: '📌', color: 'cyan', icon: 'code', categoryKey: 'career' });
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState<string | null>(null);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null); // null = new, string = editing
  const [form, setForm] = useState<Omit<Task, 'id'>>(emptyForm());
  const [formAttachments, setFormAttachments] = useState<TaskAttachment[]>([]);
  const [formSubtasks, setFormSubtasks] = useState<SubTask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [formRecurrence, setFormRecurrence] = useState<Recurrence | undefined>(undefined);
  const [formLocationReminder, setFormLocationReminder] = useState<LocationReminder | undefined>(undefined);
  const [locationLoading, setLocationLoading] = useState(false);
  const [expandedSubtaskId, setExpandedSubtaskId] = useState<string | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<'time' | 'plan' | 'detail'>('time');

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
  const savedCatRef = useRef<string | null>(null);

  const openNewForm = () => {
    setEditId(null);
    setForm(emptyForm());
    setFormAttachments([]);
    setFormSubtasks([]);
    setNewSubtaskTitle('');
    setFormRecurrence(undefined);
    setFormLocationReminder(undefined);
    setShowPhoneInput(false);
    setShowContactInput(false);
    setFormOpen(true);
  };

  const openNewFormWithCategory = (cat: string) => {
    savedCatRef.current = selectedCat;
    setSelectedCat(null);
    setEditId(null);
    setForm({ ...emptyForm(), category: cat });
    setFormAttachments([]);
    setFormSubtasks([]);
    setNewSubtaskTitle('');
    setFormRecurrence(undefined);
    setFormLocationReminder(undefined);
    setShowPhoneInput(false);
    setShowContactInput(false);
    setFormOpen(true);
  };

  // Auto-open add-task form when navigated from Dashboard
  useEffect(() => {
    if (initialGroupKey) openNewForm();
  }, [initialGroupKey]);

  const openEditForm = (task: Task) => {
    // Hide category modal while editing, restore on close
    savedCatRef.current = selectedCat;
    setSelectedCat(null);
    setEditId(task.id);
    setForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      completed: task.completed,
      startDate: task.startDate,
      endDate: task.endDate,
      category: task.category,
      notes: task.notes || '',
      attachments: task.attachments || [],
      dayTypes: task.dayTypes,
      estimatedDuration: task.estimatedDuration,
    });
    setFormAttachments(task.attachments || []);
    setFormSubtasks(task.subtasks || []);
    setNewSubtaskTitle('');
    setFormRecurrence(task.recurrence);
    setFormLocationReminder(task.locationReminder);
    setShowPhoneInput(false);
    setShowContactInput(false);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditId(null);
    setForm(emptyForm());
    setFormAttachments([]);
    setFormSubtasks([]);
    setNewSubtaskTitle('');
    setFormRecurrence(undefined);
    setFormLocationReminder(undefined);
    setShowPhoneInput(false);
    setShowContactInput(false);
    // Restore category modal if it was open before editing
    if (savedCatRef.current) {
      setSelectedCat(savedCatRef.current);
      savedCatRef.current = null;
    }
  };

  const saveForm = () => {
    if (!form.title.trim()) return;
    const subtasks = formSubtasks.length > 0 ? formSubtasks : undefined;
    const recurrence = formRecurrence;
    const locationReminder = formLocationReminder;
    if (editId) {
      setTasks(prev => prev.map(t => t.id === editId ? { ...t, ...form, attachments: formAttachments, subtasks, recurrence, locationReminder } : t));
    } else {
      const newTask: Task = { id: Date.now().toString(), ...form, attachments: formAttachments, subtasks, recurrence, locationReminder };
      setTasks(prev => [newTask, ...prev]);
    }
    closeForm();
  };

  // Subtask helpers
  const addSubtask = () => {
    const title = newSubtaskTitle.trim();
    if (!title) return;
    setFormSubtasks(prev => [...prev, { id: Date.now().toString(), title, completed: false }]);
    setNewSubtaskTitle('');
  };

  const toggleSubtask = (id: string) => {
    setFormSubtasks(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const removeSubtask = (id: string) => {
    setFormSubtasks(prev => prev.filter(s => s.id !== id));
  };

  const updateSubtaskNote = (id: string, note: string) => {
    setFormSubtasks(prev => prev.map(s => s.id === id ? { ...s, note: note || undefined } : s));
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
    setEditingGroupKey(null);
    setGroupForm({ name: '', emoji: '📌', color: 'cyan', icon: 'code', categoryKey: 'career' });
    setGroupFormOpen(true);
  };
  const openEditGroup = (g: TaskGroup) => {
    setEditingGroupKey(g.key);
    setGroupForm({ name: g.label, emoji: g.emoji, color: g.color, icon: g.icon, categoryKey: g.categoryKey || 'career' });
    setGroupFormOpen(true);
  };
  const saveGroup = () => {
    const name = groupForm.name.trim();
    if (!name) return;

    if (editingGroupKey) {
      // Edit mode: update group and rename tasks' category
      const oldKey = editingGroupKey;
      setTaskGroups(prev => prev.map(g => g.key === oldKey ? { ...g, key: name, label: name, emoji: groupForm.emoji, color: groupForm.color, icon: groupForm.icon, categoryKey: groupForm.categoryKey } : g));
      if (name !== oldKey) {
        setTasks(prev => prev.map(t => t.category === oldKey ? { ...t, category: name } : t));
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
    }
    setGroupFormOpen(false);
  };
  const deleteGroup = (key: string) => {
    setTaskGroups(prev => prev.filter(g => g.key !== key));
    setTasks(prev => prev.filter(t => t.category !== key));
    setDeleteGroupConfirm(null);
    if (selectedCat === key) setSelectedCat(null);
  };

  return (
    <div className="space-y-6 pb-10">

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

      {/* ===== Task Form (Add / Edit) ===== */}
      {formOpen && createPortal(
        <div style={{ zIndex: 9000 }} className="fixed inset-0 flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-4 pt-16 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl animate-fadeIn overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <h3 className="font-bold text-slate-800 text-base">{editId ? 'แก้ไข Task' : 'เพิ่ม Task ใหม่'}</h3>
              <button onClick={closeForm} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sticky Title */}
            <div className="px-5 pt-4 pb-2 border-b border-slate-100 shrink-0 bg-white">
              <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">ชื่อ Task</label>
              <input type="text" autoFocus value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="What needs to be done?" />
            </div>

            {/* Scrollable body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* ประเภทกิจกรรม — only groups with categoryKey (exclude งานด่วน/นัดหมาย) */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">ประเภท</label>
                <div className="flex flex-wrap gap-1.5">
                  {groupStyles.filter(t => {
                    const tg = taskGroups.find(g => g.key === t.key);
                    return tg?.categoryKey;
                  }).map(t => (
                    <button key={t.key} onClick={() => setForm({...form, category: t.key})} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${form.category === t.key ? `${t.bg} ${t.border} ${t.text}` : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}>
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${form.category === t.key ? t.iconBg : 'bg-slate-300'} text-white`}>{GROUP_ICON_MAP[t.icon] || t.emoji}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ═══════ Folder Tabs ═══════ */}
              <div>
                {/* Tab handles — file folder style */}
                <div className="flex items-end gap-0.5 px-1">
                  {/* Tab: จัดการเวลา (blue) */}
                  <button onClick={() => setActiveFormTab('time')} className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold transition-all rounded-t-xl border border-b-0 ${activeFormTab === 'time' ? 'bg-blue-50 border-blue-300 text-blue-700 relative z-10 -mb-px pb-2.5' : 'bg-blue-100/60 border-blue-200/60 text-blue-400 hover:bg-blue-100 hover:text-blue-500 -mb-px pb-1.5 scale-[0.97] origin-bottom'}`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>จัดการเวลา</span>
                  </button>
                  {/* Tab: แผนงาน (amber) */}
                  <button onClick={() => setActiveFormTab('plan')} className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold transition-all rounded-t-xl border border-b-0 ${activeFormTab === 'plan' ? 'bg-amber-50 border-amber-300 text-amber-700 relative z-10 -mb-px pb-2.5' : 'bg-amber-100/60 border-amber-200/60 text-amber-400 hover:bg-amber-100 hover:text-amber-500 -mb-px pb-1.5 scale-[0.97] origin-bottom'}`}>
                    <ListTodo className="w-3.5 h-3.5" />
                    <span>แผนงาน</span>
                    {formSubtasks.length > 0 && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeFormTab === 'plan' ? 'bg-amber-200 text-amber-700' : 'bg-amber-200/60 text-amber-500'}`}>{formSubtasks.length}</span>}
                  </button>
                  {/* Tab: รายละเอียด (emerald) */}
                  <button onClick={() => setActiveFormTab('detail')} className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold transition-all rounded-t-xl border border-b-0 ${activeFormTab === 'detail' ? 'bg-emerald-50 border-emerald-300 text-emerald-700 relative z-10 -mb-px pb-2.5' : 'bg-emerald-100/60 border-emerald-200/60 text-emerald-400 hover:bg-emerald-100 hover:text-emerald-500 -mb-px pb-1.5 scale-[0.97] origin-bottom'}`}>
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>รายละเอียด</span>
                    {formAttachments.length > 0 && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeFormTab === 'detail' ? 'bg-emerald-200 text-emerald-700' : 'bg-emerald-200/60 text-emerald-500'}`}>{formAttachments.length}</span>}
                  </button>
                </div>

                {/* Tab Content — folder body */}
                <div className={`p-4 rounded-b-xl rounded-tr-xl border ${activeFormTab === 'time' ? 'bg-blue-50/40 border-blue-300' : activeFormTab === 'plan' ? 'bg-amber-50/40 border-amber-300' : 'bg-emerald-50/40 border-emerald-300'}`}>
                  {/* ── Tab: จัดการเวลา ── */}
                  {activeFormTab === 'time' && (
                    <div className="space-y-4">
                      {/* Recurrence */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">การทำซ้ำ</label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
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
                              onClick={() => setFormRecurrence(opt.key ? { pattern: opt.key } : undefined)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                (formRecurrence?.pattern || undefined) === opt.key
                                  ? 'bg-violet-100 text-violet-700 border-violet-300'
                                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {opt.label}
                            </button>
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
                                return (
                                  <button
                                    key={i}
                                    onClick={() => {
                                      const days = formRecurrence.weekDays || [];
                                      const next = isOn ? days.filter(x => x !== i) : [...days, i];
                                      setFormRecurrence({ ...formRecurrence, weekDays: next });
                                    }}
                                    className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                                      isOn ? 'bg-violet-500 text-white' : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {d}
                                  </button>
                                );
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
                              {['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'].map((m, i) => (
                                <option key={i} value={i + 1}>{m}</option>
                              ))}
                            </select>
                            <span className="text-sm text-slate-500 font-bold">วันที่</span>
                            <input type="number" min="1" max="31" value={formRecurrence.monthDate?.day || 1} onChange={e => setFormRecurrence({ ...formRecurrence, monthDate: { month: formRecurrence.monthDate?.month || 1, day: parseInt(e.target.value) || 1 } })} className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-violet-400" />
                          </div>
                        )}
                      </div>

                      {/* Estimated Duration */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">ระยะเวลาโดยประมาณ (นาที)</label>
                        <input type="number" min="0" step="5" value={form.estimatedDuration || ''} onChange={e => setForm({...form, estimatedDuration: e.target.value ? parseInt(e.target.value) : undefined})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="เช่น 30" />
                      </div>

                      {/* Day Types */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">ทำวันไหน</label>
                        <div className="flex gap-2">
                          {([['workday', 'จ-ศ'], ['saturday', 'เสาร์'], ['sunday', 'อาทิตย์']] as [string, string][]).map(([key, label]) => {
                            const isOn = !form.dayTypes || form.dayTypes.length === 0 || form.dayTypes.includes(key as any);
                            return (
                              <button
                                key={key}
                                onClick={() => {
                                  const current = form.dayTypes || ['workday', 'saturday', 'sunday'];
                                  const next = isOn ? current.filter(d => d !== key) : [...current, key as any];
                                  setForm({ ...form, dayTypes: next.length > 0 ? next : undefined });
                                }}
                                className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                                  isOn
                                    ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Date Range */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">ช่วงวัน (ถ้ามี deadline)</label>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="date" value={form.startDate || ''} onChange={e => setForm({...form, startDate: e.target.value || undefined, endDate: !form.endDate || (e.target.value > (form.endDate || '')) ? e.target.value || undefined : form.endDate})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                          <input type="date" value={form.endDate || ''} min={form.startDate || ''} onChange={e => setForm({...form, endDate: e.target.value || undefined})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">เว้นว่างไว้ = ทำซ้ำทุกวัน (ตาม dayTypes)</p>
                      </div>

                      {/* Time */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">กำหนดเวลา</label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block mb-1">เริ่ม</span>
                            <input type="time" value={form.startTime || ''} onChange={e => setForm({...form, startTime: e.target.value || undefined})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block mb-1">ถึง</span>
                            <input type="time" value={form.endTime || ''} onChange={e => setForm({...form, endTime: e.target.value || undefined})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                          </div>
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
                        <input
                          type="text"
                          value={newSubtaskTitle}
                          onChange={e => setNewSubtaskTitle(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
                          placeholder="เพิ่มรายการ..."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button onClick={addSubtask} disabled={!newSubtaskTitle.trim()} className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-40 active:scale-95">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      {formSubtasks.length > 0 && (
                        <div className="space-y-1.5">
                          {formSubtasks.map(sub => (
                            <div key={sub.id} className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                              <div className="flex items-center gap-2 px-3 py-2">
                                <button onClick={() => toggleSubtask(sub.id)} className="shrink-0 active:scale-90">
                                  {sub.completed
                                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    : <Circle className="w-4 h-4 text-slate-300" />}
                                </button>
                                <span className={`text-sm flex-1 ${sub.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{sub.title}</span>
                                <button onClick={() => setExpandedSubtaskId(expandedSubtaskId === sub.id ? null : sub.id)} className={`p-1 rounded transition-colors shrink-0 ${expandedSubtaskId === sub.id || sub.note ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'}`}>
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => removeSubtask(sub.id)} className="p-1 hover:bg-rose-50 rounded text-slate-300 hover:text-rose-500 transition-colors shrink-0">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {expandedSubtaskId === sub.id && (
                                <div className="px-3 pb-2 pt-0">
                                  <textarea
                                    value={sub.note || ''}
                                    onChange={e => updateSubtaskNote(sub.id, e.target.value)}
                                    placeholder="รายละเอียดเพิ่มเติม..."
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 h-16 resize-none"
                                  />
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

                      {/* Attachment List */}
                      {formAttachments.length > 0 && (
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">ไฟล์แนบ ({formAttachments.length})</label>
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
                  )}
                </div>
              </div>
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
      , document.body)}

      {/* ===== Category Sections with Group Cards ===== */}
      <div className="space-y-3 animate-fadeIn">
        {DEFAULT_CATEGORIES.map(cat => {
          const catGroups = groupStyles.filter(g => {
            const tg = taskGroups.find(t => t.key === g.key);
            return tg?.categoryKey === cat.key;
          });
          if (catGroups.length === 0) return null;

          return (
            <div key={cat.key} className="flex items-center gap-2 flex-wrap">
              {/* Category label */}
              <span className="text-xs font-black text-slate-400 w-16 shrink-0 truncate">{cat.emoji} {cat.label}</span>

              {/* Group chips */}
              {catGroups.map((type) => {
                const isActive = selectedCat === type.key;
                const groupData = taskGroups.find(g => g.key === type.key);

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
                  <div key={type.key} className={`group/card relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                    isActive ? `${type.bg} ${type.border} border shadow-sm` : 'hover:bg-slate-100'
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
                    <span className="text-xs font-bold text-slate-600">{type.label}</span>

                    {/* Edit / Delete on hover */}
                    <div className="hidden group-hover/card:flex gap-0.5 ml-0.5">
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
          );
        })}
      </div>

      {/* ===== Selected Category Modal ===== */}
      {selectedCat && createPortal((() => {
        const style = getTypeStyle(selectedCat);
        const group = tasks.filter(t => t.category === selectedCat);

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
          <div style={{ zIndex: 8000 }} className="fixed inset-0 flex flex-col bg-emerald-50 sm:bg-slate-900/50 sm:backdrop-blur-sm sm:p-4 sm:overflow-y-auto sm:items-start sm:justify-center sm:flex-row">
            <div className="bg-transparent sm:bg-white sm:rounded-2xl w-full sm:max-w-3xl sm:shadow-2xl animate-fadeIn flex flex-col flex-1 sm:flex-initial sm:my-8">
              {/* Modal Header */}
              <div className={`${style.bg} border-b-2 ${style.border} p-3 sm:p-4 sm:rounded-t-2xl shrink-0`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center shadow-sm`}>
                      {style.icon === 'broom' ? <BroomIcon className="w-5 h-5 text-white" />
                        : style.icon === 'family' ? <FamilyIcon className="w-5 h-5 text-white" />
                        : style.icon === 'flex' ? <FlexIcon className="w-5 h-5 text-white" />
                        : style.icon === 'brain2' ? <BrainIcon className="w-5 h-5 text-white" />
                        : IconComponent ? <IconComponent className="w-5 h-5 text-white" />
                        : <Briefcase className="w-5 h-5 text-white" />}
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
              <div className="px-2 py-3 sm:p-4 flex-1 overflow-y-auto sm:max-h-[60vh]">
                {group.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-12">ยังไม่มี task ในหมวดนี้</p>
                ) : (
                  <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleTaskDragEnd}>
                  <SortableContext items={group.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {group.map(task => (
                      <SortableTaskItem key={task.id} id={task.id}>
                      <div className={`bg-white border border-slate-200 rounded-xl transition-all ${task.completed ? 'opacity-40' : 'hover:shadow-sm'}`}>
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

                          {/* Subtask progress */}
                          {task.subtasks && task.subtasks.length > 0 && (
                            <div className="ml-7 mb-1">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${Math.round((task.subtasks.filter((s: SubTask) => s.completed).length / task.subtasks.length) * 100)}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                  {task.subtasks.filter((s: SubTask) => s.completed).length}/{task.subtasks.length}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Metadata Row */}
                          <div className="flex items-center gap-2 ml-7">
                            {task.recurrence && (
                              <span className="text-[8px] font-black bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5">
                                <RefreshCw className="w-2.5 h-2.5" />
                                {task.recurrence.pattern === 'daily' ? 'ทุกวัน' :
                                 task.recurrence.pattern === 'every_x_days' ? `ทุก ${task.recurrence.interval || 2} วัน` :
                                 task.recurrence.pattern === 'weekly' ? 'รายสัปดาห์' :
                                 task.recurrence.pattern === 'monthly' ? 'รายเดือน' : 'รายปี'}
                              </span>
                            )}
                            {!task.startDate && !task.endDate && !task.recurrence && (
                              <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded shrink-0">ทำซ้ำ</span>
                            )}
                            {task.dayTypes && task.dayTypes.length > 0 && task.dayTypes.length < 3 && (
                              <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded shrink-0">
                                {task.dayTypes.map(d => d === 'workday' ? 'จ-ศ' : d === 'saturday' ? 'ส.' : 'อา.').join(',')}
                              </span>
                            )}
                            {(task.attachments?.length ?? 0) > 0 && (
                              <Paperclip className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                            )}
                            {task.estimatedDuration && (
                              <span className="text-[10px] text-blue-500 font-bold shrink-0">{task.estimatedDuration}น.</span>
                            )}
                            {task.startDate && (
                              <>
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
                              </>
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
                      </SortableTaskItem>
                    ))}
                  </div>
                  </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          </div>
        );
      })(), document.body)}

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
