import { useEffect } from 'react';
import { ScheduleTemplates, TaskGroup, getDayType } from '../types';
import { sendNotification } from '../services/notificationService';
import { BehaviorPattern, minToTime } from '../services/behaviorAnalysis';

export function useNotificationScheduler(
  scheduleTemplates: ScheduleTemplates,
  taskGroups: TaskGroup[],
  enabled: boolean,
  reminderMinutes: number = 5,
  behaviorPatterns?: Map<string, BehaviorPattern>,
) {
  useEffect(() => {
    if (!enabled || Notification.permission !== 'granted') return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const dayType = getDayType(new Date());
    const slots = scheduleTemplates[dayType] || [];
    const now = Date.now();

    slots.forEach(slot => {
      const [sh, sm] = slot.startTime.split(':').map(Number);
      const [eh, em] = slot.endTime.split(':').map(Number);

      const slotStart = new Date();
      slotStart.setHours(sh, sm, 0, 0);

      // Smart timing: use behavior pattern if available
      const pattern = behaviorPatterns?.get(slot.id);
      let reminderTime: number;
      let reminderLabel: string;

      if (pattern && pattern.consistency > 0) {
        // Use AI-analyzed best reminder time
        const bestH = Math.floor(pattern.bestReminderMin / 60);
        const bestM = pattern.bestReminderMin % 60;
        const bestDate = new Date();
        bestDate.setHours(bestH, bestM, 0, 0);
        reminderTime = bestDate.getTime();
        reminderLabel = `เริ่มเร็วๆ นี้ (${slot.startTime}–${slot.endTime})`;
      } else {
        // Fallback: fixed minutes before slot
        reminderTime = slotStart.getTime() - reminderMinutes * 60 * 1000;
        reminderLabel = `เริ่มในอีก ${reminderMinutes} นาที (${slot.startTime}–${slot.endTime})`;
      }

      if (reminderTime > now) {
        const group = taskGroups.find(g => g.key === slot.groupKey);
        timers.push(setTimeout(() => {
          sendNotification(
            `${group?.emoji || ''} ${group?.label || slot.groupKey}`,
            reminderLabel
          );
        }, reminderTime - now));
      }

      // Notification when slot ends
      const slotEnd = new Date();
      slotEnd.setHours(eh, em, 0, 0);
      if (slotEnd.getTime() > now) {
        const group = taskGroups.find(g => g.key === slot.groupKey);
        timers.push(setTimeout(() => {
          sendNotification(
            'หมดเวลา!',
            `ช่วง ${group?.emoji || ''} ${group?.label || slot.groupKey} (${slot.startTime}–${slot.endTime}) จบแล้ว`
          );
        }, slotEnd.getTime() - now));
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [scheduleTemplates, taskGroups, enabled, reminderMinutes, behaviorPatterns]);
}
