/**
 * PrdForm.tsx — Main form for generating PRDs
 *
 * Includes template selector, product details input fields,
 * AI description generator, and the generate/stop button.
 */

import { ArrowRight, Loader2, Square, Sparkles, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useGenerateStore } from '../stores/generateStore'
import { useSettingsStore } from '../stores/settingsStore'
import { generatePrd } from '../lib/api'
import { buildPrdPrompt } from '../lib/prompt'
import { templates } from '../lib/templates'
import { FileUpload } from './FileUpload'

export function PrdForm() {
  const { formData, setFormData, isStreaming, appendContent, setStreaming, setComplete, setError, resetContent, abortController, setAbortController } =
    useGenerateStore()
  const { apiKey, selectedModel, customInstructions } = useSettingsStore()
  const [generatingDesc, setGeneratingDesc] = useState(false)
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowTemplateDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedTemplate = templates.find((t) => t.id === formData.selectedTemplate) || templates[0]

  const handleGenerate = async () => {
    if (!formData.appName.trim() || !formData.description.trim()) return
    if (!apiKey || !selectedModel) return

    resetContent()
    setStreaming(true)

    const controller = new AbortController()
    setAbortController(controller)

    const messages = buildPrdPrompt(formData, customInstructions)

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
    <div className="animate-fade-in no-print">
      <h1 className="text-2xl font-bold text-text mb-1" style={{ fontFamily: 'var(--font-serif)' }}>
        Draft a PRD
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        Describe your product and let AI generate a comprehensive requirements document.
      </p>

      <div className="space-y-4">
        {/* Template Selector */}
        <div ref={dropdownRef} className="relative">
          <label className="block text-[13px] font-medium text-text mb-1.5">
            Template
          </label>
          <button
            onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
            disabled={isStreaming}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-bg-input border border-border-input rounded-lg text-text text-sm hover:border-border-hover focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-light transition-all disabled:opacity-50 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span className="text-base">{selectedTemplate.emoji}</span>
              <span className="font-medium">{selectedTemplate.label}</span>
              <span className="text-text-tertiary text-xs hidden sm:inline">— {selectedTemplate.description}</span>
            </span>
            <ChevronDown size={14} className={`text-text-tertiary transition-transform ${showTemplateDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showTemplateDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-bg-elevated border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setFormData({ selectedTemplate: t.id })
                    setShowTemplateDropdown(false)
                  }}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-bg-hover transition-colors cursor-pointer ${
                    t.id === formData.selectedTemplate ? 'bg-bg-hover' : ''
                  }`}
                >
                  <span className="text-lg mt-0.5">{t.emoji}</span>
                  <div>
                    <div className="text-sm font-medium text-text">{t.label}</div>
                    <div className="text-xs text-text-tertiary mt-0.5">{t.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

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
          <FileUpload
            attachments={formData.attachments || []}
            onChange={(attachments) => setFormData({ attachments })}
            disabled={isStreaming}
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
