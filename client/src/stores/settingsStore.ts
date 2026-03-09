import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  apiKey: string
  selectedModel: string
  historyEnabled: boolean
  hasCompletedSetup: boolean
  setApiKey: (key: string) => void
  setSelectedModel: (model: string) => void
  setHistoryEnabled: (enabled: boolean) => void
  setHasCompletedSetup: (completed: boolean) => void
  reset: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: '',
      selectedModel: '',
      historyEnabled: false,
      hasCompletedSetup: false,
      setApiKey: (key) => set({ apiKey: key }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setHistoryEnabled: (enabled) => set({ historyEnabled: enabled }),
      setHasCompletedSetup: (completed) => set({ hasCompletedSetup: completed }),
      reset: () =>
        set({
          apiKey: '',
          selectedModel: '',
          historyEnabled: false,
          hasCompletedSetup: false,
        }),
    }),
    { name: 'prd-bin-settings' }
  )
)
