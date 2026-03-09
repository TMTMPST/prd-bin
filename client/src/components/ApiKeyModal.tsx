import { useState } from 'react'
import { Loader2, ArrowRight, ExternalLink } from 'lucide-react'
import { validateApiKey, fetchModels, type ModelInfo } from '../lib/api'
import { useSettingsStore } from '../stores/settingsStore'

interface ApiKeyModalProps {
  onComplete: () => void
}

function formatCost(priceStr: string): string {
  const price = parseFloat(priceStr)
  if (isNaN(price) || price === 0) return 'Free'
  const perMillion = price * 1_000_000
  if (perMillion < 0.01) return '<$0.01/1M'
  if (perMillion >= 100) return `$${perMillion.toFixed(0)}/1M`
  if (perMillion >= 1) return `$${perMillion.toFixed(2)}/1M`
  return `$${perMillion.toFixed(3)}/1M`
}

export function ApiKeyModal({ onComplete }: ApiKeyModalProps) {
  const { setApiKey, setSelectedModel, setHasCompletedSetup } = useSettingsStore()
  const [key, setKey] = useState('')
  const [step, setStep] = useState<'key' | 'model'>('key')
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState('')
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModelId, setSelectedModelId] = useState('')
  const [loadingModels, setLoadingModels] = useState(false)

  const handleValidateKey = async () => {
    if (!key.trim()) { setError('Please enter your API key'); return }
    setValidating(true)
    setError('')

    try {
      const result = await validateApiKey(key.trim())
      if (result.valid) {
        setApiKey(key.trim())
        setLoadingModels(true)
        const modelList = await fetchModels(key.trim())
        setModels(modelList)
        setLoadingModels(false)
        setStep('model')
      } else {
        setError(result.error || 'Invalid API key')
      }
    } catch {
      setError('Could not validate key. Make sure the server is running.')
    } finally {
      setValidating(false)
    }
  }

  const handleSelectModel = () => {
    if (!selectedModelId) { setError('Please select a model'); return }
    setSelectedModel(selectedModelId)
    setHasCompletedSetup(true)
    onComplete()
  }

  const popularIds = [
    'google/gemini-2.5-flash-preview', 'google/gemini-2.0-flash-001',
    'anthropic/claude-sonnet-4', 'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o', 'openai/gpt-4o-mini',
    'meta-llama/llama-3.1-70b-instruct', 'deepseek/deepseek-chat',
  ]

  const popular = models.filter((m) => popularIds.some((id) => m.id.includes(id)))
  const others = models.filter((m) => !popularIds.some((id) => m.id.includes(id)))

  const selectedModelInfo = models.find((m) => m.id === selectedModelId)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-text/10 backdrop-blur-sm p-4">
      <div className="bg-bg-elevated border border-border rounded-xl w-full max-w-md shadow-xl animate-fade-in">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-text mb-1" style={{ fontFamily: 'var(--font-serif)' }}>
            {step === 'key' ? 'Welcome to prd-bin' : 'Choose a model'}
          </h2>
          <p className="text-sm text-text-secondary mb-5">
            {step === 'key'
              ? 'Enter your OpenRouter API key to start generating PRDs.'
              : 'Select the LLM you want to use.'}
          </p>

          {step === 'key' ? (
            <>
              <input
                type="password"
                value={key}
                onChange={(e) => { setKey(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleValidateKey()}
                placeholder="sk-or-v1-..."
                className="w-full px-3.5 py-2.5 bg-bg-input border border-border-input rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-light transition-all font-mono text-sm"
                autoFocus
              />

              {error && <p className="text-error text-sm mt-2">{error}</p>}

              <p className="text-xs text-text-tertiary mt-3 leading-relaxed">
                Your key is stored locally in your browser and only sent to OpenRouter.
              </p>

              <div className="flex items-center justify-between mt-5">
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  Get a key <ExternalLink size={10} />
                </a>
                <button
                  onClick={handleValidateKey}
                  disabled={validating || !key.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-text text-text-inverse rounded-lg text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {validating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ArrowRight size={14} />
                  )}
                  {validating ? 'Validating...' : 'Continue'}
                </button>
              </div>
            </>
          ) : (
            <>
              {loadingModels ? (
                <div className="flex items-center justify-center py-8 gap-2 text-text-secondary text-sm">
                  <Loader2 size={15} className="animate-spin" />
                  Loading models...
                </div>
              ) : (
                <>
                  <div className="max-h-64 overflow-y-auto space-y-px -mx-1 mb-4">
                    {popular.length > 0 && (
                      <>
                        <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-1 py-1.5">Popular</p>
                        {popular.map((model) => (
                          <ModelRow
                            key={model.id}
                            model={model}
                            selected={selectedModelId === model.id}
                            onSelect={() => { setSelectedModelId(model.id); setError('') }}
                          />
                        ))}
                        <div className="border-t border-border my-2 mx-1" />
                      </>
                    )}
                    {others.length > 0 && (
                      <>
                        <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-1 py-1.5">All models</p>
                        {others.slice(0, 40).map((model) => (
                          <ModelRow
                            key={model.id}
                            model={model}
                            selected={selectedModelId === model.id}
                            onSelect={() => { setSelectedModelId(model.id); setError('') }}
                          />
                        ))}
                      </>
                    )}
                  </div>

                  {/* Selected model cost summary */}
                  {selectedModelInfo?.pricing && (
                    <div className="flex gap-3 px-3 py-2 bg-bg-secondary rounded-lg mb-4 text-xs">
                      <span className="text-text-secondary">
                        Input: <span className="font-medium text-cost">{formatCost(selectedModelInfo.pricing.prompt)}</span>
                      </span>
                      <span className="text-text-secondary">
                        Output: <span className="font-medium text-cost">{formatCost(selectedModelInfo.pricing.completion)}</span>
                      </span>
                    </div>
                  )}

                  {error && <p className="text-error text-sm mb-3">{error}</p>}

                  <div className="flex justify-between">
                    <button
                      onClick={() => setStep('key')}
                      className="px-3 py-2 text-sm text-text-secondary hover:text-text transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSelectModel}
                      disabled={!selectedModelId}
                      className="flex items-center gap-1.5 px-4 py-2 bg-text text-text-inverse rounded-lg text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Start <ArrowRight size={14} />
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ModelRow({ model, selected, onSelect }: { model: ModelInfo; selected: boolean; onSelect: () => void }) {
  const promptCost = model.pricing?.prompt ? formatCost(model.pricing.prompt) : null

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2 rounded-md transition-colors cursor-pointer ${
        selected
          ? 'bg-primary-light text-text'
          : 'text-text-secondary hover:bg-bg-hover hover:text-text'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-sm font-medium block truncate">{model.name}</span>
          <span className="text-[11px] text-text-tertiary truncate block">{model.id}</span>
        </div>
        {promptCost && (
          <span className="text-[10px] font-medium text-cost whitespace-nowrap flex-shrink-0">
            {promptCost}
          </span>
        )}
      </div>
    </button>
  )
}
