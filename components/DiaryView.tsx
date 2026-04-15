import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DiaryEntry, DiaryAttachment } from '../types';
import { saveDiaryEntry, deleteDiaryEntry, subscribeDiaryEntries } from '../lib/firestoreDB';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Plus, X, ArrowLeft, Bold, Italic, Heading1, Heading2, List, ListOrdered,
  Quote, Undo2, Redo2, Hash, Pin, PinOff, Trash2, Edit3, Calendar,
  ImageIcon, Search, Check, Camera, Video, Music, Link2, Play, Pause,
  FileImage, Film, Headphones,
} from 'lucide-react';

interface DiaryViewProps {
  userId: string;
  searchQuery?: string;
}

// ===== Toolbar =====
const DiaryToolbar: React.FC<{
  editor: ReturnType<typeof useEditor>;
  onAddAttachment: (type: 'photo' | 'video' | 'audio') => void;
  onInsertLink: () => void;
}> = ({ editor, onAddAttachment, onInsertLink }) => {
  if (!editor) return null;
  const btn = (active: boolean, onClick: () => void, icon: React.ReactNode, title?: string) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
    >
      {icon}
    </button>
  );

  const mediaBtn = (onClick: () => void, icon: React.ReactNode, title: string) => (
    <button onClick={onClick} title={title} className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
      {icon}
    </button>
  );

  return (
    <div className="border-b border-slate-100 bg-white sticky top-0 z-10">
      {/* Text formatting */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 flex-wrap">
        {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <Bold className="w-4 h-4" />, 'Bold')}
        {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <Italic className="w-4 h-4" />, 'Italic')}
        {btn(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), <Heading1 className="w-4 h-4" />, 'Heading 1')}
        {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 className="w-4 h-4" />, 'Heading 2')}
        <div className="w-px h-5 bg-slate-200 mx-1" />
        {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), <List className="w-4 h-4" />, 'Bullet List')}
        {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="w-4 h-4" />, 'Ordered List')}
        {btn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), <Quote className="w-4 h-4" />, 'Quote')}
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30" title="Undo"><Undo2 className="w-4 h-4" /></button>
        <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30" title="Redo"><Redo2 className="w-4 h-4" /></button>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        {/* Media & Link */}
        {mediaBtn(() => onAddAttachment('photo'), <Camera className="w-4 h-4" />, 'เพิ่มรูปภาพ')}
        {mediaBtn(() => onAddAttachment('video'), <Film className="w-4 h-4" />, 'เพิ่มวิดีโอ')}
        {mediaBtn(() => onAddAttachment('audio'), <Headphones className="w-4 h-4" />, 'เพิ่มเสียง/เพลง')}
        {mediaBtn(onInsertLink, <Link2 className="w-4 h-4" />, 'แทรกลิงค์')}
      </div>
    </div>
  );
};

