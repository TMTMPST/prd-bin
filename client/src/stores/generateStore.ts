import { create } from 'zustand'

export interface PrdFormData {
  appName: string
  targetAudience: string
  description: string
  techStack: string
}

interface GenerateState {
  formData: PrdFormData
  generatedContent: string
  isStreaming: boolean
  isComplete: boolean
  error: string | null
  abortController: AbortController | null
  setFormData: (data: Partial<PrdFormData>) => void
  appendContent: (chunk: string) => void
  setContent: (content: string) => void
  setStreaming: (streaming: boolean) => void
  setComplete: (complete: boolean) => void
  setError: (error: string | null) => void
  setAbortController: (controller: AbortController | null) => void
  reset: () => void
  resetContent: () => void
}

const initialFormData: PrdFormData = {
  appName: '',
  targetAudience: '',
  description: '',
  techStack: '',
}

export const useGenerateStore = create<GenerateState>((set) => ({
  formData: initialFormData,
  generatedContent: '',
  isStreaming: false,
  isComplete: false,
  error: null,
  abortController: null,
  setFormData: (data) =>
    set((state) => ({ formData: { ...state.formData, ...data } })),
  appendContent: (chunk) =>
    set((state) => ({ generatedContent: state.generatedContent + chunk })),
  setContent: (content) => set({ generatedContent: content }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setComplete: (complete) => set({ isComplete: complete }),
  setError: (error) => set({ error }),
  setAbortController: (controller) => set({ abortController: controller }),
  reset: () =>
    set({
      formData: initialFormData,
      generatedContent: '',
      isStreaming: false,
      isComplete: false,
      error: null,
      abortController: null,
    }),
  resetContent: () =>
    set({
      generatedContent: '',
      isStreaming: false,
      isComplete: false,
      error: null,
    }),
}))
