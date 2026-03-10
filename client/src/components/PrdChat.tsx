/**
 * PrdChat.tsx — Chat with your PRD
 *
 * A collapsible chat panel that lets users ask follow-up questions
 * about a generated PRD. The full PRD is included as context in every
 * API call, enabling deep analysis and task generation.
 */

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, Loader2, Trash2, Zap } from 'lucide-react'
import { useChatStore, type ChatMessage } from '../stores/chatStore'
import { useSettingsStore } from '../stores/settingsStore'
import { generatePrd } from '../lib/api'

interface PrdChatProps {
  prdContent: string
}

const QUICK_ACTIONS = [
  { label: 'Write Jira tickets', prompt: 'Break down this PRD into actionable Jira tickets with story points and acceptance criteria.' },
  { label: 'List test cases', prompt: 'Generate a comprehensive list of test cases (unit, integration, e2e) for this product.' },
  { label: 'Identify risks', prompt: 'What are the top technical and business risks in this PRD? How would you mitigate each one?' },
  { label: 'Suggest improvements', prompt: 'What are the weakest sections of this PRD? How could they be improved?' },
  { label: 'Estimate effort', prompt: 'Provide a rough effort estimate (in developer-weeks) for building this product, broken down by phase.' },
]

export function PrdChat({ prdContent }: PrdChatProps) {
  const { messages, isStreaming, error, addMessage, updateLastAssistant, setStreaming, setError, clearChat } = useChatStore()
  const { apiKey, selectedModel } = useSettingsStore()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || !apiKey || !selectedModel || isStreaming) return

    setInput('')
    setError(null)

    // Add user message
    const userMsg: ChatMessage = { role: 'user', content: messageText }
    addMessage(userMsg)

    // Add empty assistant message to stream into
    addMessage({ role: 'assistant', content: '' })
    setStreaming(true)

    // Build messages with PRD context
    const systemPrompt = `You are an expert Product Manager and Technical Architect. You have just created the following PRD document. Answer the user's questions about it thoroughly, referencing specific sections when relevant. Use Markdown formatting in your responses.

---
${prdContent}
---

Respond to the user's questions about this PRD. Be specific, actionable, and reference the document above.`

    const chatHistory = [...useChatStore.getState().messages.slice(0, -1)] // Exclude the empty assistant msg
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.map((m) => ({ role: m.role, content: m.content })),
    ]

    await generatePrd(
      apiKey,
      selectedModel,
      apiMessages,
      (chunk) => updateLastAssistant(chunk),
      () => setStreaming(false),
      (err) => { setError(err); setStreaming(false) },
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="mb-6 border border-border rounded-xl bg-bg-secondary overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-sm font-medium text-text">Chat with this PRD</span>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            disabled={isStreaming}
            className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer disabled:opacity-40"
          >
            <Trash2 size={11} />
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="max-h-[400px] overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-4">
            <p className="text-xs text-text-tertiary mb-3">
              Ask questions about your PRD, generate tickets, or explore edge cases.
            </p>
            {/* Quick action chips */}
            <div className="flex flex-wrap justify-center gap-1.5">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleSend(action.prompt)}
                  disabled={!apiKey || !selectedModel}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-bg-elevated border border-border rounded-full text-xs text-text-secondary hover:text-text hover:border-border-hover transition-colors cursor-pointer disabled:opacity-40"
                >
                  <Zap size={10} />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
              msg.role === 'user'
                ? 'bg-text text-text-inverse rounded-br-sm'
                : 'bg-bg-elevated border border-border rounded-bl-sm'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="markdown-content chat-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content || '...'}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="px-3 py-2 text-xs text-error bg-error/5 rounded-lg border border-error/20">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-3 py-2.5 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this PRD..."
          rows={1}
          disabled={isStreaming}
          className="flex-1 px-3 py-2 bg-bg-input border border-border-input rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-primary-light text-sm resize-none disabled:opacity-50"
        />
        <button
          onClick={() => handleSend()}
          disabled={isStreaming || !input.trim()}
          className="p-2.5 bg-text text-text-inverse rounded-lg hover:opacity-90 transition-opacity disabled:opacity-30 cursor-pointer flex-shrink-0"
        >
          {isStreaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  )
}
