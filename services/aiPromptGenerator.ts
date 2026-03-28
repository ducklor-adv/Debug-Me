import { Task, SubTask } from '../types';
import { AIProcessResult } from '../components/ProjectAIChat';

/**
 * Generate a prompt from task data for external AI chatbot analysis.
 * The prompt instructs the AI to break down the task into processes/phases
 * and return structured JSON matching AIProcessResult format.
 */
export function generateTaskBreakdownPrompt(
  task: Omit<Task, 'id'>,
  subtasks: SubTask[] = [],
): string {
  const lines: string[] = [];

  lines.push('คุณเป็น Project Manager AI ที่เชี่ยวชาญในการวิเคราะห์และวางแผนงาน');
  lines.push('');
  lines.push('== ข้อมูลงาน ==');
  lines.push(`ชื่อ: ${task.title}`);
  if (task.description) lines.push(`คำอธิบาย: ${task.description}`);
  lines.push(`ลำดับความสำคัญ: ${task.priority}`);
  if (task.estimatedDuration) lines.push(`ระยะเวลาโดยประมาณ: ${task.estimatedDuration} นาที`);
  if (task.startDate) lines.push(`วันเริ่ม: ${task.startDate}`);
  if (task.endDate) lines.push(`วันสิ้นสุด: ${task.endDate}`);
  if (task.startTime) lines.push(`เวลาเริ่ม: ${task.startTime}`);
  if (task.endTime) lines.push(`เวลาสิ้นสุด: ${task.endTime}`);
  if (task.notes) lines.push(`หมายเหตุ: ${task.notes}`);

  if (subtasks.length > 0) {
    lines.push('');
    lines.push('รายการย่อย (Subtasks):');
    subtasks.forEach((s, i) => {
      lines.push(`${i + 1}. ${s.title}${s.note ? ' — ' + s.note : ''}`);
    });
  }

  lines.push('');
  lines.push('== คำสั่ง ==');
  lines.push('วิเคราะห์งานนี้และแบ่งเป็นขั้นตอน (processes) พร้อม tasks ย่อย');
  lines.push('ตอบเป็น JSON ภายใน ```json ... ``` block ตาม format นี้:');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify({
    processes: [
      {
        title: "ชื่อ Phase/ขั้นตอน",
        emoji: "📋",
        order: 1,
        tasks: [
          { title: "ชื่อ task ย่อย", description: "รายละเอียดสั้นๆ", duration: 60, priority: "High" }
        ]
      }
    ]
  }, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('กฎ:');
  lines.push('- priority: "High" / "Medium" / "Low"');
  lines.push('- duration: หน่วยนาที (เช่น 60 = 1 ชั่วโมง)');
  lines.push('- แบ่ง process ตามลำดับขั้นตอนจริงของงาน');
  lines.push('- ใส่ description ที่ชัดเจน เป็นประโยชน์สำหรับคนทำงานจริง');
  lines.push('- ตอบเป็นภาษาไทย');

  return lines.join('\n');
}

/**
 * Try to parse AI-generated JSON containing processes.
 * Handles both ```json ... ``` blocks and raw JSON.
 * Shared utility used by ProjectAIChat and AIImportModal.
 */
export function tryParseJSON(text: string): { processes: AIProcessResult[] } | null {
  // Try to extract JSON from ```json ... ``` block
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = jsonBlockMatch ? jsonBlockMatch[1].trim() : null;

  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.processes && Array.isArray(parsed.processes)) return parsed;
    } catch { /* ignore */ }
  }

  // Try raw JSON
  const rawMatch = text.match(/\{[\s\S]*"processes"[\s\S]*\}/);
  if (rawMatch) {
    try {
      const parsed = JSON.parse(rawMatch[0]);
      if (parsed.processes && Array.isArray(parsed.processes)) return parsed;
    } catch { /* ignore */ }
  }

  return null;
}
