import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PrdHistoryItem {
  id: string
  title: string
  content: string
  formData: {
    appName: string
    targetAudience: string
    description: string
    techStack: string
  }
  createdAt: string
  model: string
}

interface HistoryState {
  items: PrdHistoryItem[]
  syncing: boolean
  addItem: (item: PrdHistoryItem) => void
  removeItem: (id: string) => void
  clearAll: () => void
  getItem: (id: string) => PrdHistoryItem | undefined
  exportData: () => string
  importData: (json: string) => boolean
  syncFromServer: () => Promise<void>
}

const API = '/api/cache'

// Server-side cache helpers
async function saveToServer(item: PrdHistoryItem) {
  try {
    await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
  } catch {
    // Silently fail — localStorage is the fallback
  }
}

async function deleteFromServer(id: string) {
  try {
    await fetch(`${API}/${id}`, { method: 'DELETE' })
  } catch {}
}

async function clearServer() {
  try {
    await fetch(API, { method: 'DELETE' })
  } catch {}
}

async function fetchFromServer(): Promise<PrdHistoryItem[]> {
  try {
    const res = await fetch(API)
    if (!res.ok) return []
    const data = await res.json()
    return data.items || []
  } catch {
    return []
  }
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      items: [],
      syncing: false,

      addItem: (item) => {
        set((state) => ({
          items: [item, ...state.items].slice(0, 50),
        }))
        // Fire-and-forget save to server
        saveToServer(item)
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }))
        deleteFromServer(id)
      },

      clearAll: () => {
        set({ items: [] })
        clearServer()
      },

      getItem: (id) => get().items.find((i) => i.id === id),

      exportData: () => JSON.stringify(get().items, null, 2),

      importData: (json) => {
        try {
          const data = JSON.parse(json)
          if (Array.isArray(data)) {
            set({ items: data })
            // Sync imported items to server
            data.forEach((item) => saveToServer(item))
            return true
          }
          return false
        } catch {
          return false
        }
      },

      // Pull from server and merge with localStorage
      syncFromServer: async () => {
        set({ syncing: true })
        try {
          const serverItems = await fetchFromServer()
          const localItems = get().items

          // Merge: use a map keyed by id, prefer newer version
          const merged = new Map<string, PrdHistoryItem>()

          for (const item of localItems) {
            merged.set(item.id, item)
          }
          for (const item of serverItems) {
            const existing = merged.get(item.id)
            if (!existing || new Date(item.createdAt) >= new Date(existing.createdAt)) {
              merged.set(item.id, item)
            }
          }

          // Sort by date descending, limit to 50
          const allItems = Array.from(merged.values())
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 50)

          set({ items: allItems })

          // Push any local-only items to server
          for (const item of allItems) {
            if (!serverItems.find((s) => s.id === item.id)) {
              saveToServer(item)
            }
          }
        } catch {
          // Silently fail — use localStorage data
        } finally {
          set({ syncing: false })
        }
      },
    }),
    { name: 'prd-bin-history' }
  )
)

// Auto-sync on app load
useHistoryStore.getState().syncFromServer()
