import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'

interface TiptapEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

export const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content,
  onChange,
  placeholder = 'Start writing your blog content here...',
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-amber-400 underline hover:text-amber-300',
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          'prose prose-invert prose-sm sm:prose-base max-w-none p-5 focus:outline-none min-h-[500px] text-white/85',
        placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) return null

  const ToolbarButton = ({
    onClick,
    isActive,
    title,
    children,
  }: {
    onClick: () => void
    isActive?: boolean
    title: string
    children: React.ReactNode
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
        isActive
          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
          : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80 border border-transparent'
      }`}
      title={title}
    >
      {children}
    </button>
  )

  const ToolbarDivider = () => (
    <div className="w-px h-5 bg-white/[0.08] mx-0.5" />
  )

  return (
    <div className="rounded-xl border border-white/[0.08] overflow-hidden">
      {/* Toolbar */}
      <div className="bg-white/[0.03] border-b border-white/[0.06] px-3 py-2 flex flex-wrap items-center gap-0.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <strong>B</strong>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <em>I</em>
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          H2
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          H3
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor.chain().focus().insertContent('<hr>').run()}
          title="Horizontal Line"
        >
          HR
        </ToolbarButton>

        <ToolbarButton
          onClick={() => {
            if (editor.isActive('link')) {
              editor.chain().focus().unsetLink().run()
            } else {
              const url = prompt('Enter URL:')
              if (url) editor.chain().focus().setLink({ href: url }).run()
            }
          }}
          isActive={editor.isActive('link')}
          title="Link"
        >
          🔗
        </ToolbarButton>

        <ToolbarButton
          onClick={() => {
            const url = prompt('Enter image URL:')
            if (url) editor.chain().focus().insertContent(`<img src="${url}" alt="" />`).run()
          }}
          title="Image"
        >
          🖼️
        </ToolbarButton>

        <ToolbarButton
          onClick={() => {
            editor.chain().focus().insertContent('<table><tbody><tr><td>Cell 1</td><td>Cell 2</td></tr><tr><td>Cell 3</td><td>Cell 4</td></tr></tbody></table>').run()
          }}
          title="Table"
        >
          Table
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Blockquote"
        >
          &quot;
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          • List
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Ordered List"
        >
          1.
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          ↩️
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          ↪️
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <div className="bg-white/[0.02]">
        <EditorContent editor={editor} />
      </div>

      {/* Word count */}
      <div className="bg-white/[0.03] border-t border-white/[0.06] px-4 py-2 flex justify-between text-xs text-white/40">
        <div className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Words: <span className="text-white/60 font-medium">{content.trim().split(/\s+/).filter(Boolean).length}</span>
        </div>
        <div>
          Characters: <span className="text-white/60 font-medium">{content.length}</span>
        </div>
      </div>
    </div>
  )
}