
import React from 'react';
import { Habit } from '../types';
import { Check, Flame, Plus, RotateCcw } from 'lucide-react';

interface HabitTrackerProps {
  habits: Habit[];
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
}

const HabitTracker: React.FC<HabitTrackerProps> = ({ habits, setHabits }) => {
  const toggleHabit = (id: string) => {
    setHabits(habits.map(h => {
      if (h.id === id) {
        const isNowCompleted = !h.completedToday;
        return {
          ...h,
          completedToday: isNowCompleted,
          streak: isNowCompleted ? h.streak + 1 : Math.max(0, h.streak - 1)
        };
      }
      return h;
    }));
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white p-6 md:p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Habit Tracker</h2>
          <p className="text-slate-500 font-medium">Consistency is the key to mastery.</p>
        </div>
        <button className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 w-full sm:w-auto">
          <Plus className="w-5 h-5" />
          New Habit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {habits.map(habit => (
          <div key={habit.id} className="bg-white border-2 border-slate-100 p-6 md:p-8 rounded-[2rem] flex flex-col gap-6 shadow-sm hover:shadow-md hover:border-slate-200 transition-all group cursor-pointer" onClick={() => toggleHabit(habit.id)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div 
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    habit.completedToday 
                    ? `${habit.color} text-white scale-105 shadow-lg shadow-${habit.color.split('-')[1]}-500/30` 
                    : 'bg-slate-50 text-slate-300 border-2 border-dashed border-slate-200 group-hover:border-slate-300 group-hover:bg-slate-100'
                  }`}
                >
                  {habit.completedToday ? <Check className="w-7 h-7" /> : <div className="w-3 h-3 rounded-full bg-slate-200 group-hover:bg-slate-300 transition-colors"></div>}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-800 tracking-tight">{habit.name}</h4>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Flame className={`w-4 h-4 ${habit.streak > 0 ? 'text-[#FF6321] fill-[#FF6321]' : 'text-slate-300'}`} />
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{habit.streak} day streak</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 w-full justify-between items-end h-10">
              {[...Array(7)].map((_, i) => {
                const heightClass = i === 6 ? 'h-10' : `h-${Math.max(2, Math.floor(Math.random() * 8) + 2)}`;
                return (
                  <div 
                    key={i} 
                    className={`w-full rounded-full transition-all duration-500 ${i === 6 ? (habit.completedToday ? habit.color : 'bg-slate-100') : 'bg-slate-100'} ${heightClass}`}
                  ></div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-[2.5rem] p-10 text-center border-2 border-indigo-100/50 shadow-inner">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm transform -rotate-6">
            <RotateCcw className="w-8 h-8 text-indigo-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Build New Routines</h3>
          <p className="text-slate-500 text-[15px] mb-8 font-medium leading-relaxed">Start small. The best way to build a habit is to make it so easy you can't say no.</p>
          <button className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold border-2 border-indigo-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm active:scale-95">
            Browse Habit Templates
          </button>
        </div>
      </div>
    </div>
  );
};

export default HabitTracker;
