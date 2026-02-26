import React from 'react';

interface TimePickerProps {
  value: string; // HH:mm format (e.g., "14:30")
  onChange: (value: string) => void;
  className?: string;
  label?: string;
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, className = '', label }) => {
  const [hour, minute] = value.split(':');

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const handleHourChange = (newHour: string) => {
    onChange(`${newHour}:${minute || '00'}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(`${hour || '00'}:${newMinute}`);
  };

  return (
    <div className={className}>
      {label && (
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        {/* Hour Dropdown */}
        <select
          value={hour || '00'}
          onChange={(e) => handleHourChange(e.target.value)}
          className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {hours.map((h) => (
            <option key={h} value={h}>
              {h} น.
            </option>
          ))}
        </select>

        <span className="text-slate-400 font-bold text-sm self-center">:</span>

        {/* Minute Dropdown */}
        <select
          value={minute || '00'}
          onChange={(e) => handleMinuteChange(e.target.value)}
          className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m} ม.
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default TimePicker;
