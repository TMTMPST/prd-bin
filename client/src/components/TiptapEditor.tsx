/**
 * TiptapEditor.tsx — WYSIWYG rich-text editor for PRD editing
 *
 * Uses Tiptap (built on ProseMirror) with a floating toolbar.
 * Accepts Markdown content, converts to HTML for editing,
 * and serializes back to Markdown on save via Turndown.
 */

import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Placeholder from '@tiptap/extension-placeholder'
import { common, createLowlight } from 'lowlight'
import TurndownService from 'turndown'
import { useEffect, useCallback, useMemo } from 'react'
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus, Link as LinkIcon, Undo2, Redo2,
  Table as TableIcon
} from 'lucide-react'

const lowlight = createLowlight(common)

interface TiptapEditorProps {
  content: string // markdown
  onUpdate: (markdown: string) => void
}

/** Convert basic markdown to HTML for Tiptap */
function markdownToHtml(md: string): string {
  let html = md
    // Headings (### before ## before #)
    .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
    .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
    .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
    // Bold & Italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr>')
    // Blockquote
    .replace(/^>\s+(.+)$/gm, '<blockquote><p>$1</p></blockquote>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // Code blocks — handle ```lang\n...\n``` (must come before paragraph wrapping)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const langAttr = lang ? ` class="language-${lang}"` : ''
    return `<pre><code${langAttr}>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`
  })

  // Unordered lists
  html = html.replace(/^(\s*)[-*]\s+(.+)$/gm, '$1<li>$2</li>')

  // Ordered lists
  html = html.replace(/^(\s*)\d+\.\s+(.+)$/gm, '$1<li>$2</li>')

  // Wrap consecutive <li> in <ul> or <ol>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')

  // Wrap remaining plain lines in <p> (skip already wrapped content)
  html = html
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (
        !trimmed ||
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<p') ||
        trimmed.startsWith('<ul') ||
        trimmed.startsWith('<ol') ||
        trimmed.startsWith('<li') ||
        trimmed.startsWith('<blockquote') ||
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<hr') ||
        trimmed.startsWith('<table') ||
        trimmed.startsWith('<tr') ||
        trimmed.startsWith('<td') ||
        trimmed.startsWith('<th') ||
        trimmed.startsWith('</') ||
        trimmed.startsWith('<a ')
      ) {
        return line
      }
      return `<p>${line}</p>`
    })
    .join('\n')

  return html
}

/** Create turndown instance with table support */
function createTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
  })

  // Table rules
  td.addRule('tableCell', {
    filter: ['td', 'th'],
    replacement: (content) => ` ${content.trim()} |`,
  })
  td.addRule('tableRow', {
    filter: 'tr',
    replacement: (content) => `|${content}\n`,
  })
  td.addRule('table', {
    filter: 'table',
    replacement: (_content, node) => {
      const el = node as HTMLElement
      const rows = el.querySelectorAll('tr')
      let md = ''
      rows.forEach((row, i) => {
        const cells = row.querySelectorAll('td, th')
        const cellTexts: string[] = []
        cells.forEach((cell) => cellTexts.push(cell.textContent?.trim() || ''))
        md += '| ' + cellTexts.join(' | ') + ' |\n'
        if (i === 0) {
          md += '| ' + cellTexts.map(() => '---').join(' | ') + ' |\n'
        }
      })
      return '\n' + md + '\n'
    },
  })

  return td
}

export function TiptapEditor({ content, onUpdate }: TiptapEditorProps) {
  const turndown = useMemo(() => createTurndown(), [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // using lowlight version instead
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'tiptap-link' },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder: 'Start editing your PRD...' }),
    ],
    content: markdownToHtml(content),
    editorProps: {
      attributes: {
        class: 'tiptap-content',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML()
      const md = turndown.turndown(html)
      onUpdate(md)
    },
  })

  // Sync content when external content changes
  useEffect(() => {
    if (editor && content) {
      const currentMd = turndown.turndown(editor.getHTML())
      // Only update if content meaningfully differs (avoid loops)
      if (currentMd.trim() !== content.trim()) {
        editor.commands.setContent(markdownToHtml(content))
      }
    }
  }, [content])

  const setLink = useCallback(() => {
    if (!editor) return
    const url = window.prompt('URL', editor.getAttributes('link').href || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }, [editor])

  const insertTable = useCallback(() => {
    if (!editor) return
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div className="tiptap-editor">
      {/* Floating Bubble Menu */}
      <BubbleMenu editor={editor} className="tiptap-bubble-menu">
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''} title="Bold">
          <Bold size={14} />
        </button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''} title="Italic">
          <Italic size={14} />
        </button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'is-active' : ''} title="Strikethrough">
          <Strikethrough size={14} />
        </button>
        <button onClick={() => editor.chain().focus().toggleCode().run()} className={editor.isActive('code') ? 'is-active' : ''} title="Inline Code">
          <Code size={14} />
        </button>
        <div className="tiptap-separator" />
        <button onClick={setLink} className={editor.isActive('link') ? 'is-active' : ''} title="Link">
          <LinkIcon size={14} />
        </button>
      </BubbleMenu>

      {/* Fixed Toolbar */}
      <div className="tiptap-toolbar">
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''} title="Heading 1">
          <Heading1 size={15} />
        </button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''} title="Heading 2">
          <Heading2 size={15} />
        </button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''} title="Heading 3">
          <Heading3 size={15} />
        </button>
        <div className="tiptap-separator" />
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'is-active' : ''} title="Bullet List">
          <List size={15} />
        </button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'is-active' : ''} title="Numbered List">
          <ListOrdered size={15} />
        </button>
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive('blockquote') ? 'is-active' : ''} title="Quote">
          <Quote size={15} />
        </button>
        <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={editor.isActive('codeBlock') ? 'is-active' : ''} title="Code Block">
          <Code size={15} />
        </button>
        <div className="tiptap-separator" />
        <button onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
          <Minus size={15} />
        </button>
        <button onClick={insertTable} title="Insert Table">
          <TableIcon size={15} />
        </button>
        <div className="tiptap-separator" />
        <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
          <Undo2 size={15} />
        </button>
        <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
          <Redo2 size={15} />
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  )
}
