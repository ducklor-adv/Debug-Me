
import { GoogleGenAI, Type } from "@google/genai";
import { Task, DailyRecord, Habit, TaskGroup, TimeSlot } from "../types";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

const MODEL = 'gemini-2.0-flash';

// Retry wrapper for 429 rate limit errors
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const is429 = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('Too Many Requests');
      if (is429 && i < maxRetries) {
        const delay = (i + 1) * 3000; // 3s, 6s
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

export const getAIPrioritization = async (
  tasks: Task[],
  context?: { currentTime: string; completedCount: number; totalCount: number }
) => {
  const ai = getAIClient();
  const taskList = tasks.map(t => `${t.title} (${t.priority} priority, category: ${t.category}${t.estimatedDuration ? `, ~${t.estimatedDuration}min` : ''})`).join('\n');
  const contextStr = context
    ? `\nเวลาปัจจุบัน: ${context.currentTime}, ทำเสร็จแล้ว ${context.completedCount}/${context.totalCount} tasks`
    : '';

  const response = await withRetry(() => ai.models.generateContent({
    model: MODEL,
    contents: `เป็น productivity coach ภาษาไทย วิเคราะห์ task เหล่านี้และแนะนำลำดับที่ควรทำเพื่อประสิทธิภาพสูงสุด อธิบายสั้นๆ ว่าทำไม${contextStr}\n\nTasks:\n${taskList}`,
    config: {
      temperature: 0.7,
    }
  }));

  return response.text;
};

export const generateSmartSchedule = async (
  tasks: Task[],
  taskGroups?: TaskGroup[],
  currentSchedule?: TimeSlot[]
) => {
  const ai = getAIClient();
  const taskList = tasks.filter(t => !t.completed).map(t => `- ${t.title} (${t.priority}, category: ${t.category}${t.estimatedDuration ? `, ~${t.estimatedDuration}min` : ''})`).join('\n');
  const groupInfo = taskGroups ? '\n\nTask Groups:\n' + taskGroups.map(g => `${g.key}: ${g.label} (${g.emoji})`).join('\n') : '';
  const currentInfo = currentSchedule ? '\n\nตารางปัจจุบัน:\n' + currentSchedule.map(s => `${s.startTime}-${s.endTime}: ${s.groupKey}`).join('\n') : '';

  const response = await withRetry(() => ai.models.generateContent({
    model: MODEL,
    contents: `สร้างตารางวันจาก 05:00 ถึง 23:00 ด้วย tasks เหล่านี้ คำนึงถึง energy level (งานยากตอนเช้า)
ตอบเป็น JSON array เท่านั้น ไม่ต้องมี markdown: [{"startTime":"HH:MM","endTime":"HH:MM","groupKey":"..."}]
ใช้ groupKey จาก task groups ที่ให้${groupInfo}${currentInfo}

Tasks:\n${taskList}`,
    config: {
      temperature: 0.7,
    }
  }));

  // Try to parse JSON, fallback to raw text
  const text = response.text || '';
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { /* fallback */ }
  return text;
};

export const generateDailyDigest = async (
  records: DailyRecord[],
  tasks: Task[],
  habits?: Habit[]
) => {
  const ai = getAIClient();
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

  const response = await withRetry(() => ai.models.generateContent({
    model: MODEL,
    contents: `เป็น life coach ภาษาไทย สรุปผลวันนี้ให้กำลังใจ มี 4 ส่วน:
1. สรุปผลงานวันนี้
2. สิ่งที่ทำได้ดี
3. สิ่งที่ควรปรับปรุง
4. คำแนะนำสำหรับพรุ่งนี้

ตอบสั้นๆ ไม่เกิน 200 คำ ให้กำลังใจ

ข้อมูล:\n${summary}`,
    config: { temperature: 0.7 }
  }));
  return response.text;
};

export const chatWithCoach = async (history: { role: 'user' | 'model', message: string }[], userInput: string) => {
  const ai = getAIClient();
  const chat = ai.chats.create({
    model: MODEL,
    config: {
      systemInstruction: 'You are "LifeFlow AI Coach", a supportive, expert life strategist. You help users manage time, set goals, and overcome procrastination. Keep responses concise and motivating.',
    }
  });

  const response = await withRetry(() => chat.sendMessage({ message: userInput }));
  return response.text;
};

export const analyzeProjectTasks = async (
  history: { role: 'user' | 'model', message: string }[],
  userInput: string
) => {
  const ai = getAIClient();

  const systemPrompt = `คุณคือ Project Manager AI ที่เชี่ยวชาญในการวิเคราะห์งานและวางแผนโปรเจกต์
หน้าที่ของคุณ:
1. รับฟังรายละเอียดงาน/โปรเจกต์จากผู้ใช้
2. ถามคำถามเพิ่มเติมถ้าข้อมูลยังไม่เพียงพอ (เช่น deadline, scope, ข้อจำกัด)
3. เมื่อมีข้อมูลเพียงพอแล้ว ให้วิเคราะห์และสร้างแผนงานเป็น JSON

กฎสำคัญ:
- ตอบเป็นภาษาไทยเสมอ สั้นกระชับ
- ถามคำถาม 1-2 ข้อต่อรอบ ไม่ถามมากเกินไป
- เมื่อพร้อมสร้างแผน ให้ตอบ JSON ภายใน \`\`\`json ... \`\`\` block
- JSON ต้องมี format ดังนี้:
\`\`\`json
{
  "processes": [
    {
      "title": "ชื่อ Phase",
      "emoji": "📋",
      "order": 1,
      "tasks": [
        { "title": "ชื่องาน", "description": "รายละเอียด", "duration": 120, "priority": "High" }
      ]
    }
  ]
}
\`\`\`
- priority: "High" / "Medium" / "Low"
- duration: นาที (เช่น 60 = 1 ชั่วโมง)
- แบ่ง process ตามลำดับขั้นตอนจริงของโปรเจกต์
- ใส่ description ที่เป็นประโยชน์ ชัดเจน สำหรับคนทำงานจริง`;

  const chat = ai.chats.create({
    model: MODEL,
    config: {
      systemInstruction: systemPrompt,
    }
  });

  // Send previous history first (if any)
  for (const msg of history) {
    await chat.sendMessage({ message: msg.message });
  }

  const response = await withRetry(() => chat.sendMessage({ message: userInput }));
  return response.text;
};
