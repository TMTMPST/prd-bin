import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
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

  // Force dark mode initially to match Claude style if desired, though theme store handles this
  useEffect(() => {
    // Ensuring background covers full screen
    document.body.className = document.documentElement.className
  }, [])

  return (
    <div className="h-screen w-full flex bg-bg overflow-hidden print:h-auto print:overflow-visible print:block">
      {showSetup && <ApiKeyModal onComplete={() => setShowSetup(false)} />}

      <Sidebar currentView={currentView} onNavigate={setCurrentView} />

      <main className="flex-1 h-full overflow-y-auto relative print:h-auto print:overflow-visible print:block">
        <div className="max-w-3xl w-full mx-auto px-8 py-12 pb-24 min-h-full flex flex-col relative pt-safe pb-safe print:p-0 print:min-h-0 print:block">
          {currentView === 'home' && (
            <div className="flex-1 flex flex-col justify-center min-h-[50vh]">
              <PrdForm />
              <div className="flex-1 mt-4">
                <PrdViewer />
              </div>
            </div>
          )}
          {currentView === 'settings' && <SettingsPanel />}
          {currentView === 'history' && (
            <HistoryList onNavigateHome={() => setCurrentView('home')} />
          )}
        </div>
      </main>
    </div>
  )
}

export default App
