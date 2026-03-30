import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Project, Task, TaskGroup, GROUP_COLORS, Priority, ProjectProcess, SubTask, TaskAttachment, Recurrence } from '../types';
import {
  ArrowLeft, ArrowRight,
  CheckCircle2, Circle, Clock, FolderKanban, Briefcase, Coffee,
  Loader2, Check, AlertTriangle, ListTodo, Bot, LayoutList, GitBranch, Download,
  List, GripVertical, X,
} from 'lucide-react';
import TaskEditModal from './TaskEditModal';
import ProjectAIChat, { AIProcessResult } from './ProjectAIChat';
import ProjectTimeline from './ProjectTimeline';
import AIImportModal from './AIImportModal';
import { doc, setDoc, onSnapshot, initializeFirestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

// Separate Firebase instance for Project List (avoids persistentLocalCache conflict)
const listApp = initializeApp({
  apiKey: "AIzaSyAvVyJCNS3GPvSeY-RfhoplxaucnG7lHOo",
  authDomain: "debug-me-8036c.firebaseapp.com",
  projectId: "debug-me-8036c",
  storageBucket: "debug-me-8036c.firebasestorage.app",
}, 'project-list');
const listDb = initializeFirestore(listApp, {});

// ===== Project List Data =====
const DEFAULT_ORDER = [
  "debug-me","truck-kub","trackmydesk","cuteped","fingame","pnc","doograde",
  "c-root","health-desk","taokaeyai","layered-time","fingrowv5",
  "smart-menu","easy-plan","mindmap-agent","fridge-app","bueaty-book",
  "growcraft","phassa","flirt-card","finny","budtboy"
];

const PROJECT_META: Record<string, { name: string; folder: string; status: string }> = {
  "debug-me":       { name: "Debug-Me",              folder: "Root",                            status: "production" },
  "truck-kub":      { name: "Truck-Kub",             folder: "Project/Truck-Kub/",              status: "blueprint" },
  "trackmydesk":    { name: "Trackmydesk (TMD)",     folder: "Project/Trackmydesk-fresh/",      status: "production" },
  "cuteped":        { name: "Cuteped",               folder: "Project/cuteped/",                status: "app" },
  "fingame":        { name: "Fingame",               folder: "Project/Fingame/",                status: "production" },
  "pnc":            { name: "PNC",                   folder: "Project/PNC/",                    status: "production" },
  "doograde":       { name: "DooGrade",              folder: "Project/DooGrade/",               status: "production" },
  "c-root":         { name: "C-Root",                folder: "Project/C-Root/",                 status: "research" },
  "health-desk":    { name: "Health Desk",           folder: "Project/Health Desk/",            status: "blueprint" },
  "taokaeyai":      { name: "Taokaeyai",             folder: "Project/Taokaeyai/",              status: "app" },
  "layered-time":   { name: "Layered Time Theory",   folder: "Project/Layered Time Theory/",    status: "research" },
  "fingrowv5":      { name: "FingrowV5",             folder: "Project/FingrowV5/",              status: "other" },
  "smart-menu":     { name: "Smart Menu",            folder: "",                                status: "idea" },
  "easy-plan":      { name: "EASY PLAN",             folder: "",                                status: "idea" },
  "mindmap-agent":  { name: "Mindmap Agent",         folder: "",                                status: "idea" },
  "fridge-app":     { name: "APP บริหารตู้เย็น",       folder: "",                                status: "idea" },
  "bueaty-book":    { name: "Bueaty book",           folder: "",                                status: "idea" },
  "growcraft":      { name: "Growcraft",             folder: "",                                status: "idea" },
  "phassa":         { name: "ผัสสะ",                  folder: "",                                status: "idea" },
  "flirt-card":     { name: "Flirt Card",            folder: "Project/I-LOVE-YOU-BENNIE-WANG/", status: "other" },
  "finny":          { name: "Finny",                 folder: "Project/Finny/",                  status: "other" },
  "budtboy":        { name: "Budtboy",               folder: "Project/Budtboy/",                status: "other" },
};

const STATUS_OPTIONS = [
  { value: "production",  label: "Production",  color: "#4ade80" },
  { value: "development", label: "Development", color: "#facc15" },
  { value: "blueprint",   label: "Blueprint",   color: "#c084fc" },
  { value: "prototype",   label: "Prototype",   color: "#38bdf8" },
  { value: "research",    label: "Research",     color: "#a78bfa" },
  { value: "idea",        label: "Idea",         color: "#fbbf24" },
  { value: "onhold",      label: "On Hold",      color: "#94a3b8" },
  { value: "archived",    label: "Archived",     color: "#475569" },
];

const STATUS_COLOR_MAP: Record<string, string> = {
  ...Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s.color])),
  app: "#38bdf8", other: "#64748b",
};

