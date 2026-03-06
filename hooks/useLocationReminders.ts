import { useEffect, useRef } from 'react';
import { Task } from '../types';
import { isInsideRadius } from '../services/locationService';
import { sendNotification } from '../services/notificationService';

export function useLocationReminders(tasks: Task[], enabled: boolean) {
  const insideRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !('geolocation' in navigator) || Notification.permission !== 'granted') return;

    const tasksWithLocation = tasks.filter(
      t => t.locationReminder?.enabled && !t.completed
    );
    if (tasksWithLocation.length === 0) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        tasksWithLocation.forEach(task => {
          const lr = task.locationReminder!;
          const inside = isInsideRadius(
            latitude, longitude,
            lr.latitude, lr.longitude,
            lr.radius
          );
          const wasInside = insideRef.current.has(lr.id);

          if (inside && !wasInside) {
            insideRef.current.add(lr.id);
            if (lr.triggerOn === 'enter' || lr.triggerOn === 'both') {
              sendNotification(
                `📍 ${task.title}`,
                `คุณอยู่ใกล้ "${lr.label}" แล้ว`
              );
            }
          } else if (!inside && wasInside) {
            insideRef.current.delete(lr.id);
            if (lr.triggerOn === 'exit' || lr.triggerOn === 'both') {
              sendNotification(
                `📍 ${task.title}`,
                `คุณออกจาก "${lr.label}" แล้ว — อย่าลืมทำ!`
              );
            }
          }
        });
      },
      undefined,
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [tasks, enabled]);
}
