import React, { useState } from 'react';
import { Task, DailyRecord, Habit } from '../types';
import { generateDailyDigest } from '../services/geminiService';
import { BookOpen, Loader2, RefreshCw } from 'lucide-react';

interface AIDailyDigestProps {
  todayRecords: DailyRecord[];
  tasks: Task[];
  habits: Habit[];
}

const AIDailyDigest: React.FC<AIDailyDigestProps> = ({ todayRecords, tasks, habits }) => {
  const [digest, setDigest] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateDailyDigest(todayRecords, tasks, habits);
      setDigest(result || 'ไม่สามารถสร้างสรุปได้');
    } catch {
      setError('ไม่สามารถเชื่อมต่อ AI ได้');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-amber-500">
          <BookOpen className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">สรุปวันนี้</span>
        </div>
        {digest && (
          <button onClick={handleGenerate} disabled={isLoading} className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-400 hover:text-amber-600">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {!digest && !error && !isLoading && (
        <button
          onClick={handleGenerate}
          className="w-full py-3 rounded-xl border-2 border-dashed border-amber-200 text-amber-500 hover:border-amber-300 hover:bg-amber-50/50 transition-all text-xs font-bold flex items-center justify-center gap-2"
        >
          <BookOpen className="w-4 h-4" />
          AI สรุปผลวันนี้
        </button>
      )}

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-4 text-amber-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-xs font-bold">กำลังสรุป...</span>
        </div>
      )}

      {error && (
        <div className="text-center py-3">
          <p className="text-xs text-rose-500 font-medium">{error}</p>
          <button onClick={handleGenerate} className="text-xs text-amber-500 font-bold mt-1 hover:underline">ลองอีกครั้ง</button>
        </div>
      )}

      {digest && !isLoading && (
        <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-amber-50/50 rounded-xl p-3 border border-amber-100">
          {digest}
        </div>
      )}
    </div>
  );
};

export default AIDailyDigest;
