import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader2, Sparkles, CheckCircle2, Bot, User } from 'lucide-react';
import { analyzeProjectTasks } from '../services/geminiService';
import { tryParseJSON } from '../services/aiPromptGenerator';

export interface AIProcessResult {
  title: string;
  emoji: string;
  order: number;
  tasks: { title: string; description: string; duration: number; priority: string }[];
}

interface ProjectAIChatProps {
  isOpen: boolean;
  onClose: () => void;
  onTasksGenerated: (processes: AIProcessResult[]) => void;
  projectType: 'main' | 'side';
}

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  jsonData?: { processes: AIProcessResult[] };
}

const ProjectAIChat: React.FC<ProjectAIChatProps> = ({ isOpen, onClose, onTasksGenerated, projectType }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      content: `สวัสดีครับ! 🤖 ผมเป็น AI ที่จะช่วยวิเคราะห์และวางแผนงานให้คุณ\n\nบอกเล่าเกี่ยวกับ${projectType === 'main' ? 'งานหลัก' : 'งานรอง'}ที่ต้องการวางแผนได้เลยครับ เช่น:\n- ชื่อโปรเจกต์/งาน\n- เป้าหมายหลัก\n- มี deadline ไหม`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmedProcesses, setConfirmedProcesses] = useState<AIProcessResult[] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const history = messages
        .filter(m => m.role === 'user')
        .map(m => ({ role: m.role as 'user' | 'model', message: m.content }));

      const response = await analyzeProjectTasks(history, userMsg);
      const text = response || 'ขอโทษครับ ไม่สามารถประมวลผลได้ ลองใหม่อีกครั้ง';

      const jsonData = tryParseJSON(text);
      setMessages(prev => [...prev, { role: 'model', content: text, jsonData: jsonData || undefined }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'model',
        content: 'ขอโทษครับ ระบบมีปัญหาชั่วคราว ลองใหม่อีกครั้งนะครับ 🙏',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = (processes: AIProcessResult[]) => {
    setConfirmedProcesses(processes);
    onTasksGenerated(processes);
    onClose();
  };

  // Get text without JSON block for display
  const getDisplayText = (msg: ChatMessage) => {
    if (!msg.jsonData) return msg.content;
    return msg.content
      .replace(/```json[\s\S]*?```/g, '')
      .replace(/\{[\s\S]*"processes"[\s\S]*\}/g, '')
      .trim();
  };

  const totalTasksInJSON = (processes: AIProcessResult[]) =>
    processes.reduce((sum, p) => sum + p.tasks.length, 0);

  if (!isOpen) return null;

  return createPortal(
    <div style={{ zIndex: 9500 }} className="fixed inset-0 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl w-full max-w-lg shadow-2xl animate-slideUp flex flex-col" style={{ height: '75vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">AI วิเคราะห์งาน</h3>
              <p className="text-[10px] text-slate-400">Powered by Gemini</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'model' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center shrink-0 mt-1">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              )}
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-slate-100 text-slate-700 rounded-bl-md'
                }`}>
                  {getDisplayText(msg).split('\n').map((line, j) => (
                    <p key={j} className={j > 0 ? 'mt-1' : ''}>{line}</p>
                  ))}
                </div>

                {/* JSON Preview Card */}
                {msg.jsonData && (
                  <div className="mt-2 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700">แผนงานพร้อมแล้ว!</span>
                    </div>
                    <div className="space-y-2 mb-3">
                      {msg.jsonData.processes.map((proc, pi) => (
                        <div key={pi} className="flex items-center gap-2 bg-white/70 rounded-xl px-3 py-2">
                          <span className="text-base">{proc.emoji}</span>
                          <span className="text-xs font-bold text-slate-700 flex-1">{proc.title}</span>
                          <span className="text-[10px] font-bold text-slate-400">{proc.tasks.length} tasks</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold">
                        รวม {totalTasksInJSON(msg.jsonData.processes)} tasks ใน {msg.jsonData.processes.length} ขั้นตอน
                      </span>
                      <button
                        onClick={() => handleConfirm(msg.jsonData!.processes)}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95"
                      >
                        สร้าง Tasks
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-3 h-3 text-indigo-600" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
                <span className="text-xs text-slate-400 font-medium">กำลังวิเคราะห์...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-4 py-3 border-t border-slate-100 shrink-0 bg-white">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="บรรยายงานที่ต้องการวางแผน..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition-all"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl font-bold text-sm disabled:opacity-40 transition-all active:scale-95 shadow-lg shadow-violet-200"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>,
    document.body
  );
};

export default ProjectAIChat;
