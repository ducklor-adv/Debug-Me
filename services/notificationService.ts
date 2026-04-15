export type SoundType = 'slot_start' | 'urgent' | 'slot_ending' | 'timer_end';

export function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return Promise.resolve(false);
  if (Notification.permission === 'granted') return Promise.resolve(true);
  return Notification.requestPermission().then(p => p === 'granted');
}

let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioCtx;
  } catch {
    return null;
  }
}

function playTone(freq: number, durationMs: number, vol = 0.25, delayMs = 0, wave: OscillatorType = 'sine') {
  const ctx = getCtx();
  if (!ctx) return;
  const start = ctx.currentTime + delayMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = wave;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(vol, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, start + durationMs / 1000);
  osc.start(start);
  osc.stop(start + durationMs / 1000);
}

export type SoundPreset =
  | 'chime-soft' | 'chime-bright' | 'bell' | 'marimba'
  | 'ding' | 'pop' | 'zen' | 'koto'
  | 'alarm-short' | 'alarm-urgent' | 'triple-ding' | 'ring';

export function playPreset(name: SoundPreset) {
  switch (name) {
    case 'chime-soft':
      playTone(523.25, 180, 0.2);
      playTone(659.25, 220, 0.2, 180);
      break;
    case 'chime-bright':
      playTone(523.25, 120, 0.2);
      playTone(659.25, 120, 0.2, 120);
      playTone(783.99, 260, 0.22, 240);
      break;
    case 'bell':
      playTone(440, 600, 0.28);
      playTone(880, 500, 0.08, 0);
      break;
    case 'marimba':
      playTone(587.33, 100, 0.25, 0, 'triangle');
      playTone(698.46, 100, 0.25, 100, 'triangle');
      playTone(880, 200, 0.25, 200, 'triangle');
      break;
    case 'ding':
      playTone(1046.5, 280, 0.25);
      break;
    case 'pop':
      playTone(800, 50, 0.3, 0, 'square');
      break;
    case 'zen':
      playTone(261.63, 900, 0.22);
      break;
    case 'koto':
      playTone(523.25, 400, 0.2, 0, 'sawtooth');
      playTone(783.99, 400, 0.18, 150, 'sawtooth');
      break;
    case 'alarm-short':
      playTone(880, 120, 0.3);
      playTone(880, 120, 0.3, 200);
      break;
    case 'alarm-urgent':
      playTone(880, 100, 0.3);
      playTone(880, 100, 0.3, 150);
      playTone(1046.5, 100, 0.3, 300);
      playTone(1046.5, 100, 0.3, 450);
      playTone(1318.51, 250, 0.32, 600);
      break;
    case 'triple-ding':
      playTone(1046.5, 150, 0.25);
      playTone(1046.5, 150, 0.25, 200);
      playTone(1046.5, 200, 0.25, 400);
      break;
    case 'ring':
      playTone(698.46, 80, 0.25, 0, 'triangle');
      playTone(880, 80, 0.25, 80, 'triangle');
      playTone(698.46, 80, 0.25, 200, 'triangle');
      playTone(880, 180, 0.28, 280, 'triangle');
      break;
  }
}

const DEFAULT_MAP: Record<SoundType, SoundPreset> = {
  slot_start: 'chime-soft',
  urgent: 'alarm-short',
  slot_ending: 'ding',
  timer_end: 'bell',
};

export function getSoundPreset(type: SoundType): SoundPreset {
  try {
    const v = localStorage.getItem(`debugme-sound-${type}`);
    if (v) return v as SoundPreset;
  } catch {}
  return DEFAULT_MAP[type];
}

export function setSoundPreset(type: SoundType, preset: SoundPreset) {
  try { localStorage.setItem(`debugme-sound-${type}`, preset); } catch {}
}

export function playSound(type: SoundType) {
  if (!isSoundEnabled()) return;
  playPreset(getSoundPreset(type));
}

export function isSoundEnabled(): boolean {
  try { return localStorage.getItem('debugme-sound') !== 'false'; } catch { return true; }
}

export function sendNotification(title: string, body: string, sound?: SoundType, icon?: string) {
  if (sound) playSound(sound);
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: icon || '/logo.png', badge: '/logo.png' });
  } catch {
    // Notification API not supported in this context
  }
}
