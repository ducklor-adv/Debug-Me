
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Task, TaskGroup, DailyRecord, ScheduleTemplates, GROUP_COLORS, TimeSlot, getTasksForDate } from '../types';
import { getDailyRecordsInRange } from '../lib/firestoreDB';
import {
  BarChart, Bar,
  PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Flame, CheckCircle2, Clock, Target, BarChart3 } from 'lucide-react';

// Tailwind color → hex for Recharts
const COLOR_HEX: Record<string, string> = {
  teal: '#2dd4bf', orange: '#fb923c', yellow: '#facc15',
  amber: '#fbbf24', green: '#4ade80', violet: '#8b5cf6',
  rose: '#fb7185', cyan: '#22d3ee', blue: '#60a5fa',
  indigo: '#818cf8', pink: '#f472b6', purple: '#a78bfa',
};

interface AnalyticsProps {
  tasks: Task[];
  taskGroups: TaskGroup[];
  scheduleTemplates: ScheduleTemplates;
  todayRecords: DailyRecord[];
  totalRecordCount: number;
  userId: string;
}

// Helpers
function getDurationMins(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
}

function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}ชม.${m}น.`;
  if (h > 0) return `${h}ชม.`;
  return `${m}น.`;
}

function fmtHours(mins: number): string {
  return (mins / 60).toFixed(1);
}

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    dates.push(dateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function countDayTypes(start: string, end: string) {
  let workdays = 0, saturdays = 0, sundays = 0;
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    const dow = cur.getDay();
    if (dow === 0) sundays++;
    else if (dow === 6) saturdays++;
    else workdays++;
    cur.setDate(cur.getDate() + 1);
  }
  return { workdays, saturdays, sundays };
}

function calcStreak(records: DailyRecord[]): number {
  const completedDates = new Set(records.filter(r => r.completed).map(r => r.date));
  let streak = 0;
  const d = new Date();
  while (true) {
    if (completedDates.has(dateStr(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

type DateRange = '7d' | '30d' | 'all';

const Analytics: React.FC<AnalyticsProps> = ({
  tasks, taskGroups, scheduleTemplates, todayRecords, totalRecordCount, userId,
}) => {
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const cacheRef = useRef<Map<string, DailyRecord[]>>(new Map());

  const today = new Date();
  const todayS = dateStr(today);

  // Determine date range
  const rangeDays = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 365;
  const startDate = dateStr(addDays(today, -(rangeDays - 1)));
  const prevStartDate = dateStr(addDays(today, -(rangeDays * 2 - 1)));

  // Fetch records (double range for trend comparison)
  useEffect(() => {
    const fetchData = async () => {
      const cacheKey = dateRange;
      if (cacheRef.current.has(cacheKey)) {
        setRecords(cacheRef.current.get(cacheKey)!);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getDailyRecordsInRange(userId, prevStartDate, todayS);
        cacheRef.current.set(cacheKey, data);
        setRecords(data);
      } catch (err) {
        console.error('Analytics fetch error:', err);
        setRecords([]);
      }
      setLoading(false);
    };
    fetchData();
  }, [dateRange, userId, prevStartDate, todayS]);

  // Split into current and previous periods
  const currentRecords = useMemo(() =>
    records.filter(r => r.date >= startDate && r.date <= todayS),
    [records, startDate, todayS]);

  const prevRecords = useMemo(() =>
    records.filter(r => r.date >= prevStartDate && r.date < startDate),
    [records, prevStartDate, startDate]);

  // Group map
  const groupMap = useMemo(() =>
    new Map(taskGroups.map(g => [g.key, g])),
    [taskGroups]);

  // ====== STAT CARDS ======

  const completedCurrent = useMemo(() => currentRecords.filter(r => r.completed).length, [currentRecords]);
  const completedPrev = useMemo(() => prevRecords.filter(r => r.completed).length, [prevRecords]);

  // Total actual time
  const totalMinsCurrent = useMemo(() =>
    currentRecords.filter(r => r.completed && r.timeStart && r.timeEnd)
      .reduce((s, r) => s + getDurationMins(r.timeStart!, r.timeEnd!), 0),
    [currentRecords]);
  const totalMinsPrev = useMemo(() =>
    prevRecords.filter(r => r.completed && r.timeStart && r.timeEnd)
      .reduce((s, r) => s + getDurationMins(r.timeStart!, r.timeEnd!), 0),
    [prevRecords]);

  // Planned tasks per day count
  const plannedPerDay = useMemo(() => {
    const dates = getDateRange(startDate, todayS);
    let total = 0;
    dates.forEach(d => {
      total += getTasksForDate(tasks, d).length;
    });
    return total;
  }, [tasks, startDate, todayS]);

  const completionRate = plannedPerDay > 0 ? Math.round((completedCurrent / plannedPerDay) * 100) : 0;
  const prevPlannedPerDay = useMemo(() => {
    const dates = getDateRange(prevStartDate, dateStr(addDays(new Date(startDate), -1)));
    let total = 0;
    dates.forEach(d => { total += getTasksForDate(tasks, d).length; });
    return total;
  }, [tasks, prevStartDate, startDate]);
  const prevCompletionRate = prevPlannedPerDay > 0 ? Math.round((completedPrev / prevPlannedPerDay) * 100) : 0;

  const streak = useMemo(() => calcStreak(records), [records]);

  // Trend helper
  const trendStr = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? '+100%' : '-';
    const pct = Math.round(((cur - prev) / prev) * 100);
    return pct > 0 ? `+${pct}%` : pct < 0 ? `${pct}%` : '-';
  };

  // ====== B: DAILY COMPLETION (BarChart) ======
  const dailyChartData = useMemo(() => {
    const grouped = new Map<string, number>();
    currentRecords.filter(r => r.completed).forEach(r => {
      grouped.set(r.date, (grouped.get(r.date) || 0) + 1);
    });
    return getDateRange(startDate, todayS).map(d => {
      const dt = new Date(d);
      return {
        date: `${dt.getDate()}/${dt.getMonth() + 1}`,
        completed: grouped.get(d) || 0,
      };
    });
  }, [currentRecords, startDate, todayS]);

  // ====== C: LIFE BALANCE (PieChart) ======
  const categoryTimeData = useMemo(() => {
    const timeMap = new Map<string, number>();
    currentRecords.filter(r => r.completed && r.timeStart && r.timeEnd).forEach(r => {
      const mins = getDurationMins(r.timeStart!, r.timeEnd!);
      if (mins > 0) timeMap.set(r.category, (timeMap.get(r.category) || 0) + mins);
    });
    return taskGroups
      .filter(g => timeMap.has(g.key))
      .map(g => ({
        key: g.key,
        name: `${g.emoji} ${g.label}`,
        label: g.label,
        emoji: g.emoji,
        value: timeMap.get(g.key)!,
        color: COLOR_HEX[g.color] || '#94a3b8',
      }))
      .sort((a, b) => b.value - a.value);
  }, [currentRecords, taskGroups]);

  const totalCategoryMins = categoryTimeData.reduce((s, c) => s + c.value, 0);

  // Insight
  const lifeBalanceInsight = useMemo(() => {
    if (categoryTimeData.length === 0) return 'ยังไม่มีข้อมูลเพียงพอ';
    const top = categoryTimeData[0];
    const topPct = Math.round((top.value / totalCategoryMins) * 100);
    const neglected = taskGroups
      .filter(g => !['งานรอง', 'เฉพาะกิจ'].includes(g.key))
      .filter(g => {
        const found = categoryTimeData.find(c => c.key === g.key);
        return !found || found.value < 30;
      })
      .slice(0, 2)
      .map(g => g.label);

    let msg = `คุณใช้เวลากับ "${top.label}" มากที่สุด (${topPct}%)`;
    if (neglected.length > 0) msg += ` — ลองเพิ่มเวลาให้ "${neglected.join('" และ "')}"`;
    return msg;
  }, [categoryTimeData, totalCategoryMins, taskGroups]);

  // ====== D: PLANNED VS ACTUAL (BarChart) ======
  const planVsActualData = useMemo(() => {
    const days = countDayTypes(startDate, todayS);
    const plannedMap = new Map<string, number>();
    const addSlots = (slots: TimeSlot[], count: number) => {
      slots.forEach(s => {
        if (s.startTime && s.endTime && s.groupKey) {
          const mins = getDurationMins(s.startTime, s.endTime);
          plannedMap.set(s.groupKey, (plannedMap.get(s.groupKey) || 0) + mins * count);
        }
      });
    };
    addSlots(scheduleTemplates.workday || [], days.workdays);
    addSlots(scheduleTemplates.saturday || [], days.saturdays);
    addSlots(scheduleTemplates.sunday || [], days.sundays);

    const actualMap = new Map<string, number>();
    currentRecords.filter(r => r.completed && r.timeStart && r.timeEnd).forEach(r => {
      const mins = getDurationMins(r.timeStart!, r.timeEnd!);
      if (mins > 0) actualMap.set(r.category, (actualMap.get(r.category) || 0) + mins);
    });

    return taskGroups
      .filter(g => !['งานรอง', 'เฉพาะกิจ'].includes(g.key))
      .map(g => ({
        name: `${g.emoji} ${g.label}`,
        planned: Math.round((plannedMap.get(g.key) || 0) / 60 * 10) / 10,
        actual: Math.round((actualMap.get(g.key) || 0) / 60 * 10) / 10,
      }))
      .filter(d => d.planned > 0 || d.actual > 0);
  }, [currentRecords, scheduleTemplates, taskGroups, startDate, todayS]);

  // ====== E: CATEGORY CARDS ======
  const categoryCards = useMemo(() => {
    const countMap = new Map<string, { done: number; total: number }>();
    const dates = getDateRange(startDate, todayS);
    dates.forEach(d => {
      const dayTasks = getTasksForDate(tasks, d);
      dayTasks.forEach(t => {
        const prev = countMap.get(t.category) || { done: 0, total: 0 };
        prev.total++;
        countMap.set(t.category, prev);
      });
    });
    currentRecords.filter(r => r.completed).forEach(r => {
      const prev = countMap.get(r.category) || { done: 0, total: 0 };
      prev.done++;
      countMap.set(r.category, prev);
    });

    return taskGroups
      .filter(g => !['งานรอง', 'เฉพาะกิจ'].includes(g.key))
      .map(g => {
        const data = countMap.get(g.key) || { done: 0, total: 0 };
        const rate = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
        return { ...g, done: data.done, total: data.total, rate };
      })
      .filter(c => c.total > 0);
  }, [tasks, currentRecords, taskGroups, startDate, todayS]);

  // ====== F: HOURLY DISTRIBUTION ======
  const hourlyData = useMemo(() => {
    const buckets = new Array(18).fill(0); // 05:00 to 22:00
    currentRecords.filter(r => r.completed && r.timeStart).forEach(r => {
      const hour = parseInt(r.timeStart!.split(':')[0]);
      if (hour >= 5 && hour < 23) buckets[hour - 5]++;
    });
    return buckets.map((count, i) => ({
      hour: `${String(i + 5).padStart(2, '0')}:00`,
      count,
    }));
  }, [currentRecords]);

  // Completion insight
  const completionInsight = useMemo(() => {
    if (completionRate > 80) return `เก่งมาก! ทำกิจกรรมได้ตามเป้า ${completionRate}%`;
    if (completionRate >= 50) return `ดีขึ้นเรื่อยๆ! เป้าหมายต่อไป ${Math.min(completionRate + 10, 100)}%`;
    if (completionRate > 0) return 'ลองตั้งเป้าที่ 60% สัปดาห์หน้า — ทำได้!';
    return 'เริ่มทำกิจกรรมใน Planner เพื่อดูสถิติ';
  }, [completionRate]);

  // ====== RENDER ======

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-sm text-emerald-600 font-medium">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (totalRecordCount === 0 && currentRecords.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
        <BarChart3 className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
        <h3 className="text-xl font-black text-slate-800 mb-2">ยังไม่มีข้อมูล</h3>
        <p className="text-sm text-slate-500">เริ่มทำกิจกรรมใน Daily Planner แล้วกลับมาดูสถิติของคุณ</p>
      </div>
    );
  }

  const tooltipStyle = { borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* A: Date Range + Stats */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ช่วงเวลา</span>
        <div className="flex gap-1">
          {([['7d', '7 วัน'], ['30d', '30 วัน'], ['all', 'ทั้งหมด']] as [DateRange, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setDateRange(key)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                dateRange === key ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Insight Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
        <span className="text-lg">💡</span>
        <p className="text-xs font-bold text-emerald-700">{completionInsight}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Target className="w-4 h-4 text-emerald-500" />}
          title="อัตราสำเร็จ"
          value={`${completionRate}%`}
          trend={trendStr(completionRate, prevCompletionRate)}
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4 text-blue-500" />}
          title="งานสำเร็จ"
          value={`${completedCurrent}`}
          trend={trendStr(completedCurrent, completedPrev)}
        />
        <StatCard
          icon={<Clock className="w-4 h-4 text-violet-500" />}
          title="เวลาที่ใช้จริง"
          value={fmtMins(totalMinsCurrent)}
          trend={trendStr(totalMinsCurrent, totalMinsPrev)}
        />
        <StatCard
          icon={<Flame className="w-4 h-4 text-orange-500" />}
          title="Streak"
          value={`${streak} วัน`}
          trend={streak >= 7 ? `เป้าต่อไป ${streak + 7}` : streak > 0 ? 'ทำต่อไป!' : '-'}
          trendColor={streak >= 3 ? 'emerald' : 'slate'}
        />
      </div>

      {/* B: Daily Trend */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">แนวโน้มรายวัน</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyChartData} barSize={dateRange === '30d' ? 8 : dateRange === 'all' ? 4 : 16}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} interval={dateRange === '30d' ? 4 : dateRange === 'all' ? 29 : 0} />
              <YAxis hide />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} งาน`, 'สำเร็จ']} />
              <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* C: Life Balance */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">สมดุลชีวิต</h4>
          {categoryTimeData.length > 0 ? (
            <>
              <div className="h-52 flex items-center">
                <div className="flex-1 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryTimeData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                        {categoryTimeData.map((c, i) => <Cell key={i} fill={c.color} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtMins(v), 'เวลา']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 ml-2 shrink-0">
                  {categoryTimeData.map(c => (
                    <div key={c.key} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="text-[11px] font-bold text-slate-600 truncate max-w-[80px]">{c.emoji} {c.label}</span>
                      <span className="text-[10px] font-black text-slate-400 ml-auto">{Math.round((c.value / totalCategoryMins) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[11px] font-bold text-emerald-600 mt-2 bg-emerald-50 rounded-lg px-3 py-1.5">{lifeBalanceInsight}</p>
            </>
          ) : (
            <p className="text-xs text-slate-400 italic py-10 text-center">ยังไม่มีข้อมูลเวลา</p>
          )}
        </div>

        {/* D: Planned vs Actual */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">แผน vs จริง (ชม.)</h4>
          {planVsActualData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planVsActualData} layout="vertical" barSize={8}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" width={90} axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} ชม.`]} />
                  <Bar dataKey="planned" fill="#d1fae5" radius={[0, 4, 4, 0]} name="แผน" />
                  <Bar dataKey="actual" fill="#10b981" radius={[0, 4, 4, 0]} name="จริง" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-10 text-center">ยังไม่มีข้อมูล</p>
          )}
        </div>
      </div>

      {/* E: Category Cards */}
      {categoryCards.length > 0 && (
        <div>
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">สถิติแต่ละหมวด</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categoryCards.map(c => {
              const clr = GROUP_COLORS[c.color] || GROUP_COLORS.orange;
              const badge = c.rate >= 70 ? { text: 'ดีมาก', cls: 'bg-emerald-100 text-emerald-700' }
                : c.rate >= 40 ? { text: 'ปานกลาง', cls: 'bg-amber-100 text-amber-700' }
                : { text: 'ต้องปรับปรุง', cls: 'bg-rose-100 text-rose-700' };
              return (
                <div key={c.key} className={`rounded-xl border p-3 ${clr.bg} ${clr.border}`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm">{c.emoji}</span>
                    <span className={`text-xs font-black ${clr.text}`}>{c.label}</span>
                  </div>
                  <div className="flex items-end justify-between mb-1.5">
                    <span className="text-xl font-black text-slate-800">{c.rate}%</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.text}</span>
                  </div>
                  <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${clr.iconBg}`} style={{ width: `${c.rate}%` }} />
                  </div>
                  <p className="text-[9px] text-slate-500 font-bold mt-1">{c.done}/{c.total} งาน</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* F: Hourly Distribution */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">ช่วงเวลาที่ทำได้ดี</h4>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="hourGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} interval={2} />
              <YAxis hide />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} ครั้ง`, 'สำเร็จ']} />
              <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#hourGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Stat Card
const StatCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string;
  trend: string;
  trendColor?: 'emerald' | 'slate';
}> = ({ icon, title, value, trend, trendColor }) => {
  const isUp = trend.startsWith('+');
  const isDown = trend.startsWith('-') && trend !== '-';
  const color = trendColor || (isUp ? 'emerald' : isDown ? 'rose' : 'slate');

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-xl font-black text-slate-800">{value}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
          color === 'emerald' ? 'bg-emerald-100 text-emerald-600'
          : color === 'rose' ? 'bg-rose-100 text-rose-600'
          : 'bg-slate-100 text-slate-500'
        }`}>
          {isUp && <TrendingUp className="w-3 h-3 inline mr-0.5" />}
          {isDown && <TrendingDown className="w-3 h-3 inline mr-0.5" />}
          {trend}
        </span>
      </div>
    </div>
  );
};

export default Analytics;
