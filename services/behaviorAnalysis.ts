import { DailyRecord, TimeSlot } from '../types';

export interface BehaviorPattern {
  groupKey: string;
  avgStartMin: number;   // average minute-of-day the user actually starts this slot
  consistency: number;   // 0-1, how consistently user completes tasks in this slot
  bestReminderMin: number; // optimal minute-of-day to send reminder
}

/**
 * Analyze 30 days of DailyRecords to find user behavior patterns per slot.
 * Returns a Map<slotId, BehaviorPattern> for smart reminder timing.
 */
export function analyzeBehaviorPatterns(
  records: DailyRecord[],
  slots: TimeSlot[]
): Map<string, BehaviorPattern> {
  const patterns = new Map<string, BehaviorPattern>();

  slots.forEach(slot => {
    // Find records matching this slot's time window
    const slotRecords = records.filter(r =>
      r.timeStart === slot.startTime && r.timeEnd === slot.endTime
    );
    if (slotRecords.length < 3) return; // need enough data

    const completedRecords = slotRecords.filter(r => r.completed && r.completedAt);
    if (completedRecords.length === 0) return;

    // Calculate average completion time (minute of day)
    const completionMins = completedRecords.map(r => {
      const d = new Date(r.completedAt!);
      return d.getHours() * 60 + d.getMinutes();
    });
    const avgMin = Math.round(completionMins.reduce((a, b) => a + b, 0) / completionMins.length);

    // Parse slot start time
    const [sh, sm] = slot.startTime.split(':').map(Number);
    const slotStartMin = sh * 60 + sm;

    // Consistency = completion rate
    const consistency = completedRecords.length / slotRecords.length;

    // Best reminder = 5 min before user's average actual start, but not before slot start - 15 min
    const bestReminderMin = Math.max(slotStartMin - 15, avgMin - 5);

    patterns.set(slot.id, {
      groupKey: slot.groupKey,
      avgStartMin: avgMin,
      consistency,
      bestReminderMin,
    });
  });

  return patterns;
}

/** Format minute-of-day to HH:MM string */
export function minToTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
