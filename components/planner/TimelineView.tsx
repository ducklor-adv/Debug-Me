import React from 'react';
import { TimeSlot, TaskGroup, Task, SubTask, GROUP_COLORS, DEFAULT_CATEGORIES, Category, resolveSlotTimes } from '../../types';
import { formatDuration } from './slotUtils';
import { CheckCircle2, Circle, Plus, Pencil, Trash2, ChevronDown, RefreshCw, GripVertical, Minus } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const PIXELS_PER_HOUR = 60;
const MIN_SLOT_HEIGHT = 36;

const categoryColorMap: Record<string, string> = { break: 'cyan', sleep: 'indigo' };

// Sortable slot wrapper
const SortableSlotWrapper: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} className={`flex items-stretch transition-shadow ${isDragging ? 'shadow-lg rounded-xl ring-2 ring-emerald-300 bg-white' : ''}`}>
      <div {...listeners} className="w-8 shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-300 hover:text-emerald-500 active:text-emerald-600 transition-colors touch-none">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};

// Sortable task wrapper
const SortableTaskItem: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 30 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} className={`flex items-stretch transition-shadow ${isDragging ? 'shadow-md rounded-lg ring-2 ring-emerald-300 bg-white' : ''}`}>
      <div {...listeners} className="w-7 shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-300 hover:text-emerald-500 active:text-emerald-600 transition-colors touch-none">
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};

interface TimelineViewProps {
  slots: TimeSlot[];
  wakeTime: string;
  sleepTime: string;
  taskGroups: TaskGroup[];
  tasks: Task[];
  isToday: boolean;
  nowMinutes: number;
  checkedTasks: Set<string>;
  expandedSlots: Set<string>;
  onToggleSlot: (id: string) => void;
  onToggleCheck: (taskId: string, slotStart?: string, slotEnd?: string) => void;
  onEditSlot: (slot: TimeSlot) => void;
  onDeleteSlot: (id: string) => void;
  onAddTaskToSlot: (slot: TimeSlot) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string, slotId: string) => void;
  onReorder: (newSlots: TimeSlot[]) => void;
  onAdjustDuration: (slotIndex: number, delta: number) => void;
  onConvertFreeSlot: (slot: TimeSlot & { startTime: string; endTime: string; duration: number }) => void;
  onTaskReorder: (slotId: string, newTaskIds: string[]) => void;
  getFullTasksForSlot: (slot: TimeSlot) => Task[];
}

const groupMap = new Map<string, TaskGroup>();
const categoryMap = new Map<string, Category>(DEFAULT_CATEGORIES.map(c => [c.key, c]));

function resolveSlotInfo(key: string, taskGroups: TaskGroup[]): { label: string; emoji: string; color: string } {
  if (key === '_free') return { label: 'ว่าง', emoji: '⏳', color: 'slate' };
  const cat = categoryMap.get(key);
  if (cat) {
    const firstGroup = taskGroups.find(g => g.categoryKey === key);
    return { label: cat.label, emoji: cat.emoji, color: firstGroup?.color || categoryColorMap[key] || 'orange' };
  }
  const g = taskGroups.find(tg => tg.key === key);
  if (g) return { label: g.label, emoji: g.emoji, color: g.color };
  return { label: key, emoji: '', color: 'orange' };
}

