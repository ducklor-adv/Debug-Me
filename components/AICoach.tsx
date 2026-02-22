
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles, Loader2 } from 'lucide-react';
import { chatWithCoach } from '../services/geminiService';
import { Task } from '../types';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface AICoachProps {
  tasks: Task[];
}

const AICoach: React.FC<AICoachProps> = ({ tasks }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Hi Alex! I'm your LifeFlow AI Coach. I've analyzed your schedule for today. How can I help you be more productive?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, message: m.content }));
      const response = await chatWithCoach(history, userMsg);
      setMessages(prev => [...prev, { role: 'model', content: response || "I'm sorry, I couldn't process that. Let's try again." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: "My systems are a bit tired today. Please try talking to me again in a moment." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="p-6 border-b-2 border-slate-100 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-fuchsia-500 to-violet-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-fuchsia-200 transform -rotate-6">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">LifeFlow AI Coach</h3>
            <p className="text-xs text-fuchsia-600 font-bold uppercase tracking-widest mt-0.5">Ready to optimize your day</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-slate-50/50"
      >
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-4 max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center shadow-sm ${
                msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white text-fuchsia-500 border-2 border-fuchsia-100'
              }`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`p-5 rounded-3xl shadow-sm ${
                msg.role === 'user' 
                ? 'bg-slate-900 text-white rounded-tr-none' 
                : 'bg-white text-slate-700 border-2 border-slate-100 rounded-tl-none'
              }`}>
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-4 max-w-[85%]">
              <div className="w-10 h-10 rounded-2xl bg-white text-fuchsia-500 border-2 border-fuchsia-100 flex items-center justify-center shadow-sm">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div className="p-5 bg-white border-2 border-slate-100 rounded-3xl rounded-tl-none shadow-sm flex items-center">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 bg-fuchsia-300 rounded-full animate-bounce"></span>
                  <span className="w-2.5 h-2.5 bg-fuchsia-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2.5 h-2.5 bg-fuchsia-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 border-t-2 border-slate-100 bg-white shrink-0">
        <div className="relative flex items-center max-w-4xl mx-auto">
          <input 
            type="text" 
            placeholder="Ask for advice, prioritization, or motivation..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="w-full pl-6 pr-16 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-fuchsia-300 focus:ring-4 focus:ring-fuchsia-50 transition-all text-[15px] font-medium placeholder:text-slate-400"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-3 p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:bg-slate-300 transition-colors shadow-sm"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-4 uppercase tracking-widest font-black flex items-center justify-center gap-1.5">
          <Sparkles className="w-3 h-3 text-fuchsia-400" />
          Powered by Gemini 3.1 Pro
        </p>
      </div>
    </div>
  );
};

export default AICoach;
