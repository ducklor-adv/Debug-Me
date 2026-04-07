import { TimeSlot, timeToMinutes, minutesToTime } from '../../types';

/** Calculate duration in minutes between two HH:MM time strings */
export function getDurationMinutes(start: string, end: string): number {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  let diff = e - s;
  if (diff <= 0) diff += 1440;
  return diff;
}

/** Add minutes to a HH:MM time string, returns new HH:MM */
export function addMinutesToTime(time: string, mins: number): string {
  return minutesToTime(timeToMinutes(time) + mins);
}

/** Format duration in minutes to Thai readable string (e.g. "1ชม. 30น.") */
export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}น.`;
  if (m === 0) return `${h}ชม.`;
  return `${h}ชม. ${m}น.`;
}

/**
 * Migrate v1 slots (startTime/endTime based) to v2 (duration based).
 * Sorts by startTime, computes duration, fills gaps with free slots.
 */
export function migrateV1Slots(
  slots: TimeSlot[],
  wakeTime: string = '05:00',
  sleepTime: string = '22:00'
): TimeSlot[] {
  if (slots.length === 0) return [];

  // Already v2 if first slot has duration
  if (slots[0].duration !== undefined) return slots;

  // Sort by startTime
  const sorted = [...slots].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  const result: TimeSlot[] = [];
  const wakeMin = timeToMinutes(wakeTime);
  const sleepMin = timeToMinutes(sleepTime);
  let cursor = wakeMin;

  for (const slot of sorted) {
    if (!slot.startTime || !slot.endTime) continue;
    const slotStart = timeToMinutes(slot.startTime);
    const slotEnd = timeToMinutes(slot.endTime);
    let dur = slotEnd - slotStart;
    if (dur <= 0) dur += 1440;

    // Skip sleep slots outside wake-sleep range
    if (slot.groupKey === 'sleep') {
      const isBeforeWake = slotEnd <= wakeMin || (slotStart < wakeMin);
      const isAfterSleep = slotStart >= sleepMin;
      if (isBeforeWake || isAfterSleep) continue;
    }

    if (slotStart < wakeMin) continue;

    if (slotStart > cursor) {
      const gap = slotStart - cursor;
      if (gap > 0) {
        result.push({
          id: `free-${Date.now()}-${result.length}`,
          duration: gap,
          type: 'free',
          groupKey: '_free',
        });
      }
      cursor = slotStart;
    }

    result.push({ ...slot, duration: dur, type: 'activity' });
    cursor += dur;
  }

  const totalAvail = ((sleepMin - wakeMin) + 1440) % 1440;
  const usedTime = result.reduce((sum, s) => sum + (s.duration || 0), 0);
  const remaining = totalAvail - usedTime;
  if (remaining > 0) {
    result.push({
      id: `free-${Date.now()}-end`,
      duration: remaining,
      type: 'free',
      groupKey: '_free',
    });
  }

  return result;
}
