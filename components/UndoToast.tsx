import React from 'react';
import { X, Undo2 } from 'lucide-react';
import { UndoAction } from '../hooks/useUndoStack';

interface UndoToastProps {
  action: UndoAction | null;
  onUndo: () => void;
  onDismiss: () => void;
}

const UndoToast: React.FC<UndoToastProps> = ({ action, onUndo, onDismiss }) => {
  if (!action) return null;
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[70] animate-fadeIn lg:bottom-8">
      <div className="flex items-center gap-3 bg-slate-800 text-white rounded-xl px-4 py-3 shadow-xl min-w-[280px]">
        <span className="text-sm font-medium flex-1 truncate">{action.label}</span>
        <button onClick={onUndo} className="flex items-center gap-1 text-sm font-bold text-emerald-400 hover:text-emerald-300 shrink-0">
          <Undo2 className="w-3.5 h-3.5" /> Undo
        </button>
        <button onClick={onDismiss} className="text-slate-400 hover:text-white shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default UndoToast;
