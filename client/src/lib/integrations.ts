/**
 * integrations.ts — Export PRD content to external services
 *
 * All API calls go through the server proxy to avoid CORS
 * and to keep integration tokens secure.
 */

const API_BASE = '/api'

// ─── Notion ──────────────────────────────────────────────

/**
 * Convert markdown to Notion blocks and create a page
 */
export async function exportToNotion(
  apiKey: string,
  parentPageId: string,
  title: string,
  markdownContent: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/export/notion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, parentPageId, title, content: markdownContent }),
  })
  return res.json()
}

// ─── Jira ────────────────────────────────────────────────

/**
 * Parse user stories from PRD and create Jira issues
 */
export async function exportToJira(
  email: string,
  apiToken: string,
  domain: string,
  projectKey: string,
  markdownContent: string
): Promise<{ success: boolean; issueCount?: number; error?: string }> {
  const res = await fetch(`${API_BASE}/export/jira`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, apiToken, domain, projectKey, content: markdownContent }),
  })
  return res.json()
}

// ─── Linear ──────────────────────────────────────────────

/**
 * Parse user stories from PRD and create Linear issues
 */
export async function exportToLinear(
  apiKey: string,
  teamId: string,
  markdownContent: string
): Promise<{ success: boolean; issueCount?: number; error?: string }> {
  const res = await fetch(`${API_BASE}/export/linear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, teamId, content: markdownContent }),
  })
  return res.json()
}
