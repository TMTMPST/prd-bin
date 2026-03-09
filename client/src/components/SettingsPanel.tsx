import { useState, useEffect } from 'react'
import { Trash2, Loader2, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import { validateApiKey, fetchModels, type ModelInfo } from '../lib/api'

function formatCost(priceStr: string): string {
  const price = parseFloat(priceStr)
  if (isNaN(price) || price === 0) return 'Free'
  const perMillion = price * 1_000_000
  if (perMillion < 0.01) return '<$0.01/1M'
  if (perMillion >= 100) return `$${perMillion.toFixed(0)}/1M`
  if (perMillion >= 1) return `$${perMillion.toFixed(2)}/1M`
  return `$${perMillion.toFixed(3)}/1M`
}

export function SettingsPanel() {
  const {
    apiKey, selectedModel, historyEnabled,
    setApiKey, setSelectedModel, setHistoryEnabled,
  } = useSettingsStore()

  const [showKey, setShowKey] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [validating, setValidating] = useState(false)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (apiKey) loadModels()
  }, [apiKey])

  const loadModels = async () => {
    setLoadingModels(true)
    try {
      const list = await fetchModels(apiKey)
      setModels(list)
    } catch { setModels([]) }
    finally { setLoadingModels(false) }
  }

  const handleUpdateKey = async () => {
    if (!newKey.trim()) return
    setValidating(true)
    setError('')

    try {
      const result = await validateApiKey(newKey.trim())
      if (result.valid) {
        setApiKey(newKey.trim())
        setNewKey('')
      } else {
        setError(result.error || 'Invalid key')
      }
    } catch { setError('Could not validate key') }
    finally { setValidating(false) }
  }

  const handleClearKey = () => {
    setApiKey('')
    setSelectedModel('')
    setModels([])
  }

  const maskedKey = apiKey ? `${apiKey.slice(0, 10)}···${apiKey.slice(-4)}` : ''
  const selectedModelInfo = models.find((m) => m.id === selectedModel)

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-text mb-6" style={{ fontFamily: 'var(--font-serif)' }}>
        Settings
      </h1>

      <div className="space-y-6">
        {/* API Key */}
        <Section title="API Key">
          {apiKey ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-bg-secondary rounded-md text-sm text-text-secondary font-mono truncate">
                  {showKey ? apiKey : maskedKey}
                </code>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="px-2.5 py-2 text-xs text-text-secondary hover:text-text border border-border rounded-md hover:bg-bg-hover transition-colors cursor-pointer"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={handleClearKey}
                  className="p-2 text-text-tertiary hover:text-error rounded-md hover:bg-bg-hover transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="text-xs text-success">Key configured</p>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="password"
                value={newKey}
                onChange={(e) => { setNewKey(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateKey()}
                placeholder="sk-or-v1-..."
                className="w-full px-3.5 py-2.5 bg-bg-input border border-border-input rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-light transition-all font-mono text-sm"
              />
              {error && <p className="text-error text-xs">{error}</p>}
              <div className="flex items-center justify-between">
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary"
                >
                  Get a key <ExternalLink size={10} />
                </a>
                <button
                  onClick={handleUpdateKey}
                  disabled={validating || !newKey.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-text text-text-inverse rounded-md text-xs font-medium disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {validating && <Loader2 size={12} className="animate-spin" />}
                  {validating ? 'Validating' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* Model */}
        <Section title="Model">
          {loadingModels ? (
            <div className="flex items-center gap-2 text-text-secondary text-sm py-1">
              <Loader2 size={13} className="animate-spin" />
              Loading...
            </div>
          ) : models.length > 0 ? (
            <div className="space-y-2">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-bg-input border border-border-input rounded-lg text-text focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-light transition-all text-sm cursor-pointer appearance-none"
              >
                <option value="">Select a model</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.pricing?.prompt ? `— ${formatCost(m.pricing.prompt)}` : ''}
                  </option>
                ))}
              </select>

              {selectedModelInfo?.pricing && (
                <div className="flex gap-3 text-xs text-text-secondary">
                  <span>
                    Input: <span className="font-medium text-cost">{formatCost(selectedModelInfo.pricing.prompt)}</span>
                  </span>
                  <span>
                    Output: <span className="font-medium text-cost">{formatCost(selectedModelInfo.pricing.completion)}</span>
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-tertiary">Add an API key to see models.</p>
          )}
        </Section>

        {/* History */}
        <Section title="Save history">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">
              Keep generated PRDs in browser storage.
            </p>
            <button
              onClick={() => setHistoryEnabled(!historyEnabled)}
              className="cursor-pointer text-text-tertiary hover:text-text transition-colors"
            >
              {historyEnabled ? (
                <ToggleRight size={28} className="text-primary" />
              ) : (
                <ToggleLeft size={28} />
              )}
            </button>
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pb-6 border-b border-border last:border-b-0 last:pb-0">
      <h3 className="text-[13px] font-semibold text-text mb-3">{title}</h3>
      {children}
    </div>
  )
}
