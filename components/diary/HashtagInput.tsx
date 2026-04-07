import React, { useState } from 'react';
import { X } from 'lucide-react';

interface HashtagInputProps {
  hashtags: string[];
  allTags: string[];
  onChange: (tags: string[]) => void;
}

/** Hashtag input with autocomplete from existing tags */
const HashtagInput: React.FC<HashtagInputProps> = ({ hashtags, allTags, onChange }) => {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addTag = (tag: string) => {
    const clean = tag.toLowerCase().replace(/[^a-z0-9ก-๙]/g, '').trim();
    if (clean && !hashtags.includes(clean)) onChange([...hashtags, clean]);
    setInput('');
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => onChange(hashtags.filter(t => t !== tag));

  const suggestions = input.length > 0
    ? allTags.filter(t => t.includes(input.toLowerCase()) && !hashtags.includes(t)).slice(0, 5)
    : [];

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 min-h-[40px]">
        {hashtags.map(tag => (
          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
            #{tag}
            <button onClick={() => removeTag(tag)} className="hover:text-rose-500"><X className="w-3 h-3" /></button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addTag(input); } }}
          placeholder={hashtags.length === 0 ? "เพิ่ม #hashtag..." : ""}
          className="flex-1 min-w-[80px] bg-transparent text-xs outline-none text-slate-600 placeholder:text-slate-300"
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 z-20 overflow-hidden">
          {suggestions.map(s => (
            <button key={s} onClick={() => addTag(s)} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600">
              #{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default HashtagInput;
