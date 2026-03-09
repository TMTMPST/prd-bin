import { ArrowRight, Loader2, Square, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useGenerateStore } from '../stores/generateStore'
import { useSettingsStore } from '../stores/settingsStore'
import { generatePrd } from '../lib/api'
import { buildPrdPrompt } from '../lib/prompt'

export function PrdForm() {
  const { formData, setFormData, isStreaming, appendContent, setStreaming, setComplete, setError, resetContent, abortController, setAbortController } =
    useGenerateStore()
  const { apiKey, selectedModel } = useSettingsStore()
  const [generatingDesc, setGeneratingDesc] = useState(false)

  const handleGenerate = async () => {
    if (!formData.appName.trim() || !formData.description.trim()) return
    if (!apiKey || !selectedModel) return

    resetContent()
    setStreaming(true)

    const controller = new AbortController()
    setAbortController(controller)

    const messages = buildPrdPrompt(formData)

    await generatePrd(
      apiKey,
      selectedModel,
      messages,
      (chunk) => appendContent(chunk),
      () => { setStreaming(false); setComplete(true); setAbortController(null) },
      (err) => { setError(err); setStreaming(false); setAbortController(null) },
      controller.signal
    )
  }

  const handleStop = () => {
    abortController?.abort()
    setStreaming(false)
    setComplete(true)
    setAbortController(null)
  }

  const handleGenerateDescription = async () => {
    if (!formData.appName.trim() || !apiKey || !selectedModel) return

    setGeneratingDesc(true)
    const prompt = `Write a concise product description (3-5 sentences) for an app called "${formData.appName}"${
      formData.targetAudience ? ` targeting ${formData.targetAudience}` : ''
    }${formData.techStack ? ` built with ${formData.techStack}` : ''}. Focus on the problem it solves, key features, and value proposition. Be specific and actionable. Return ONLY the description text, no markdown formatting.`

    let desc = ''
    await generatePrd(
      apiKey,
      selectedModel,
      [{ role: 'user', content: prompt }],
      (chunk) => {
        desc += chunk
        setFormData({ description: desc })
      },
      () => setGeneratingDesc(false),
      () => setGeneratingDesc(false),
    )
  }

  const isFormValid = formData.appName.trim() && formData.description.trim()
  const canGenerateDesc = formData.appName.trim() && apiKey && selectedModel && !isStreaming && !generatingDesc

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-text mb-1" style={{ fontFamily: 'var(--font-serif)' }}>
        Draft a PRD
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        Describe your product and let AI generate a comprehensive requirements document.
      </p>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-text mb-1.5">
              Product name
            </label>
            <input
              type="text"
              value={formData.appName}
              onChange={(e) => setFormData({ appName: e.target.value })}
              placeholder="TaskFlow"
              disabled={isStreaming}
              className="w-full px-3.5 py-2.5 bg-bg-input border border-border-input rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-light transition-all text-sm disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-text mb-1.5">
              Target audience
              <span className="text-text-tertiary font-normal ml-1">optional</span>
            </label>
            <input
              type="text"
              value={formData.targetAudience}
              onChange={(e) => setFormData({ targetAudience: e.target.value })}
              placeholder="Remote teams, freelancers"
              disabled={isStreaming}
              className="w-full px-3.5 py-2.5 bg-bg-input border border-border-input rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-light transition-all text-sm disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[13px] font-medium text-text">
              Description
            </label>
            <button
              onClick={handleGenerateDescription}
              disabled={!canGenerateDesc}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-text-tertiary hover:text-primary hover:bg-primary-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="AI-generate a description from the product name"
            >
              {generatingDesc ? (
                <>
                  <Loader2 size={11} className="animate-spin" />
                  Writing...
                </>
              ) : (
                <>
                  <Sparkles size={11} />
                  Generate
                </>
              )}
            </button>
          </div>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ description: e.target.value })}
            placeholder="What problem does this product solve? What are the key features you have in mind?"
            rows={4}
            disabled={isStreaming}
            className="w-full px-3.5 py-2.5 bg-bg-input border border-border-input rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-light transition-all text-sm resize-y min-h-24 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-text mb-1.5">
            Tech stack
            <span className="text-text-tertiary font-normal ml-1">optional</span>
          </label>
          <input
            type="text"
            value={formData.techStack}
            onChange={(e) => setFormData({ techStack: e.target.value })}
            placeholder="Next.js, PostgreSQL, Tailwind CSS"
            disabled={isStreaming}
            className="w-full px-3.5 py-2.5 bg-bg-input border border-border-input rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-light transition-all text-sm disabled:opacity-50"
          />
        </div>

        <div className="pt-1">
          {isStreaming ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-text-secondary hover:text-text hover:bg-bg-hover transition-all cursor-pointer"
            >
              <Square size={13} fill="currentColor" />
              Stop
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!isFormValid}
              className="flex items-center gap-2 px-5 py-2.5 bg-text text-text-inverse rounded-lg text-sm font-medium disabled:opacity-30 hover:opacity-90 transition-opacity cursor-pointer"
            >
              Generate PRD
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
