import React, { useState, useMemo } from 'react';
import { Task, TaskGroup, Priority, GROUP_COLORS } from '../types';
import { Search, X, Filter, CheckCircle2, Circle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

interface SearchViewProps {
  tasks: Task[];
  taskGroups: TaskGroup[];
}

type StatusFilter = 'all' | 'completed' | 'pending';

const SearchView: React.FC<SearchViewProps> = ({ tasks, taskGroups }) => {
  const [query, setQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  const hasFilters = selectedCategories.length > 0 || selectedPriority !== null || statusFilter !== 'all';

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    return tasks.filter(t => {
      // Text search
      const textMatch = !q ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.notes || '').toLowerCase().includes(q) ||
        (t.subtasks || []).some(s => s.title.toLowerCase().includes(q));

      // Category filter
      const catMatch = selectedCategories.length === 0 || selectedCategories.includes(t.category);

      // Priority filter
      const priMatch = !selectedPriority || t.priority === selectedPriority;

      // Status filter
      const statusMatch = statusFilter === 'all' ||
        (statusFilter === 'completed' && t.completed) ||
        (statusFilter === 'pending' && !t.completed);

      return textMatch && catMatch && priMatch && statusMatch;
    });
  }, [tasks, query, selectedCategories, selectedPriority, statusFilter]);

  const toggleCategory = (key: string) => {
    setSelectedCategories(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedPriority(null);
    setStatusFilter('all');
  };

  const highlightMatch = (text: string) => {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="bg-yellow-200 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="ค้นหา task, รายละเอียด, โน้ต..."
          autoFocus
          className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${showFilters || hasFilters ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}
        >
          <Filter className="w-3.5 h-3.5" /> ตัวกรอง {hasFilters && `(${selectedCategories.length + (selectedPriority ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0)})`}
        </button>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs font-bold text-rose-500 hover:text-rose-600 px-2 py-1">
            ล้างตัวกรอง
          </button>
        )}
        <span className="ml-auto text-xs font-bold text-slate-400">{results.length} ผลลัพธ์</span>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 animate-fadeIn shadow-sm">
          {/* Category chips */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">หมวดหมู่</p>
            <div className="flex flex-wrap gap-1.5">
              {taskGroups.map(g => {
                const active = selectedCategories.includes(g.key);
                const clr = GROUP_COLORS[g.color] || GROUP_COLORS.orange;
                return (
                  <button
                    key={g.key}
                    onClick={() => toggleCategory(g.key)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${active ? `${clr.bg} ${clr.text} ${clr.border} border` : 'bg-slate-50 text-slate-500 border border-slate-100'}`}
                  >
                    {g.emoji} {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">ความสำคัญ</p>
            <div className="flex gap-1.5">
              {[Priority.HIGH, Priority.MEDIUM, Priority.LOW].map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedPriority(selectedPriority === p ? null : p)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${selectedPriority === p
                    ? p === Priority.HIGH ? 'bg-rose-100 text-rose-600 border border-rose-200'
                    : p === Priority.MEDIUM ? 'bg-amber-100 text-amber-600 border border-amber-200'
                    : 'bg-blue-100 text-blue-600 border border-blue-200'
                    : 'bg-slate-50 text-slate-500 border border-slate-100'}`}
                >
                  {p === Priority.HIGH ? 'สูง' : p === Priority.MEDIUM ? 'กลาง' : 'ต่ำ'}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">สถานะ</p>
            <div className="flex gap-1.5">
              {[
                { key: 'all' as StatusFilter, label: 'ทั้งหมด' },
                { key: 'pending' as StatusFilter, label: 'ยังไม่เสร็จ' },
                { key: 'completed' as StatusFilter, label: 'เสร็จแล้ว' },
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(s.key)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${statusFilter === s.key ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="space-y-2">
        {results.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-400 mb-1">ไม่พบผลลัพธ์</h3>
            <p className="text-sm text-slate-400">ลองค้นหาด้วยคำอื่น หรือปรับตัวกรอง</p>
          </div>
        ) : (
          results.map(task => {
            const group = taskGroups.find(g => g.key === task.category);
            const clr = GROUP_COLORS[group?.color || 'orange'] || GROUP_COLORS.orange;
            return (
              <div key={task.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {task.completed
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      : <Circle className="w-5 h-5 text-slate-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-bold ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {highlightMatch(task.title)}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{highlightMatch(task.description)}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${clr.badge}`}>
                        {group?.emoji} {group?.label || task.category}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        task.priority === Priority.HIGH ? 'bg-rose-100 text-rose-600'
                        : task.priority === Priority.MEDIUM ? 'bg-amber-100 text-amber-600'
                        : 'bg-blue-100 text-blue-600'
                      }`}>
                        {task.priority === Priority.HIGH ? 'สูง' : task.priority === Priority.MEDIUM ? 'กลาง' : 'ต่ำ'}
                      </span>
                      {task.estimatedDuration && (
                        <span className="text-[9px] font-mono text-slate-400 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> {task.estimatedDuration}น.
                        </span>
                      )}
                      {task.recurrence && (
                        <span className="text-[9px] font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <RefreshCw className="w-2.5 h-2.5" />
                          {task.recurrence.pattern === 'daily' ? 'ทุกวัน' :
                           task.recurrence.pattern === 'every_x_days' ? `ทุก ${task.recurrence.interval} วัน` :
                           task.recurrence.pattern === 'weekly' ? 'รายสัปดาห์' :
                           task.recurrence.pattern === 'monthly' ? 'รายเดือน' : 'รายปี'}
                        </span>
                      )}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <span className="text-[9px] font-bold text-slate-400">
                          {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} งานย่อย
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SearchView;
