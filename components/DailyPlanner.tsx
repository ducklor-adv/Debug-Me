
import React, { useState } from 'react';
import { Task, TaskGroup, GROUP_COLORS } from '../types';
import { Sparkles, Bookmark, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Edit3, Sun, Moon, Coffee, Code, FileText, Home, Wrench, Dumbbell, BookOpen, Brain, X, Plus, Trash2 } from 'lucide-react';
import { generateSmartSchedule } from '../services/geminiService';

export interface ScheduleBlock {
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  title: string;
  subtitle?: string;
  color: string;
  icon: string;
  isBreak?: boolean;
}

export const SCHEDULE: ScheduleBlock[] = [];

const ICON_MAP: Record<string, React.ReactNode> = {
  sun: <Sun className="w-3.5 h-3.5" />,
  moon: <Moon className="w-3.5 h-3.5" />,
  coffee: <Coffee className="w-3.5 h-3.5" />,
  code: <Code className="w-3.5 h-3.5" />,
  file: <FileText className="w-3.5 h-3.5" />,
  home: <Home className="w-3.5 h-3.5" />,
  wrench: <Wrench className="w-3.5 h-3.5" />,
  gym: <Dumbbell className="w-3.5 h-3.5" />,
  book: <BookOpen className="w-3.5 h-3.5" />,
  brain: <Brain className="w-3.5 h-3.5" />,
};

