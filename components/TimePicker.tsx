import React from 'react';

interface TimePickerProps {
  value: string; // HH:mm format (e.g., "14:30")
  onChange: (value: string) => void;
  className?: string;
  label?: string;
  compact?: boolean;
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, className = '', label, compact }) => {
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
      <div className={`flex ${compact ? 'gap-0.5' : 'gap-2'}`}>
        {/* Hour Dropdown */}
        <select
          value={hour || '00'}
          onChange={(e) => handleHourChange(e.target.value)}
          className={`min-w-0 bg-slate-50 border border-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
            compact ? 'w-12 px-1 py-1 text-[10px] rounded-lg' : 'flex-1 px-2 py-2 text-xs rounded-xl'
          }`}
        >
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}{compact ? '' : ' น.'}
            </option>
          ))}
        </select>

        <span className={`text-slate-400 font-bold self-center ${compact ? 'text-[10px]' : 'text-sm'}`}>:</span>

        {/* Minute Dropdown */}
        <select
          value={minute || '00'}
          onChange={(e) => handleMinuteChange(e.target.value)}
          className={`min-w-0 bg-slate-50 border border-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
            compact ? 'w-12 px-1 py-1 text-[10px] rounded-lg' : 'flex-1 px-2 py-2 text-xs rounded-xl'
          }`}
        >
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m}{compact ? '' : ' ม.'}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default TimePicker;
