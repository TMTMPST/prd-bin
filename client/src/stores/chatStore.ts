/**
 * chatStore.ts — Manages state for the "Chat with your PRD" feature
 *
 * Stores the conversation history between the user and AI
 * when discussing a generated PRD document.
 */

import { create } from 'zustand'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatState {
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null
  addMessage: (msg: ChatMessage) => void
  updateLastAssistant: (chunk: string) => void
  setStreaming: (streaming: boolean) => void
  setError: (error: string | null) => void
  clearChat: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  error: null,

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  updateLastAssistant: (chunk) =>
    set((state) => {
      const msgs = [...state.messages]
      const last = msgs[msgs.length - 1]
      if (last && last.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, content: last.content + chunk }
      }
      return { messages: msgs }
    }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setError: (error) => set({ error }),

  clearChat: () => set({ messages: [], isStreaming: false, error: null }),
}))