const formatTime = (h: number, m: number) =>
  `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

const getDurationMin = (b: ScheduleBlock) =>
  (b.endHour * 60 + b.endMin) - (b.startHour * 60 + b.startMin);

const getTimePeriod = (timeStr: string) => {
  const h = parseInt(timeStr.split(':')[0], 10);
  if (h < 6) return { label: 'ดึก/เช้ามืด', emoji: '🌙' };
  if (h < 12) return { label: 'เช้า', emoji: '🌅' };
  if (h < 13) return { label: 'เที่ยง', emoji: '☀️' };
  if (h < 17) return { label: 'บ่าย', emoji: '🌤️' };
  if (h < 20) return { label: 'เย็น', emoji: '🌇' };
  return { label: 'ค่ำ/กลางคืน', emoji: '🌙' };
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const TimePicker: React.FC<{ value: string; onChange: (v: string) => void; label: string }> = ({ value, onChange, label }) => {
  const [h, m] = value.split(':').map(Number);
  const period = getTimePeriod(value);
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-1.5 block">{label}</label>
      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
        <select
          value={h}
          onChange={e => onChange(formatTime(Number(e.target.value), m))}
          className="bg-transparent text-lg font-black text-slate-800 focus:outline-none appearance-none text-center w-12 cursor-pointer"
        >
          {HOURS.map(hr => (
            <option key={hr} value={hr}>{hr.toString().padStart(2, '0')}</option>
          ))}
        </select>
        <span className="text-lg font-black text-slate-400">:</span>
        <select
          value={m}
          onChange={e => onChange(formatTime(h, Number(e.target.value)))}
          className="bg-transparent text-lg font-black text-slate-800 focus:outline-none appearance-none text-center w-12 cursor-pointer"
        >
          {MINUTES.map(mn => (
            <option key={mn} value={mn}>{mn.toString().padStart(2, '0')}</option>
          ))}
        </select>
        <span className="ml-2 text-xs font-bold text-slate-400">{period.emoji} {period.label}</span>
      </div>
    </div>
  );
};

const ICON_OPTIONS = [
  { key: 'code', label: 'Code' },
  { key: 'coffee', label: 'Coffee' },
  { key: 'sun', label: 'Sun' },
  { key: 'moon', label: 'Moon' },
  { key: 'gym', label: 'Gym' },
  { key: 'book', label: 'Book' },
  { key: 'brain', label: 'Brain' },
  { key: 'file', label: 'File' },
  { key: 'home', label: 'Home' },
  { key: 'wrench', label: 'Wrench' },
];

const COLOR_BY_ICON: Record<string, string> = {
  code: 'bg-blue-50 border-blue-300 text-blue-700',
  coffee: 'bg-amber-50 border-amber-200 text-amber-700',
  sun: 'bg-slate-100 border-slate-200 text-slate-600',
  moon: 'bg-indigo-50 border-indigo-200 text-indigo-600',
  gym: 'bg-green-50 border-green-300 text-green-700',
  book: 'bg-purple-50 border-purple-200 text-purple-700',
  brain: 'bg-violet-50 border-violet-200 text-violet-700',
  file: 'bg-slate-100 border-slate-200 text-slate-600',
  home: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  wrench: 'bg-orange-50 border-orange-200 text-orange-700',
};

// Derive picker-style from a TaskGroup
const getCatStyle = (g: TaskGroup) => {
  const c = GROUP_COLORS[g.color] || GROUP_COLORS.orange;
  return { key: g.key, label: g.label, icon: g.icon, emoji: g.emoji, bg: c.plannerBg, text: c.plannerText, border: c.plannerBorder };
};

// Special milestone markers (single-time, no duration)
const MILESTONES = [
  { key: 'ตื่นนอน', emoji: '🌅', icon: 'sun', defaultTime: '05:00', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { key: 'นอน', emoji: '🌙', icon: 'moon', defaultTime: '22:00', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-300', color: 'bg-indigo-50 border-indigo-200 text-indigo-600' },
];

interface DailyPlannerProps {
  tasks: Task[];
  schedule: ScheduleBlock[];
  onScheduleChange: (s: ScheduleBlock[]) => void;
  taskGroups: TaskGroup[];
}

const DailyPlanner: React.FC<DailyPlannerProps> = ({ tasks, schedule, onScheduleChange, taskGroups }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSchedule, setAiSchedule] = useState<string | null>(null);
  const [checkedBlocks, setCheckedBlocks] = useState<Set<number>>(new Set());

  // Edit state
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ScheduleBlock | null>(null);

  // Task Picker state (0=closed, 1=categories, 2=tasks, 3=time)
  const [pickerStep, setPickerStep] = useState<number>(0);
  const [pickerCat, setPickerCat] = useState('');
  const [pickerTask, setPickerTask] = useState<Task | null>(null);
  const [pickerStart, setPickerStart] = useState('08:00');
  const [pickerEnd, setPickerEnd] = useState('09:00');
  const [pickerMilestone, setPickerMilestone] = useState<string | null>(null); // 'ตื่นนอน' | 'นอน' | null

  // Derive taskCats from dynamic taskGroups
  const taskCats = taskGroups.map(getCatStyle);

  // Always sort schedule by start time for display
  const sortedSchedule = [...schedule].sort((a, b) => (a.startHour * 60 + a.startMin) - (b.startHour * 60 + b.startMin));

  const today = new Date();
  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const dateStr = `วัน${dayNames[today.getDay()]}ที่ ${today.getDate()} ${monthNames[today.getMonth()]} ${today.getFullYear() + 543}`;

  const currentHour = today.getHours();
  const currentMin = today.getMinutes();
  const nowMinutes = currentHour * 60 + currentMin;

  const toggleCheck = (idx: number) => {
    setCheckedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const totalWork = sortedSchedule.filter(b => !b.isBreak).reduce((sum, b) => sum + getDurationMin(b), 0);
  const doneWork = sortedSchedule.filter((b, i) => !b.isBreak && checkedBlocks.has(i)).reduce((sum, b) => sum + getDurationMin(b), 0);
  const progressPct = totalWork > 0 ? Math.round((doneWork / totalWork) * 100) : 0;

  const handleMagicFill = async () => {
    setIsGenerating(true);
    try {
      const result = await generateSmartSchedule(tasks);
      setAiSchedule(result || null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const openEdit = (idx: number) => {
    setEditIdx(idx);
    setEditForm({ ...sortedSchedule[idx] });
  };

  const openAddNew = () => {
    const last = sortedSchedule[sortedSchedule.length - 1];
    const newBlock: ScheduleBlock = {
      startHour: last ? last.endHour : 8,
      startMin: last ? last.endMin : 0,
      endHour: last ? last.endHour + 1 : 9,
      endMin: last ? last.endMin : 0,
      title: '',
      subtitle: '',
      color: 'bg-blue-50 border-blue-300 text-blue-700',
      icon: 'code',
      isBreak: false,
    };
    setEditIdx(sortedSchedule.length); // new item marker
    setEditForm(newBlock);
  };

  const saveEdit = () => {
    if (!editForm || editIdx === null) return;
    const finalBlock = { ...editForm, color: editForm.isBreak ? 'bg-slate-50 border-slate-200 text-slate-400' : (COLOR_BY_ICON[editForm.icon] || 'bg-blue-50 border-blue-300 text-blue-700') };
    let updated: ScheduleBlock[];
    if (editIdx >= sortedSchedule.length) {
      updated = [...schedule, finalBlock];
    } else {
      // Find the original block in schedule by reference match
      const origBlock = sortedSchedule[editIdx];
      updated = schedule.map(b => b === origBlock ? finalBlock : b);
    }
    updated.sort((a, b) => (a.startHour * 60 + a.startMin) - (b.startHour * 60 + b.startMin));
    onScheduleChange(updated);
    setEditIdx(null);
    setEditForm(null);
  };

  const deleteBlock = () => {
    if (editIdx === null || editIdx >= sortedSchedule.length) return;
    const origBlock = sortedSchedule[editIdx];
    const updated = schedule.filter(b => b !== origBlock);
    onScheduleChange(updated);
    setEditIdx(null);
    setEditForm(null);
  };

  // Task Picker functions
  const openTaskPicker = () => {
    setPickerStep(1);
    setPickerCat('');
    setPickerTask(null);
    setPickerMilestone(null);
  };
  const closeTaskPicker = () => { setPickerStep(0); setPickerMilestone(null); };

  const selectPickerCat = (cat: string) => {
    setPickerCat(cat);
    setPickerStep(2);
  };

  const selectPickerTask = (task: Task) => {
    setPickerTask(task);
    const last = sortedSchedule[sortedSchedule.length - 1];
    const sh = last ? last.endHour : 8;
    const sm = last ? last.endMin : 0;
    setPickerStart(formatTime(sh, sm));
    setPickerEnd(formatTime(Math.min(sh + 1, 23), sm));
    setPickerStep(3);
  };

  const selectMilestone = (key: string) => {
    const ms = MILESTONES.find(m => m.key === key);
    if (!ms) return;
    setPickerMilestone(key);
    setPickerTask(null);
    setPickerStart(ms.defaultTime);
    setPickerStep(3);
  };

  const confirmTaskPicker = () => {
    const [sh, sm] = pickerStart.split(':').map(Number);

    if (pickerMilestone) {
      // Milestone — single time point (start = end)
      const ms = MILESTONES.find(m => m.key === pickerMilestone);
      if (!ms) return;
      const newBlock: ScheduleBlock = {
        startHour: sh, startMin: sm,
        endHour: sh, endMin: sm,
        title: `${ms.emoji} ${ms.key}`,
        subtitle: undefined,
        color: ms.color,
        icon: ms.icon,
        isBreak: false,
      };
      const updated = [...schedule, newBlock].sort((a, b) => (a.startHour * 60 + a.startMin) - (b.startHour * 60 + b.startMin));
      onScheduleChange(updated);
      closeTaskPicker();
      return;
    }

    if (!pickerTask) return;
    const [eh, em] = pickerEnd.split(':').map(Number);
    const catInfo = taskCats.find(c => c.key === pickerTask.category);
    const icon = catInfo?.icon || 'code';
    const newBlock: ScheduleBlock = {
      startHour: sh, startMin: sm,
      endHour: eh, endMin: em,
      title: pickerTask.title,
      subtitle: pickerTask.description,
      color: COLOR_BY_ICON[icon] || 'bg-blue-50 border-blue-300 text-blue-700',
      icon,
      isBreak: pickerTask.category === 'พักผ่อน',
    };
    const updated = [...schedule, newBlock].sort((a, b) => (a.startHour * 60 + a.startMin) - (b.startHour * 60 + b.startMin));
    onScheduleChange(updated);
    closeTaskPicker();
  };

  const catTasks = tasks.filter(t => t.category === pickerCat);

  return (
    <div className="max-w-5xl mx-auto pb-10 animate-fadeIn">

      {/* ===== Task Picker Popup ===== */}
      {pickerStep > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-fadeIn overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-500" />
                {pickerStep === 1 && 'เลือกหมวดหมู่'}
                {pickerStep === 2 && `เลือก Task — ${pickerCat}`}
                {pickerStep === 3 && (pickerMilestone ? `กำหนดเวลา — ${pickerMilestone}` : 'กำหนดเวลา')}
              </h3>
              <button onClick={closeTaskPicker} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {/* Step 1: Category grid + Milestones */}
              {pickerStep === 1 && (
                <div className="space-y-4">
                  {/* Milestone markers */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">จุดเริ่ม / จุดจบ</label>
                    <div className="flex gap-3">
                      {MILESTONES.map(ms => (
                        <button
                          key={ms.key}
                          onClick={() => selectMilestone(ms.key)}
                          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border-2 ${ms.border} ${ms.bg} hover:scale-105 transition-all`}
                        >
                          <span className="text-2xl">{ms.emoji}</span>
                          <span className={`text-sm font-black ${ms.text}`}>{ms.key}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Task categories */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">หมวดหมู่ Task</label>
                    <div className="grid grid-cols-2 gap-3">
                      {taskCats.map(cat => {
                        const count = tasks.filter(t => t.category === cat.key).length;
                        return (
                          <button
                            key={cat.key}
                            onClick={() => selectPickerCat(cat.key)}
                            className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 ${cat.border} ${cat.bg} hover:scale-105 transition-all`}
                          >
                            <span className="text-2xl">{cat.emoji}</span>
                            <span className={`text-sm font-bold ${cat.text}`}>{cat.label}</span>
                            <span className="text-[10px] font-bold text-slate-400">{count} tasks</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Task list from selected category */}
              {pickerStep === 2 && (
                <div className="space-y-2">
                  <button onClick={() => setPickerStep(1)} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 font-bold mb-3 transition-colors">
                    <ChevronLeft className="w-4 h-4" /> กลับเลือกหมวด
                  </button>
                  {catTasks.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <p className="text-sm font-bold">ไม่มี Task ในหมวดนี้</p>
                      <p className="text-xs mt-1">เพิ่ม Task ได้ที่หน้า Tasks</p>
                    </div>
                  ) : (
                    catTasks.map(task => {
                      const catInfo = taskCats.find(c => c.key === task.category);
                      return (
                        <button
                          key={task.id}
                          onClick={() => selectPickerTask(task)}
                          className={`w-full text-left p-4 rounded-xl border-2 ${catInfo?.border || 'border-slate-200'} ${catInfo?.bg || 'bg-slate-50'} hover:scale-[1.02] transition-all`}
                        >
                          <div className={`text-sm font-bold ${catInfo?.text || 'text-slate-700'}`}>{task.title}</div>
                          {task.description && <div className="text-xs text-slate-400 mt-1 line-clamp-1">{task.description}</div>}
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Step 3: Time picker */}
              {pickerStep === 3 && (pickerTask || pickerMilestone) && (
                <div className="space-y-5">
                  <button onClick={() => { if (pickerMilestone) { setPickerMilestone(null); setPickerStep(1); } else { setPickerStep(2); } }} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 font-bold mb-1 transition-colors">
                    <ChevronLeft className="w-4 h-4" /> {pickerMilestone ? 'กลับเลือกประเภท' : 'กลับเลือก Task'}
                  </button>

                  {/* Preview — milestone or task */}
                  {pickerMilestone ? (() => {
                    const ms = MILESTONES.find(m => m.key === pickerMilestone);
                    return ms ? (
                      <div className={`p-4 rounded-xl border-2 ${ms.border} ${ms.bg} text-center`}>
                        <span className="text-3xl block mb-1">{ms.emoji}</span>
                        <span className={`text-base font-black ${ms.text}`}>{ms.key}</span>
                        <div className="text-[10px] text-slate-400 font-bold mt-1">จุดเวลาเดียว — ไม่มีช่วงเวลา</div>
                      </div>
                    ) : null;
                  })() : pickerTask && (
                    <div className={`p-4 rounded-xl border-2 ${taskCats.find(c => c.key === pickerTask.category)?.border || 'border-slate-200'} ${taskCats.find(c => c.key === pickerTask.category)?.bg || 'bg-slate-50'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{taskCats.find(c => c.key === pickerTask.category)?.emoji}</span>
                        <div>
                          <div className={`text-sm font-bold ${taskCats.find(c => c.key === pickerTask.category)?.text || 'text-slate-700'}`}>{pickerTask.title}</div>
                          <div className="text-[10px] text-slate-400 font-bold">{pickerTask.category}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Time inputs — single for milestone, start+end for task */}
                  {pickerMilestone ? (
                    <TimePicker label="เวลา" value={pickerStart} onChange={setPickerStart} />
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-3">
                        <TimePicker label="เริ่ม" value={pickerStart} onChange={setPickerStart} />
                        <TimePicker label="สิ้นสุด" value={pickerEnd} onChange={setPickerEnd} />
                      </div>

                      {/* Duration preview */}
                      {(() => {
                        const [sh, sm] = pickerStart.split(':').map(Number);
                        const [eh, em] = pickerEnd.split(':').map(Number);
                        const dur = (eh * 60 + em) - (sh * 60 + sm);
                        return dur > 0 ? (
                          <div className="text-center text-xs font-bold text-emerald-500 bg-emerald-50 rounded-lg py-2">
                            ระยะเวลา: {dur >= 60 ? `${Math.floor(dur / 60)} ชม. ${dur % 60 > 0 ? `${dur % 60} น.` : ''}` : `${dur} น.`}
                          </div>
                        ) : null;
                      })()}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer — only on step 3 */}
            {pickerStep === 3 && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center gap-3 justify-end">
                <button onClick={closeTaskPicker} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm rounded-xl transition-colors">ยกเลิก</button>
                <button
                  onClick={confirmTaskPicker}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-200 transition-colors"
                >
                  เพิ่มลงตาราง
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Edit Popup ===== */}
      {editForm && editIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-fadeIn overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-500" />
                {editIdx >= sortedSchedule.length ? 'เพิ่มกิจกรรมใหม่' : 'แก้ไขกิจกรรม'}
              </h3>
              <button onClick={() => { setEditIdx(null); setEditForm(null); }} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">ชื่อกิจกรรม</label>
                <input type="text" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="เช่น Coding Session 1" />
              </div>

              {/* Subtitle */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">รายละเอียด (optional)</label>
                <input type="text" value={editForm.subtitle || ''} onChange={e => setEditForm({ ...editForm, subtitle: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="รายละเอียดเพิ่มเติม..." />
              </div>

              {/* Time */}
              <div className="space-y-3">
                <TimePicker
                  label="เริ่ม"
                  value={formatTime(editForm.startHour, editForm.startMin)}
                  onChange={v => { const [h,m] = v.split(':').map(Number); setEditForm({ ...editForm, startHour: h, startMin: m }); }}
                />
                <TimePicker
                  label="สิ้นสุด"
                  value={formatTime(editForm.endHour, editForm.endMin)}
                  onChange={v => { const [h,m] = v.split(':').map(Number); setEditForm({ ...editForm, endHour: h, endMin: m }); }}
                />
              </div>

              {/* Icon picker */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 block">ไอคอน</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map(opt => (
                    <button key={opt.key} onClick={() => setEditForm({ ...editForm, icon: opt.key })} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-all ${editForm.icon === opt.key ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                      {ICON_MAP[opt.key]} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* isBreak toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={editForm.isBreak || false} onChange={e => setEditForm({ ...editForm, isBreak: e.target.checked })} className="w-5 h-5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                <span className="text-sm font-bold text-slate-700">เป็นช่วงพัก (Break)</span>
              </label>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center gap-3">
              {editIdx < sortedSchedule.length && (
                <button onClick={deleteBlock} className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <div className="flex-1" />
              <button onClick={() => { setEditIdx(null); setEditForm(null); }} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm rounded-xl transition-colors">ยกเลิก</button>
              <button onClick={saveEdit} disabled={!editForm.title.trim()} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-200 transition-colors disabled:opacity-40">บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 px-2">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1 bg-white border border-emerald-200 rounded-xl p-1 shadow-sm">
            <button className="p-2 hover:bg-emerald-50 rounded-lg"><ChevronLeft className="w-4 h-4 text-emerald-500" /></button>
            <span className="text-sm font-bold text-slate-700 px-3 min-w-[140px] text-center">{dateStr}</span>
            <button className="p-2 hover:bg-emerald-50 rounded-lg"><ChevronRight className="w-4 h-4 text-emerald-500" /></button>
          </div>
          <button className="p-2.5 bg-white border border-emerald-200 rounded-xl text-emerald-400 hover:text-emerald-600 shadow-sm transition-colors">
            <CalendarIcon className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={handleMagicFill}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-xl shadow-emerald-200 hover:bg-emerald-800 transition-all active:scale-95 disabled:opacity-50"
        >
          {isGenerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Sparkles className="w-4 h-4 text-amber-300" />}
          AI Smart Plan
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mx-2 mb-6 bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">ความคืบหน้าวันนี้</span>
          <span className="text-sm font-black text-emerald-600">{progressPct}%</span>
        </div>
        <div className="h-2.5 bg-emerald-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }}></div>
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-bold">
          <span>05:00 ตื่นนอน</span>
          <span>22:00 เข้านอน</span>
        </div>
      </div>

      {/* Notebook */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden min-h-[600px] flex flex-col md:flex-row relative">
        {/* Binder */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-10 -ml-5 bg-gradient-to-r from-stone-200 via-stone-50 to-stone-200 z-10 shadow-inner">
          <div className="h-full w-full flex flex-col justify-around py-8">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="h-[2px] w-full bg-stone-300/40"></div>
            ))}
          </div>
        </div>

        {/* Left: Timeline */}
        <div className="flex-1 p-5 md:p-8 md:pr-14 bg-white relative">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-xl font-bold text-slate-800">ตารางวันนี้</h3>
            <span className="text-[10px] uppercase tracking-[0.15em] text-emerald-500 font-black">05:00 — 22:00</span>
          </div>

          <div className="space-y-1.5">
            {sortedSchedule.map((block, idx) => {
              const blockStart = block.startHour * 60 + block.startMin;
              const blockEnd = block.endHour * 60 + block.endMin;
              const isNow = nowMinutes >= blockStart && nowMinutes < blockEnd;
              const checked = checkedBlocks.has(idx);
              const duration = getDurationMin(block);

              return (
                <div
                  key={idx}
                  className={`flex items-stretch rounded-xl border transition-all ${isNow ? 'ring-2 ring-emerald-400 ring-offset-1' : ''} ${checked ? 'opacity-50' : ''} ${block.color}`}
                >
                  {/* Time */}
                  <div className="w-[52px] md:w-16 shrink-0 py-2.5 px-1.5 md:px-3 flex flex-col items-center justify-center border-r border-current/10">
                    <span className="text-[10px] font-black tabular-nums leading-tight">{formatTime(block.startHour, block.startMin)}</span>
                    {getDurationMin(block) > 0 && <span className="text-[8px] opacity-50 leading-tight">{formatTime(block.endHour, block.endMin)}</span>}
                  </div>

                  {/* Content — tap to check */}
                  <div
                    onClick={() => !block.isBreak && toggleCheck(idx)}
                    className={`flex-1 py-2.5 px-3 flex items-center gap-2.5 ${duration >= 60 ? 'min-h-[56px]' : 'min-h-[40px]'} ${block.isBreak ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {!block.isBreak && (
                      <div className={`w-4.5 h-4.5 rounded-md border-2 border-current/30 flex items-center justify-center shrink-0 ${checked ? 'bg-current/20' : ''}`}>
                        {checked && <span className="text-[10px] font-black">✓</span>}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold leading-tight ${checked ? 'line-through' : ''}`}>{block.title}</div>
                      {block.subtitle && <div className="text-[10px] opacity-60 font-medium mt-0.5">{block.subtitle}</div>}
                    </div>
                    <div className="shrink-0 opacity-50">{ICON_MAP[block.icon]}</div>
                    {isNow && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>}
                  </div>

                  {/* Edit button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(idx); }}
                    className="px-2.5 shrink-0 flex items-center justify-center opacity-30 hover:opacity-80 transition-opacity"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {/* Add new block — opens Task Picker */}
            <button
              onClick={openTaskPicker}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-emerald-200 text-emerald-400 hover:text-emerald-600 hover:border-emerald-400 transition-all text-sm font-bold"
            >
              <Plus className="w-4 h-4" /> เพิ่มกิจกรรม
            </button>
          </div>
        </div>

        {/* Right: Summary */}
        <div className="flex-1 p-5 md:p-8 md:pl-14 bg-[#fefefc] border-t md:border-t-0 md:border-l border-stone-200">
          {sortedSchedule.length > 0 ? (
            <>
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4">สรุปเวลาตามหมวด</h3>
                <div className="space-y-2.5">
                  {(() => {
                    // Map icon → group for category lookup
                    const iconToGroup: Record<string, TaskGroup> = {};
                    taskGroups.forEach(g => { iconToGroup[g.icon] = g; });

                    const catMins: Record<string, { mins: number; emoji: string; color: string }> = {};
                    let breakMins = 0;

                    sortedSchedule.forEach(b => {
                      const dur = getDurationMin(b);
                      if (dur <= 0) return; // skip milestones (0 duration)
                      if (b.isBreak) { breakMins += dur; return; }
                      const group = iconToGroup[b.icon];
                      const key = group ? group.key : 'อื่นๆ';
                      if (!catMins[key]) {
                        catMins[key] = { mins: 0, emoji: group?.emoji || '📋', color: group?.color || 'orange' };
                      }
                      catMins[key].mins += dur;
                    });

                    const totalWorkMins = Object.values(catMins).reduce((s, v) => s + v.mins, 0);

                    return (
                      <>
                        {Object.entries(catMins).map(([key, { mins, emoji, color }]) => {
                          const c = GROUP_COLORS[color] || GROUP_COLORS.orange;
                          const pct = totalWorkMins > 0 ? Math.round((mins / totalWorkMins) * 100) : 0;
                          return (
                            <div key={key} className={`flex items-center gap-3 px-3 py-3 rounded-xl border ${c.border} ${c.bg}`}>
                              <span className="text-lg">{emoji}</span>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-bold ${c.text}`}>{key}</div>
                                <div className="h-1.5 bg-white/60 rounded-full mt-1 overflow-hidden">
                                  <div className={`h-full rounded-full ${c.dot}`} style={{ width: `${pct}%` }}></div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-black text-slate-700">
                                  {mins >= 60 ? `${Math.floor(mins / 60)} ชม. ${mins % 60 > 0 ? `${mins % 60} น.` : ''}` : `${mins} น.`}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400">{pct}%</div>
                              </div>
                            </div>
                          );
                        })}

                        {breakMins > 0 && (
                          <div className="flex items-center gap-3 px-3 py-3 rounded-xl border border-slate-200 bg-slate-50">
                            <span className="text-lg">☕</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-slate-500">พักผ่อน / Break</div>
                            </div>
                            <div className="text-sm font-black text-slate-500">
                              {breakMins >= 60 ? `${Math.floor(breakMins / 60)} ชม. ${breakMins % 60 > 0 ? `${breakMins % 60} น.` : ''}` : `${breakMins} น.`}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 p-3 bg-emerald-50/50 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-lg font-black text-emerald-600">
                              {totalWorkMins >= 60 ? `${Math.floor(totalWorkMins / 60)} ชม. ${totalWorkMins % 60 > 0 ? `${totalWorkMins % 60} น.` : ''}` : `${totalWorkMins} น.`}
                            </span>
                            <span className="text-xs text-slate-500 ml-2">ทำงานทั้งวัน</span>
                          </div>
                          {breakMins > 0 && (
                            <span className="text-xs font-bold text-slate-400">
                              พัก {breakMins >= 60 ? `${Math.floor(breakMins / 60)} ชม. ${breakMins % 60 > 0 ? `${breakMins % 60} น.` : ''}` : `${breakMins} น.`}
                            </span>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarIcon className="w-12 h-12 text-stone-300 mb-4" />
              <p className="text-base font-bold text-slate-500 mb-1">ยังไม่มีตารางวันนี้</p>
              <p className="text-sm text-slate-400">เพิ่มกิจกรรมจากปุ่มด้านซ้าย</p>
            </div>
          )}

          {/* AI Result */}
          {aiSchedule && (
            <div className="mt-8 p-5 bg-emerald-50/40 rounded-2xl border border-emerald-100 animate-fadeIn shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-emerald-700">
                <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">AI Strategist</span>
              </div>
              <div className="text-sm text-emerald-900/90 leading-loose whitespace-pre-wrap font-medium bg-white/50 p-4 rounded-xl border border-emerald-50">
                {aiSchedule}
              </div>
            </div>
          )}

          <div className="mt-12 pt-10 text-center opacity-30">
            <Bookmark className="w-6 h-6 text-stone-400 mx-auto" />
            <p className="mt-4 text-xs text-stone-500">Debug-Me LifeFlow</p>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.4em] opacity-60">Daily Plan — Designed for Focus</p>
      </div>
    </div>
  );
};

export default DailyPlanner;
