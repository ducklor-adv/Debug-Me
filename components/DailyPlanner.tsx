
import React, { useState } from 'react';
import { Task } from '../types';
import { Sparkles, Bookmark, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Edit3, Sun, Moon, Coffee, Code, FileText, Home, Wrench, Dumbbell, BookOpen, Brain } from 'lucide-react';
import { generateSmartSchedule } from '../services/geminiService';

interface ScheduleBlock {
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

const SCHEDULE: ScheduleBlock[] = [
  { startHour: 5, startMin: 0, endHour: 5, endMin: 20, title: 'กิจวัตรเช้า', subtitle: 'ล้างหน้า แปรงฟัน', color: 'bg-slate-100 border-slate-200 text-slate-600', icon: 'sun' },
  { startHour: 5, startMin: 20, endHour: 5, endMin: 35, title: 'นั่งสมาธิ 15 นาที', subtitle: 'Habit', color: 'bg-violet-50 border-violet-200 text-violet-700', icon: 'brain' },
  { startHour: 5, startMin: 35, endHour: 5, endMin: 50, title: 'รดน้ำ ดูแลต้นไม้', subtitle: 'Habit', color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: 'sun' },
  { startHour: 5, startMin: 50, endHour: 6, endMin: 30, title: 'อาหารเช้า', color: 'bg-amber-50 border-amber-200 text-amber-700', icon: 'coffee', isBreak: true },
  { startHour: 6, startMin: 30, endHour: 7, endMin: 30, title: 'ออกกำลังกาย / เดินเล่น', subtitle: 'Personal', color: 'bg-green-50 border-green-300 text-green-700', icon: 'gym' },
  { startHour: 7, startMin: 30, endHour: 8, endMin: 0, title: 'อาบน้ำ เตรียมตัว', color: 'bg-slate-100 border-slate-200 text-slate-600', icon: 'sun' },
  { startHour: 8, startMin: 0, endHour: 9, endMin: 0, title: 'เตรียม Workspace + Review Plan', subtitle: 'เปิดเครื่อง อ่าน PR / Issue', color: 'bg-slate-100 border-slate-200 text-slate-600', icon: 'file' },
  { startHour: 9, startMin: 0, endHour: 10, endMin: 30, title: 'Coding — Deep Work Session 1', subtitle: 'โฟกัสสูง ไม่เปิดแชท', color: 'bg-blue-50 border-blue-300 text-blue-700', icon: 'code' },
  { startHour: 10, startMin: 30, endHour: 10, endMin: 45, title: 'พัก', color: 'bg-slate-50 border-slate-200 text-slate-400', icon: 'coffee', isBreak: true },
  { startHour: 10, startMin: 45, endHour: 12, endMin: 0, title: 'Coding — Deep Work Session 2', subtitle: 'ต่อจาก Session 1', color: 'bg-blue-50 border-blue-300 text-blue-700', icon: 'code' },
  { startHour: 12, startMin: 0, endHour: 13, endMin: 0, title: 'อาหารกลางวัน + พักผ่อน', color: 'bg-amber-50 border-amber-200 text-amber-700', icon: 'coffee', isBreak: true },
  { startHour: 13, startMin: 0, endHour: 14, endMin: 30, title: 'Coding — Session 3', subtitle: 'Implement / Build', color: 'bg-blue-50 border-blue-300 text-blue-700', icon: 'code' },
  { startHour: 14, startMin: 30, endHour: 14, endMin: 45, title: 'พัก', color: 'bg-slate-50 border-slate-200 text-slate-400', icon: 'coffee', isBreak: true },
  { startHour: 14, startMin: 45, endHour: 15, endMin: 45, title: 'Coding — Session 4', subtitle: 'Debug / Fix / Test', color: 'bg-blue-50 border-blue-300 text-blue-700', icon: 'code' },
  { startHour: 15, startMin: 45, endHour: 16, endMin: 0, title: 'พัก + ของว่าง', color: 'bg-slate-50 border-slate-200 text-slate-400', icon: 'coffee', isBreak: true },
  { startHour: 16, startMin: 0, endHour: 17, endMin: 0, title: 'Coding — Session 5', subtitle: 'Review / Deploy / Wrap up', color: 'bg-blue-50 border-blue-300 text-blue-700', icon: 'code' },
  { startHour: 17, startMin: 0, endHour: 18, endMin: 0, title: 'พักผ่อน / เวลาส่วนตัว', color: 'bg-indigo-50 border-indigo-200 text-indigo-600', icon: 'moon' },
  { startHour: 18, startMin: 0, endHour: 19, endMin: 0, title: 'อาหารเย็น', color: 'bg-amber-50 border-amber-200 text-amber-700', icon: 'coffee', isBreak: true },
  { startHour: 19, startMin: 0, endHour: 20, endMin: 0, title: 'Coding — Evening Session 1', subtitle: 'Side Project / เรียนรู้สิ่งใหม่', color: 'bg-indigo-50 border-indigo-300 text-indigo-700', icon: 'code' },
  { startHour: 20, startMin: 0, endHour: 20, endMin: 15, title: 'พัก', color: 'bg-slate-50 border-slate-200 text-slate-400', icon: 'coffee', isBreak: true },
  { startHour: 20, startMin: 15, endHour: 21, endMin: 0, title: 'Coding — Evening Session 2', subtitle: 'Commit / Push / วางแผนพรุ่งนี้', color: 'bg-indigo-50 border-indigo-300 text-indigo-700', icon: 'code' },
  { startHour: 21, startMin: 0, endHour: 21, endMin: 30, title: 'อ่านหนังสือ / พักผ่อน', color: 'bg-purple-50 border-purple-200 text-purple-700', icon: 'book' },
  { startHour: 21, startMin: 30, endHour: 22, endMin: 0, title: 'เตรียมตัวนอน', color: 'bg-slate-100 border-slate-200 text-slate-500', icon: 'moon' },
];

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

interface DailyPlannerProps {
  tasks: Task[];
}

const DailyPlanner: React.FC<DailyPlannerProps> = ({ tasks }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSchedule, setAiSchedule] = useState<string | null>(null);
  const [checkedBlocks, setCheckedBlocks] = useState<Set<number>>(new Set());

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

