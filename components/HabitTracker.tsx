import React, { useState, useMemo } from 'react';
import { Habit, GROUP_COLORS } from '../types';
import { Check, Flame, Plus, X, Trash2, Pencil } from 'lucide-react';

interface HabitTrackerProps {
  habits: Habit[];
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
}

const EMOJI_OPTIONS = ['💪', '📖', '🧘', '🏃', '💧', '🍎', '😴', '✍️', '🧠', '🎯', '☀️', '🙏', '💊', '🎵', '🌿', '🚶'];
const COLOR_OPTIONS: { key: string; label: string }[] = [
  { key: 'emerald', label: 'เขียว' }, { key: 'blue', label: 'น้ำเงิน' }, { key: 'violet', label: 'ม่วง' },
  { key: 'rose', label: 'ชมพู' }, { key: 'amber', label: 'ส้ม' }, { key: 'cyan', label: 'ฟ้า' },
  { key: 'teal', label: 'เขียวเข้ม' }, { key: 'indigo', label: 'คราม' },
];
const FREQ_OPTIONS: { key: Habit['frequency']; label: string }[] = [
  { key: 'daily', label: 'ทุกวัน' }, { key: 'weekdays', label: 'จ-ศ' },
  { key: 'weekends', label: 'ส-อา' }, { key: 'custom', label: 'กำหนดเอง' },
];
const DAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function calculateStreak(history: Record<string, boolean>, frequency: Habit['frequency'], customDays?: number[]): number {
  let streak = 0;
  const d = new Date();
  d.setDate(d.getDate()); // start from today
  for (let i = 0; i < 365; i++) {
    const ds = d.toISOString().split('T')[0];
    const dow = d.getDay();
    // Check if this day matches frequency
    let shouldCheck = true;
    if (frequency === 'weekdays' && (dow === 0 || dow === 6)) shouldCheck = false;
    if (frequency === 'weekends' && dow >= 1 && dow <= 5) shouldCheck = false;
    if (frequency === 'custom' && customDays && !customDays.includes(dow)) shouldCheck = false;

    if (shouldCheck) {
      if (history[ds]) {
        streak++;
      } else {
        // For today, if not done yet, don't break streak, just skip
        if (i === 0) { /* skip today */ }
        else break;
      }
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

const HabitTracker: React.FC<HabitTrackerProps> = ({ habits, setHabits }) => {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formEmoji, setFormEmoji] = useState('💪');
  const [formColor, setFormColor] = useState('emerald');
  const [formFreq, setFormFreq] = useState<Habit['frequency']>('daily');
  const [formCustomDays, setFormCustomDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const openNew = () => {
    setEditId(null);
    setFormName(''); setFormDesc(''); setFormEmoji('💪'); setFormColor('emerald'); setFormFreq('daily'); setFormCustomDays([1,2,3,4,5]);
    setShowForm(true);
  };

  const openEdit = (h: Habit) => {
    setEditId(h.id);
    setFormName(h.name); setFormDesc(h.description || ''); setFormEmoji(h.emoji); setFormColor(h.color); setFormFreq(h.frequency); setFormCustomDays(h.customDays || [1,2,3,4,5]);
    setShowForm(true);
  };

  const saveHabit = () => {
    if (!formName.trim()) return;
    if (editId) {
      setHabits(prev => prev.map(h => h.id === editId ? {
        ...h, name: formName.trim(), description: formDesc.trim() || undefined, emoji: formEmoji, color: formColor,
        frequency: formFreq, customDays: formFreq === 'custom' ? formCustomDays : undefined,
      } : h));
    } else {
      const newHabit: Habit = {
        id: `hab-${Date.now()}`, name: formName.trim(), description: formDesc.trim() || undefined,
        emoji: formEmoji, color: formColor, streak: 0, bestStreak: 0,
        frequency: formFreq, customDays: formFreq === 'custom' ? formCustomDays : undefined,
        createdAt: new Date().toISOString(), history: {},
      };
      setHabits(prev => [...prev, newHabit]);
    }
    setShowForm(false);
  };

  const deleteHabit = (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
    setConfirmDelete(null);
  };

  const toggleToday = (id: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id !== id) return h;
      const newHistory = { ...h.history };
      if (newHistory[todayStr]) {
        delete newHistory[todayStr];
      } else {
        newHistory[todayStr] = true;
      }
      const newStreak = calculateStreak(newHistory, h.frequency, h.customDays);
      return {
        ...h, history: newHistory, streak: newStreak,
        bestStreak: Math.max(h.bestStreak, newStreak),
      };
    }));
  };

  // Last 7 days for mini heatmap
  const last7Days = useMemo(() => {
    const days: string[] = [];
    const d = new Date();
    for (let i = 6; i >= 0; i--) {
      const dd = new Date(d);
      dd.setDate(dd.getDate() - i);
      days.push(dd.toISOString().split('T')[0]);
    }
    return days;
  }, []);

  // Month heatmap data
  const monthDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay();
    const offset = firstDow === 0 ? 6 : firstDow - 1;
    const cells: (number | null)[] = Array(offset).fill(null);
    for (let i = 1; i <= daysInMonth; i++) cells.push(i);
    while (cells.length % 7 !== 0) cells.push(null);
    return { year, month, cells };
  }, []);

  const getColorClasses = (colorKey: string) => {
    // Map GROUP_COLORS key to Tailwind bg class
    const map: Record<string, { bg: string; ring: string }> = {
      emerald: { bg: 'bg-emerald-500', ring: 'ring-emerald-300' },
      blue: { bg: 'bg-blue-500', ring: 'ring-blue-300' },
      violet: { bg: 'bg-violet-500', ring: 'ring-violet-300' },
      rose: { bg: 'bg-rose-500', ring: 'ring-rose-300' },
      amber: { bg: 'bg-amber-500', ring: 'ring-amber-300' },
      cyan: { bg: 'bg-cyan-500', ring: 'ring-cyan-300' },
      teal: { bg: 'bg-teal-500', ring: 'ring-teal-300' },
      indigo: { bg: 'bg-indigo-500', ring: 'ring-indigo-300' },
    };
    return map[colorKey] || map.emerald;
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Habits</h2>
          <p className="text-xs text-slate-500 font-medium">สร้างนิสัยดี ทำทุกวัน</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 transition-all active:scale-95">
          <Plus className="w-4 h-4" /> เพิ่ม Habit
        </button>
      </div>

      {/* Habit Cards */}
      {habits.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-5xl mb-4 block">🎯</span>
          <h3 className="text-lg font-bold text-slate-400 mb-1">ยังไม่มี Habit</h3>
          <p className="text-sm text-slate-400">กดปุ่ม "เพิ่ม Habit" เพื่อเริ่มสร้างนิสัยดี</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {habits.map(habit => {
            const isCompletedToday = !!habit.history[todayStr];
            const clr = getColorClasses(habit.color);
            return (
              <div key={habit.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  {/* Toggle button */}
                  <button
                    onClick={() => toggleToday(habit.id)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 active:scale-90 ${
                      isCompletedToday
                        ? `${clr.bg} text-white shadow-lg ring-2 ${clr.ring} scale-105`
                        : 'bg-slate-50 text-slate-300 border-2 border-dashed border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {isCompletedToday ? <Check className="w-6 h-6" /> : <span className="text-xl">{habit.emoji}</span>}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-800 truncate">{habit.emoji} {habit.name}</h4>
                    {habit.description && <p className="text-[11px] text-slate-400 truncate">{habit.description}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <Flame className={`w-3.5 h-3.5 ${habit.streak > 0 ? 'text-orange-500' : 'text-slate-300'}`} />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {habit.streak} วัน {habit.bestStreak > habit.streak && `(best: ${habit.bestStreak})`}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(habit)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirmDelete(habit.id)} className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 7-day mini heatmap */}
                <div className="flex gap-1 mt-3 justify-end">
                  {last7Days.map((day, i) => (
                    <div key={i} className="flex flex-col items-center gap-0.5">
                      <div className={`w-5 h-5 rounded ${habit.history[day] ? clr.bg : 'bg-slate-100'} transition-colors`} />
                      <span className="text-[8px] text-slate-400">{new Date(day).getDate()}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Month Heatmap */}
      {habits.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
            เดือนนี้ — {['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][monthDays.month]} {monthDays.year + 543}
          </h3>
          <div className="grid grid-cols-7 gap-1">
            {['จ','อ','พ','พฤ','ศ','ส','อา'].map(d => (
              <div key={d} className="text-[8px] font-bold text-slate-400 text-center pb-1">{d}</div>
            ))}
            {monthDays.cells.map((day, idx) => {
              if (day === null) return <div key={idx} />;
              const ds = `${monthDays.year}-${String(monthDays.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const completedCount = habits.filter(h => h.history[ds]).length;
              const isToday = ds === todayStr;
              return (
                <div
                  key={idx}
                  className={`aspect-square rounded flex items-center justify-center text-[9px] font-bold transition-colors
                    ${isToday ? 'ring-1 ring-emerald-500' : ''}
                    ${completedCount === 0 ? 'bg-slate-50 text-slate-400'
                      : completedCount >= habits.length ? 'bg-emerald-500 text-white'
                      : completedCount >= habits.length / 2 ? 'bg-emerald-300 text-white'
                      : 'bg-emerald-100 text-emerald-700'}
                  `}
                >
                  {day}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-2 mt-2">
            <span className="text-[8px] text-slate-400">น้อย</span>
            <div className="w-3 h-3 rounded bg-slate-50 border border-slate-200" />
            <div className="w-3 h-3 rounded bg-emerald-100" />
            <div className="w-3 h-3 rounded bg-emerald-300" />
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-[8px] text-slate-400">มาก</span>
          </div>
        </div>
      )}

      {/* CRUD Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">{editId ? 'แก้ไข Habit' : 'เพิ่ม Habit ใหม่'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">ชื่อ Habit</label>
                <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="เช่น ออกกำลังกาย" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">คำอธิบาย (ถ้ามี)</label>
                <input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="รายละเอียดเพิ่มเติม" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Emoji</label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_OPTIONS.map(e => (
                    <button key={e} onClick={() => setFormEmoji(e)} className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${formEmoji === e ? 'bg-emerald-100 ring-2 ring-emerald-500 scale-110' : 'bg-slate-50 hover:bg-slate-100'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">สี</label>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_OPTIONS.map(c => {
                    const clr = getColorClasses(c.key);
                    return (
                      <button key={c.key} onClick={() => setFormColor(c.key)} className={`w-8 h-8 rounded-lg ${clr.bg} transition-all ${formColor === c.key ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'opacity-70 hover:opacity-100'}`} />
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">ความถี่</label>
                <div className="flex flex-wrap gap-1.5">
                  {FREQ_OPTIONS.map(f => (
                    <button key={f.key} onClick={() => setFormFreq(f.key)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${formFreq === f.key ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
                {formFreq === 'custom' && (
                  <div className="flex gap-1.5 mt-2">
                    {DAY_LABELS.map((label, i) => (
                      <button key={i} onClick={() => setFormCustomDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])}
                        className={`w-9 h-9 rounded-lg text-[11px] font-bold transition-all ${formCustomDays.includes(i) ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm">ยกเลิก</button>
              <button onClick={saveHabit} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200">บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6 animate-fadeIn text-center">
            <h3 className="text-lg font-bold text-slate-800 mb-2">ลบ Habit นี้?</h3>
            <p className="text-sm text-slate-500 mb-4">ข้อมูล streak และประวัติจะหายไป</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm">ยกเลิก</button>
              <button onClick={() => deleteHabit(confirmDelete)} className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-sm">ลบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HabitTracker;
