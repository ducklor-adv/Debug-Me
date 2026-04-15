import { useEffect } from 'react';
import { ScheduleTemplates, TaskGroup, getScheduleForDay, resolveSlotTimes } from '../types';
import { sendNotification, SoundType } from '../services/notificationService';
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
    const now0 = new Date();
    const resolved = getScheduleForDay(scheduleTemplates, now0.getDay(), now0.toISOString().split('T')[0]);
    const rawSlots = (resolved.slots || []).filter(s => s.type !== 'free');
    const slots = resolveSlotTimes(rawSlots, resolved.wakeTime || '05:00', resolved.sleepTime || '22:00');
    const now = Date.now();

    slots.forEach(slot => {
      const [sh, sm] = slot.startTime.split(':').map(Number);
      const [eh, em] = slot.endTime.split(':').map(Number);

      const slotStart = new Date();
      slotStart.setHours(sh, sm, 0, 0);

      const group = taskGroups.find(g => g.key === slot.groupKey);
      const isUrgent = slot.groupKey === 'นัดหมาย' || slot.groupKey === 'งานด่วน';
      const startSound: SoundType = isUrgent ? 'urgent' : 'slot_start';

      // Smart timing: use behavior pattern if available
      const pattern = behaviorPatterns?.get(slot.id);
      let reminderTime: number;
      let reminderLabel: string;

      if (pattern && pattern.consistency > 0) {
        const bestH = Math.floor(pattern.bestReminderMin / 60);
        const bestM = pattern.bestReminderMin % 60;
        const bestDate = new Date();
        bestDate.setHours(bestH, bestM, 0, 0);
        reminderTime = bestDate.getTime();
        reminderLabel = `เริ่มเร็วๆ นี้ (${slot.startTime}–${slot.endTime})`;
      } else {
        reminderTime = slotStart.getTime() - reminderMinutes * 60 * 1000;
        reminderLabel = `เริ่มในอีก ${reminderMinutes} นาที (${slot.startTime}–${slot.endTime})`;
      }

      if (reminderMinutes > 0 && reminderTime > now) {
        timers.push(setTimeout(() => {
          sendNotification(
            `${group?.emoji || ''} ${group?.label || slot.groupKey}`,
            reminderLabel,
            'slot_ending'
          );
        }, reminderTime - now));
      }

      if (slotStart.getTime() > now) {
        timers.push(setTimeout(() => {
          sendNotification(
            `${group?.emoji || ''} ${group?.label || slot.groupKey}`,
            `ถึงเวลาแล้ว (${slot.startTime}–${slot.endTime})`,
            startSound
          );
        }, slotStart.getTime() - now));
      }

      const slotEnd = new Date();
      slotEnd.setHours(eh, em, 0, 0);
      if (slotEnd.getTime() > now) {
        timers.push(setTimeout(() => {
          sendNotification(
            'หมดเวลา!',
            `ช่วง ${group?.emoji || ''} ${group?.label || slot.groupKey} (${slot.startTime}–${slot.endTime}) จบแล้ว`,
            'slot_ending'
          );
        }, slotEnd.getTime() - now));
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [scheduleTemplates, taskGroups, enabled, reminderMinutes, behaviorPatterns]);
}
