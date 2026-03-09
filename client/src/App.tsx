import { useState } from 'react'
import { Header } from './components/Header'
import { ApiKeyModal } from './components/ApiKeyModal'
import { PrdForm } from './components/PrdForm'
import { PrdViewer } from './components/PrdViewer'
import { SettingsPanel } from './components/SettingsPanel'
import { HistoryList } from './components/HistoryList'
import { useSettingsStore } from './stores/settingsStore'

type View = 'home' | 'settings' | 'history'

function App() {
  const { hasCompletedSetup } = useSettingsStore()
  const [currentView, setCurrentView] = useState<View>('home')
  const [showSetup, setShowSetup] = useState(!hasCompletedSetup)

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {showSetup && <ApiKeyModal onComplete={() => setShowSetup(false)} />}

      <Header currentView={currentView} onNavigate={setCurrentView} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-8">
        {currentView === 'home' && (
          <>
            <PrdForm />
            <PrdViewer />
          </>
        )}
        {currentView === 'settings' && <SettingsPanel />}
        {currentView === 'history' && (
          <HistoryList onNavigateHome={() => setCurrentView('home')} />
        )}
      </main>

      <footer className="no-print border-t border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 text-xs text-text-tertiary">
          prd-bin · local-first PRD generator
        </div>
      </footer>
    </div>
  )
}

export default App