interface ListItemData {
  agent?: string; platform?: string; note?: string;
  local?: string; prod?: string; status?: string;
}

// ===== Project List View Component =====
const ProjectListView: React.FC = () => {
  const [order, setOrder] = useState<string[]>([...DEFAULT_ORDER]);
  const [listData, setListData] = useState<Record<string, ListItemData>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);
  const isRemoteRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docRef = doc(listDb, "public", "agentFamilyBoard");

  // Firebase realtime sync
  useEffect(() => {
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        isRemoteRef.current = true;
        if (d.order) setOrder(d.order);
        if (d.data) setListData(d.data);
        setTimeout(() => { isRemoteRef.current = false; }, 500);
      }
      setSynced(true);
    }, () => setSynced(false));
    return unsub;
  }, []);

  const saveToFirebase = useCallback((newOrder: string[], newData: Record<string, ListItemData>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setDoc(docRef, { order: newOrder, data: newData, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    }, 600);
  }, []);

  const updateField = (id: string, field: string, value: string) => {
    if (isRemoteRef.current) return;
    const next = { ...listData, [id]: { ...listData[id], [field]: value } };
    setListData(next);
    saveToFirebase(order, next);
  };

  // Drag handlers
  const onDragStart = (id: string) => setDragId(id);
  const onDragEnd = () => { setDragId(null); setDragOverId(null); };
  const onDragOver = (id: string) => { if (id !== dragId) setDragOverId(id); };
  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = order.indexOf(dragId);
    const to = order.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    setOrder(next);
    setDragId(null);
    setDragOverId(null);
    saveToFirebase(next, listData);
  };

  // Modal
  const modalData = editId ? (listData[editId] || {}) : null;
  const modalMeta = editId ? PROJECT_META[editId] : null;

  const saveModal = (form: { local: string; prod: string; agent: string; platform: string; note: string; status: string }) => {
    if (!editId) return;
    const next = { ...listData, [editId]: { ...listData[editId], ...form } };
    setListData(next);
    saveToFirebase(order, next);
    setEditId(null);
  };

  const assigned = order.filter(id => listData[id]?.agent).length;

  return (
    <div className="space-y-3">
      {/* Sync + Stats */}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className={`w-2 h-2 rounded-full ${synced ? 'bg-emerald-400' : 'bg-red-400'}`} />
        <span>{synced ? 'Synced' : 'Offline'}</span>
        <span className="ml-auto">{order.length} projects</span>
        <span className="text-emerald-500 font-bold">{assigned} assigned</span>
      </div>

      {/* Scrollable Table — fills remaining height, scroll both axes */}
      <div className="overflow-auto -mx-4 px-4 project-scroll" style={{ maxHeight: 'calc(100dvh - 220px)' }}>
        <div className="min-w-[720px]">
          {/* Sticky Column Headers */}
          <div className="flex items-center text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 pb-2 sticky top-0 bg-slate-50 z-10">
            <div className="w-9 text-center shrink-0">#</div>
            <div className="w-[160px] shrink-0 px-2">Project</div>
            <div className="w-[110px] shrink-0 px-2">Status</div>
            <div className="w-[160px] shrink-0 px-2">Folder</div>
            <div className="w-[120px] shrink-0 px-2">Local</div>
            <div className="w-[160px] shrink-0 px-2">Production</div>
            <div className="w-[120px] shrink-0 px-2">Agent</div>
          </div>

          {/* Cards */}
          <div className="space-y-2 pb-4">
          {order.map((id, i) => {
            const meta = PROJECT_META[id] || { name: id, folder: '', status: 'other' };
            const d = listData[id] || {};
            const currentStatus = d.status || meta.status || 'other';
            const sc = STATUS_COLOR_MAP[currentStatus] || '#64748b';
            const isDragging = dragId === id;
            const isDragOver = dragOverId === id;

            return (
              <div
                key={id}
                draggable
                onDragStart={() => onDragStart(id)}
                onDragEnd={onDragEnd}
                onDragOver={(e) => { e.preventDefault(); onDragOver(id); }}
                onDrop={() => onDrop(id)}
                onDoubleClick={() => setEditId(id)}
                className={`flex items-stretch bg-white rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing ${
                  isDragging ? 'opacity-30 border-indigo-400' :
                  isDragOver ? 'border-emerald-400 shadow-md shadow-emerald-100' :
                  d.agent ? 'border-emerald-200' : 'border-slate-100'
                }`}
              >
                {/* Rank */}
                <div className="w-9 flex items-center justify-center text-sm font-black text-slate-300 border-r border-slate-100 shrink-0 hover:text-indigo-500">
                  {i + 1}
                </div>

                {/* Project name */}
                <div className="w-[160px] shrink-0 px-3 py-2.5 flex items-center border-r border-slate-50">
                  <span className="text-xs font-bold text-slate-700 truncate">{meta.name}</span>
                </div>

                {/* Status */}
                <div className="w-[110px] shrink-0 px-2 py-2.5 flex items-center gap-1.5 border-r border-slate-50">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sc }} />
                  <select
                    value={currentStatus}
                    onChange={e => updateField(id, 'status', e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className="bg-transparent text-[11px] font-semibold outline-none w-full cursor-pointer appearance-none"
                    style={{ color: sc }}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Folder */}
                <div className="w-[160px] shrink-0 px-2 py-2.5 flex items-center border-r border-slate-50">
                  <span className={`text-[11px] truncate ${meta.folder ? 'text-slate-500' : 'text-slate-300 italic'}`}>
                    {meta.folder || '—'}
                  </span>
                </div>

                {/* Local */}
                <div className="w-[120px] shrink-0 px-2 py-2.5 border-r border-slate-50">
                  <input
                    value={d.local || ''}
                    onChange={e => updateField(id, 'local', e.target.value)}
                    onClick={e => e.stopPropagation()}
                    placeholder="—"
                    className="w-full bg-transparent text-[11px] font-medium text-slate-600 outline-none placeholder:text-slate-300"
                  />
                </div>

                {/* Production */}
                <div className="w-[160px] shrink-0 px-2 py-2.5 border-r border-slate-50">
                  <input
                    value={d.prod || ''}
                    onChange={e => updateField(id, 'prod', e.target.value)}
                    onClick={e => e.stopPropagation()}
                    placeholder="—"
                    className="w-full bg-transparent text-[11px] font-medium text-slate-600 outline-none placeholder:text-slate-300"
                  />
                </div>

                {/* Agent */}
                <div className="w-[120px] shrink-0 px-2 py-2.5">
                  <input
                    value={d.agent || ''}
                    onChange={e => updateField(id, 'agent', e.target.value)}
                    onClick={e => e.stopPropagation()}
                    placeholder="—"
                    className={`w-full bg-transparent text-[11px] font-bold outline-none placeholder:text-slate-300 ${
                      d.agent ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  />
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editId && modalMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setEditId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-800">{modalMeta.name}</h3>
              <button onClick={() => setEditId(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <ModalForm
              initial={{ local: modalData?.local || '', prod: modalData?.prod || '', agent: modalData?.agent || '', platform: modalData?.platform || '', note: modalData?.note || '', status: modalData?.status || modalMeta.status || 'idea' }}
              onSave={saveModal}
              onCancel={() => setEditId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ===== Modal Form =====
const ModalForm: React.FC<{
  initial: { local: string; prod: string; agent: string; platform: string; note: string; status: string };
  onSave: (data: { local: string; prod: string; agent: string; platform: string; note: string; status: string }) => void;
  onCancel: () => void;
}> = ({ initial, onSave, onCancel }) => {
  const [form, setForm] = useState(initial);
  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <>
      <div className="px-5 py-4 space-y-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Local Server</label>
          <input value={form.local} onChange={e => set('local', e.target.value)} placeholder="localhost:5200" className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Production Server</label>
          <input value={form.prod} onChange={e => set('prod', e.target.value)} placeholder="https://xxx.web.app" className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Agent Name</label>
          <input value={form.agent} onChange={e => set('agent', e.target.value)} placeholder="Agent name..." className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Platform</label>
          <input value={form.platform} onChange={e => set('platform', e.target.value)} placeholder="Claude, Gemini, GPT..." className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Note</label>
          <input value={form.note} onChange={e => set('note', e.target.value)} placeholder="Role or note..." className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
        </div>
      </div>
      <div className="flex gap-2 px-5 py-4 border-t border-slate-100">
        <button onClick={onCancel} className="flex-1 py-2 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
        <button onClick={() => onSave(form)} className="flex-1 py-2 text-sm font-bold text-white bg-indigo-500 rounded-xl hover:bg-indigo-600 transition-colors">Save</button>
      </div>
    </>
  );
};

// ===== Main ProjectManager =====
interface ProjectManagerProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  taskGroups: TaskGroup[];
  onImmediateSave?: () => Promise<void>;
}

type KanbanStatus = 'todo' | 'in_progress' | 'done';

const KANBAN_COLUMNS: { key: KanbanStatus; label: string; emoji: string; headerBg: string; headerText: string; countBg: string }[] = [
  { key: 'todo', label: 'รอทำ', emoji: '📋', headerBg: 'bg-slate-100', headerText: 'text-slate-700', countBg: 'bg-slate-200 text-slate-600' },
  { key: 'in_progress', label: 'กำลังทำ', emoji: '🔨', headerBg: 'bg-amber-100', headerText: 'text-amber-700', countBg: 'bg-amber-200 text-amber-700' },
  { key: 'done', label: 'เสร็จแล้ว', emoji: '✅', headerBg: 'bg-emerald-100', headerText: 'text-emerald-700', countBg: 'bg-emerald-200 text-emerald-700' },
];

const PROCESS_COLORS = ['indigo', 'violet', 'blue', 'teal', 'amber', 'rose', 'cyan', 'green', 'orange', 'pink'];

const getGroupStyle = (g: TaskGroup) => {
  const c = GROUP_COLORS[g.color] || GROUP_COLORS.orange;
  return { key: g.key, label: g.label, emoji: g.emoji, icon: g.icon, ...c };
};

const ProjectManager: React.FC<ProjectManagerProps> = ({ projects, setProjects, tasks, setTasks, taskGroups, onImmediateSave }) => {
  const [typeTab, setTypeTab] = useState<'main' | 'side'>('main');
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'timeline'>('list');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showAIChat, setShowAIChat] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [initialTask, setInitialTask] = useState<Omit<Task, 'id'> | null>(null);
  const [initialSubtasks, setInitialSubtasks] = useState<SubTask[]>([]);
  const [initialAttachments, setInitialAttachments] = useState<TaskAttachment[]>([]);
  const [initialRecurrence, setInitialRecurrence] = useState<Recurrence | undefined>(undefined);

  const groupKey = typeTab === 'main' ? 'งานหลัก' : 'งานรอง';
  const autoProjectId = typeTab === 'main' ? 'auto-main' : 'auto-side';
  const tabTasks = tasks.filter(t => t.category === groupKey);
  const autoProject = projects.find(p => p.id === autoProjectId);

  useEffect(() => {
    const mainIds = tasks.filter(t => t.category === 'งานหลัก').map(t => t.id);
    const sideIds = tasks.filter(t => t.category === 'งานรอง').map(t => t.id);
    setProjects(prev => {
      let updated = [...prev];
      let changed = false;
      const syncAuto = (id: string, taskIds: string[], title: string, emoji: string, color: string, type: 'main' | 'side') => {
        let proj = updated.find(p => p.id === id);
        if (!proj) {
          proj = { id, title, emoji, color, type, status: 'active' as const, taskIds: [...taskIds], taskStatuses: Object.fromEntries(taskIds.map(tid => [tid, 'todo' as const])), createdAt: new Date().toISOString() };
          updated = [...updated, proj];
          changed = true;
          return;
        }
        const existingSet = new Set(proj.taskIds);
        const newSet = new Set(taskIds);
        const hasNew = taskIds.some(tid => !existingSet.has(tid));
        const hasRemoved = proj.taskIds.some(tid => !newSet.has(tid));
        if (hasNew || hasRemoved) {
          const newStatuses: Record<string, KanbanStatus> = {};
          taskIds.forEach(tid => { newStatuses[tid] = proj!.taskStatuses[tid] || 'todo'; });
          updated = updated.map(p => p.id === id ? { ...proj!, taskIds: [...taskIds], taskStatuses: newStatuses } : p);
          changed = true;
        }
      };
      syncAuto('auto-main', mainIds, 'งานหลัก', '💼', 'orange', 'main');
      syncAuto('auto-side', sideIds, 'งานรอง', '📝', 'yellow', 'side');
      return changed ? updated : prev;
    });
  }, [tasks, setProjects]);

  useEffect(() => {
    if (autoProject?.processes && autoProject.processes.length > 0 && viewMode === 'kanban') {
      setViewMode('timeline');
    }
  }, [autoProjectId]);

  const withSave = async (action: () => void) => {
    action();
    if (onImmediateSave) {
      setSaveStatus('saving');
      try { await onImmediateSave(); setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); }
      catch { setSaveStatus('error'); setTimeout(() => setSaveStatus('idle'), 3000); }
    }
  };

  const getStatus = (taskId: string): KanbanStatus => autoProject?.taskStatuses[taskId] || 'todo';
  const getTasksForColumn = (status: KanbanStatus) => tabTasks.filter(t => getStatus(t.id) === status);
  const moveTask = (taskId: string, newStatus: KanbanStatus) => {
    withSave(() => {
      setProjects(prev => prev.map(p => p.id === autoProjectId ? { ...p, taskStatuses: { ...p.taskStatuses, [taskId]: newStatus } } : p));
    });
  };

  const openEditForm = (task: Task) => {
    setEditId(task.id);
    setInitialTask({
      title: task.title, description: task.description, priority: task.priority,
      completed: task.completed, startDate: task.startDate, endDate: task.endDate,
      category: task.category, notes: task.notes || '', attachments: task.attachments || [],
      dayTypes: task.dayTypes, estimatedDuration: task.estimatedDuration,
      startTime: task.startTime, endTime: task.endTime,
    });
    setInitialAttachments(task.attachments || []);
    setInitialSubtasks(task.subtasks || []);
    setInitialRecurrence(task.recurrence);
    setFormOpen(true);
  };

  const closeForm = () => { setFormOpen(false); setEditId(null); setInitialTask(null); };

  const handleModalSave = (data: { form: Omit<Task, 'id'>; subtasks: SubTask[]; attachments: TaskAttachment[]; recurrence?: Recurrence }) => {
    const subtasks = data.subtasks.length > 0 ? data.subtasks : undefined;
    withSave(() => {
      if (editId) {
        setTasks(prev => prev.map(t => t.id === editId ? { ...t, ...data.form, attachments: data.attachments, subtasks, recurrence: data.recurrence } : t));
      } else {
        const newTask: Task = { id: Date.now().toString(), ...data.form, attachments: data.attachments, subtasks, recurrence: data.recurrence };
        setTasks(prev => [newTask, ...prev]);
      }
    });
    closeForm();
  };

  const handleAITasksGenerated = (processes: AIProcessResult[]) => {
    const newTasks: Task[] = [];
    const newProcesses: ProjectProcess[] = [];
    processes.forEach((proc, i) => {
      const procTaskIds: string[] = [];
      proc.tasks.forEach((t, j) => {
        const taskId = `ai-${Date.now()}-${i}-${j}`;
        const task: Task = { id: taskId, title: t.title, description: t.description || '', priority: t.priority === 'High' ? Priority.HIGH : t.priority === 'Low' ? Priority.LOW : Priority.MEDIUM, completed: false, category: groupKey, estimatedDuration: t.duration || undefined };
        newTasks.push(task); procTaskIds.push(taskId);
      });
      newProcesses.push({ id: `proc-${Date.now()}-${i}`, title: proc.title, order: proc.order || i + 1, emoji: proc.emoji || '📋', color: PROCESS_COLORS[i % PROCESS_COLORS.length], taskIds: procTaskIds });
    });
    withSave(() => {
      setTasks(prev => [...prev, ...newTasks]);
      const newStatuses: Record<string, KanbanStatus> = {};
      newTasks.forEach(t => { newStatuses[t.id] = 'todo'; });
      setProjects(prev => prev.map(p => p.id !== autoProjectId ? p : { ...p, taskIds: [...p.taskIds, ...newTasks.map(t => t.id)], taskStatuses: { ...p.taskStatuses, ...newStatuses }, processes: [...(p.processes || []), ...newProcesses] }));
    });
    setViewMode('timeline');
  };

  const totalTasks = tabTasks.length;
  const doneTasks = tabTasks.filter(t => getStatus(t.id) === 'done').length;
  const inProgressTasks = tabTasks.filter(t => getStatus(t.id) === 'in_progress').length;
  const todoTasks = totalTasks - doneTasks - inProgressTasks;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const mainCount = tasks.filter(t => t.category === 'งานหลัก').length;
  const sideCount = tasks.filter(t => t.category === 'งานรอง').length;
  const hasProcesses = (autoProject?.processes?.length || 0) > 0;

  return (
    <div className="animate-fadeIn w-full min-h-full bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 p-6 pb-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <FolderKanban className="w-6 h-6 text-indigo-200" />
            <h1 className="text-xl font-black text-white flex-1">Project Management</h1>
            <div className="flex gap-1.5">
              <button onClick={() => setShowImportModal(true)} className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-xs font-bold text-white transition-all active:scale-95">
                <Download className="w-4 h-4" /> Import
              </button>
              <button onClick={() => setShowAIChat(true)} className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-xs font-bold text-white transition-all active:scale-95">
                <Bot className="w-4 h-4" /> AI วิเคราะห์
              </button>
            </div>
          </div>

          {/* View mode tabs — List / Kanban / Timeline */}
          <div className="flex gap-1 bg-white/10 rounded-xl p-1">
            <button onClick={() => setViewMode('list')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-indigo-700 shadow' : 'text-white/70 hover:text-white'}`}>
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button onClick={() => setViewMode('kanban')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-white text-indigo-700 shadow' : 'text-white/70 hover:text-white'}`}>
              <LayoutList className="w-3.5 h-3.5" /> Kanban
            </button>
            <button onClick={() => setViewMode('timeline')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'timeline' ? 'bg-white text-violet-700 shadow' : 'text-white/70 hover:text-white'}`}>
              <GitBranch className="w-3.5 h-3.5" /> Timeline
              {hasProcesses && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>
          </div>

          {/* Type tabs — only for Kanban/Timeline */}
          {viewMode !== 'list' && (
            <>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setTypeTab('main')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${typeTab === 'main' ? 'bg-white text-indigo-700 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                  <Briefcase className="w-4 h-4" /> งานหลัก
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${typeTab === 'main' ? 'bg-indigo-100 text-indigo-600' : 'bg-white/20'}`}>{mainCount}</span>
                </button>
                <button onClick={() => setTypeTab('side')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${typeTab === 'side' ? 'bg-white text-violet-700 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                  <Coffee className="w-4 h-4" /> งานรอง
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${typeTab === 'side' ? 'bg-violet-100 text-violet-600' : 'bg-white/20'}`}>{sideCount}</span>
                </button>
              </div>
              {totalTasks > 0 && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progress}%` }} /></div>
                  <span className="text-xs font-bold text-white/90">{doneTasks}/{totalTasks}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stats cards — only for Kanban/Timeline */}
      {viewMode !== 'list' && (
        <div className="px-4 -mt-2 max-w-4xl mx-auto mb-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-center">
              <p className="text-2xl font-black text-slate-700">{todoTasks}</p>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">📋 รอทำ</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-amber-100 text-center">
              <p className="text-2xl font-black text-amber-600">{inProgressTasks}</p>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">🔨 กำลังทำ</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-emerald-100 text-center">
              <p className="text-2xl font-black text-emerald-600">{doneTasks}</p>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">✅ เสร็จแล้ว</p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`px-4 mx-auto ${viewMode === 'list' ? 'max-w-6xl' : 'max-w-4xl'}`}>
        {viewMode === 'list' ? (
          <ProjectListView />
        ) : tabTasks.length === 0 && !hasProcesses ? (
          <div className="text-center py-12">
            <ListTodo className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 font-bold">ยังไม่มี task ใน "{groupKey}"</p>
            <p className="text-sm text-slate-300 mt-1">สร้าง task ในหน้า Tasks หรือกด "AI วิเคราะห์"</p>
            <button onClick={() => setShowAIChat(true)} className="mt-4 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-200 active:scale-95 transition-all">
              <Bot className="w-4 h-4 inline mr-1.5" /> AI วิเคราะห์งาน
            </button>
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="space-y-4">
            {KANBAN_COLUMNS.map(col => {
              const colTasks = getTasksForColumn(col.key);
              return (
                <div key={col.key} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className={`${col.headerBg} px-4 py-3 flex items-center gap-2`}>
                    <span className="text-base">{col.emoji}</span>
                    <span className={`text-sm font-bold ${col.headerText}`}>{col.label}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${col.countBg}`}>{colTasks.length}</span>
                  </div>
                  <div className="p-3 space-y-2 min-h-[48px]">
                    {colTasks.length === 0 && <p className="text-xs text-slate-300 text-center py-2">ไม่มี task</p>}
                    {colTasks.map(task => {
                      const currentStatus = getStatus(task.id);
                      const statusIdx = KANBAN_COLUMNS.findIndex(c => c.key === currentStatus);
                      return (
                        <div key={task.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer" onClick={() => openEditForm(task)}>
                          <div className="flex items-center gap-2">
                            {col.key === 'done' ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : col.key === 'in_progress' ? <Clock className="w-4 h-4 text-amber-500 shrink-0" /> : <Circle className="w-4 h-4 text-slate-300 shrink-0" />}
                            <span className={`text-sm font-medium truncate flex-1 ${col.key === 'done' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</span>
                            <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                              {statusIdx > 0 && <button onClick={() => moveTask(task.id, KANBAN_COLUMNS[statusIdx - 1].key)} className="p-1.5 hover:bg-white rounded-lg transition-colors"><ArrowLeft className="w-3.5 h-3.5 text-slate-400" /></button>}
                              {statusIdx < KANBAN_COLUMNS.length - 1 && <button onClick={() => moveTask(task.id, KANBAN_COLUMNS[statusIdx + 1].key)} className="p-1.5 hover:bg-white rounded-lg transition-colors"><ArrowRight className="w-3.5 h-3.5 text-slate-400" /></button>}
                            </div>
                          </div>
                          {task.description && <p className="text-[11px] text-slate-400 mt-1 ml-6 line-clamp-1">{task.description}</p>}
                          <div className="flex items-center gap-2 mt-1.5 ml-6 flex-wrap">
                            {task.estimatedDuration && <span className="text-[10px] font-mono text-slate-400">{task.estimatedDuration} นาที</span>}
                            {task.subtasks && task.subtasks.length > 0 && (
                              <div className="flex items-center gap-1">
                                <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%` }} /></div>
                                <span className="text-[9px] font-bold text-slate-400">{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <ProjectTimeline processes={autoProject?.processes || []} tasks={tasks} taskStatuses={autoProject?.taskStatuses || {}} onTaskClick={openEditForm} onMoveTask={moveTask} />
        )}
      </div>

      <TaskEditModal isOpen={formOpen} editId={editId} initialTask={initialTask} initialSubtasks={initialSubtasks} initialAttachments={initialAttachments} initialRecurrence={initialRecurrence} taskGroups={taskGroups} onClose={closeForm} onSave={handleModalSave} />
      <ProjectAIChat isOpen={showAIChat} onClose={() => setShowAIChat(false)} onTasksGenerated={handleAITasksGenerated} projectType={typeTab} />
      <AIImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onImport={handleAITasksGenerated} />

      {saveStatus !== 'idle' && (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 ${saveStatus === 'saving' ? 'bg-amber-100 text-amber-700' : saveStatus === 'saved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {saveStatus === 'saving' && <><Loader2 className="w-3 h-3 animate-spin" /> กำลังบันทึก...</>}
          {saveStatus === 'saved' && <><Check className="w-3 h-3" /> บันทึกแล้ว</>}
          {saveStatus === 'error' && <><AlertTriangle className="w-3 h-3" /> บันทึกไม่สำเร็จ</>}
        </div>
      )}
    </div>
  );
};

export default ProjectManager;
