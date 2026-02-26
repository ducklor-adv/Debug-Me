import React, { useState, useEffect, useMemo } from 'react';
import { Task, TaskGroup, ScheduleTemplates, GROUP_COLORS, getTasksForDate, getDayType, DailyRecord } from '../types';
import { getDailyRecordsInRange } from '../lib/firestoreDB';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Clock } from 'lucide-react';

const WEEKDAY_LABELS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
const MONTH_NAMES = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

interface CalendarViewProps {
  tasks: Task[];
  taskGroups: TaskGroup[];
  scheduleTemplates: ScheduleTemplates;
  userId: string;
}

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1; // Monday-start
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function dateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, taskGroups, scheduleTemplates, userId }) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [monthRecords, setMonthRecords] = useState<DailyRecord[]>([]);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Load daily records for visible month
  useEffect(() => {
    const start = dateStr(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const end = dateStr(viewYear, viewMonth, lastDay);
    getDailyRecordsInRange(userId, start, end).then(setMonthRecords).catch(() => setMonthRecords([]));
  }, [userId, viewYear, viewMonth]);

  // Records grouped by date
  const recordsByDate = useMemo(() => {
    const map: Record<string, DailyRecord[]> = {};
    monthRecords.forEach(r => {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    });
    return map;
  }, [monthRecords]);

  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const goToToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelectedDate(todayStr); };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  // Tasks for selected date
  const selectedDayTasks = useMemo(() => {
    if (!selectedDate) return [];
    return getTasksForDate(tasks, selectedDate);
  }, [selectedDate, tasks]);

  // Get category dots for a day
  const getCategoryDots = (day: number) => {
    const d = dateStr(viewYear, viewMonth, day);
    const dayTasks = getTasksForDate(tasks, d);
    const categories = [...new Set(dayTasks.map(t => t.category))];
    return categories.slice(0, 4).map(cat => {
      const group = taskGroups.find(g => g.key === cat);
      return GROUP_COLORS[group?.color || 'orange']?.dot || 'bg-slate-300';
    });
  };

  // Get completion status for a day
  const getDayStatus = (day: number): 'none' | 'partial' | 'complete' => {
    const d = dateStr(viewYear, viewMonth, day);
    const dayTasks = getTasksForDate(tasks, d);
    if (dayTasks.length === 0) return 'none';
    const records = recordsByDate[d] || [];
    if (records.length === 0) return 'none';
    const completedCount = records.filter(r => r.completed).length;
    if (completedCount >= dayTasks.length) return 'complete';
    if (completedCount > 0) return 'partial';
    return 'none';
  };

  // Buddhist year
  const buddhistYear = viewYear + 543;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Month Header */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ChevronLeft className="w-5 h-5 text-slate-500" />
        </button>
        <div className="text-center">
          <h3 className="text-lg font-black text-slate-800">{MONTH_NAMES[viewMonth]} {buddhistYear}</h3>
        </div>
        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      <div className="flex justify-center">
        <button onClick={goToToday} className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors">
          วันนี้
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={i} className={`py-2 text-center text-[10px] font-bold uppercase tracking-widest ${i >= 5 ? 'text-rose-400' : 'text-slate-400'}`}>
              {label}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return <div key={idx} className="h-14 md:h-18 border-b border-r border-slate-50" />;
            }

            const d = dateStr(viewYear, viewMonth, day);
            const isToday = d === todayStr;
            const isSelected = d === selectedDate;
            const status = getDayStatus(day);
            const dots = getCategoryDots(day);
            const isPast = d < todayStr;

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(d === selectedDate ? null : d)}
                className={`h-14 md:h-18 border-b border-r border-slate-50 flex flex-col items-center justify-center gap-0.5 transition-all relative
                  ${isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'}
                  ${isToday ? 'ring-2 ring-emerald-500 ring-inset rounded-lg z-10' : ''}
                  ${status === 'complete' ? 'bg-emerald-50/50' : status === 'partial' ? 'bg-amber-50/50' : ''}
                `}
              >
                <span className={`text-sm font-bold ${isToday ? 'text-emerald-600' : isPast ? 'text-slate-400' : 'text-slate-700'}`}>
                  {day}
                </span>
                {dots.length > 0 && (
                  <div className="flex gap-0.5">
                    {dots.map((dot, i) => (
                      <span key={i} className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Detail */}
      {selectedDate && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 animate-fadeIn">
          <div className="flex items-center gap-2 mb-3">
            <h4 className="text-sm font-black text-slate-800">
              {new Date(selectedDate).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h4>
            {selectedDate === todayStr && (
              <span className="text-[9px] font-bold bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded">วันนี้</span>
            )}
          </div>

          {selectedDayTasks.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">ไม่มี task ในวันนี้</p>
          ) : (
            <div className="space-y-2">
              {/* Group tasks by category */}
              {[...new Set(selectedDayTasks.map(t => t.category))].map(cat => {
                const group = taskGroups.find(g => g.key === cat);
                const clr = GROUP_COLORS[group?.color || 'orange'] || GROUP_COLORS.orange;
                const catTasks = selectedDayTasks.filter(t => t.category === cat);
                const records = recordsByDate[selectedDate] || [];

                return (
                  <div key={cat}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-2 h-2 rounded-full ${clr.dot}`} />
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${clr.text}`}>
                        {group?.emoji} {group?.label || cat}
                      </span>
                    </div>
                    {catTasks.map(task => {
                      const isRecorded = records.some(r => r.taskTitle === task.title && r.completed);
                      return (
                        <div key={task.id} className="flex items-center gap-2 py-1.5 pl-4">
                          {isRecorded
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                          <span className={`text-xs font-medium truncate ${isRecorded ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                            {task.title}
                          </span>
                          {task.estimatedDuration && (
                            <span className="text-[9px] font-mono text-slate-400 shrink-0 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" /> {task.estimatedDuration}น.
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarView;
