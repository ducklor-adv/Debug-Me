
import { Task, DailyRecord, Habit, TaskGroup, TimeSlot } from "../types";

let _functions: any = null;
const getFns = async () => {
  if (_functions) return _functions;
  const { getFunctions } = await import("firebase/functions");
  const { app } = await import("../firebase");
  _functions = getFunctions(app);
  return _functions;
};

const callFn = async (name: string, data: object) => {
  const { httpsCallable } = await import("firebase/functions");
  const fns = await getFns();
  const fn = httpsCallable(fns, name);
  const result = await fn(data);
  return result.data as { text?: string; schedule?: object[] };
};

export const getAIPrioritization = async (
  tasks: Task[],
  context?: { currentTime: string; completedCount: number; totalCount: number }
) => {
  const taskList = tasks.map(t => `${t.title} (${t.priority} priority, category: ${t.category}${t.estimatedDuration ? `, ~${t.estimatedDuration}min` : ''})`).join('\n');
  const contextStr = context
    ? `\nเวลาปัจจุบัน: ${context.currentTime}, ทำเสร็จแล้ว ${context.completedCount}/${context.totalCount} tasks`
    : '';

  const result = await callFn('aiPrioritize', { taskList, contextStr });
  return result.text;
};

export const generateSmartSchedule = async (
  tasks: Task[],
  taskGroups?: TaskGroup[],
  currentSchedule?: TimeSlot[]
) => {
  const taskList = tasks.filter(t => !t.completed).map(t => `- ${t.title} (${t.priority}, category: ${t.category}${t.estimatedDuration ? `, ~${t.estimatedDuration}min` : ''})`).join('\n');
  const groupInfo = taskGroups ? '\n\nTask Groups:\n' + taskGroups.map(g => `${g.key}: ${g.label} (${g.emoji})`).join('\n') : '';
  const currentInfo = currentSchedule ? '\n\nตารางปัจจุบัน:\n' + currentSchedule.map(s => `${s.startTime}-${s.endTime}: ${s.groupKey}`).join('\n') : '';

  const result = await callFn('aiSchedule', { taskList, groupInfo, currentInfo });
  return result.schedule || result.text;
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

  const result = await callFn('aiDigest', { summary });
  return result.text;
};

export const chatWithCoach = async (history: { role: 'user' | 'model', message: string }[], userInput: string) => {
  const result = await callFn('aiChat', { userInput });
  return result.text;
};

export const analyzeProjectTasks = async (
  history: { role: 'user' | 'model', message: string }[],
  userInput: string
) => {
  const result = await callFn('aiProject', { history, userInput });
  return result.text;
};
