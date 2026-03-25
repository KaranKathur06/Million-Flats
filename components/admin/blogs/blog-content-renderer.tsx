'use client'

import React from 'react'

// ─── Types ──────────────────────────────────────────
interface TiptapNode {
  type: string
  content?: TiptapNode[]
  text?: string
  attrs?: Record<string, any>
  marks?: TiptapMark[]
}

interface TiptapMark {
  type: string
  attrs?: Record<string, any>
}

interface BlogContentRendererProps {
  content: TiptapNode | null | undefined
  className?: string
}

// ─── Mark Renderer ──────────────────────────────────
function renderMarks(text: string, marks?: TiptapMark[]): React.ReactNode {
  if (!marks || marks.length === 0) return text

  return marks.reduce<React.ReactNode>((acc, mark) => {
    switch (mark.type) {
      case 'bold':
        return <strong>{acc}</strong>
      case 'italic':
        return <em>{acc}</em>
      case 'strike':
        return <s>{acc}</s>
      case 'code':
        return (
          <code className="bg-gray-100 text-gray-800 rounded px-1.5 py-0.5 text-sm font-mono">
            {acc}
          </code>
        )
      case 'link':
        return (
          <a
            href={mark.attrs?.href || '#'}
            target={mark.attrs?.target || '_blank'}
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline transition-colors"
          >
            {acc}
          </a>
        )
      case 'highlight':
        return (
          <mark
            className="bg-yellow-100 text-yellow-900 rounded px-0.5"
            style={mark.attrs?.color ? { backgroundColor: mark.attrs.color } : undefined}
          >
            {acc}
          </mark>
        )
      default:
        return acc
    }
  }, text)
}

// ─── Node Renderer ──────────────────────────────────
function renderNode(node: TiptapNode, index: number): React.ReactNode {
  const key = `${node.type}-${index}`

  // Text node
  if (node.type === 'text') {
    return (
      <React.Fragment key={key}>
        {renderMarks(node.text || '', node.marks)}
      </React.Fragment>
    )
  }

  // Children
  const children = node.content?.map((child, i) => renderNode(child, i)) || null
  const textAlign = node.attrs?.textAlign

  const alignStyle: React.CSSProperties = textAlign
    ? { textAlign: textAlign as any }
    : {}

  switch (node.type) {
    case 'doc':
      return <>{children}</>

    case 'paragraph':
      return (
        <p key={key} className="my-3 text-gray-700 leading-relaxed" style={alignStyle}>
          {children || <br />}
        </p>
      )

    case 'heading': {
      const level = node.attrs?.level || 2
      const headingClasses: Record<number, string> = {
        1: 'text-3xl sm:text-4xl font-bold text-gray-900 mt-8 mb-4',
        2: 'text-2xl sm:text-3xl font-bold text-gray-900 mt-7 mb-3',
        3: 'text-xl sm:text-2xl font-semibold text-gray-900 mt-6 mb-3',
        4: 'text-lg sm:text-xl font-semibold text-gray-800 mt-5 mb-2',
      }
      const Tag = `h${level}` as keyof JSX.IntrinsicElements
      return (
        <Tag key={key} className={headingClasses[level] || headingClasses[2]} style={alignStyle}>
          {children}
        </Tag>
      )
    }

    case 'bulletList':
      return (
        <ul key={key} className="my-4 pl-6 space-y-1.5 list-disc text-gray-700">
          {children}
        </ul>
      )

    case 'orderedList':
      return (
        <ol key={key} className="my-4 pl-6 space-y-1.5 list-decimal text-gray-700" start={node.attrs?.start || 1}>
          {children}
        </ol>
      )

    case 'listItem':
      return (
        <li key={key} className="leading-relaxed">
          {children}
        </li>
      )

    case 'blockquote':
      return (
        <blockquote key={key} className="my-6 border-l-4 border-blue-500 pl-5 py-1 italic text-gray-600 bg-blue-50/50 rounded-r-lg">
          {children}
        </blockquote>
      )

    case 'codeBlock':
      return (
        <pre key={key} className="my-5 bg-gray-900 text-gray-100 rounded-xl p-5 overflow-x-auto text-sm font-mono">
          <code>{children}</code>
        </pre>
      )

    case 'horizontalRule':
      return <hr key={key} className="my-8 border-t border-gray-200" />

    case 'hardBreak':
      return <br key={key} />

    case 'image':
      return (
        <figure key={key} className="my-6">
          <img
            src={node.attrs?.src || ''}
            alt={node.attrs?.alt || ''}
            title={node.attrs?.title || undefined}
            loading="lazy"
            className="w-full rounded-xl shadow-sm"
          />
          {node.attrs?.alt && (
            <figcaption className="text-center text-sm text-gray-500 mt-2">
              {node.attrs.alt}
            </figcaption>
          )}
        </figure>
      )

    case 'table':
      return (
        <div key={key} className="my-6 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full border-collapse">
            {children}
          </table>
        </div>
      )

    case 'tableRow':
      return <tr key={key} className="border-b border-gray-200 last:border-b-0">{children}</tr>

    case 'tableHeader':
      return (
        <th key={key} className="px-4 py-3 text-left text-sm font-semibold text-gray-900 bg-gray-50 border-r border-gray-200 last:border-r-0"
          colSpan={node.attrs?.colspan || undefined}
          rowSpan={node.attrs?.rowspan || undefined}
        >
          {children}
        </th>
      )

    case 'tableCell':
      return (
        <td key={key} className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 last:border-r-0"
          colSpan={node.attrs?.colspan || undefined}
          rowSpan={node.attrs?.rowspan || undefined}
        >
          {children}
        </td>
      )

    // Custom blocks
    case 'ctaBlock':
      return (
        <div key={key} className="my-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 text-center shadow-lg">
          {children}
        </div>
      )

    case 'highlightBlock':
      return (
        <div key={key} className="my-6 rounded-xl border-l-4 border-amber-400 bg-amber-50 p-5 text-gray-800">
          {children}
        </div>
      )

    default:
      // Fallback for unknown nodes
      if (children) return <div key={key}>{children}</div>
      return null
  }
}

// ─── Main Component ──────────────────────────────────
export function BlogContentRenderer({ content, className = '' }: BlogContentRendererProps) {
  if (!content) {
    return (
      <div className="text-gray-400 text-center py-12">
        <p className="text-lg">No content available</p>
      </div>
    )
  }

  return (
    <article className={`blog-content max-w-none ${className}`}>
      {renderNode(content, 0)}
    </article>
  )
}
