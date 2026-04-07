const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenAI } = require("@google/genai");

const geminiKey = defineSecret("GEMINI_API_KEY");

const MODEL = "gemini-2.0-flash";

/** Create AI client with secret key */
const getAI = (key) => new GoogleGenAI({ apiKey: key });

/** Retry wrapper for 429 rate limit */
async function withRetry(fn, maxRetries = 2) {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err?.status === 429 || err?.message?.includes("429");
      if (is429 && i < maxRetries) {
        await new Promise((r) => setTimeout(r, (i + 1) * 3000));
        continue;
      }
      throw err;
    }
  }
}

// --- AI Prioritization ---
exports.aiPrioritize = onCall({ secrets: [geminiKey], cors: true }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "ต้อง login ก่อน");
  const { taskList, contextStr } = req.data;
  const ai = getAI(geminiKey.value());
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: `เป็น productivity coach ภาษาไทย วิเคราะห์ task เหล่านี้และแนะนำลำดับที่ควรทำเพื่อประสิทธิภาพสูงสุด อธิบายสั้นๆ ว่าทำไม${contextStr || ""}\n\nTasks:\n${taskList}`,
      config: { temperature: 0.7 },
    })
  );
  return { text: response.text };
});

// --- Smart Schedule ---
exports.aiSchedule = onCall({ secrets: [geminiKey], cors: true }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "ต้อง login ก่อน");
  const { taskList, groupInfo, currentInfo } = req.data;
  const ai = getAI(geminiKey.value());
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: `สร้างตารางวันจาก 05:00 ถึง 23:00 ด้วย tasks เหล่านี้ คำนึงถึง energy level (งานยากตอนเช้า)
ตอบเป็น JSON array เท่านั้น ไม่ต้องมี markdown: [{"startTime":"HH:MM","endTime":"HH:MM","groupKey":"..."}]
ใช้ groupKey จาก task groups ที่ให้${groupInfo || ""}${currentInfo || ""}

Tasks:\n${taskList}`,
      config: { temperature: 0.7 },
    })
  );
  const text = response.text || "";
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) return { schedule: JSON.parse(jsonMatch[0]) };
  } catch {}
  return { text };
});

// --- Daily Digest ---
exports.aiDigest = onCall({ secrets: [geminiKey], cors: true }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "ต้อง login ก่อน");
  const { summary } = req.data;
  const ai = getAI(geminiKey.value());
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: `เป็น life coach ภาษาไทย สรุปผลวันนี้ให้กำลังใจ มี 4 ส่วน:
1. สรุปผลงานวันนี้
2. สิ่งที่ทำได้ดี
3. สิ่งที่ควรปรับปรุง
4. คำแนะนำสำหรับพรุ่งนี้

ตอบสั้นๆ ไม่เกิน 200 คำ ให้กำลังใจ

ข้อมูล:\n${summary}`,
      config: { temperature: 0.7 },
    })
  );
  return { text: response.text };
});

// --- Chat with Coach ---
exports.aiChat = onCall({ secrets: [geminiKey], cors: true }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "ต้อง login ก่อน");
  const { userInput } = req.data;
  const ai = getAI(geminiKey.value());
  const chat = ai.chats.create({
    model: MODEL,
    config: {
      systemInstruction:
        'You are "LifeFlow AI Coach", a supportive, expert life strategist. You help users manage time, set goals, and overcome procrastination. Keep responses concise and motivating.',
    },
  });
  const response = await withRetry(() => chat.sendMessage({ message: userInput }));
  return { text: response.text };
});

// --- Analyze Project Tasks ---
exports.aiProject = onCall({ secrets: [geminiKey], cors: true }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "ต้อง login ก่อน");
  const { history, userInput } = req.data;
  const ai = getAI(geminiKey.value());

  const systemPrompt = `คุณคือ Project Manager AI ที่เชี่ยวชาญในการวิเคราะห์งานและวางแผนโปรเจกต์
หน้าที่ของคุณ:
1. รับฟังรายละเอียดงาน/โปรเจกต์จากผู้ใช้
2. ถามคำถามเพิ่มเติมถ้าข้อมูลยังไม่เพียงพอ
3. เมื่อมีข้อมูลเพียงพอแล้ว ให้วิเคราะห์และสร้างแผนงานเป็น JSON

กฎ:
- ตอบเป็นภาษาไทย สั้นกระชับ
- เมื่อพร้อมสร้างแผน ให้ตอบ JSON ภายใน \`\`\`json ... \`\`\` block
- JSON format: { "processes": [{ "title": "...", "emoji": "...", "order": 1, "tasks": [{ "title": "...", "description": "...", "duration": 120, "priority": "High" }] }] }`;

  const chat = ai.chats.create({
    model: MODEL,
    config: { systemInstruction: systemPrompt },
  });

  for (const msg of history || []) {
    await chat.sendMessage({ message: msg.message });
  }

  const response = await withRetry(() => chat.sendMessage({ message: userInput }));
  return { text: response.text };
});
