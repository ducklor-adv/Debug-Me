import { useState, useCallback } from 'react';

export interface UndoAction {
  id: string;
  label: string;
  timestamp: number;
  restore: () => void;
}

export function useUndoStack(maxSize: number = 10) {
  const [stack, setStack] = useState<UndoAction[]>([]);
  const [toast, setToast] = useState<UndoAction | null>(null);

  const push = useCallback((action: UndoAction) => {
    setStack(prev => [action, ...prev].slice(0, maxSize));
    setToast(action);
    const id = action.id;
    setTimeout(() => setToast(prev => prev?.id === id ? null : prev), 5000);
  }, [maxSize]);

  const undo = useCallback(() => {
    if (!toast) return;
    toast.restore();
    const id = toast.id;
    setToast(null);
    setStack(prev => prev.filter(a => a.id !== id));
  }, [toast]);

  const dismissToast = useCallback(() => setToast(null), []);

  return { push, undo, toast, dismissToast, stack };
}
