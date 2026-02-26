export function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return Promise.resolve(false);
  if (Notification.permission === 'granted') return Promise.resolve(true);
  return Notification.requestPermission().then(p => p === 'granted');
}

export function sendNotification(title: string, body: string, icon?: string) {
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: icon || '/logo.png', badge: '/logo.png' });
  } catch {
    // Notification API not supported in this context
  }
}