// ===== Hashtag Input =====
const HashtagInput: React.FC<{
  hashtags: string[];
  allTags: string[];
  onChange: (tags: string[]) => void;
}> = ({ hashtags, allTags, onChange }) => {
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

// ===== Entry Editor =====
const DiaryEntryEditor: React.FC<{
  entry?: DiaryEntry;
  allTags: string[];
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}> = ({ entry, allTags, userId, onClose, onSaved }) => {
  const isEdit = !!entry;
  const [title, setTitle] = useState(entry?.title || '');
  const [date, setDate] = useState(entry?.date || new Date().toISOString().slice(0, 10));
  const [hashtags, setHashtags] = useState<string[]>(entry?.hashtags || []);
  const [mood, setMood] = useState(entry?.mood || '');
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<DiaryAttachment[]>(entry?.attachments || []);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileAccept, setFileAccept] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'เขียนเรื่องราวของคุณ...' }),
    ],
    content: entry?.content ? JSON.parse(entry.content) : undefined,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none px-4 py-3 min-h-[200px] outline-none text-slate-700',
      },
    },
  });

  const handleAddAttachment = (type: 'photo' | 'video' | 'audio') => {
    const acceptMap = { photo: 'image/*', video: 'video/*', audio: 'audio/*' };
    setFileAccept(acceptMap[type]);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const type = file.type.startsWith('image') ? 'photo' : file.type.startsWith('video') ? 'video' : 'audio';
      const url = URL.createObjectURL(file);
      const att: DiaryAttachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        fileName: file.name,
        downloadUrl: url,
        mimeType: file.type,
        sizeBytes: file.size,
      };
      setAttachments(prev => [...prev, att]);
    });
    e.target.value = '';
  };

  const removeAttachment = (id: string) => setAttachments(prev => prev.filter(a => a.id !== id));

  const handleInsertLink = () => {
    if (!editor || !linkUrl.trim()) return;
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
    editor.chain().focus().insertContent(`<a href="${url}" target="_blank">${linkUrl}</a> `).run();
    setLinkUrl('');
    setShowLinkInput(false);
  };

  const handleSave = async (status: 'draft' | 'published') => {
    if (!editor) return;
    setSaving(true);
    const now = new Date().toISOString();
    const json = editor.getJSON();
    const plainText = editor.getText().slice(0, 500);

    const diaryEntry: Record<string, any> = {
      id: entry?.id || `diary-${Date.now()}`,
      title: title.trim() || 'Untitled',
      content: JSON.stringify(json),
      contentPlainText: plainText,
      hashtags: hashtags.length > 0 ? hashtags : [],
      attachments: [],  // TODO: Firebase Storage for media (Phase 3)
      date,
      status,
      pinned: entry?.pinned || false,
      createdAt: entry?.createdAt || now,
      updatedAt: now,
    };
    if (mood) diaryEntry.mood = mood;

    try {
      await saveDiaryEntry(userId, diaryEntry as DiaryEntry);
    } catch (err) {
      console.error('[Diary] Save error:', err);
      alert('บันทึกไม่สำเร็จ: ' + (err as Error).message);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  const MOODS = ['😊', '😢', '😤', '🤔', '😴', '🥳', '💪', '❤️', '🔥', '✨'];

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col safe-top safe-bottom">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 shrink-0">
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
        <h2 className="text-base font-black text-slate-800 flex-1">{isEdit ? 'แก้ไข' : 'เขียน Diary'}</h2>
        <button
          onClick={() => handleSave('draft')}
          disabled={saving}
          className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200"
        >
          Draft
        </button>
        <button
          onClick={() => handleSave('published')}
          disabled={saving}
          className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-500 rounded-xl hover:bg-indigo-600"
        >
          {saving ? '...' : 'Publish'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Title */}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="หัวข้อ..."
          className="w-full px-4 py-3 text-xl font-black text-slate-800 outline-none placeholder:text-slate-300 border-b border-slate-50"
        />

        {/* Date + Mood */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-50">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-xs text-slate-500 outline-none bg-transparent" />
          <div className="flex-1" />
          <div className="flex gap-1">
            {MOODS.map(m => (
              <button key={m} onClick={() => setMood(mood === m ? '' : m)} className={`text-base p-0.5 rounded transition-all ${mood === m ? 'scale-125 bg-indigo-100' : 'opacity-40 hover:opacity-100'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <DiaryToolbar editor={editor} onAddAttachment={handleAddAttachment} onInsertLink={() => setShowLinkInput(!showLinkInput)} />
        <input ref={fileInputRef} type="file" accept={fileAccept} multiple onChange={handleFileSelected} className="hidden" />

        {/* Link Input */}
        {showLinkInput && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-100">
            <Link2 className="w-4 h-4 text-blue-400" />
            <input
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleInsertLink(); }}
              placeholder="วาง URL ที่นี่..."
              className="flex-1 bg-transparent text-sm text-blue-700 outline-none placeholder:text-blue-300"
              autoFocus
            />
            <button onClick={handleInsertLink} className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600">แทรก</button>
            <button onClick={() => setShowLinkInput(false)}><X className="w-4 h-4 text-blue-400" /></button>
          </div>
        )}

        {/* Editor */}
        <EditorContent editor={editor} />

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ไฟล์แนบ ({attachments.length})</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {attachments.map(att => (
                <div key={att.id} className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
                  {att.type === 'photo' ? (
                    <img src={att.downloadUrl} alt={att.fileName} className="w-full h-24 object-cover" />
                  ) : att.type === 'video' ? (
                    <div className="w-full h-24 flex flex-col items-center justify-center bg-slate-100">
                      <Film className="w-6 h-6 text-slate-400" />
                      <span className="text-[9px] text-slate-400 mt-1 truncate max-w-full px-1">{att.fileName}</span>
                    </div>
                  ) : (
                    <div className="w-full h-24 flex flex-col items-center justify-center bg-purple-50">
                      <Headphones className="w-6 h-6 text-purple-400" />
                      <span className="text-[9px] text-purple-400 mt-1 truncate max-w-full px-1">{att.fileName}</span>
                    </div>
                  )}
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hashtags */}
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Hashtags</span>
          </div>
          <HashtagInput hashtags={hashtags} allTags={allTags} onChange={setHashtags} />
        </div>
      </div>
    </div>
  );
};

// ===== Detail View (Popup) =====
const DiaryDetailView: React.FC<{
  entry: DiaryEntry;
  onClose: () => void;
  onEdit: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}> = ({ entry, onClose, onEdit, onTogglePin, onDelete }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: entry.content ? JSON.parse(entry.content) : undefined,
    editable: false,
    editorProps: {
      attributes: { class: 'prose prose-sm max-w-none px-0 py-0 outline-none text-slate-700' },
    },
  });

  const coverImage = entry.attachments.find(a => a.type === 'photo' && a.downloadUrl && a.downloadUrl.length > 1);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Cover or Header */}
        {coverImage ? (
          <div className="relative w-full h-48 shrink-0">
            <img src={coverImage.downloadUrl} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50">
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-center gap-2 mb-1">
                {entry.mood && <span className="text-2xl drop-shadow-md">{entry.mood}</span>}
                {entry.pinned && <Pin className="w-4 h-4 text-white/80" />}
                {entry.status === 'draft' && <span className="text-[10px] font-bold bg-amber-400/80 text-white px-2 py-0.5 rounded-full">Draft</span>}
              </div>
              <h2 className="text-xl font-black text-white drop-shadow-md">{entry.title}</h2>
              <p className="text-xs text-white/70 mt-1">{entry.date}</p>
            </div>
          </div>
        ) : (
          <div className="px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-start gap-3">
              {entry.mood && <span className="text-2xl">{entry.mood}</span>}
              <div className="flex-1">
                <h2 className="text-lg font-black text-slate-800">{entry.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400">{entry.date}</span>
                  {entry.status === 'draft' && <span className="text-[9px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">Draft</span>}
                  {entry.pinned && <Pin className="w-3 h-3 text-indigo-400" />}
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {editor && <EditorContent editor={editor} />}

          {/* Hashtags */}
          {entry.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-slate-100">
              {entry.hashtags.map(tag => (
                <span key={tag} className="text-xs font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full">#{tag}</span>
              ))}
            </div>
          )}

          {/* Attachments info */}
          {entry.attachments.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{entry.attachments.length} ไฟล์แนบ</span>
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="flex border-t border-slate-100 divide-x divide-slate-100 shrink-0">
          <button onClick={() => { onTogglePin(); onClose(); }} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors">
            {entry.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            {entry.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button onClick={() => { onClose(); setTimeout(onEdit, 100); }} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-indigo-500 hover:bg-indigo-50 transition-colors">
            <Edit3 className="w-4 h-4" /> แก้ไข
          </button>
          <button onClick={() => { if (confirm('ลบ diary นี้?')) { onDelete(); onClose(); } }} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-rose-500 hover:bg-rose-50 transition-colors">
            <Trash2 className="w-4 h-4" /> ลบ
          </button>
        </div>
      </div>
    </div>
  );
};

// ===== Entry Card =====
const DiaryEntryCard: React.FC<{
  entry: DiaryEntry;
  onView: () => void;
  onEdit: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}> = ({ entry, onView, onEdit, onTogglePin, onDelete }) => {
  const [showActions, setShowActions] = useState(false);

  const coverImage = entry.attachments.find(a => a.type === 'photo' && a.downloadUrl && a.downloadUrl.length > 1);
  const otherAttachments = entry.attachments.filter(a => a !== coverImage && a.downloadUrl && a.downloadUrl.length > 1);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={onView}>
      {/* Cover Image */}
      {coverImage && (
        <div className="relative w-full h-44 overflow-hidden">
          <img src={coverImage.downloadUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          {/* Title overlay on cover */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-end gap-2">
              {entry.mood && <span className="text-xl drop-shadow-md">{entry.mood}</span>}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-white drop-shadow-md truncate">{entry.title}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-white/80">{entry.date}</span>
                  {entry.status === 'draft' && <span className="text-[9px] font-bold bg-amber-400/80 text-white px-1.5 py-0.5 rounded-full">Draft</span>}
                  {entry.pinned && <Pin className="w-3 h-3 text-white/80" />}
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); setShowActions(!showActions); }} className="p-1.5 hover:bg-white/20 rounded-lg">
                <Edit3 className="w-3.5 h-3.5 text-white/80" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Header — only when no cover image */}
        {!coverImage && (
          <div className="flex items-start gap-2 mb-2">
            {entry.mood && <span className="text-lg">{entry.mood}</span>}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-slate-800 truncate">{entry.title}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-slate-400">{entry.date}</span>
                {entry.status === 'draft' && <span className="text-[9px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">Draft</span>}
                {entry.pinned && <Pin className="w-3 h-3 text-indigo-400" />}
              </div>
            </div>
            <button onClick={e => { e.stopPropagation(); setShowActions(!showActions); }} className="p-1.5 hover:bg-slate-100 rounded-lg">
              <Edit3 className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        )}

        {/* Preview */}
        {entry.contentPlainText && (
          <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-2">{entry.contentPlainText}</p>
        )}

        {/* Media thumbnails (remaining, excluding cover) */}
        {otherAttachments.length > 0 && (
          <div className="flex gap-1.5 mb-2 overflow-x-auto">
            {otherAttachments.slice(0, 4).map(att => (
              <div key={att.id} className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                {att.type === 'photo' && att.downloadUrl ? (
                  <img src={att.downloadUrl} alt="" className="w-full h-full object-cover" />
                ) : att.type === 'video' ? (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center"><Film className="w-4 h-4 text-slate-400" /></div>
                ) : (
                  <div className="w-full h-full bg-purple-50 flex items-center justify-center"><Headphones className="w-4 h-4 text-purple-400" /></div>
                )}
              </div>
            ))}
            {otherAttachments.length > 4 && (
              <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400">+{otherAttachments.length - 4}</span>
              </div>
            )}
          </div>
        )}

        {/* Hashtags */}
        {entry.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.hashtags.map(tag => (
              <span key={tag} className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Actions dropdown */}
      {showActions && (
        <div className="flex border-t border-slate-100 divide-x divide-slate-100">
          <button onClick={e => { e.stopPropagation(); onTogglePin(); setShowActions(false); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-slate-500 hover:bg-slate-50">
            {entry.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            {entry.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button onClick={e => { e.stopPropagation(); onEdit(); setShowActions(false); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-indigo-500 hover:bg-indigo-50">
            <Edit3 className="w-3.5 h-3.5" /> แก้ไข
          </button>
          <button onClick={e => { e.stopPropagation(); if (confirm('ลบ diary นี้?')) onDelete(); setShowActions(false); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-rose-500 hover:bg-rose-50">
            <Trash2 className="w-3.5 h-3.5" /> ลบ
          </button>
        </div>
      )}
    </div>
  );
};

// ===== Main View =====
const DiaryView: React.FC<DiaryViewProps> = ({ userId, searchQuery = '' }) => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editEntry, setEditEntry] = useState<DiaryEntry | undefined>();
  const [viewEntry, setViewEntry] = useState<DiaryEntry | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);

  // Subscribe to diary entries
  useEffect(() => {
    const unsub = subscribeDiaryEntries(userId, setEntries, 100);
    return unsub;
  }, [userId]);

  // All unique hashtags
  const allTags = [...new Set(entries.flatMap(e => e.hashtags))].sort();

  // Filter
  let filtered = entries;
  if (filterTag) filtered = filtered.filter(e => e.hashtags.includes(filterTag));
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(e => e.title.toLowerCase().includes(q) || e.contentPlainText.toLowerCase().includes(q) || e.hashtags.some(t => t.includes(q)));
  }

  // Sort: pinned first, then by createdAt desc
  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  // Group by date
  const grouped = sorted.reduce<Record<string, DiaryEntry[]>>((acc, e) => {
    (acc[e.date] = acc[e.date] || []).push(e);
    return acc;
  }, {});

  const handleTogglePin = async (entry: DiaryEntry) => {
    await saveDiaryEntry(userId, { ...entry, pinned: !entry.pinned, updatedAt: new Date().toISOString() });
  };

  const handleDelete = async (entryId: string) => {
    await deleteDiaryEntry(userId, entryId);
  };

  const openEditor = (entry?: DiaryEntry) => {
    setEditEntry(entry);
    setShowEditor(true);
  };

  return (
    <div className="animate-fadeIn w-full min-h-full bg-slate-50 pb-20">
      {/* Hashtag filters */}
      {allTags.length > 0 && (
        <div className="px-4 pt-2 pb-1 max-w-lg mx-auto">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setFilterTag(null)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${!filterTag ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${filterTag === tag ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-4 max-w-lg mx-auto">
        {sorted.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl mb-4 block">📝</span>
            <p className="text-slate-400 font-bold text-base">ยังไม่มี Diary</p>
            <p className="text-sm text-slate-300 mt-1">กดปุ่ม + เพื่อเริ่มเขียน</p>
            <button onClick={() => openEditor()} className="mt-4 px-6 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-all">
              เขียน Diary แรก
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            {Object.entries(grouped).map(([date, dateEntries]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{date}</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="space-y-3">
                  {dateEntries.map(entry => (
                    <DiaryEntryCard
                      key={entry.id}
                      entry={entry}
                      onView={() => setViewEntry(entry)}
                      onEdit={() => openEditor(entry)}
                      onTogglePin={() => handleTogglePin(entry)}
                      onDelete={() => handleDelete(entry.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail View Popup */}
      {viewEntry && (
        <DiaryDetailView
          entry={viewEntry}
          onClose={() => setViewEntry(null)}
          onEdit={() => { setViewEntry(null); openEditor(viewEntry); }}
          onTogglePin={() => handleTogglePin(viewEntry)}
          onDelete={() => { handleDelete(viewEntry.id); setViewEntry(null); }}
        />
      )}

      {/* FAB */}
      <button
        onClick={() => openEditor()}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white rounded-full shadow-xl shadow-purple-300 flex items-center justify-center active:scale-90 transition-all hover:shadow-2xl lg:bottom-8 lg:right-8"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Editor */}
      {showEditor && (
        <DiaryEntryEditor
          entry={editEntry}
          allTags={allTags}
          userId={userId}
          onClose={() => { setShowEditor(false); setEditEntry(undefined); }}
          onSaved={() => {}}
        />
      )}
    </div>
  );
};

export default DiaryView;
