import React, { useState } from 'react';
import { Task, getTasksForDate } from '../types';
import { getAIPrioritization } from '../services/geminiService';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';

interface AISuggestionsProps {
  tasks: Task[];
  checkedTaskIds: Set<string>;
}

const AISuggestions: React.FC<AISuggestionsProps> = ({ tasks, checkedTaskIds }) => {
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayTasks = getTasksForDate(tasks, todayStr).filter(t => !t.completed && !checkedTaskIds.has(t.id));
      if (todayTasks.length === 0) {
        setSuggestions('ทำ task ครบหมดแล้ววันนี้! เก่งมาก!');
        return;
      }
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const totalTasks = getTasksForDate(tasks, todayStr);
      const result = await getAIPrioritization(todayTasks, {
        currentTime,
        completedCount: checkedTaskIds.size,
        totalCount: totalTasks.length,
      });
      setSuggestions(result || 'ไม่สามารถสร้างคำแนะนำได้');
    } catch {
      setError('ไม่สามารถเชื่อมต่อ AI ได้');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-fuchsia-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-fuchsia-500">
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">AI แนะนำ</span>
        </div>
        {suggestions && (
          <button onClick={handleGetSuggestions} disabled={isLoading} className="p-1.5 hover:bg-fuchsia-50 rounded-lg text-fuchsia-400 hover:text-fuchsia-600">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {!suggestions && !error && !isLoading && (
        <button
          onClick={handleGetSuggestions}
          className="w-full py-3 rounded-xl border-2 border-dashed border-fuchsia-200 text-fuchsia-500 hover:border-fuchsia-300 hover:bg-fuchsia-50/50 transition-all text-xs font-bold flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          วิเคราะห์ task วันนี้ด้วย AI
        </button>
      )}

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-4 text-fuchsia-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-xs font-bold">กำลังวิเคราะห์...</span>
        </div>
      )}

      {error && (
        <div className="text-center py-3">
          <p className="text-xs text-rose-500 font-medium">{error}</p>
          <button onClick={handleGetSuggestions} className="text-xs text-fuchsia-500 font-bold mt-1 hover:underline">ลองอีกครั้ง</button>
        </div>
      )}

      {suggestions && !isLoading && (
        <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-fuchsia-50/50 rounded-xl p-3 border border-fuchsia-100">
          {suggestions}
        </div>
      )}
    </div>
  );
};

export default AISuggestions;
