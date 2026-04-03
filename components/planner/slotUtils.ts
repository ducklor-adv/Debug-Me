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
 * Adjust a slot's duration by deltaMins, consuming/creating adjacent free slots.
 * Returns new slots array, or null if adjustment is not possible.
 */
export function adjustSlotDuration(
  slots: TimeSlot[],
  slotIndex: number,
  deltaMins: number
): TimeSlot[] | null {
  const slot = slots[slotIndex];
  if (!slot || slot.type === 'free') return null;

  const currentDur = slot.duration || 0;
  const newDur = currentDur + deltaMins;
  if (newDur < 30) return null; // minimum 30 minutes

  if (deltaMins > 0) {
    // Growing: consume from adjacent free slot (prefer after, then before)
    const afterIdx = slotIndex + 1;
    const beforeIdx = slotIndex - 1;

    if (afterIdx < slots.length && slots[afterIdx].type === 'free' && (slots[afterIdx].duration || 0) >= deltaMins) {
      const result = [...slots];
      result[slotIndex] = { ...slot, duration: newDur };
      const freeDur = (slots[afterIdx].duration || 0) - deltaMins;
      if (freeDur <= 0) {
        result.splice(afterIdx, 1);
      } else {
        result[afterIdx] = { ...slots[afterIdx], duration: freeDur };
      }
      return result;
    }
    if (beforeIdx >= 0 && slots[beforeIdx].type === 'free' && (slots[beforeIdx].duration || 0) >= deltaMins) {
      const result = [...slots];
      result[slotIndex] = { ...slot, duration: newDur };
      const freeDur = (slots[beforeIdx].duration || 0) - deltaMins;
      if (freeDur <= 0) {
        result.splice(beforeIdx, 1);
      } else {
        result[beforeIdx] = { ...slots[beforeIdx], duration: freeDur };
      }
      return result;
    }
    return null; // no adjacent free slot with enough time
  }

  if (deltaMins < 0) {
    // Shrinking: create/extend adjacent free slot after
    const result = [...slots];
    result[slotIndex] = { ...slot, duration: newDur };
    const afterIdx = slotIndex + 1;
    if (afterIdx < result.length && result[afterIdx].type === 'free') {
      result[afterIdx] = { ...result[afterIdx], duration: (result[afterIdx].duration || 0) + Math.abs(deltaMins) };
    } else {
      result.splice(afterIdx, 0, {
        id: `free-${Date.now()}`,
        duration: Math.abs(deltaMins),
        type: 'free',
        groupKey: '_free',
      });
    }
    return result;
  }

  return slots;
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

    // Skip sleep slots that are outside wake-sleep range
    if (slot.groupKey === 'sleep') continue;

    // Insert free slot for gap before this slot
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

    result.push({
      ...slot,
      duration: dur,
      type: 'activity',
    });
    cursor += dur;
  }

  // Fill remaining time until sleepTime
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

/** Check if a slot array is v2 (duration-based) */
export function isV2Schedule(slots: TimeSlot[]): boolean {
  return slots.length > 0 && slots[0].duration !== undefined;
}
