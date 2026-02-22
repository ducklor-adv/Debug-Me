
import React, { useState } from 'react';
import { Task } from '../types';
import { Sparkles, Bookmark, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Edit3, Quote } from 'lucide-react';
import { generateSmartSchedule } from '../services/geminiService';

interface DailyPlannerProps {
  tasks: Task[];
}

const DailyPlanner: React.FC<DailyPlannerProps> = ({ tasks }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSchedule, setAiSchedule] = useState<string | null>(null);

  const hours = Array.from({ length: 17 }, (_, i) => i + 7); // 7:00 to 23:00

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
      {/* Planner Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 px-2">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-xl p-1 shadow-sm">
            <button className="p-2 hover:bg-stone-50 rounded-lg"><ChevronLeft className="w-4 h-4 text-stone-500" /></button>
            <span className="text-sm font-bold text-stone-700 px-3 min-w-[120px] text-center">Monday, Dec 4</span>
            <button className="p-2 hover:bg-stone-50 rounded-lg"><ChevronRight className="w-4 h-4 text-stone-500" /></button>
          </div>
          <button className="p-2.5 bg-white border border-stone-200 rounded-xl text-stone-400 hover:text-indigo-600 shadow-sm transition-colors">
            <CalendarIcon className="w-5 h-5" />
          </button>
        </div>
        <button 
          onClick={handleMagicFill}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
        >
          {isGenerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Sparkles className="w-4 h-4 text-amber-300" />}
          AI Smart Plan
        </button>
      </div>

      {/* The Notebook Container */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden min-h-[600px] flex flex-col md:flex-row relative">
        {/* Binder Spring Effect - Hidden on mobile, stacks sections instead */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-10 -ml-5 bg-gradient-to-r from-stone-200 via-stone-50 to-stone-200 z-10 shadow-inner">
          <div className="h-full w-full flex flex-col justify-around py-8">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="h-[2px] w-full bg-stone-300/40"></div>
            ))}
          </div>
        </div>

        {/* Left Page: Timeline */}
        <div className="flex-1 p-5 md:p-10 md:pr-14 bg-white relative">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-serif italic text-stone-800">Schedule</h3>
            <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-black">Daily Timeline</span>
          </div>

          <div className="space-y-0 border-t border-stone-100">
            {hours.map(hour => (
              <div key={hour} className="group flex min-h-[50px] md:min-h-[60px] border-b border-stone-100 hover:bg-stone-50/50 transition-colors">
                <div className="w-12 md:w-16 pt-3 text-[10px] font-black text-stone-400 text-right pr-4 tabular-nums">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="flex-1 py-2 px-2 relative">
                  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-stone-50 group-hover:bg-indigo-50/40"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Page: Notes & Tasks */}
        <div className="flex-1 p-5 md:p-10 md:pl-14 bg-[#fefefc] border-t md:border-t-0 md:border-l border-stone-200">
          <div className="mb-8">
            <h3 className="text-xl font-serif italic text-stone-800 mb-4">Daily Focus</h3>
            <div className="p-5 bg-stone-100/40 rounded-2xl border border-dashed border-stone-300 min-h-[100px] flex items-center justify-center text-stone-500 text-sm italic text-center leading-relaxed px-8">
              "Focus on being productive instead of busy."
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs uppercase tracking-[0.2em] font-black text-stone-500">Essential Tasks</h4>
              <Edit3 className="w-4 h-4 text-stone-300" />
            </div>
            <div className="space-y-3">
              {tasks.filter(t => !t.completed).slice(0, 5).map(task => (
                <div key={task.id} className="flex items-start gap-4 p-3 hover:bg-stone-50 rounded-xl transition-colors">
                  <div className="w-5 h-5 rounded-lg border-2 border-stone-300 mt-0.5 flex-shrink-0"></div>
                  <span className="text-sm font-semibold text-stone-700 leading-snug">{task.title}</span>
                </div>
              ))}
              {tasks.filter(t => !t.completed).length === 0 && (
                <div className="text-center py-6">
                  <p className="text-sm text-stone-400 italic">Clear workspace, clear mind.</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Result Area - Mobile Optimized */}
          {aiSchedule && (
            <div className="mt-8 p-5 bg-indigo-50/40 rounded-2xl border border-indigo-100 animate-slideUp shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-indigo-700">
                <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">AI Strategist</span>
              </div>
              <div className="text-sm text-indigo-900/90 leading-loose whitespace-pre-wrap font-medium font-serif italic bg-white/50 p-4 rounded-xl border border-indigo-50">
                {aiSchedule}
              </div>
            </div>
          )}

          <div className="mt-12 pt-10 text-center opacity-30">
            <Bookmark className="w-6 h-6 text-stone-400 mx-auto" />
            <p className="mt-4 font-serif italic text-xs text-stone-500">LifeFlow Edition</p>
          </div>
        </div>
      </div>
      
      {/* Bottom Label */}
      <div className="mt-6 text-center">
        <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.4em] opacity-60">Stationery Series — Designed for Focus</p>
      </div>
    </div>
  );
};

export default DailyPlanner;
