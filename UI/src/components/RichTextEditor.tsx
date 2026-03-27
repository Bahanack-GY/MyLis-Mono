import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Heading2,
    List,
    ListOrdered,
    Link as LinkIcon,
    Undo2,
    Redo2,
} from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    minHeight?: string;
}

const RichTextEditor = ({ value, onChange, placeholder = '', minHeight = '80px' }: RichTextEditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2] },
            }),
            Underline,
            Link.configure({ openOnClick: false }),
            Placeholder.configure({ placeholder }),
        ],
        content: value || '',
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onChange(html === '<p></p>' ? '' : html);
        },
    });

    // Sync external value changes (e.g. form resets)
    useEffect(() => {
        if (!editor) return;
        const current = editor.getHTML();
        const normalized = value || '<p></p>';
        if (current !== normalized && current !== value) {
            editor.commands.setContent(value || '');
        }
    }, [value, editor]);

    if (!editor) return null;

    const btnClass = (active: boolean) =>
        `p-1.5 rounded-lg transition-colors ${active ? 'text-[#33cbcc] bg-[#33cbcc]/10' : 'text-gray-400 hover:text-[#33cbcc] hover:bg-gray-100'}`;

    const handleLink = () => {
        if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run();
            return;
        }
        const url = window.prompt('URL:');
        if (url) {
            editor.chain().focus().setLink({ href: url }).run();
        }
    };

    return (
        <div className="tiptap-editor w-full bg-white rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-[#33cbcc]/20 focus-within:border-[#33cbcc]/30 transition-all overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 flex-wrap">
                <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))}><Bold size={15} /></button>
                <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))}><Italic size={15} /></button>
                <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive('underline'))}><UnderlineIcon size={15} /></button>
                <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive('strike'))}><Strikethrough size={15} /></button>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive('heading', { level: 2 }))}><Heading2 size={15} /></button>
                <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))}><List size={15} /></button>
                <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))}><ListOrdered size={15} /></button>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <button type="button" onClick={handleLink} className={btnClass(editor.isActive('link'))}><LinkIcon size={15} /></button>
                <div className="flex-1" />
                <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={`p-1.5 rounded-lg transition-colors ${editor.can().undo() ? 'text-gray-400 hover:text-[#33cbcc] hover:bg-gray-100' : 'text-gray-200'}`}><Undo2 size={15} /></button>
                <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={`p-1.5 rounded-lg transition-colors ${editor.can().redo() ? 'text-gray-400 hover:text-[#33cbcc] hover:bg-gray-100' : 'text-gray-200'}`}><Redo2 size={15} /></button>
            </div>
            {/* Editor content */}
            <EditorContent editor={editor} className="px-4 py-2.5 text-sm text-gray-800" style={{ minHeight }} />
        </div>
    );
};

export default RichTextEditor;
