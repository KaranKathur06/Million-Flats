'use client'

import React, { useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import DOMPurify from 'dompurify'


interface TiptapEditorProps {
  content: string
  onChange: (html: string, json: any) => void
  placeholder?: string
}

export const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content,
  onChange,
  placeholder = 'Start writing your blog content here...',
}) => {
  const isInternalUpdate = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-amber-400 underline hover:text-amber-300',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse border border-white/20 w-full',
        },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-white/20 px-3 py-2 text-sm',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-white/20 px-3 py-2 text-sm font-bold bg-white/[0.06]',
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          'prose prose-invert prose-sm sm:prose-base max-w-none p-5 focus:outline-none min-h-[500px] text-white/85',
      },
      handlePaste: (view, event) => {
        const clipboardData = event.clipboardData
        if (!clipboardData) return false

        const html = clipboardData.getData('text/html')
        if (html) {
          event.preventDefault()
          const sanitized = DOMPurify.sanitize(html, {
            ALLOWED_TAGS: [
              'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
              'h1', 'h2', 'h3', 'h4',
              'ul', 'ol', 'li',
              'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
              'a', 'img', 'blockquote', 'code', 'pre', 'hr',
              'span', 'div', 'mark',
            ],
            ALLOWED_ATTR: [
              'href', 'src', 'alt', 'title', 'class', 'style',
              'target', 'rel', 'colspan', 'rowspan', 'width', 'height',
            ],
            ALLOW_DATA_ATTR: false,
          })

          if (sanitized.trim()) {
            editor?.commands.insertContent(sanitized)
            return true
          }
        }

        return false
      },
    },
    onUpdate: ({ editor: ed }) => {
      isInternalUpdate.current = true
      const html = ed.getHTML()
      const json = ed.getJSON()
      onChange(html, json)
    },
  })

  useEffect(() => {
    if (editor && !isInternalUpdate.current && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
    isInternalUpdate.current = false
  }, [content, editor])

  // ── Callbacks must be defined BEFORE any early return (Rules of Hooks) ──
  const addLink = useCallback(() => {
    if (!editor) return
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
    } else {
      const url = prompt('Enter URL:')
      if (url) editor.chain().focus().setLink({ href: url }).run()
    }
  }, [editor])

  const addImage = useCallback(() => {
    if (!editor) return
    const url = prompt('Enter image URL:')
    if (url) editor.chain().focus().setImage({ src: url, alt: '' }).run()
  }, [editor])

  const insertTable = useCallback(() => {
    if (!editor) return
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  if (!editor) return null

  const ToolbarButton = ({
    onClick,
    isActive,
    title,
    children,
    disabled,
  }: {
    onClick: () => void
    isActive?: boolean
    title: string
    children: React.ReactNode
    disabled?: boolean
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
        isActive
          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
          : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80 border border-transparent'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
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
        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <s>S</s>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive('highlight')}
          title="Highlight"
        >
          <span className="bg-yellow-400/40 px-0.5 rounded">H</span>
        </ToolbarButton>

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          H1
        </ToolbarButton>

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

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          isActive={editor.isActive('heading', { level: 4 })}
          title="Heading 4"
        >
          H4
        </ToolbarButton>

        <ToolbarDivider />

        {/* Text Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"/></svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm3 10.5a.75.75 0 01.75-.75h8.5a.75.75 0 010 1.5h-8.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"/></svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm6.5 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"/></svg>
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
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

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Blockquote"
        >
          &quot;
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Code Block"
        >
          {'</>'}
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Line"
        >
          HR
        </ToolbarButton>

        <ToolbarDivider />

        {/* Media and Links */}
        <ToolbarButton
          onClick={addLink}
          isActive={editor.isActive('link')}
          title="Link"
        >
          🔗
        </ToolbarButton>

        <ToolbarButton onClick={addImage} title="Image">
          🖼️
        </ToolbarButton>

        <ToolbarDivider />

        {/* Table controls */}
        <ToolbarButton onClick={insertTable} title="Insert Table (3×3)">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" /></svg>
        </ToolbarButton>

        {editor.isActive('table') && (
          <>
            <ToolbarButton
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              title="Add Column"
            >
              +Col
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().addRowAfter().run()}
              title="Add Row"
            >
              +Row
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().deleteColumn().run()}
              title="Delete Column"
            >
              -Col
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().deleteRow().run()}
              title="Delete Row"
            >
              -Row
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().deleteTable().run()}
              title="Delete Table"
            >
              ✕ Table
            </ToolbarButton>
          </>
        )}

        <ToolbarDivider />

        {/* Undo / Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          ↩️
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Shift+Z)"
        >
          ↪️
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <div className="bg-white/[0.02] tiptap-editor-content">
        <EditorContent editor={editor} />
      </div>

      {/* Word count */}
      <div className="bg-white/[0.03] border-t border-white/[0.06] px-4 py-2 flex justify-between text-xs text-white/40">
        <div className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Words: <span className="text-white/60 font-medium">{editor.storage.characterCount?.words?.() ?? editor.getText().trim().split(/\s+/).filter(Boolean).length}</span>
        </div>
        <div>
          Characters: <span className="text-white/60 font-medium">{editor.getText().length}</span>
        </div>
      </div>

      {/* TipTap Editor Styles */}
      <style jsx global>{`
        .tiptap-editor-content .ProseMirror {
          min-height: 500px;
          padding: 1.25rem;
        }
        .tiptap-editor-content .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: rgba(255,255,255,0.25);
          pointer-events: none;
          height: 0;
        }
        .tiptap-editor-content .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
          overflow: hidden;
        }
        .tiptap-editor-content .ProseMirror table td,
        .tiptap-editor-content .ProseMirror table th {
          border: 1px solid rgba(255,255,255,0.15);
          padding: 0.5rem 0.75rem;
          position: relative;
          vertical-align: top;
          min-width: 80px;
        }
        .tiptap-editor-content .ProseMirror table th {
          background: rgba(255,255,255,0.06);
          font-weight: 700;
        }
        .tiptap-editor-content .ProseMirror table .selectedCell::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(245,158,11,0.15);
          pointer-events: none;
        }
        .tiptap-editor-content .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        .tiptap-editor-content .ProseMirror blockquote {
          border-left: 3px solid rgba(245,158,11,0.5);
          padding-left: 1rem;
          margin-left: 0;
          font-style: italic;
          color: rgba(255,255,255,0.6);
        }
        .tiptap-editor-content .ProseMirror mark {
          background-color: rgba(250,204,21,0.3);
          border-radius: 2px;
          padding: 0.1em 0.2em;
        }
        .tiptap-editor-content .ProseMirror code {
          background: rgba(255,255,255,0.08);
          border-radius: 0.25rem;
          padding: 0.15em 0.3em;
          font-size: 0.9em;
          font-family: 'Fira Code', monospace;
        }
        .tiptap-editor-content .ProseMirror pre {
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 1rem 0;
          overflow-x: auto;
        }
        .tiptap-editor-content .ProseMirror pre code {
          background: none;
          padding: 0;
          border-radius: 0;
        }
        .tiptap-editor-content .ProseMirror hr {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.1);
          margin: 1.5rem 0;
        }
        .tiptap-editor-content .ProseMirror ul,
        .tiptap-editor-content .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .tiptap-editor-content .ProseMirror ul li {
          list-style-type: disc;
        }
        .tiptap-editor-content .ProseMirror ol li {
          list-style-type: decimal;
        }
        .tiptap-editor-content .ProseMirror h1 {
          font-size: 2em;
          font-weight: 700;
          margin: 1rem 0 0.5rem;
          line-height: 1.2;
        }
        .tiptap-editor-content .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: 700;
          margin: 1rem 0 0.5rem;
          line-height: 1.3;
        }
        .tiptap-editor-content .ProseMirror h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 0.75rem 0 0.5rem;
          line-height: 1.4;
        }
        .tiptap-editor-content .ProseMirror h4 {
          font-size: 1.1em;
          font-weight: 600;
          margin: 0.5rem 0 0.25rem;
          line-height: 1.4;
        }
        .tiptap-editor-content .ProseMirror a {
          color: #fbbf24;
          text-decoration: underline;
          cursor: pointer;
        }
        .tiptap-editor-content .ProseMirror a:hover {
          color: #fcd34d;
        }
        .tiptap-editor-content .ProseMirror .tableWrapper {
          overflow-x: auto;
          margin: 1rem 0;
        }
      `}</style>
    </div>
  )
}