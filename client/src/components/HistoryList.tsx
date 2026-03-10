/**
 * HistoryList.tsx — Displays saved PRD history
 *
 * Features: full-text search, tag filtering with chips,
 * import/export, clear all, and navigation to view a PRD.
 */

import { useState, useRef } from 'react'
import { Trash2, Eye, Download, Upload, FileText, Clock, Cpu, Search, X, Tag } from 'lucide-react'
import { useHistoryStore, type PrdHistoryItem } from '../stores/historyStore'
import { useGenerateStore } from '../stores/generateStore'

interface HistoryListProps {
  onNavigateHome: () => void
}

export function HistoryList({ onNavigateHome }: HistoryListProps) {
  const { items, removeItem, clearAll, exportData, importData } = useHistoryStore()
  const { setContent, setFormData, setComplete } = useGenerateStore()
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Collect all unique tags
  const allTags = Array.from(
    new Set(items.flatMap((item) => item.tags || []))
  ).sort()

  // Filter by search text AND active tag
  const filtered = items.filter((item) => {
    const matchesSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.content.toLowerCase().includes(search.toLowerCase())
    const matchesTag =
      !activeTag || (item.tags && item.tags.includes(activeTag))
    return matchesSearch && matchesTag
  })

  const handleView = (item: PrdHistoryItem) => {
    setFormData(item.formData)
    setContent(item.content)
    setComplete(true)
    onNavigateHome()
  }

  const handleExport = () => {
    const json = exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prd-history-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      importData(ev.target?.result as string)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleClearAll = () => {
    if (confirmClear) { clearAll(); setConfirmClear(false) }
    else { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000) }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-text" style={{ fontFamily: 'var(--font-serif)' }}>
          History
        </h1>
        <div className="flex gap-1.5">
          <SmallButton onClick={handleExport} disabled={!items.length}>Export</SmallButton>
          <SmallButton onClick={() => fileInputRef.current?.click()}>Import</SmallButton>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          {items.length > 0 && (
            <SmallButton onClick={handleClearAll} danger={confirmClear}>
              {confirmClear ? 'Confirm?' : 'Clear all'}
            </SmallButton>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="space-y-3 mb-4">
          {/* Search bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search PRDs..."
              className="w-full pl-8 pr-8 py-2 bg-bg-input border border-border-input rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-light text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text cursor-pointer">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Tag filter chips */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveTag(null)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  activeTag === null
                    ? 'bg-text text-text-inverse'
                    : 'bg-bg-secondary text-text-secondary hover:bg-bg-hover'
                }`}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                    activeTag === tag
                      ? 'bg-primary text-text-inverse'
                      : 'bg-primary-light text-primary hover:opacity-80'
                  }`}
                >
                  <Tag size={10} />
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText size={32} className="mx-auto mb-2 text-border" />
          <p className="text-sm text-text-tertiary">
            {items.length === 0 ? 'No PRDs saved yet.' : 'No results found.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filtered.map((item) => (
            <div key={item.id} className="py-3.5 group flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => handleView(item)}
                  className="text-sm font-medium text-text hover:text-primary transition-colors cursor-pointer text-left"
                >
                  {item.title}
                </button>
                <div className="flex items-center gap-3 mt-1 text-xs text-text-tertiary">
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {formatDate(item.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Cpu size={10} />
                    {item.model.split('/').pop()}
                  </span>
                </div>
                {/* Tag badges */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-primary-light text-primary text-[10px] font-medium rounded-full cursor-pointer hover:opacity-80"
                        onClick={() => setActiveTag(tag)}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleView(item)}
                  className="p-1.5 rounded text-text-tertiary hover:text-text hover:bg-bg-hover cursor-pointer"
                >
                  <Eye size={13} />
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 rounded text-text-tertiary hover:text-error hover:bg-bg-hover cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SmallButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer disabled:opacity-40 ${
        danger
          ? 'border-error/30 text-error bg-error/5 hover:bg-error/10'
          : 'border-border text-text-secondary hover:text-text hover:bg-bg-hover'
      }`}
    >
      {children}
    </button>
  )
}
