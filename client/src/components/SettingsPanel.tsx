/**
 * SettingsPanel.tsx — User settings page
 *
 * Sections: API Key, Model (with recommended), History toggle,
 * Custom Instructions, and Integrations (Notion, Jira, Linear).
 */

import { useState, useEffect, useMemo } from 'react'
import { Trash2, Loader2, ToggleLeft, ToggleRight, ExternalLink, ChevronDown, Search, ArrowUpDown } from 'lucide-react'
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
    apiKey, selectedModel, historyEnabled, customInstructions,
    notionApiKey, notionParentPageId,
    jiraEmail, jiraApiToken, jiraDomain, jiraProjectKey,
    linearApiKey, linearTeamId,
    setApiKey, setSelectedModel, setHistoryEnabled, setCustomInstructions,
    setNotionConfig, setJiraConfig, setLinearConfig,
  } = useSettingsStore()

  const [showKey, setShowKey] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [validating, setValidating] = useState(false)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [error, setError] = useState('')
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null)

  // Model selection state
  const [modelSearch, setModelSearch] = useState('')
  const [modelCategory, setModelCategory] = useState<'all' | 'premium' | 'balanced' | 'economy'>('all')
  const [sortOrder, setSortOrder] = useState<'cost-desc' | 'cost-asc'>('cost-desc')

  // Local state for integration forms
  const [nKey, setNKey] = useState(notionApiKey)
  const [nPage, setNPage] = useState(notionParentPageId)
  const [jEmail, setJEmail] = useState(jiraEmail)
  const [jToken, setJToken] = useState(jiraApiToken)
  const [jDomain, setJDomain] = useState(jiraDomain)
  const [jProject, setJProject] = useState(jiraProjectKey)
  const [lKey, setLKey] = useState(linearApiKey)
  const [lTeam, setLTeam] = useState(linearTeamId)

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
      if (result.valid) { setApiKey(newKey.trim()); setNewKey('') }
      else { setError(result.error || 'Invalid key') }
    } catch { setError('Could not validate key') }
    finally { setValidating(false) }
  }

  const handleClearKey = () => { setApiKey(''); setSelectedModel(''); setModels([]) }

  const maskedKey = apiKey ? `${apiKey.slice(0, 10)}···${apiKey.slice(-4)}` : ''
  const selectedModelInfo = models.find((m) => m.id === selectedModel)

  // Advanced model filtering & sorting
  const filteredModels = useMemo(() => {
    let result = [...models]

    // 1. Text Search
    if (modelSearch.trim()) {
      const query = modelSearch.toLowerCase()
      result = result.filter(m => m.name.toLowerCase().includes(query) || m.id.toLowerCase().includes(query))
    }

    // 2. Category Filter
    if (modelCategory !== 'all') {
      result = result.filter(m => {
        const cost = parseFloat(m.pricing?.prompt || '0') * 1_000_000
        const id = m.id.toLowerCase()
        
        if (modelCategory === 'premium') {
          // Expensive/High Reasoning models
          return id.includes('opus') || id.includes('gpt-4') || id.includes('gemini-1.5-pro') || id.includes('gemini-2.5-pro') || (cost > 2.0 && !id.includes('mini') && !id.includes('flash') && !id.includes('haiku'))
        }
        if (modelCategory === 'balanced') {
          // Mid-tier models
          return id.includes('sonnet') || ((cost > 0.15 && cost <= 2.0) || id.includes('llama-3.3-70b') || id.includes('deepseek-chat'))
        }
        if (modelCategory === 'economy') {
          // Cheap/Fast models
          return id.includes('haiku') || id.includes('flash') || id.includes('mini') || cost <= 0.15
        }
        return true
      })
    }

    // 3. Sorting
    result.sort((a, b) => {
      const costA = parseFloat(a.pricing?.prompt || '0')
      const costB = parseFloat(b.pricing?.prompt || '0')
      return sortOrder === 'cost-desc' ? costB - costA : costA - costB
    })

    return result
  }, [models, modelSearch, modelCategory, sortOrder])

  // Group models for the dropdown (only if we are showing 'all' without search, otherwise flat list is usually better, but grouping is nice)
  const recommendedIds = [
    'anthropic/claude-3.7-sonnet', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o',
    'google/gemini-2.5-pro', 'google/gemini-pro-1.5', 'anthropic/claude-3-5-haiku',
    'openai/gpt-4o-mini', 'google/gemini-2.5-flash', 'google/gemini-flash-1.5',
    'meta-llama/llama-3.3-70b-instruct', 'deepseek/deepseek-chat'
  ]
  const displayedRecommended = filteredModels.filter(m => recommendedIds.some(id => m.id.includes(id)))
  const displayedOther = filteredModels.filter(m => !displayedRecommended.includes(m))

  const toggleIntegration = (id: string) => setExpandedIntegration(expandedIntegration === id ? null : id)

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-text mb-6" style={{ fontFamily: 'var(--font-serif)' }}>Settings</h1>

      <div className="space-y-6">
        {/* API Key */}
        <Section title="API Key">
          {apiKey ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-bg-secondary rounded-md text-sm text-text-secondary font-mono truncate">
                  {showKey ? apiKey : maskedKey}
                </code>
                <button onClick={() => setShowKey(!showKey)} className="px-2.5 py-2 text-xs text-text-secondary hover:text-text border border-border rounded-md hover:bg-bg-hover transition-colors cursor-pointer">
                  {showKey ? 'Hide' : 'Show'}
                </button>
                <button onClick={handleClearKey} className="p-2 text-text-tertiary hover:text-error rounded-md hover:bg-bg-hover transition-colors cursor-pointer">
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="text-xs text-success">Key configured</p>
            </div>
          ) : (
            <div className="space-y-2">
              <input type="password" value={newKey} onChange={(e) => { setNewKey(e.target.value); setError('') }} onKeyDown={(e) => e.key === 'Enter' && handleUpdateKey()} placeholder="sk-or-v1-..." className="w-full px-3.5 py-2.5 bg-bg-input border border-border-input rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-light transition-all font-mono text-sm" />
              {error && <p className="text-error text-xs">{error}</p>}
              <div className="flex items-center justify-between">
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary">
                  Get a key <ExternalLink size={10} />
                </a>
                <button onClick={handleUpdateKey} disabled={validating || !newKey.trim()} className="flex items-center gap-1.5 px-3 py-1.5 bg-text text-text-inverse rounded-md text-xs font-medium disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer">
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
            <div className="flex items-center gap-2 text-text-secondary text-sm py-1"><Loader2 size={13} className="animate-spin" />Loading...</div>
          ) : models.length > 0 ? (
            <div className="space-y-3">
              
              {/* Filter & Sort Controls */}
              <div className="space-y-3 bg-bg-secondary border border-border rounded-lg p-3">
                
                {/* Search & Sort Row */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input 
                      type="text" 
                      placeholder="Search models..." 
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-bg-input border border-border-input rounded-md text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-focus text-xs transition-all"
                    />
                  </div>
                  <button 
                    onClick={() => setSortOrder(prev => prev === 'cost-desc' ? 'cost-asc' : 'cost-desc')}
                    className="flex shrink-0 items-center justify-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-text-secondary hover:text-text hover:bg-bg-hover text-xs font-medium cursor-pointer transition-colors whitespace-nowrap"
                  >
                    <ArrowUpDown size={12} />
                    {sortOrder === 'cost-desc' ? 'Price: High → Low' : 'Price: Low → High'}
                  </button>
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryPill 
                    active={modelCategory === 'all'} 
                    onClick={() => { setModelCategory('all'); setSortOrder('cost-desc') }}
                    label="All" 
                  />
                  <CategoryPill 
                    active={modelCategory === 'premium'} 
                    onClick={() => { setModelCategory('premium'); setSortOrder('cost-desc') }}
                    label="✨ Premium" 
                  />
                  <CategoryPill 
                    active={modelCategory === 'balanced'} 
                    onClick={() => { setModelCategory('balanced'); setSortOrder('cost-desc') }}
                    label="⚖️ Balanced" 
                  />
                  <CategoryPill 
                    active={modelCategory === 'economy'} 
                    onClick={() => { setModelCategory('economy'); setSortOrder('cost-asc') }}
                    label="💸 Economy" 
                  />
                </div>
              </div>

              {/* Advanced Dropdown */}
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full px-3.5 py-2.5 bg-bg-input border border-border-input rounded-lg text-text focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-light transition-all text-sm cursor-pointer appearance-none shadow-sm">
                <option value="">Select a model...</option>
                {filteredModels.length === 0 && (
                  <option disabled>No models match your filters</option>
                )}
                
                {modelCategory === 'all' && !modelSearch ? (
                  <>
                    {displayedRecommended.length > 0 && (
                      <optgroup label="✨ Recommended Models">
                        {displayedRecommended.map((m) => (
                          <option key={m.id} value={m.id}>{m.name} {m.pricing?.prompt ? `— ${formatCost(m.pricing.prompt)}` : ''}</option>
                        ))}
                      </optgroup>
                    )}
                    {displayedOther.length > 0 && (
                      <optgroup label="Other Models">
                        {displayedOther.map((m) => (
                          <option key={m.id} value={m.id}>{m.name} {m.pricing?.prompt ? `— ${formatCost(m.pricing.prompt)}` : ''}</option>
                        ))}
                      </optgroup>
                    )}
                  </>
                ) : (
                  <>
                    {filteredModels.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} {m.pricing?.prompt ? `— ${formatCost(m.pricing.prompt)}` : ''}</option>
                    ))}
                  </>
                )}
              </select>

              {/* Selected Model Details */}
              {selectedModelInfo?.pricing && (
                <div className="flex items-center justify-between px-1">
                  <div className="text-xs font-medium text-text truncate max-w-[200px]" title={selectedModelInfo.name}>{selectedModelInfo.name}</div>
                  <div className="flex gap-3 text-[11px] text-text-secondary shrink-0">
                    <span>In: <span className="font-medium text-cost">{formatCost(selectedModelInfo.pricing.prompt)}</span></span>
                    <span>Out: <span className="font-medium text-cost">{formatCost(selectedModelInfo.pricing.completion)}</span></span>
                  </div>
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
            <p className="text-sm text-text-secondary">Keep generated PRDs in browser storage.</p>
            <button onClick={() => setHistoryEnabled(!historyEnabled)} className="cursor-pointer text-text-tertiary hover:text-text transition-colors">
              {historyEnabled ? <ToggleRight size={28} className="text-primary" /> : <ToggleLeft size={28} />}
            </button>
          </div>
        </Section>

        {/* Custom Instructions */}
        <Section title="Custom instructions">
          <p className="text-xs text-text-tertiary mb-2">These instructions will be appended to every generation.</p>
          <textarea value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} placeholder="e.g. Always write in Bahasa Indonesia. Focus on HIPAA compliance." rows={3} className="w-full px-3.5 py-2.5 bg-bg-input border border-border-input rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-light transition-all text-sm resize-y" />
        </Section>

        {/* Integrations */}
        <Section title="Integrations">
          <p className="text-xs text-text-tertiary mb-3">Connect external services to export your PRDs directly.</p>

          <div className="space-y-2">
            {/* Notion */}
            <IntegrationAccordion
              emoji="📝" label="Notion" configured={!!notionApiKey}
              expanded={expandedIntegration === 'notion'}
              onToggle={() => toggleIntegration('notion')}
            >
              <div className="space-y-2">
                <IntInput label="Integration Token" value={nKey} onChange={setNKey} placeholder="ntn_..." type="password" />
                <IntInput label="Parent Page ID" value={nPage} onChange={setNPage} placeholder="abc123..." />
                <button onClick={() => setNotionConfig({ apiKey: nKey, parentPageId: nPage })} disabled={!nKey.trim()} className="px-3 py-1.5 bg-text text-text-inverse rounded-md text-xs font-medium disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer">Save</button>
              </div>
            </IntegrationAccordion>

            {/* Jira */}
            <IntegrationAccordion
              emoji="🎫" label="Jira" configured={!!jiraApiToken}
              expanded={expandedIntegration === 'jira'}
              onToggle={() => toggleIntegration('jira')}
            >
              <div className="space-y-2">
                <IntInput label="Email" value={jEmail} onChange={setJEmail} placeholder="you@company.com" />
                <IntInput label="API Token" value={jToken} onChange={setJToken} placeholder="ATATT3x..." type="password" />
                <IntInput label="Domain" value={jDomain} onChange={setJDomain} placeholder="yourcompany.atlassian.net" />
                <IntInput label="Project Key" value={jProject} onChange={setJProject} placeholder="PRD" />
                <button onClick={() => setJiraConfig({ email: jEmail, apiToken: jToken, domain: jDomain, projectKey: jProject })} disabled={!jToken.trim()} className="px-3 py-1.5 bg-text text-text-inverse rounded-md text-xs font-medium disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer">Save</button>
              </div>
            </IntegrationAccordion>

            {/* Linear */}
            <IntegrationAccordion
              emoji="⚡" label="Linear" configured={!!linearApiKey}
              expanded={expandedIntegration === 'linear'}
              onToggle={() => toggleIntegration('linear')}
            >
              <div className="space-y-2">
                <IntInput label="API Key" value={lKey} onChange={setLKey} placeholder="lin_api_..." type="password" />
                <IntInput label="Team ID" value={lTeam} onChange={setLTeam} placeholder="abc123..." />
                <button onClick={() => setLinearConfig({ apiKey: lKey, teamId: lTeam })} disabled={!lKey.trim()} className="px-3 py-1.5 bg-text text-text-inverse rounded-md text-xs font-medium disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer">Save</button>
              </div>
            </IntegrationAccordion>
          </div>
        </Section>
      </div>
    </div>
  )
}

function CategoryPill({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-[11px] font-medium rounded-full cursor-pointer transition-colors border
        ${active 
          ? 'bg-text text-bg border-text shadow-sm' 
          : 'bg-bg-input text-text-secondary border-border-input hover:border-border hover:text-text hover:bg-bg-hover'
        }`}
    >
      {label}
    </button>
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

function IntegrationAccordion({
  emoji, label, configured, expanded, onToggle, children,
}: {
  emoji: string; label: string; configured: boolean; expanded: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-bg-hover transition-colors cursor-pointer">
        <span className="flex items-center gap-2 text-sm">
          <span>{emoji}</span>
          <span className="font-medium text-text">{label}</span>
          {configured && <span className="px-1.5 py-0.5 bg-success/10 text-success text-[10px] font-medium rounded-full">Connected</span>}
        </span>
        <ChevronDown size={13} className={`text-text-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="px-3.5 pb-3 pt-1 border-t border-border animate-fade-in">{children}</div>
      )}
    </div>
  )
}

function IntInput({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-text-secondary mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 bg-bg-input border border-border-input rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-light transition-all text-xs font-mono" />
    </div>
  )
}
