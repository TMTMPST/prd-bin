import {
  MessageSquarePlus,
  Search,
  Settings,
  FolderOpen,
  LayoutGrid,
  Code2,
  MoreHorizontal,
  Download,
  Trash2,
  Eye,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { useState } from 'react'
import { useHistoryStore, type PrdHistoryItem } from '../stores/historyStore'
import { useGenerateStore } from '../stores/generateStore'
import { useThemeStore } from '../stores/themeStore'

interface SidebarProps {
  currentView: 'home' | 'settings' | 'history'
  onNavigate: (view: 'home' | 'settings' | 'history') => void
}

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const { theme, toggleTheme } = useThemeStore()
  const { items, removeItem, exportData } = useHistoryStore()
  const { setContent, setFormData, setComplete } = useGenerateStore()
  const [isOpen, setIsOpen] = useState(true)

  const handleView = (item: PrdHistoryItem) => {
    setFormData(item.formData)
    setContent(item.content)
    setComplete(true)
    onNavigate('home')
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

  const handleNewChat = () => {
    useGenerateStore.getState().resetContent()
    useGenerateStore.getState().setFormData({ appName: '', targetAudience: '', description: '', techStack: '', selectedTemplate: 'full-prd' })
    onNavigate('home')
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-md text-text-tertiary hover:text-text hover:bg-bg-hover transition-colors shadow-sm bg-bg-elevated border border-border"
      >
        <PanelLeft size={18} />
      </button>
    )
  }

  return (
    <div className="w-64 h-screen flex-shrink-0 bg-bg-secondary border-r border-border flex flex-col no-print transition-all duration-300 relative group">
      {/* Header section */}
      <div className="p-4 pl-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-serif font-semibold tracking-tight text-text">
            prd-bin
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 rounded-md text-text-tertiary hover:text-text hover:bg-bg-hover transition-colors opacity-0 group-hover:opacity-100"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="px-3 py-2 space-y-0.5">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-3 px-2 py-2 text-sm text-text-secondary hover:bg-bg-hover rounded-md transition-colors"
        >
          <MessageSquarePlus size={16} />
          New draft
        </button>
        <button className="w-full flex items-center gap-3 px-2 py-2 text-sm text-text-secondary hover:bg-bg-hover rounded-md transition-colors">
          <Search size={16} />
          Search
        </button>
        <button
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-3 px-2 py-2 text-sm rounded-md transition-colors ${
            currentView === 'settings' ? 'bg-bg-hover text-text' : 'text-text-secondary hover:bg-bg-hover'
          }`}
        >
          <Settings size={16} />
          Customize
        </button>
      </nav>


      {/* Recents / History */}
      <div className="mt-6 flex-1 overflow-y-auto px-3 pb-4">
        <div className="flex items-center justify-between px-2 mb-2 group/recents">
          <span className="text-xs font-medium text-text-tertiary">Recents</span>
          <button onClick={() => onNavigate('history')} className="text-text-tertiary hover:text-text opacity-0 group-hover/recents:opacity-100">
            <MoreHorizontal size={14} />
          </button>
        </div>
        
        <div className="space-y-0.5">
          {items.slice(0, 15).map((item) => (
            <div key={item.id} className="group/item flex items-center justify-between text-sm px-2 py-1.5 rounded-md hover:bg-bg-hover transition-colors cursor-pointer">
               <button
                  onClick={() => handleView(item)}
                  className="truncate text-left text-text-secondary group-hover/item:text-text flex-1"
                >
                  {item.title}
               </button>
               <div className="flex items-center opacity-0 group-hover/item:opacity-100 gap-1 ml-2">
                 <button onClick={(e) => { e.stopPropagation(); removeItem(item.id) }} className="p-1 text-text-tertiary hover:text-error rounded">
                   <Trash2 size={12} />
                 </button>
               </div>
            </div>
          ))}
          {items.length === 0 && (
             <div className="px-2 py-2 text-xs text-text-tertiary">No recent drafts</div>
          )}
        </div>
      </div>
    </div>
  )
}
