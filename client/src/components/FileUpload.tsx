/**
 * FileUpload.tsx — Drag-and-drop file upload for PRD context
 *
 * Supports images (png, jpg, webp) and text files (txt, md).
 * Images are converted to base64 data URIs for vision model support.
 * Text files are read via FileReader.
 */

import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react'

export interface FileAttachment {
  name: string
  type: 'image' | 'text'
  content: string // base64 data URI for images, plain text for text files
  preview?: string // thumbnail URL for images
}

interface FileUploadProps {
  attachments: FileAttachment[]
  onChange: (attachments: FileAttachment[]) => void
  disabled?: boolean
}

const ACCEPTED_IMAGE = ['image/png', 'image/jpeg', 'image/webp']
const ACCEPTED_TEXT = ['text/plain', 'text/markdown']
const MAX_FILES = 5
const MAX_SIZE_MB = 10

export function FileUpload({ attachments, onChange, disabled }: FileUploadProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File): Promise<FileAttachment | null> => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return null

    if (ACCEPTED_IMAGE.includes(file.type)) {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
          const dataUri = reader.result as string
          resolve({
            name: file.name,
            type: 'image',
            content: dataUri,
            preview: dataUri,
          })
        }
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(file)
      })
    }

    if (ACCEPTED_TEXT.includes(file.type) || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
          resolve({
            name: file.name,
            type: 'text',
            content: reader.result as string,
          })
        }
        reader.onerror = () => resolve(null)
        reader.readAsText(file)
      })
    }

    return null
  }, [])

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (disabled) return
    const remaining = MAX_FILES - attachments.length
    const toProcess = Array.from(files).slice(0, remaining)
    const results = await Promise.all(toProcess.map(processFile))
    const valid = results.filter(Boolean) as FileAttachment[]
    if (valid.length > 0) {
      onChange([...attachments, ...valid])
    }
  }, [attachments, onChange, processFile, disabled])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleRemove = (index: number) => {
    onChange(attachments.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <label className="block text-[13px] font-medium text-text mb-1.5">
        Context files
        <span className="text-text-tertiary font-normal ml-1">optional</span>
      </label>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-1.5 px-4 py-5 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
          dragging
            ? 'border-primary bg-primary-light/30'
            : 'border-border-input hover:border-border-hover hover:bg-bg-hover/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Upload size={18} className="text-text-tertiary" />
        <p className="text-xs text-text-secondary text-center">
          Drop images or text files here, or <span className="text-primary font-medium">browse</span>
        </p>
        <p className="text-[10px] text-text-tertiary">
          PNG, JPG, WEBP, TXT, MD • Max {MAX_SIZE_MB}MB • Up to {MAX_FILES} files
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.webp,.txt,.md"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
        disabled={disabled}
      />

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {attachments.map((att, i) => (
            <div key={i} className="relative group flex items-center gap-2 px-2.5 py-1.5 bg-bg-secondary border border-border rounded-lg">
              {att.type === 'image' ? (
                <div className="w-8 h-8 rounded overflow-hidden bg-bg-hover flex-shrink-0">
                  <img src={att.preview} alt={att.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <FileText size={16} className="text-text-tertiary flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs text-text font-medium truncate max-w-[120px]">{att.name}</p>
                <p className="text-[10px] text-text-tertiary">
                  {att.type === 'image' ? (
                    <span className="flex items-center gap-0.5"><ImageIcon size={8} /> Image</span>
                  ) : (
                    `${att.content.length} chars`
                  )}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleRemove(i) }}
                className="ml-1 p-0.5 text-text-tertiary hover:text-error rounded transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
