
import React, { useState } from 'react';
import { Task, Priority } from '../types';
import { Plus, Trash2, CheckCircle2, Circle, Clock, Filter, Sparkles } from 'lucide-react';
import { getAIPrioritization } from '../services/geminiService';

interface TaskManagerProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

const TaskManager: React.FC<TaskManagerProps> = ({ tasks, setTasks }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTitle,
      description: '',
      priority: Priority.MEDIUM,
      completed: false,
      dueDate: new Date().toISOString().split('T')[0],
      category: 'General'
    };

    setTasks([newTask, ...tasks]);
    setNewTitle('');
    setIsAdding(false);
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleAIAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const insight = await getAIPrioritization(tasks);
      setAiInsight(insight || "I don't have enough information to analyze your tasks yet.");
    } catch (error) {
      setAiInsight("Failed to connect to the productivity strategist. Please try again later.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white p-6 md:p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">My Tasks</h2>
          <p className="text-slate-500 font-medium">Organize your life, one step at a time.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <button 
            onClick={handleAIAnalyze}
            disabled={isAnalyzing}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3.5 bg-fuchsia-50 text-fuchsia-600 rounded-2xl font-bold hover:bg-fuchsia-100 transition-colors disabled:opacity-50 border-2 border-fuchsia-100"
          >
            <Sparkles className={`w-5 h-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Analyzing...' : 'AI Strategy'}
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
          >
            <Plus className="w-5 h-5" />
            Add Task
          </button>
        </div>
      </div>

      {aiInsight && (
        <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-[2rem] relative animate-fadeIn shadow-sm">
          <button onClick={() => setAiInsight(null)} className="absolute top-4 right-4 p-2 bg-amber-100 rounded-xl text-amber-600 hover:bg-amber-200 transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-amber-500" />
            </div>
            <div className="text-[15px] text-amber-900 prose prose-amber font-medium">
              <p className="font-black text-lg mb-2 tracking-tight">AI Strategy Recommendation</p>
              <p className="whitespace-pre-wrap leading-relaxed">{aiInsight}</p>
            </div>
          </div>
        </div>
      )}

      {isAdding && (
        <form onSubmit={addTask} className="bg-white p-6 md:p-8 rounded-[2rem] border-2 border-slate-900 shadow-xl shadow-slate-900/10 animate-scaleIn">
          <input 
            autoFocus
            type="text" 
            placeholder="What needs to be done?" 
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full text-2xl font-black text-slate-800 border-none focus:ring-0 p-0 mb-6 placeholder:text-slate-300"
          />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="flex gap-3">
              <button type="button" className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 transition-colors">
                <Clock className="w-5 h-5" />
              </button>
              <button type="button" className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 transition-colors">
                <Filter className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button type="button" onClick={() => setIsAdding(false)} className="flex-1 sm:flex-none px-6 py-3.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
              <button type="submit" className="flex-1 sm:flex-none px-6 py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-slate-800 transition-colors">Create Task</button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {tasks.map(task => (
          <div key={task.id} className={`group flex items-center justify-between p-5 bg-white border-2 border-slate-100 rounded-[1.5rem] transition-all hover:border-slate-300 cursor-pointer ${task.completed ? 'opacity-60 bg-slate-50/50' : 'hover:shadow-md'}`}>
            <div className="flex items-center gap-5 flex-1">
              <button onClick={() => toggleTask(task.id)} className="shrink-0 transition-transform active:scale-90">
                {task.completed ? (
                  <CheckCircle2 className="w-8 h-8 text-[#FF6321]" />
                ) : (
                  <Circle className="w-8 h-8 text-slate-200 group-hover:text-slate-400 transition-colors" />
                )}
              </button>
              <div className="flex flex-col">
                <span className={`text-lg font-bold ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                  {task.title}
                </span>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[11px] text-slate-400 font-black uppercase tracking-widest">{task.category}</span>
                  <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                  <span className="text-[11px] text-slate-400 font-bold">{task.dueDate}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                task.priority === 'High' ? 'bg-rose-100 text-rose-700' : 
                task.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {task.priority}
              </span>
              <button 
                onClick={() => deleteTask(task.id)}
                className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskManager;
