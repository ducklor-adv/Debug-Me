import React, { useState } from 'react';
import { Task, ProjectProcess, GROUP_COLORS } from '../types';
import {
  CheckCircle2, Circle, Clock, ChevronDown, ChevronRight,
  ArrowLeft, ArrowRight,
} from 'lucide-react';

type KanbanStatus = 'todo' | 'in_progress' | 'done';

interface ProjectTimelineProps {
  processes: ProjectProcess[];
  tasks: Task[];
  taskStatuses: Record<string, KanbanStatus>;
  onTaskClick: (task: Task) => void;
  onMoveTask: (taskId: string, newStatus: KanbanStatus) => void;
}

const STATUS_ORDER: KanbanStatus[] = ['todo', 'in_progress', 'done'];

const STATUS_LABELS: Record<KanbanStatus, { label: string; emoji: string }> = {
  todo: { label: 'รอทำ', emoji: '📋' },
  in_progress: { label: 'กำลังทำ', emoji: '🔨' },
  done: { label: 'เสร็จ', emoji: '✅' },
};

const ProjectTimeline: React.FC<ProjectTimelineProps> = ({
  processes, tasks, taskStatuses, onTaskClick, onMoveTask,
}) => {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const toggleCollapse = (id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getStatus = (taskId: string): KanbanStatus => taskStatuses[taskId] || 'todo';

  const sortedProcesses = [...processes].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-0">
      {sortedProcesses.map((proc, idx) => {
        const isLast = idx === sortedProcesses.length - 1;
        const isCollapsed = collapsedIds.has(proc.id);
        const procTasks = proc.taskIds
          .map(id => tasks.find(t => t.id === id))
          .filter((t): t is Task => t !== undefined);
        const doneCount = procTasks.filter(t => getStatus(t.id) === 'done').length;
        const totalCount = procTasks.length;
        const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
        const clr = GROUP_COLORS[proc.color] || GROUP_COLORS.indigo;

        return (
          <div key={proc.id} className="relative">
            {/* Vertical line */}
            {!isLast && (
              <div className={`absolute left-5 top-12 bottom-0 w-0.5 ${doneCount === totalCount && totalCount > 0 ? 'bg-emerald-300' : 'bg-slate-200'}`} />
            )}

            {/* Process node */}
            <div className="relative flex items-start gap-3 mb-1">
              {/* Node circle */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 border-2 z-10 ${
                  doneCount === totalCount && totalCount > 0
                    ? 'bg-emerald-100 border-emerald-400'
                    : `${clr.bg} ${clr.border}`
                }`}
              >
                {proc.emoji}
              </div>

              {/* Process header */}
              <button
                onClick={() => toggleCollapse(proc.id)}
                className="flex-1 flex items-center gap-2 py-2 min-w-0"
              >
                <div className="flex-1 min-w-0 text-left">
                  <h4 className="font-bold text-slate-800 text-sm truncate">{proc.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${doneCount === totalCount && totalCount > 0 ? 'bg-emerald-400' : clr.dot}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{doneCount}/{totalCount}</span>
                  </div>
                </div>
                {isCollapsed
                  ? <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-slate-300 shrink-0" />
                }
              </button>
            </div>

            {/* Tasks under this process */}
            {!isCollapsed && (
              <div className="ml-5 pl-7 pb-4 space-y-2">
                {procTasks.length === 0 && (
                  <p className="text-xs text-slate-300 py-1">ไม่มี task</p>
                )}
                {procTasks.map(task => {
                  const status = getStatus(task.id);
                  const statusIdx = STATUS_ORDER.indexOf(status);

                  return (
                    <div
                      key={task.id}
                      className={`bg-white rounded-xl p-3 border transition-all hover:shadow-sm cursor-pointer ${
                        status === 'done'
                          ? 'border-emerald-100 bg-emerald-50/50'
                          : status === 'in_progress'
                          ? 'border-amber-100'
                          : 'border-slate-100'
                      }`}
                      onClick={() => onTaskClick(task)}
                    >
                      <div className="flex items-center gap-2">
                        {status === 'done'
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          : status === 'in_progress'
                          ? <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                          : <Circle className="w-4 h-4 text-slate-300 shrink-0" />}
                        <span className={`text-sm font-medium truncate flex-1 ${
                          status === 'done' ? 'line-through text-slate-400' : 'text-slate-700'
                        }`}>
                          {task.title}
                        </span>

                        {/* Status badge */}
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                          status === 'done' ? 'bg-emerald-100 text-emerald-600' :
                          status === 'in_progress' ? 'bg-amber-100 text-amber-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {STATUS_LABELS[status].label}
                        </span>

                        {/* Move buttons */}
                        <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                          {statusIdx > 0 && (
                            <button
                              onClick={() => onMoveTask(task.id, STATUS_ORDER[statusIdx - 1])}
                              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                          )}
                          {statusIdx < STATUS_ORDER.length - 1 && (
                            <button
                              onClick={() => onMoveTask(task.id, STATUS_ORDER[statusIdx + 1])}
                              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Description preview */}
                      {task.description && (
                        <p className="text-[11px] text-slate-400 mt-1 ml-6 line-clamp-1">{task.description}</p>
                      )}

                      {/* Meta: duration + subtasks */}
                      <div className="flex items-center gap-2 mt-1.5 ml-6 flex-wrap">
                        {task.estimatedDuration && (
                          <span className="text-[10px] font-mono text-slate-400">{task.estimatedDuration} นาที</span>
                        )}
                        {task.subtasks && task.subtasks.length > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-10 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%` }} />
                            </div>
                            <span className="text-[9px] font-bold text-slate-400">
                              {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {sortedProcesses.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-400 text-sm font-bold">ยังไม่มี Timeline</p>
          <p className="text-slate-300 text-xs mt-1">กด "AI วิเคราะห์" เพื่อสร้างแผนงาน</p>
        </div>
      )}
    </div>
  );
};

export default ProjectTimeline;
