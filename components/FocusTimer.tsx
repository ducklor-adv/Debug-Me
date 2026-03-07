
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain, Volume2, VolumeX } from 'lucide-react';
import { FocusSession } from '../types';

interface FocusTimerProps {
  onSaveFocusSession?: (session: FocusSession) => void;
  todayFocusSessions?: FocusSession[];
}

const FocusTimer: React.FC<FocusTimerProps> = ({ onSaveFocusSession, todayFocusSessions = [] }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [isMuted, setIsMuted] = useState(false);
  const startedAtRef = useRef<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive && timeLeft > 0) {
      if (!startedAtRef.current) {
        startedAtRef.current = new Date().toISOString();
      }
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Play sound
      if (!isMuted) {
        try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczHjqIt9jNdUQtQYS11c16Ri5ChrPTzX1IMEKD').play(); } catch {}
      }
      // Save completed session
      if (onSaveFocusSession && startedAtRef.current) {
        const planned = mode === 'focus' ? 25 * 60 : 5 * 60;
        onSaveFocusSession({
          id: `focus-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          mode,
          durationPlanned: planned,
          durationActual: planned,
          completed: true,
          startedAt: startedAtRef.current,
          completedAt: new Date().toISOString(),
        });
      }
      startedAtRef.current = null;
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    startedAtRef.current = null;
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const switchMode = (newMode: 'focus' | 'break') => {
    setMode(newMode);
    setIsActive(false);
    startedAtRef.current = null;
    setTimeLeft(newMode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Real stats from todayFocusSessions
  const stats = useMemo(() => {
    const focusSessions = todayFocusSessions.filter(s => s.mode === 'focus');
    const completedSessions = focusSessions.filter(s => s.completed);
    const totalSessions = completedSessions.length;
    const totalMinutes = Math.round(completedSessions.reduce((sum, s) => sum + s.durationActual, 0) / 60);
    const efficiency = focusSessions.length > 0
      ? Math.round((completedSessions.length / focusSessions.length) * 100)
      : 0;
    return { totalSessions, totalMinutes, efficiency };
  }, [todayFocusSessions]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 md:space-y-8 py-4 md:py-10 animate-fadeIn">
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-200 p-8 md:p-16 text-center shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-50 rounded-full opacity-60 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-rose-50 rounded-full opacity-60 blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex justify-center gap-3 mb-8 md:mb-12">
            <button
              onClick={() => switchMode('focus')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all text-sm ${mode === 'focus' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
            >
              <Brain className="w-4 h-4" />
              Focus
            </button>
            <button
              onClick={() => switchMode('break')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all text-sm ${mode === 'break' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
            >
              <Coffee className="w-4 h-4" />
              Break
            </button>
          </div>

          <div className="mb-8 md:mb-14">
            <span className="text-7xl sm:text-8xl md:text-9xl font-black text-slate-900 tabular-nums tracking-tighter leading-none block">
              {formatTime(timeLeft)}
            </span>
            <p className="text-slate-400 font-bold mt-6 uppercase tracking-[0.3em] text-[10px] md:text-xs">
              {mode === 'focus' ? 'Deep Work: Coding Time' : 'Time to recharge / stretch'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 md:gap-8">
            <button
              onClick={resetTimer}
              className="w-14 h-14 md:w-16 md:h-16 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
            <button
              onClick={toggleTimer}
              className={`w-20 h-20 md:w-28 md:h-28 rounded-3xl flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-90 ${isActive
                  ? 'bg-slate-900 text-white shadow-slate-300'
                  : 'bg-indigo-600 text-white shadow-indigo-200'
                }`}
            >
              {isActive ? <Pause className="w-10 h-10 md:w-12 md:h-12" /> : <Play className="w-10 h-10 md:w-12 md:h-12 ml-1" />}
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-14 h-14 md:w-16 md:h-16 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95"
            >
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <FocusStat label="Today's Sessions" value={String(stats.totalSessions)} />
        <FocusStat label="Focus Time" value={`${stats.totalMinutes}m`} />
        <FocusStat label="Total Break" value={`${todayFocusSessions.filter(s => s.mode === 'break' && s.completed).length}`} />
        <FocusStat label="Efficiency" value={`${stats.efficiency}%`} />
      </div>
    </div>
  );
};

const FocusStat: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 text-center shadow-sm">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-xl md:text-2xl font-black text-slate-800">{value}</p>
  </div>
);

export default FocusTimer;
