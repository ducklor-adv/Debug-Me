
import { httpsCallable } from "firebase/functions";
import { getFunctions } from "firebase/functions";
import { Task, DailyRecord, Habit, TaskGroup, TimeSlot } from "../types";
import { app } from "../firebase";

const functions = getFunctions(app);

export const getAIPrioritization = async (
  tasks: Task[],
  context?: { currentTime: string; completedCount: number; totalCount: number }
) => {
  const taskList = tasks.map(t => `${t.title} (${t.priority} priority, category: ${t.category}${t.estimatedDuration ? `, ~${t.estimatedDuration}min` : ''})`).join('\n');
  const contextStr = context
    ? `\nเวลาปัจจุบัน: ${context.currentTime}, ทำเสร็จแล้ว ${context.completedCount}/${context.totalCount} tasks`
    : '';

  const fn = httpsCallable(functions, 'aiPrioritize');
  const result = await fn({ taskList, contextStr });
  return (result.data as { text: string }).text;
};

export const generateSmartSchedule = async (
  tasks: Task[],
  taskGroups?: TaskGroup[],
  currentSchedule?: TimeSlot[]
) => {
  const taskList = tasks.filter(t => !t.completed).map(t => `- ${t.title} (${t.priority}, category: ${t.category}${t.estimatedDuration ? `, ~${t.estimatedDuration}min` : ''})`).join('\n');
  const groupInfo = taskGroups ? '\n\nTask Groups:\n' + taskGroups.map(g => `${g.key}: ${g.label} (${g.emoji})`).join('\n') : '';
  const currentInfo = currentSchedule ? '\n\nตารางปัจจุบัน:\n' + currentSchedule.map(s => `${s.startTime}-${s.endTime}: ${s.groupKey}`).join('\n') : '';

  const fn = httpsCallable(functions, 'aiSchedule');
  const result = await fn({ taskList, groupInfo, currentInfo });
  const data = result.data as { schedule?: object[]; text?: string };
  return data.schedule || data.text;
};

export const generateDailyDigest = async (
  records: DailyRecord[],
  tasks: Task[],
  habits?: Habit[]
) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const completed = records.filter(r => r.completed);
  const missed = records.filter(r => !r.completed);
  const habitsDone = habits?.filter(h => h.history[todayStr]).length || 0;
  const habitsTotal = habits?.length || 0;

  const summary = `
Tasks เสร็จวันนี้ (${completed.length}):
${completed.map(r => `- ${r.taskTitle} (${r.category}${r.timeStart ? `, ${r.timeStart}-${r.timeEnd}` : ''})`).join('\n') || '(ไม่มี)'}

Tasks ที่พลาด (${missed.length}):
${missed.map(r => `- ${r.taskTitle}${r.notes ? ` — ${r.notes}` : ''}`).join('\n') || '(ไม่มี)'}

Tasks ทั้งหมดวันนี้: ${tasks.length}
Habits: ${habitsDone}/${habitsTotal}
`;

  const fn = httpsCallable(functions, 'aiDigest');
  const result = await fn({ summary });
  return (result.data as { text: string }).text;
};

export const chatWithCoach = async (history: { role: 'user' | 'model', message: string }[], userInput: string) => {
  const fn = httpsCallable(functions, 'aiChat');
  const result = await fn({ userInput });
  return (result.data as { text: string }).text;
};

export const analyzeProjectTasks = async (
  history: { role: 'user' | 'model', message: string }[],
  userInput: string
) => {
  const fn = httpsCallable(functions, 'aiProject');
  const result = await fn({ history, userInput });
  return (result.data as { text: string }).text;
};