  const totalWork = SCHEDULE.filter(b => !b.isBreak).reduce((sum, b) => sum + getDurationMin(b), 0);
  const doneWork = SCHEDULE.filter((b, i) => !b.isBreak && checkedBlocks.has(i)).reduce((sum, b) => sum + getDurationMin(b), 0);
  const progressPct = totalWork > 0 ? Math.round((doneWork / totalWork) * 100) : 0;

  const handleMagicFill = async () => {
    setIsGenerating(true);
    try {
      const schedule = await generateSmartSchedule(tasks);
      setAiSchedule(schedule || null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-10 animate-fadeIn">
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
            {SCHEDULE.map((block, idx) => {
              const blockStart = block.startHour * 60 + block.startMin;
              const blockEnd = block.endHour * 60 + block.endMin;
              const isNow = nowMinutes >= blockStart && nowMinutes < blockEnd;
              const isPast = nowMinutes >= blockEnd;
              const checked = checkedBlocks.has(idx);
              const duration = getDurationMin(block);

              return (
                <div
                  key={idx}
                  onClick={() => !block.isBreak && toggleCheck(idx)}
                  className={`flex items-stretch rounded-xl border transition-all ${block.isBreak ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'} ${isNow ? 'ring-2 ring-emerald-400 ring-offset-1' : ''} ${checked ? 'opacity-50' : ''} ${block.color}`}
                >
                  {/* Time */}
                  <div className="w-[52px] md:w-16 shrink-0 py-2.5 px-1.5 md:px-3 flex flex-col items-center justify-center border-r border-current/10">
                    <span className="text-[10px] font-black tabular-nums leading-tight">{formatTime(block.startHour, block.startMin)}</span>
                    <span className="text-[8px] opacity-50 leading-tight">{formatTime(block.endHour, block.endMin)}</span>
                  </div>

                  {/* Content */}
                  <div className={`flex-1 py-2.5 px-3 flex items-center gap-2.5 ${duration >= 60 ? 'min-h-[56px]' : 'min-h-[40px]'}`}>
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
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Summary */}
        <div className="flex-1 p-5 md:p-8 md:pl-14 bg-[#fefefc] border-t md:border-t-0 md:border-l border-stone-200">
          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-4">สรุปเวลา</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Coding (เช้า)', time: '3 ชม.', color: 'bg-blue-100 text-blue-600' },
                { label: 'Coding (บ่าย)', time: '4 ชม.', color: 'bg-blue-100 text-blue-600' },
                { label: 'Coding (ค่ำ)', time: '2 ชม.', color: 'bg-indigo-100 text-indigo-600' },
                { label: 'สมาธิ + ต้นไม้', time: '30 นาที', color: 'bg-violet-100 text-violet-600' },
                { label: 'ออกกำลังกาย', time: '1 ชม.', color: 'bg-green-100 text-green-600' },
                { label: 'เตรียมงาน + Review', time: '1 ชม.', color: 'bg-slate-200 text-slate-600' },
                { label: 'พักผ่อน + ส่วนตัว', time: '2.5 ชม.', color: 'bg-indigo-100 text-indigo-600' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-white rounded-xl border border-stone-100">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${item.color.split(' ')[0]}`}></div>
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  </div>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${item.color}`}>{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h4 className="text-xs uppercase tracking-[0.15em] font-black text-slate-500 mb-4">Coding Schedule</h4>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-2.5 p-3 bg-blue-50/50 rounded-xl">
                <Code className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <span><strong>09:00-12:00</strong> Deep Work — โฟกัสสูง 3 ชม.</span>
              </div>
              <div className="flex items-start gap-2.5 p-3 bg-blue-50/50 rounded-xl">
                <Code className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <span><strong>13:00-17:00</strong> Build & Ship — หลัก 4 ชม.</span>
              </div>
              <div className="flex items-start gap-2.5 p-3 bg-indigo-50/50 rounded-xl">
                <Moon className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                <span><strong>19:00-21:00</strong> Evening — เรียนรู้ + Side Project</span>
              </div>
              <div className="mt-3 p-3 bg-emerald-50/50 rounded-xl text-center">
                <span className="text-lg font-black text-emerald-600">9 ชม.</span>
                <span className="text-xs text-slate-500 ml-2">Coding ต่อวัน</span>
              </div>
            </div>
          </div>

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
