import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

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
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl max-w-none p-4 focus:outline-none min-h-[500px]',
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

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 text-sm font-bold ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
          title="Bold"
        >
          B
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 text-sm italic ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
          title="Italic"
        >
          I
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-gray-200 text-sm font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`}
          title="Heading 2"
        >
          H2
        </button>

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 rounded hover:bg-gray-200 text-sm font-bold ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}`}
          title="Heading 3"
        >
          H3
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().insertContent('<hr>').run()}
          className="p-2 rounded hover:bg-gray-200 text-sm"
          title="Horizontal Line"
        >
          HR
        </button>

        <button
          onClick={() => {
            const url = prompt('Enter URL:')
            if (url) editor.chain().focus().setLink({ href: url }).run()
          }}
          className={`p-2 rounded hover:bg-gray-200 text-sm ${editor.isActive('link') ? 'bg-gray-200' : ''}`}
          title="Link"
        >
          🔗
        </button>

        <button
          onClick={() => {
            const url = prompt('Enter image URL:')
            if (url) editor.chain().focus().insertContent(`<img src="${url}" alt="" />`).run()
          }}
          className="p-2 rounded hover:bg-gray-200 text-sm"
          title="Image"
        >
          🖼️
        </button>

        <button
          onClick={() => {
            const html = editor.getHTML()
            // Simple table insertion for now
            editor.chain().focus().insertContent('<table><tbody><tr><td>Cell 1</td><td>Cell 2</td></tr><tr><td>Cell 3</td><td>Cell 4</td></tr></tbody></table>').run()
          }}
          className="p-2 rounded hover:bg-gray-200 text-sm"
          title="Table"
        >
          Table
        </button>

        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-200 text-sm ${editor.isActive('blockquote') ? 'bg-gray-200' : ''}`}
          title="Blockquote"
        >
          &quot;
        </button>

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 text-sm ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
          title="Bullet List"
        >
          List
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 text-sm ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
          title="Ordered List"
        >
          1.
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().undo().run()}
          className="p-2 rounded hover:bg-gray-200 text-sm"
          title="Undo"
        >
          ↩️
        </button>

        <button
          onClick={() => editor.chain().focus().redo().run()}
          className="p-2 rounded hover:bg-gray-200 text-sm"
          title="Redo"
        >
          ↪️
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Word count */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex justify-between text-sm text-gray-500">
        <div>
          Words: {content.trim().split(/\s+/).filter(Boolean).length}
        </div>
        <div>
          Characters: {content.length}
        </div>
      </div>
    </div>
  )
}