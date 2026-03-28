import React, { useState, useEffect } from 'react';
import { Project, Task, TaskGroup, GROUP_COLORS, Priority, ProjectProcess, SubTask, TaskAttachment, Recurrence } from '../types';
import {
  ArrowLeft, ArrowRight,
  CheckCircle2, Circle, Clock, FolderKanban, Briefcase, Coffee,
  Loader2, Check, AlertTriangle, ListTodo, Bot, LayoutList, GitBranch, Download,
} from 'lucide-react';
import TaskEditModal from './TaskEditModal';
import ProjectAIChat, { AIProcessResult } from './ProjectAIChat';
import ProjectTimeline from './ProjectTimeline';
import AIImportModal from './AIImportModal';

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

// Reuse TaskManager's group style pattern
const getGroupStyle = (g: TaskGroup) => {
  const c = GROUP_COLORS[g.color] || GROUP_COLORS.orange;
  return { key: g.key, label: g.label, emoji: g.emoji, icon: g.icon, ...c };
};

const ProjectManager: React.FC<ProjectManagerProps> = ({ projects, setProjects, tasks, setTasks, taskGroups, onImmediateSave }) => {
  const [typeTab, setTypeTab] = useState<'main' | 'side'>('main');
  const [viewMode, setViewMode] = useState<'kanban' | 'timeline'>('kanban');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showAIChat, setShowAIChat] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // ===== Task edit form state (shared modal) =====
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [initialTask, setInitialTask] = useState<Omit<Task, 'id'> | null>(null);
  const [initialSubtasks, setInitialSubtasks] = useState<SubTask[]>([]);
  const [initialAttachments, setInitialAttachments] = useState<TaskAttachment[]>([]);
  const [initialRecurrence, setInitialRecurrence] = useState<Recurrence | undefined>(undefined);

  // Map tab → task group key
  const groupKey = typeTab === 'main' ? 'งานหลัก' : 'งานรอง';
  const autoProjectId = typeTab === 'main' ? 'auto-main' : 'auto-side';
  const tabTasks = tasks.filter(t => t.category === groupKey);
  const autoProject = projects.find(p => p.id === autoProjectId);
  const groupStyles = taskGroups.map(getGroupStyle);

  // Auto-create & sync tracking projects when tasks change
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

  // Auto-switch to timeline when processes exist
  useEffect(() => {
    if (autoProject?.processes && autoProject.processes.length > 0 && viewMode === 'kanban') {
      setViewMode('timeline');
    }
  }, [autoProjectId]);

  // Save helper
  const withSave = async (action: () => void) => {
    action();
    if (onImmediateSave) {
      setSaveStatus('saving');
      try { await onImmediateSave(); setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); }
      catch { setSaveStatus('error'); setTimeout(() => setSaveStatus('idle'), 3000); }
    }
  };

  // Kanban helpers
  const getStatus = (taskId: string): KanbanStatus => autoProject?.taskStatuses[taskId] || 'todo';
  const getTasksForColumn = (status: KanbanStatus) => tabTasks.filter(t => getStatus(t.id) === status);
  const moveTask = (taskId: string, newStatus: KanbanStatus) => {
    withSave(() => {
      setProjects(prev => prev.map(p => p.id === autoProjectId ? { ...p, taskStatuses: { ...p.taskStatuses, [taskId]: newStatus } } : p));
    });
  };

  // ===== Task Edit Popup (same as TaskManager) =====
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

  const closeForm = () => {
    setFormOpen(false);
    setEditId(null);
    setInitialTask(null);
  };

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

  // AI Tasks Generation Handler
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

  // Stats
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
        <div className="max-w-lg mx-auto">
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
          <div className="flex gap-2">
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
          <div className="flex gap-1 mt-3 bg-white/10 rounded-xl p-1">
            <button onClick={() => setViewMode('kanban')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-white text-indigo-700 shadow' : 'text-white/70 hover:text-white'}`}>
              <LayoutList className="w-3.5 h-3.5" /> Kanban
            </button>
            <button onClick={() => setViewMode('timeline')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'timeline' ? 'bg-white text-violet-700 shadow' : 'text-white/70 hover:text-white'}`}>
              <GitBranch className="w-3.5 h-3.5" /> Timeline
              {hasProcesses && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="px-4 -mt-2 max-w-lg mx-auto mb-4">
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

      {/* Content Area */}
      <div className="px-4 max-w-lg mx-auto">
        {tabTasks.length === 0 && !hasProcesses ? (
          <div className="text-center py-12">
            <ListTodo className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 font-bold">ยังไม่มี task ใน "{groupKey}"</p>
            <p className="text-sm text-slate-300 mt-1">สร้าง task ในหน้า Tasks หรือกด "AI วิเคราะห์"</p>
            <button onClick={() => setShowAIChat(true)} className="mt-4 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-200 active:scale-95 transition-all">
              <Bot className="w-4 h-4 inline mr-1.5" /> AI วิเคราะห์งาน
            </button>
          </div>
        ) : viewMode === 'kanban' ? (
          /* ===== KANBAN VIEW ===== */
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
          /* ===== TIMELINE VIEW ===== */
          <ProjectTimeline processes={autoProject?.processes || []} tasks={tasks} taskStatuses={autoProject?.taskStatuses || {}} onTaskClick={openEditForm} onMoveTask={moveTask} />
        )}
      </div>

      {/* ===== Task Edit Popup (shared component) ===== */}
      <TaskEditModal
        isOpen={formOpen}
        editId={editId}
        initialTask={initialTask}
        initialSubtasks={initialSubtasks}
        initialAttachments={initialAttachments}
        initialRecurrence={initialRecurrence}
        taskGroups={taskGroups}
        onClose={closeForm}
        onSave={handleModalSave}
      />

      {/* AI Chat */}
      <ProjectAIChat isOpen={showAIChat} onClose={() => setShowAIChat(false)} onTasksGenerated={handleAITasksGenerated} projectType={typeTab} />

      {/* AI Import Modal */}
      <AIImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onImport={handleAITasksGenerated} />

      {/* Save Status */}
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
