/**
 * PrdViewer.tsx — Displays, edits, and manages generated PRD content
 *
 * Features: Markdown rendering, Mermaid diagram rendering, inline editing,
 * export (MD/PDF), save to history with tags, and chat toggle.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Download, FileText, Check, Edit3, Eye, Save, MessageCircle, X, Tag } from 'lucide-react'
import { useGenerateStore } from '../stores/generateStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useHistoryStore } from '../stores/historyStore'
import { PrdChat } from './PrdChat'
import { TiptapEditor } from './TiptapEditor'
import { ExportMenu } from './ExportMenu'
import '../styles/tiptap.css'

export function PrdViewer() {
  const { generatedContent, isStreaming, isComplete, error } = useGenerateStore()
  const { historyEnabled, selectedModel } = useSettingsStore()
  const { addItem } = useHistoryStore()
  const { formData } = useGenerateStore()

  const contentRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saved, setSaved] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showTagInput, setShowTagInput] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const mermaidRendered = useRef(false)

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [generatedContent, isStreaming])

  // Render Mermaid diagrams when streaming completes
  useEffect(() => {
    if (isComplete && generatedContent && !mermaidRendered.current) {
      mermaidRendered.current = true
      // Small delay to let DOM update
      setTimeout(() => renderMermaidDiagrams(), 200)
    }
  }, [isComplete, generatedContent])

  // Reset when new streaming starts
  useEffect(() => {
    if (isStreaming) {
      mermaidRendered.current = false
      setShowChat(false)
      setShowTagInput(false)
      setTags([])
      setTagInput('')
    }
  }, [isStreaming])

  const renderMermaidDiagrams = async () => {
    if (!contentRef.current) return

    try {
      const mermaid = (await import('mermaid')).default
      const isDark = document.documentElement.classList.contains('dark')

      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: isDark
          ? {
              // Dark Mode Theme
              background: 'transparent',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              primaryColor: '#35342F',
              primaryTextColor: '#ECECEA',
              primaryBorderColor: '#4A4943',
              lineColor: '#807F79',
              secondaryColor: '#45443E',
              tertiaryColor: '#2C2B28',
              mainBkg: '#3D3C37',
              nodeBorder: '#5C5B54',
              clusterBkg: 'rgba(53, 52, 47, 0.5)',
              clusterBorder: '#4A4943',
              defaultLinkColor: '#B0AFA8',
              titleColor: '#ECECEA',
              edgeLabelBackground: '#35342F',
              nodeTextColor: '#ECECEA',
            }
          : {
              // Light Mode Theme
              background: 'transparent',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              primaryColor: '#F5F3EF',
              primaryTextColor: '#1A1512',
              primaryBorderColor: '#E8E4DE',
              lineColor: '#9C9589',
              secondaryColor: '#F0EDE8',
              tertiaryColor: '#FAF9F7',
              mainBkg: '#FFFFFF',
              nodeBorder: '#D4CFC7',
              clusterBkg: 'rgba(245, 243, 239, 0.5)',
              clusterBorder: '#E8E4DE',
              defaultLinkColor: '#706A60',
              titleColor: '#1A1512',
              edgeLabelBackground: '#F5F3EF',
              nodeTextColor: '#1A1512',
            },
        flowchart: { 
          curve: 'bumpX', 
          padding: 20, 
          nodeSpacing: 60, 
          rankSpacing: 60,
          htmlLabels: true
        },
        er: { 
          fontSize: 13,
          useMaxWidth: true
        },
      })

      const codeBlocks = contentRef.current.querySelectorAll('code.language-mermaid')

      for (let i = 0; i < codeBlocks.length; i++) {
        const codeEl = codeBlocks[i]
        const rawCode = codeEl.textContent || ''
        const preEl = codeEl.closest('pre')
        if (!preEl || !rawCode.trim()) continue

        // Sanitize common LLM syntax issues
        let code = rawCode.trim()
          // Remove HTML tags that LLMs sometimes insert
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/?[a-z][^>]*>/gi, '')
          // Fix labels with unescaped special chars — wrap in quotes
          .replace(/\[([^\]]*[()&][^\]]*)\]/g, (_, label) => `["${label.replace(/"/g, "'")}"]`)
          // Remove trailing semicolons on lines (common LLM mistake)
          .replace(/;\s*$/gm, '')

        const id = `mermaid-${Date.now()}-${i}`

        try {
          const { svg } = await mermaid.render(id, code)
          const wrapper = document.createElement('div')
          wrapper.className = 'mermaid-diagram'
          wrapper.innerHTML = svg
          preEl.replaceWith(wrapper)
        } catch (err) {
          console.warn('Mermaid render failed for block', i, err)
          // Clean up any orphaned error elements mermaid injected
          const errorEl = document.getElementById('d' + id)
          if (errorEl) errorEl.remove()
          // Leave the original code block as-is (no red error)
        }
      }

      // Final cleanup: remove any remaining mermaid error elements
      document.querySelectorAll('[id^="dmermaid-"]').forEach((el) => el.remove())
      document.querySelectorAll('.error-icon').forEach((el) => el.remove())
    } catch (err) {
      console.warn('Failed to load mermaid:', err)
    }
  }

  const handleCopy = useCallback(async () => {
    const content = isEditing ? editContent : generatedContent
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [generatedContent, editContent, isEditing])

  const handleDownload = useCallback(() => {
    const content = isEditing ? editContent : generatedContent
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${formData.appName || 'prd'}-prd.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [generatedContent, editContent, isEditing, formData.appName])

  const handlePdf = useCallback(() => {
    // Add a temporary class for print styling, then trigger print
    document.body.classList.add('printing-prd')
    setTimeout(() => {
      window.print()
      // Remove class after print dialog closes
      setTimeout(() => document.body.classList.remove('printing-prd'), 500)
    }, 100)
  }, [])

  const handleToggleEdit = () => {
    if (!isEditing) setEditContent(generatedContent)
    setIsEditing(!isEditing)
  }

  const handleEditorUpdate = (md: string) => {
    setEditContent(md)
  }

  const handleSaveEdit = () => {
    useGenerateStore.getState().setContent(editContent)
    setIsEditing(false)
    mermaidRendered.current = false
    setTimeout(renderMermaidDiagrams, 200)
  }

  const handleAddTag = () => {
    const newTag = tagInput.trim().toLowerCase()
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag])
    }
    setTagInput('')
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddTag()
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1))
    }
  }

  const handleSaveHistory = () => {
    if (showTagInput) {
      // Second click = confirm save
      const content = isEditing ? editContent : generatedContent
      addItem({
        id: `prd-${Date.now()}`,
        title: formData.appName || 'Untitled PRD',
        content,
        formData: { ...formData },
        createdAt: new Date().toISOString(),
        model: selectedModel,
        tags: tags.length > 0 ? tags : undefined,
      })
      setSaved(true)
      setShowTagInput(false)
      setTags([])
      setTagInput('')
      setTimeout(() => setSaved(false), 2000)
    } else {
      // First click = show tag input
      setShowTagInput(true)
    }
  }

  if (!generatedContent && !isStreaming && !error) return null

  return (
    <div className="mt-8 animate-fade-in">
      {/* Divider */}
      <div className="border-t border-border mb-6" />

      {/* Toolbar */}
      {(isComplete || generatedContent.length > 200) && (
        <div className="space-y-2 mb-5 no-print">
          <div className="flex flex-wrap items-center gap-1.5">
            <ToolbarButton onClick={handleCopy} icon={copied ? Check : Copy}>
              {copied ? 'Copied' : 'Copy'}
            </ToolbarButton>
            <ToolbarButton onClick={handleDownload} icon={Download}>
              Download
            </ToolbarButton>
            <ToolbarButton onClick={handlePdf} icon={FileText}>
              PDF
            </ToolbarButton>
            <ExportMenu content={generatedContent} title={formData.appName || 'PRD'} />

            {isComplete && (
              <>
                <div className="w-px h-4 bg-border mx-1" />
                <ToolbarButton
                  onClick={handleToggleEdit}
                  icon={isEditing ? Eye : Edit3}
                  active={isEditing}
                >
                  {isEditing ? 'Preview' : 'Edit'}
                </ToolbarButton>
                {isEditing && (
                  <ToolbarButton onClick={handleSaveEdit} icon={Save}>
                    Save
                  </ToolbarButton>
                )}

                <div className="w-px h-4 bg-border mx-1" />
                <ToolbarButton
                  onClick={() => setShowChat(!showChat)}
                  icon={MessageCircle}
                  active={showChat}
                >
                  Chat
                </ToolbarButton>

                {historyEnabled && (
                  <div className="ml-auto">
                    <ToolbarButton onClick={handleSaveHistory} icon={saved ? Check : Save}>
                      {saved ? 'Saved' : showTagInput ? 'Confirm' : 'Save'}
                    </ToolbarButton>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Tag input row */}
          {showTagInput && !saved && (
            <div className="flex items-center gap-2 px-1 animate-fade-in">
              <Tag size={13} className="text-text-tertiary flex-shrink-0" />
              <div className="flex flex-wrap items-center gap-1.5 flex-1 px-2.5 py-1.5 bg-bg-input border border-border-input rounded-lg">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-light text-primary text-xs font-medium rounded-full">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="hover:text-error cursor-pointer">
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={handleAddTag}
                  placeholder={tags.length === 0 ? 'Add tags (press Enter)...' : 'Add more...'}
                  className="flex-1 min-w-[100px] bg-transparent text-sm text-text placeholder:text-text-tertiary focus:outline-none"
                  autoFocus
                />
              </div>
              <button
                onClick={() => { setShowTagInput(false); setTags([]); setTagInput('') }}
                className="text-text-tertiary hover:text-text cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 border border-error/20 bg-error/5 rounded-lg text-sm text-error mb-4">
          {error}
        </div>
      )}

      {/* Chat Panel */}
      {showChat && isComplete && (
        <PrdChat prdContent={generatedContent} />
      )}

      {/* PRD Content */}
      <div
        ref={contentRef}
        className="prd-viewer max-h-[75vh] print:max-h-none print:overflow-visible overflow-y-auto"
      >
        {isEditing ? (
          <TiptapEditor
            content={editContent}
            onUpdate={handleEditorUpdate}
          />
        ) : (
          <div className={`markdown-content ${isStreaming ? 'streaming-cursor' : ''}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {generatedContent}
            </ReactMarkdown>
          </div>
        )}

        {isStreaming && (
          <div className="flex items-center gap-2 mt-4 text-text-tertiary text-sm">
            <Loader />
            Writing...
          </div>
        )}
      </div>
    </div>
  )
}

/* Minimal toolbar button */
function ToolbarButton({
  children,
  onClick,
  icon: Icon,
  active,
}: {
  children: React.ReactNode
  onClick: () => void
  icon: React.ComponentType<{ size: number; strokeWidth?: number }>
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
        active
          ? 'bg-bg-hover text-text'
          : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-hover'
      }`}
    >
      <Icon size={13} strokeWidth={1.75} />
      {children}
    </button>
  )
}

/* Simple loading dots */
function Loader() {
  return (
    <span className="inline-flex gap-0.5">
      <span className="w-1 h-1 rounded-full bg-text-tertiary animate-pulse" style={{ animationDelay: '0ms' }} />
      <span className="w-1 h-1 rounded-full bg-text-tertiary animate-pulse" style={{ animationDelay: '200ms' }} />
      <span className="w-1 h-1 rounded-full bg-text-tertiary animate-pulse" style={{ animationDelay: '400ms' }} />
    </span>
  )
}
