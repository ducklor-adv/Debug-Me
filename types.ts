
export enum Priority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  completed: boolean;
  dueDate: string;
  category: string;
}

export interface Habit {
  id: string;
  name: string;
  streak: number;
  completedToday: boolean;
  color: string;
}

export interface TimeEntry {
  category: string;
  hours: number;
}

export type View = 'dashboard' | 'tasks' | 'habits' | 'focus' | 'analytics' | 'ai-coach' | 'planner';
