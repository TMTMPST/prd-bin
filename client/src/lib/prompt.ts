/**
 * prompt.ts — Builds the message array for OpenRouter API calls
 *
 * Uses template-based system prompts and appends custom instructions.
 * Supports multimodal messages for vision models when image
 * attachments are present.
 */

import type { PrdFormData } from '../stores/generateStore'
import { getTemplate } from './templates'

type MessageContent = string | Array<{ type: string; text?: string; image_url?: { url: string } }>

export function buildPrdPrompt(
  formData: PrdFormData,
  customInstructions?: string
): Array<{ role: string; content: MessageContent }> {
  const template = getTemplate(formData.selectedTemplate)
  let systemPrompt = template.systemPrompt

  // Append custom instructions if provided
  if (customInstructions?.trim()) {
    systemPrompt += `\n\n## Additional Instructions from User:\n${customInstructions.trim()}`
  }

  let userPromptText = `Generate a comprehensive PRD for the following product:

**Product Name:** ${formData.appName}

**Target Audience:** ${formData.targetAudience}

**Product Description:**
${formData.description}

${formData.techStack ? `**Preferred Tech Stack:** ${formData.techStack}` : '(No tech stack preference — recommend the best options)'}

Please generate a complete, production-quality document following your structured format. Include detailed Mermaid diagrams where applicable.`

  // Append text file attachments as context
  const textAttachments = formData.attachments?.filter((a) => a.type === 'text') || []
  const imageAttachments = formData.attachments?.filter((a) => a.type === 'image') || []

  if (textAttachments.length > 0) {
    userPromptText += '\n\n## Uploaded Context Files:\n'
    for (const att of textAttachments) {
      userPromptText += `\n### ${att.name}\n\`\`\`\n${att.content}\n\`\`\`\n`
    }
    userPromptText += '\nPlease incorporate the information from these context files into the PRD where relevant.'
  }

  // Build messages — use multimodal format if images are present
  if (imageAttachments.length > 0) {
    const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: 'text', text: userPromptText + '\n\nPlease analyze the attached images (wireframes, screenshots, designs) and incorporate what you see into the PRD — describe the UI patterns, features, and user flows visible in these images.' },
    ]
    for (const img of imageAttachments) {
      contentParts.push({
        type: 'image_url',
        image_url: { url: img.content }, // base64 data URI
      })
    }

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: contentParts },
    ]
  }

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPromptText },
  ]
}

export function buildSectionRegeneratePrompt(
  sectionTitle: string,
  sectionContent: string,
  fullPrdContext: string
): Array<{ role: string; content: string }> {
  return [
    {
      role: 'system',
      content: `You are an expert Product Manager. You are editing a specific section of an existing PRD. Only output the regenerated section content (with the section header). Do not output the entire PRD. Use proper Markdown formatting and Mermaid diagrams if applicable.`,
    },
    {
      role: 'user',
      content: `Here is the full PRD for context:\n\n${fullPrdContext}\n\n---\n\nPlease regenerate the following section with improvements. Make it more detailed, specific, and actionable:\n\n## ${sectionTitle}\n${sectionContent}`,
    },
  ]
}
