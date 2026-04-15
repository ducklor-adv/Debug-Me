import React, { useState } from 'react';
import { X, Bell, Volume2, ChevronRight, Play, Check } from 'lucide-react';
import {
  requestNotificationPermission, playSound, SoundType,
  playPreset, SoundPreset, getSoundPreset, setSoundPreset,
} from '../services/notificationService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  reminderMinutes: number;
  setReminderMinutes: (v: number) => void;
}

const PRESETS: { name: SoundPreset; label: string }[] = [
  { name: 'chime-soft',   label: '🔔 Chime นุ่ม' },
  { name: 'chime-bright', label: '🔔 Chime สดใส' },
  { name: 'bell',         label: '🛎️ Bell ระฆัง' },
  { name: 'marimba',      label: '🪘 Marimba' },
  { name: 'ding',         label: '✨ Ding สั้น' },
  { name: 'pop',          label: '💬 Pop คลิก' },
  { name: 'zen',          label: '🧘 Zen สงบ' },
  { name: 'koto',         label: '🎐 Koto' },
  { name: 'triple-ding',  label: '🔔 Triple ding' },
  { name: 'ring',         label: '📞 Ring' },
  { name: 'alarm-short',  label: '⚠️ Alarm สั้น' },
  { name: 'alarm-urgent', label: '🚨 Alarm ด่วน' },
];

const EVENTS: { type: SoundType; emoji: string; label: string; hint: string }[] = [
  { type: 'slot_start',  emoji: '🔔', label: 'เริ่ม slot',     hint: 'ถึงเวลาตาม Planner' },
  { type: 'urgent',      emoji: '⚡', label: 'นัด / งานด่วน',   hint: 'นัดหมาย, งานด่วน' },
  { type: 'slot_ending', emoji: '⏳', label: 'ใกล้หมดเวลา',    hint: 'เตือนก่อนถึงเวลา' },
  { type: 'timer_end',   emoji: '🍅', label: 'จบ Focus Timer', hint: 'Pomodoro session จบ' },
];

const NotificationSettings: React.FC<Props> = ({
  isOpen, onClose,
  notificationsEnabled, setNotificationsEnabled,
  soundEnabled, setSoundEnabled,
  reminderMinutes, setReminderMinutes,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [pickerFor, setPickerFor] = useState<SoundType | null>(null);
  const [version, setVersion] = useState(0);

  if (!isOpen) return null;

  const handleEnableToggle = async (next: boolean) => {
    if (next) {
      const ok = await requestNotificationPermission();
      setPermission(Notification.permission);
      if (!ok) {
        alert('Browser ไม่ได้อนุญาตให้ส่ง notification — ต้องเปิดใน browser settings ก่อน');
        return;
      }
    }
    setNotificationsEnabled(next);
    try { localStorage.setItem('debugme-notif', String(next)); } catch {}
  };

  const handleSoundToggle = (next: boolean) => {
    setSoundEnabled(next);
    try { localStorage.setItem('debugme-sound', String(next)); } catch {}
    if (next) playSound('slot_start');
  };

  const handleReminderChange = (v: number) => {
    setReminderMinutes(v);
    try { localStorage.setItem('debugme-reminder-min', String(v)); } catch {}
  };

  const previewEvent = (type: SoundType) => {
    if (!soundEnabled) { alert('เปิดเสียงก่อน'); return; }
    playSound(type);
  };

  const pickPreset = (type: SoundType, preset: SoundPreset) => {
    setSoundPreset(type, preset);
    setVersion(v => v + 1);
    if (soundEnabled) playPreset(preset);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-slate-800">การแจ้งเตือน</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800">เปิดใช้การแจ้งเตือน</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {permission === 'denied'
                  ? '⚠️ Browser block อยู่ — เปิดใน browser settings'
                  : permission === 'granted'
                  ? 'Browser อนุญาตแล้ว'
                  : 'ต้องขอ permission'}
              </div>
            </div>
            <Toggle checked={notificationsEnabled} onChange={handleEnableToggle} />
          </div>

          <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-slate-600" />
              <div>
                <div className="font-semibold text-slate-800">เสียงแจ้งเตือน</div>
                <div className="text-xs text-slate-500 mt-0.5">ปิดเมื่อต้องการเงียบ</div>
              </div>
            </div>
            <Toggle checked={soundEnabled} onChange={handleSoundToggle} />
          </div>

          <div className="border-t border-slate-100 pt-5">
            <div className="font-semibold text-slate-800 mb-1">เสียงของแต่ละ event</div>
            <div className="text-[10px] text-slate-500 mb-3">แตะเพื่อเปลี่ยนเสียง · แตะ ▶️ เพื่อฟัง</div>
            <div className="space-y-2" key={version}>
              {EVENTS.map(ev => {
                const current = getSoundPreset(ev.type);
                const preset = PRESETS.find(p => p.name === current);
                return (
                  <div key={ev.type} className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 hover:bg-slate-50">
                    <button
                      onClick={() => previewEvent(ev.type)}
                      className="w-9 h-9 shrink-0 rounded-full bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-500"
                      aria-label="preview"
                    >
                      <Play className="w-4 h-4 ml-0.5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 text-sm">{ev.emoji} {ev.label}</div>
                      <div className="text-[11px] text-slate-500 truncate">{preset?.label || current}</div>
                    </div>
                    <button
                      onClick={() => setPickerFor(ev.type)}
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50"
                    >
                      เปลี่ยน <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-slate-800">เตือนก่อนถึงเวลา</div>
              <div className="text-sm font-bold text-blue-500">{reminderMinutes} นาที</div>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={reminderMinutes}
              onChange={e => handleReminderChange(parseInt(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>0</span>
              <span>15</span>
              <span>30</span>
            </div>
          </div>
        </div>
      </div>

      {pickerFor && (
        <SoundPicker
          eventType={pickerFor}
          currentPreset={getSoundPreset(pickerFor)}
          onPick={(preset) => pickPreset(pickerFor, preset)}
          onClose={() => setPickerFor(null)}
        />
      )}
    </div>
  );
};

const SoundPicker: React.FC<{
  eventType: SoundType;
  currentPreset: SoundPreset;
  onPick: (p: SoundPreset) => void;
  onClose: () => void;
}> = ({ eventType, currentPreset, onPick, onClose }) => {
  const [selected, setSelected] = useState<SoundPreset>(currentPreset);
  const ev = EVENTS.find(e => e.type === eventType)!;

  const handlePick = (p: SoundPreset) => {
    setSelected(p);
    onPick(p);
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <div className="text-xs text-slate-500">เลือกเสียงสำหรับ</div>
            <div className="font-bold text-slate-800">{ev.emoji} {ev.label}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-3 overflow-y-auto space-y-1.5">
          {PRESETS.map(p => (
            <button
              key={p.name}
              onClick={() => handlePick(p.name)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                selected === p.name
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="flex-1 text-left text-sm font-medium text-slate-800">{p.label}</span>
              {selected === p.name && <Check className="w-4 h-4 text-blue-500" />}
            </button>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm"
          >
            เสร็จ
          </button>
        </div>
      </div>
    </div>
  );
};

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${checked ? 'bg-blue-500' : 'bg-slate-300'}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

export default NotificationSettings;
