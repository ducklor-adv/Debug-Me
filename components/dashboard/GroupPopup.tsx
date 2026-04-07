import React from 'react';
import { Task, TaskGroup } from '../../types';
import { Circle, X } from 'lucide-react';

interface GroupPopupProps {
  group: TaskGroup;
  tasks: Task[];
  todayStr: string;
  onClose: () => void;
  onTaskComplete?: (taskId: string, completed: boolean) => void;
  onNavigateToGroup?: (groupKey: string) => void;
}

/** Popup showing today's tasks for a specific group (งานด่วน / นัดหมาย) */
const GroupPopup: React.FC<GroupPopupProps> = ({ group, tasks, todayStr, onClose, onTaskComplete, onNavigateToGroup }) => {
  const groupTasks = tasks.filter(t => t.category === group.key && !t.completed && (!t.startDate || t.startDate === todayStr));

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-2xl max-h-[70vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <span className="text-2xl">{group.emoji}</span>
          <div className="flex-1">
            <h3 className="text-base font-black text-slate-800">{group.label}</h3>
            <p className="text-[10px] text-slate-400">รายการวันนี้</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Tasks list */}
        <div className="flex-1 overflow-y-auto">
          {groupTasks.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {groupTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                  <button onClick={() => onTaskComplete?.(task.id, true)} className="shrink-0">
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

        {/* Footer */}
        <div className="flex border-t border-slate-100 divide-x divide-slate-100">
          <button
            onClick={() => { onClose(); onNavigateToGroup?.(group.key); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-indigo-500 hover:bg-indigo-50 transition-colors"
          >
            ดูทั้งหมด
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupPopup;