const TimelineView: React.FC<TimelineViewProps> = ({
  slots, wakeTime, sleepTime, taskGroups, tasks, isToday, nowMinutes,
  checkedTasks, expandedSlots,
  onToggleSlot, onToggleCheck, onEditSlot, onDeleteSlot, onAddTaskToSlot,
  onEditTask, onDeleteTask, onReorder, onAdjustDuration, onConvertFreeSlot, onTaskReorder,
  getFullTasksForSlot,
}) => {
  const resolved = resolveSlotTimes(slots, wakeTime, sleepTime);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
  );

  const taskSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = resolved.findIndex(s => s.id === active.id);
    const newIndex = resolved.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(slots, oldIndex, newIndex);
    onReorder(reordered);
  };

  const handleTaskDragEnd = (slotId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return;
    const currentTasks = getFullTasksForSlot(slot);
    const oldIndex = currentTasks.findIndex(t => t.id === active.id);
    const newIndex = currentTasks.findIndex(t => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(currentTasks, oldIndex, newIndex);
    onTaskReorder(slotId, reordered.map(t => t.id));
  };

  // Generate hour markers
  const wakeMin = parseInt(wakeTime.split(':')[0]) * 60 + parseInt(wakeTime.split(':')[1]);
  const sleepMin = parseInt(sleepTime.split(':')[0]) * 60 + parseInt(sleepTime.split(':')[1]);
  const totalMinutes = ((sleepMin - wakeMin) + 1440) % 1440;
  const hourMarkers: string[] = [];
  for (let m = 0; m <= totalMinutes; m += 60) {
    const mins = (wakeMin + m) % 1440;
    hourMarkers.push(`${String(Math.floor(mins / 60)).padStart(2, '0')}:00`);
  }

  return (
    <div className="relative">
      {/* Hour grid lines (background) */}
      <div className="absolute left-0 top-0 w-10 h-full pointer-events-none">
        {hourMarkers.map((time, i) => {
          const topPx = i * PIXELS_PER_HOUR;
          return (
            <div key={time} className="absolute left-0 w-full flex items-center" style={{ top: topPx }}>
              <span className="text-[9px] font-mono text-slate-300 w-10 text-right pr-1">{time}</span>
            </div>
          );
        })}
      </div>

      {/* Slots */}
      <div className="ml-11 space-y-1">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={resolved.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {resolved.map((slot, index) => {
              const dur = slot.duration;
              const height = Math.max(MIN_SLOT_HEIGHT, (dur / 60) * PIXELS_PER_HOUR);
              const isFree = slot.type === 'free';
              const slotInfo = resolveSlotInfo(slot.groupKey, taskGroups);
              const colors = GROUP_COLORS[slotInfo.color] || GROUP_COLORS.slate || GROUP_COLORS.orange;
              const slotTasks = isFree ? [] : getFullTasksForSlot(slot);
              const checkedCount = slotTasks.filter(t => checkedTasks.has(t.id)).length;
              const isExpanded = expandedSlots.has(slot.id);

              const slotStartMin = parseInt(slot.startTime.split(':')[0]) * 60 + parseInt(slot.startTime.split(':')[1]);
              const slotEndMin = parseInt(slot.endTime.split(':')[0]) * 60 + parseInt(slot.endTime.split(':')[1]);
              const isCurrentSlot = isToday && !isFree && (slotEndMin > slotStartMin
                ? (nowMinutes >= slotStartMin && nowMinutes < slotEndMin)
                : (nowMinutes >= slotStartMin || nowMinutes < slotEndMin));

              // Can adjust duration?
              const nextSlot = resolved[index + 1];
              const prevSlot = resolved[index - 1];
              const canGrow = !isFree && ((nextSlot?.type === 'free' && (nextSlot.duration || 0) >= 30) || (prevSlot?.type === 'free' && (prevSlot.duration || 0) >= 30));
              const canShrink = !isFree && dur > 30;

              if (isFree) {
                return (
                  <div
                    key={slot.id}
                    onClick={() => onConvertFreeSlot(slot)}
                    className="border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-all group"
                    style={{ minHeight: Math.max(MIN_SLOT_HEIGHT, height) }}
                  >
                    <div className="flex items-center gap-2 text-slate-300 group-hover:text-emerald-500 transition-colors">
                      <span className="text-[10px] font-mono">{slot.startTime}–{slot.endTime}</span>
                      <Plus className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">ว่าง {formatDuration(dur)}</span>
                    </div>
                  </div>
                );
              }

              return (
                <SortableSlotWrapper key={slot.id} id={slot.id}>
                  <div
                    className={`bg-white rounded-xl border overflow-hidden transition-all ${
                      isCurrentSlot ? 'ring-2 ring-emerald-400 ring-offset-1' : ''
                    } ${colors.plannerBorder || ''}`}
                    style={{ minHeight: height }}
                  >
                    {/* Slot Header */}
                    <div
                      onClick={() => onToggleSlot(slot.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-2 cursor-pointer select-none ${colors.plannerBg || ''}`}
                    >
                      <span className="text-[10px] font-black text-slate-500 font-mono">{slot.startTime}–{slot.endTime}</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${colors.dot || ''}`} />
                      <span className={`text-xs font-black ${colors.plannerText || ''}`}>
                        {slotInfo.emoji} {slotInfo.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {formatDuration(dur)}
                      </span>
                      <div className="flex-1" />

                      {/* Duration adjustment */}
                      <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                        {canShrink && (
                          <button
                            onClick={() => onAdjustDuration(index, -30)}
                            className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                        )}
                        {canGrow && (
                          <button
                            onClick={() => onAdjustDuration(index, 30)}
                            className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {slotTasks.length > 0 && (
                        <span className={`text-[10px] font-black ${colors.plannerText || ''} opacity-60`}>
                          {checkedCount}/{slotTasks.length}
                        </span>
                      )}
                      {isCurrentSlot && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditSlot(slot); }}
                        className="p-1 rounded hover:bg-white/60 text-slate-400 hover:text-slate-600"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteSlot(slot.id); }}
                        className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>

                    {/* Expanded Task List */}
                    {isExpanded && (
                      <div className="border-t px-2 py-2 space-y-0.5" style={{ borderColor: 'inherit' }}>
                        {slotTasks.length > 0 && (
                          <DndContext sensors={taskSensors} collisionDetection={closestCenter} onDragEnd={handleTaskDragEnd(slot.id)}>
                            <SortableContext items={slotTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                              {slotTasks.map(task => {
                                const checked = checkedTasks.has(task.id);
                                return (
                                  <SortableTaskItem key={task.id} id={task.id}>
                                    <div className={`px-2 py-1.5 rounded-lg transition-all hover:bg-slate-50 ${checked ? 'opacity-40' : ''}`}>
                                      <div className="flex items-center gap-2">
                                        <div
                                          onClick={() => onToggleCheck(task.id, slot.startTime, slot.endTime)}
                                          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                                        >
                                          <div className="shrink-0">
                                            {checked
                                              ? <CheckCircle2 className={`w-4 h-4 ${colors.plannerText || ''}`} />
                                              : <Circle className={`w-4 h-4 ${colors.plannerText || ''} opacity-30`} />
                                            }
                                          </div>
                                          <span className={`text-[13px] font-bold flex-1 min-w-0 truncate ${checked ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                            {task.title}
                                          </span>
                                        </div>
                                        {task.recurrence && (
                                          <span className="text-[8px] font-black bg-violet-100 text-violet-600 px-1 py-0.5 rounded shrink-0 flex items-center gap-0.5">
                                            <RefreshCw className="w-2.5 h-2.5" />
                                            {task.recurrence.pattern === 'daily' ? 'ทุกวัน' :
                                             task.recurrence.pattern === 'every_x_days' ? `ทุก${task.recurrence.interval}วัน` :
                                             task.recurrence.pattern === 'weekly' ? 'สัปดาห์' :
                                             task.recurrence.pattern === 'monthly' ? 'เดือน' : 'ปี'}
                                          </span>
                                        )}
                                        {task.estimatedDuration && (
                                          <span className="text-[10px] font-mono text-blue-400 shrink-0">{task.estimatedDuration}น.</span>
                                        )}
                                        <button
                                          onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                                          className="p-1 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 shrink-0"
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id, slot.id); }}
                                          className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-500 shrink-0"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                      {task.subtasks && task.subtasks.length > 0 && (
                                        <div className="flex items-center gap-2 mt-1 ml-6">
                                          <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${Math.round((task.subtasks.filter((s: SubTask) => s.completed).length / task.subtasks.length) * 100)}%` }} />
                                          </div>
                                          <span className="text-[9px] font-bold text-slate-400 shrink-0">{task.subtasks.filter((s: SubTask) => s.completed).length}/{task.subtasks.length}</span>
                                        </div>
                                      )}
                                    </div>
                                  </SortableTaskItem>
                                );
                              })}
                            </SortableContext>
                          </DndContext>
                        )}
                        <button
                          onClick={() => onAddTaskToSlot(slot)}
                          className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed transition-all text-xs font-bold ${
                            slotTasks.length === 0
                              ? `${colors.plannerBorder || ''} ${colors.plannerText || ''}`
                              : 'border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-500 hover:bg-emerald-50/50'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" /> เพิ่ม Task
                        </button>
                      </div>
                    )}
                  </div>
                </SortableSlotWrapper>
              );
            })}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};

export default TimelineView;
