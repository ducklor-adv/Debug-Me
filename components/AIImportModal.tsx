import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, CheckCircle2, AlertTriangle, Sparkles, ClipboardPaste } from 'lucide-react';
import { AIProcessResult } from './ProjectAIChat';
import { tryParseJSON } from '../services/aiPromptGenerator';

interface AIImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (processes: AIProcessResult[]) => void;
}

const AIImportModal: React.FC<AIImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [jsonText, setJsonText] = useState('');
  const [parseResult, setParseResult] = useState<{ processes: AIProcessResult[] } | null>(null);
  const [parseError, setParseError] = useState(false);

  // Real-time parse
  useEffect(() => {
    if (!jsonText.trim()) {
      setParseResult(null);
      setParseError(false);
      return;
    }
    const result = tryParseJSON(jsonText);
    setParseResult(result);
    setParseError(!result);
  }, [jsonText]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setJsonText('');
      setParseResult(null);
      setParseError(false);
    }
  }, [isOpen]);

  const handleImport = () => {
    if (parseResult) {
      onImport(parseResult.processes);
      onClose();
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJsonText(text);
    } catch {
      // Clipboard API not available
    }
  };

  const totalTasks = parseResult
    ? parseResult.processes.reduce((sum, p) => sum + p.tasks.length, 0)
    : 0;

  if (!isOpen) return null;

  return createPortal(
    <div style={{ zIndex: 9500 }} className="fixed inset-0 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl w-full max-w-lg shadow-2xl animate-slideUp flex flex-col" style={{ height: '75vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
              <Download className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Import AI JSON</h3>
              <p className="text-[10px] text-slate-400">วาง JSON จาก AI chatbot</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Instructions */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
            <p className="text-xs text-indigo-700 leading-relaxed">
              วาง JSON ที่ได้จาก AI chatbot ด้านล่าง ระบบจะ parse อัตโนมัติและแสดง preview
            </p>
          </div>

          {/* Paste button + Textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">JSON Data</label>
              <button
                onClick={handlePaste}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-all active:scale-95"
              >
                <ClipboardPaste className="w-3 h-3" /> วาง
              </button>
            </div>
            <textarea
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              placeholder={'วาง JSON ที่นี่...\n\n{\n  "processes": [\n    {\n      "title": "...",\n      "emoji": "📋",\n      "order": 1,\n      "tasks": [...]\n    }\n  ]\n}'}
              className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 resize-none ${
                parseError ? 'border-rose-300 focus:ring-rose-400' : parseResult ? 'border-emerald-300 focus:ring-emerald-400' : 'border-slate-200 focus:ring-indigo-400'
              }`}
              style={{ minHeight: '160px' }}
            />
          </div>

          {/* Parse Error */}
          {parseError && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <p className="text-xs text-rose-600 font-medium">JSON ไม่ถูกต้อง — ต้องมี "processes" array ตาม format ที่กำหนด</p>
            </div>
          )}

          {/* Preview Card */}
          {parseResult && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700">Parse สำเร็จ!</span>
              </div>
              <div className="space-y-2 mb-3">
                {parseResult.processes.map((proc, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/70 rounded-xl px-3 py-2">
                    <span className="text-base">{proc.emoji}</span>
                    <span className="text-xs font-bold text-slate-700 flex-1">{proc.title}</span>
                    <span className="text-[10px] font-bold text-slate-400">{proc.tasks.length} tasks</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold">
                  รวม {totalTasks} tasks ใน {parseResult.processes.length} ขั้นตอน
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 shrink-0 bg-white flex gap-3">
          <button
            onClick={handleImport}
            disabled={!parseResult}
            className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> สร้าง Tasks ({totalTasks})
          </button>
          <button onClick={onClose} className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm rounded-xl transition-colors">
            ยกเลิก
          </button>
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

export default AIImportModal;
