import { Settings, History, FileText, Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../stores/themeStore'

interface HeaderProps {
  currentView: 'home' | 'settings' | 'history'
  onNavigate: (view: 'home' | 'settings' | 'history') => void
}

export function Header({ currentView, onNavigate }: HeaderProps) {
  const { theme, toggleTheme } = useThemeStore()

  const navItems = [
    { id: 'home' as const, label: 'Draft', icon: FileText },
    { id: 'history' as const, label: 'History', icon: History },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ]

  return (
    <header className="no-print border-b border-border sticky top-0 z-50 bg-bg/95 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <span className="text-[15px] font-semibold text-text tracking-tight">
              prd-bin
            </span>
          </button>

          <div className="flex items-center gap-1">
            <nav className="flex items-center gap-0.5">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = currentView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-bg-hover text-text'
                        : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-hover'
                    }`}
                  >
                    <Icon size={14} strokeWidth={1.75} />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                )
              })}
            </nav>

            <div className="w-px h-4 bg-border mx-1" />

            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-8 h-8 rounded-md text-text-tertiary hover:text-text hover:bg-bg-hover transition-colors cursor-pointer"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? (
                <Moon size={15} strokeWidth={1.75} />
              ) : (
                <Sun size={15} strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
