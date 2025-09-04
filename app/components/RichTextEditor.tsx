"use client";

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { 
  FiBold, 
  FiItalic, 
  FiUnderline,
  FiList,
  FiLink,
  FiType,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight,
  FiCode
} from 'react-icons/fi';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  darkMode: boolean;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  darkMode,
  placeholder = "Start writing your document..."
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none ${
          darkMode ? 'text-gray-100' : 'text-gray-900'
        }`,
      },
    },
  });

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ onClick, isActive, children, title }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-all duration-200 ${
        isActive
          ? darkMode
            ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-400/30'
            : 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
          : darkMode
            ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
      title={title}
      type="button"
    >
      {children}
    </button>
  );

  return (
    <div className={`h-full flex flex-col border rounded-lg overflow-hidden ${
      darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
    }`}>
      {/* Toolbar */}
      <div className={`flex flex-wrap items-center gap-1 p-3 border-b ${
        darkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50/50'
      }`}>
        <div className="flex items-center gap-1 mr-3">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold"
          >
            <FiBold size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic"
          >
            <FiItalic size={16} />
          </ToolbarButton>
        </div>

        <div className={`w-px h-6 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />

        <div className="flex items-center gap-1 mx-3">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <span className="text-sm font-bold">H1</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <span className="text-sm font-bold">H2</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <span className="text-sm font-bold">H3</span>
          </ToolbarButton>
        </div>

        <div className={`w-px h-6 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />

        <div className="flex items-center gap-1 mx-3">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <FiList size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <span className="text-sm font-bold">1.</span>
          </ToolbarButton>
        </div>

        <div className={`w-px h-6 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />

        <div className="flex items-center gap-1 mx-3">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <FiCode size={16} />
          </ToolbarButton>
        </div>

        <div className={`w-px h-6 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />

        <div className="flex items-center gap-1 ml-3">
          <ToolbarButton
            onClick={() => {
              const url = window.prompt('URL');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            isActive={editor.isActive('link')}
            title="Add Link"
          >
            <FiLink size={16} />
          </ToolbarButton>
        </div>
      </div>

      {/* Editor Content */}
      <div className={`flex-1 overflow-auto p-4 ${
        darkMode ? 'bg-gray-900/50' : 'bg-white'
      }`}>
        <EditorContent 
          editor={editor} 
          className="h-full"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
};

export default RichTextEditor;