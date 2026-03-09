const API_BASE = '/api'

export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/validate-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  })
  return res.json()
}

export interface ModelInfo {
  id: string
  name: string
  context_length: number
  pricing: { prompt: string; completion: string }
}

export async function fetchModels(apiKey: string): Promise<ModelInfo[]> {
  const res = await fetch(`${API_BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  const data = await res.json()
  return data.models || []
}

export async function generatePrd(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  signal?: AbortSignal
): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, model, messages }),
      signal,
    })

    if (!res.ok) {
      const data = await res.json()
      onError(data.error || `Server error: ${res.status}`)
      return
    }

    const reader = res.body?.getReader()
    if (!reader) {
      onError('No response stream available')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          onDone()
          return
        }

        try {
          const parsed = JSON.parse(data)
          if (parsed.content) {
            onChunk(parsed.content)
          }
          if (parsed.error) {
            onError(parsed.error)
            return
          }
        } catch {
          // Skip malformed lines
        }
      }
    }

    onDone()
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return
    }
    onError(err.message || 'Network error occurred')
  }
}
