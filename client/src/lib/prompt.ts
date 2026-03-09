import type { PrdFormData } from '../stores/generateStore'

export function buildPrdPrompt(formData: PrdFormData): Array<{ role: string; content: string }> {
  const systemPrompt = `You are an expert Product Manager and Technical Architect. Your task is to generate a comprehensive, production-quality Product Requirements Document (PRD).

## Output Rules:
1. Write in clear, professional English.
2. Use proper Markdown formatting with headers (##, ###), bullet points, tables, and code blocks.
3. Include Mermaid diagrams where specified — wrap them in \`\`\`mermaid code blocks.
4. Be specific and actionable — avoid vague statements.
5. Include realistic examples and edge cases.
6. Structure the PRD with clear section numbering.

## PRD Structure to Follow:
1. **Executive Summary** — Brief overview of the product, its purpose, and key value proposition.
2. **Problem Statement** — What problem does this solve? Why does it matter?
3. **Target Users & Personas** — Who are the primary users? Create 2-3 detailed personas.
4. **User Stories** — Key user stories in "As a [user], I want to [action], so that [benefit]" format. Include acceptance criteria.
5. **Functional Requirements** — Detailed feature list organized by priority (Must Have, Should Have, Nice to Have).
6. **Non-Functional Requirements** — Performance, security, scalability, accessibility requirements.
7. **System Architecture** — High-level architecture overview.
8. **Tech Stack Recommendation** — Recommended technologies with justification.
9. **User Flow Diagram** — Create a Mermaid flowchart showing the main user journey:
   \`\`\`mermaid
   flowchart TD
       A[Start] --> B[Step 1]
       B --> C{Decision}
       C -->|Yes| D[Action]
       C -->|No| E[Alternative]
   \`\`\`
10. **Entity Relationship Diagram (ERD)** — Create a Mermaid ERD showing the data model:
    \`\`\`mermaid
    erDiagram
        USER ||--o{ ORDER : places
        ORDER ||--|{ LINE-ITEM : contains
    \`\`\`
11. **API Endpoints** — Key API endpoints with methods, paths, and descriptions.
12. **Success Metrics** — KPIs and how to measure them.
13. **Timeline & Milestones** — Suggested development phases.
14. **Risks & Mitigations** — Potential risks and how to address them.

Make the document thorough yet practical. Every section should provide real value.`

  const userPrompt = `Generate a comprehensive PRD for the following product:

**Product Name:** ${formData.appName}

**Target Audience:** ${formData.targetAudience}

**Product Description:**
${formData.description}

${formData.techStack ? `**Preferred Tech Stack:** ${formData.techStack}` : '(No tech stack preference — recommend the best options)'}

Please generate a complete, production-quality PRD following your structured format. Include detailed Mermaid diagrams for User Flow and ERD.`

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
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
