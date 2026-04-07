import React from 'react';
import { useEditor } from '@tiptap/react';
import {
  Bold, Italic, Heading1, Heading2, List, ListOrdered,
  Quote, Undo2, Redo2, Camera, Film, Headphones, Link2,
} from 'lucide-react';

interface DiaryToolbarProps {
  editor: ReturnType<typeof useEditor>;
  onAddAttachment: (type: 'photo' | 'video' | 'audio') => void;
  onInsertLink: () => void;
}

/** Rich text formatting toolbar for TipTap editor */
const DiaryToolbar: React.FC<DiaryToolbarProps> = ({ editor, onAddAttachment, onInsertLink }) => {
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
        {mediaBtn(() => onAddAttachment('photo'), <Camera className="w-4 h-4" />, 'เพิ่มรูปภาพ')}
        {mediaBtn(() => onAddAttachment('video'), <Film className="w-4 h-4" />, 'เพิ่มวิดีโอ')}
        {mediaBtn(() => onAddAttachment('audio'), <Headphones className="w-4 h-4" />, 'เพิ่มเสียง/เพลง')}
        {mediaBtn(onInsertLink, <Link2 className="w-4 h-4" />, 'แทรกลิงค์')}
      </div>
    </div>
  );
};

export default DiaryToolbar;
