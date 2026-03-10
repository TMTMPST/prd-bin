/**
 * settingsStore.ts — Persisted user settings
 *
 * Stores API key, model selection, history toggle,
 * custom instructions, and integration credentials.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  // Core
  apiKey: string
  selectedModel: string
  historyEnabled: boolean
  hasCompletedSetup: boolean
  customInstructions: string
  // Notion integration
  notionApiKey: string
  notionParentPageId: string
  // Jira integration
  jiraEmail: string
  jiraApiToken: string
  jiraDomain: string
  jiraProjectKey: string
  // Linear integration
  linearApiKey: string
  linearTeamId: string
  // Setters
  setApiKey: (key: string) => void
  setSelectedModel: (model: string) => void
  setHistoryEnabled: (enabled: boolean) => void
  setHasCompletedSetup: (completed: boolean) => void
  setCustomInstructions: (instructions: string) => void
  setNotionConfig: (config: { apiKey: string; parentPageId: string }) => void
  setJiraConfig: (config: { email: string; apiToken: string; domain: string; projectKey: string }) => void
  setLinearConfig: (config: { apiKey: string; teamId: string }) => void
  reset: () => void
}

const defaults = {
  apiKey: '',
  selectedModel: '',
  historyEnabled: false,
  hasCompletedSetup: false,
  customInstructions: '',
  notionApiKey: '',
  notionParentPageId: '',
  jiraEmail: '',
  jiraApiToken: '',
  jiraDomain: '',
  jiraProjectKey: '',
  linearApiKey: '',
  linearTeamId: '',
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      setApiKey: (key) => set({ apiKey: key }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setHistoryEnabled: (enabled) => set({ historyEnabled: enabled }),
      setHasCompletedSetup: (completed) => set({ hasCompletedSetup: completed }),
      setCustomInstructions: (instructions) => set({ customInstructions: instructions }),
      setNotionConfig: ({ apiKey, parentPageId }) => set({ notionApiKey: apiKey, notionParentPageId: parentPageId }),
      setJiraConfig: ({ email, apiToken, domain, projectKey }) => set({ jiraEmail: email, jiraApiToken: apiToken, jiraDomain: domain, jiraProjectKey: projectKey }),
      setLinearConfig: ({ apiKey, teamId }) => set({ linearApiKey: apiKey, linearTeamId: teamId }),
      reset: () => set({ ...defaults }),
    }),
    { name: 'prd-bin-settings' }
  )
)
