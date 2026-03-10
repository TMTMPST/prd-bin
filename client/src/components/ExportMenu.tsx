/**
 * ExportMenu.tsx — Dropdown menu for exporting PRD to external services
 *
 * Shows configured integrations (Notion, Jira, Linear) and handles
 * the export flow with loading/success/error states.
 */

import { useState, useRef, useEffect } from 'react'
import { Share2, ChevronDown, Loader2, Check, AlertCircle, ExternalLink } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import { exportToNotion, exportToJira, exportToLinear } from '../lib/integrations'

interface ExportMenuProps {
  content: string
  title: string
}

type ExportStatus = 'idle' | 'loading' | 'success' | 'error'

interface ServiceState {
  status: ExportStatus
  message?: string
  url?: string
}

export function ExportMenu({ content, title }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [notion, setNotion] = useState<ServiceState>({ status: 'idle' })
  const [jira, setJira] = useState<ServiceState>({ status: 'idle' })
  const [linear, setLinear] = useState<ServiceState>({ status: 'idle' })
  const ref = useRef<HTMLDivElement>(null)

  const {
    notionApiKey, notionParentPageId,
    jiraEmail, jiraApiToken, jiraDomain, jiraProjectKey,
    linearApiKey, linearTeamId,
  } = useSettingsStore()

  const hasNotion = !!notionApiKey && !!notionParentPageId
  const hasJira = !!jiraEmail && !!jiraApiToken && !!jiraDomain && !!jiraProjectKey
  const hasLinear = !!linearApiKey && !!linearTeamId
  const hasAny = hasNotion || hasJira || hasLinear

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNotionExport = async () => {
    setNotion({ status: 'loading' })
    try {
      const result = await exportToNotion(notionApiKey, notionParentPageId, title, content)
      if (result.success) {
        setNotion({ status: 'success', url: result.url, message: 'Exported to Notion!' })
      } else {
        setNotion({ status: 'error', message: result.error || 'Export failed' })
      }
    } catch (err: any) {
      setNotion({ status: 'error', message: err.message || 'Network error' })
    }
  }

  const handleJiraExport = async () => {
    setJira({ status: 'loading' })
    try {
      const result = await exportToJira(jiraEmail, jiraApiToken, jiraDomain, jiraProjectKey, content)
      if (result.success) {
        setJira({ status: 'success', message: `Created ${result.issueCount} issues!` })
      } else {
        setJira({ status: 'error', message: result.error || 'Export failed' })
      }
    } catch (err: any) {
      setJira({ status: 'error', message: err.message || 'Network error' })
    }
  }

  const handleLinearExport = async () => {
    setLinear({ status: 'loading' })
    try {
      const result = await exportToLinear(linearApiKey, linearTeamId, content)
      if (result.success) {
        setLinear({ status: 'success', message: `Created ${result.issueCount} issues!` })
      } else {
        setLinear({ status: 'error', message: result.error || 'Export failed' })
      }
    } catch (err: any) {
      setLinear({ status: 'error', message: err.message || 'Network error' })
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-text-tertiary hover:text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer"
      >
        <Share2 size={13} strokeWidth={1.75} />
        Export
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-bg-elevated border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
          {!hasAny ? (
            <div className="px-4 py-3 text-xs text-text-tertiary text-center">
              <p className="mb-1">No integrations configured.</p>
              <p>Add API keys in <strong>Settings → Integrations</strong>.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {hasNotion && (
                <ExportItem
                  emoji="📝"
                  label="Notion"
                  description="Export as a Notion page"
                  state={notion}
                  onClick={handleNotionExport}
                />
              )}
              {hasJira && (
                <ExportItem
                  emoji="🎫"
                  label="Jira"
                  description="Create issues from user stories"
                  state={jira}
                  onClick={handleJiraExport}
                />
              )}
              {hasLinear && (
                <ExportItem
                  emoji="⚡"
                  label="Linear"
                  description="Create issues from user stories"
                  state={linear}
                  onClick={handleLinearExport}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ExportItem({
  emoji,
  label,
  description,
  state,
  onClick,
}: {
  emoji: string
  label: string
  description: string
  state: ServiceState
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={state.status === 'loading'}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-hover transition-colors cursor-pointer disabled:cursor-wait"
    >
      <span className="text-base flex-shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text">{label}</div>
        {state.status === 'idle' && (
          <div className="text-xs text-text-tertiary">{description}</div>
        )}
        {state.status === 'loading' && (
          <div className="flex items-center gap-1 text-xs text-text-secondary">
            <Loader2 size={10} className="animate-spin" />
            Exporting...
          </div>
        )}
        {state.status === 'success' && (
          <div className="flex items-center gap-1 text-xs text-success">
            <Check size={10} />
            {state.message}
            {state.url && (
              <a href={state.url} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-0.5 underline">
                Open <ExternalLink size={8} />
              </a>
            )}
          </div>
        )}
        {state.status === 'error' && (
          <div className="flex items-center gap-1 text-xs text-error">
            <AlertCircle size={10} />
            {state.message}
          </div>
        )}
      </div>
    </button>
  )
}
