# prd-bin

**Local-first, open source PRD generator powered by AI.**

Generate comprehensive Product Requirements Documents (PRD) with visual diagrams — all running on your localhost. Your ideas stay private, your API key stays yours.

## Features

- **100% Local** — Runs entirely on localhost, your data never leaves your machine
- **BYOK (Bring Your Own Key)** — Use your own OpenRouter API key
- **Flexible Model Selection** — Easily filter models by Premium, Balanced, and Economy tiers with real-time input/output costs
- **Real-time Streaming** — Watch your PRD being generated live via SSE
- **File Context Uploads** — Upload images (wireframes) and text files for multimodal vision model integration
- **AI Description Generator** — Auto-draft your PRD description based on product name and audience
- **Auto Diagrams** — User Flow, ERD, and other diagrams auto-rendered with Mermaid.js
- **📝 WYSIWYG Editor** — Edit the generated PRD directly using a clean, Notion-like Tiptap rich-text editor
- **💬 PRD Chat Assistant** — Iteratively refine your PRDs chatting with an AI assistant directly in the viewer
- **Export & Integrations** — Download as MD/PDF, or export directly to **Notion**, **Jira**, and **Linear**
- **Server Cache History** — PRDs are automatically saved and accessible via a clean, collapsable Sidebar
- **Dual Theme** — Beautiful Claude.ai-inspired editorial light mode and warm olive dark mode

## Quick Start

```bash
# Clone the repo
git clone https://github.com/<username>/prd-bin.git
cd prd-bin

# Install dependencies
pnpm install
cd client && pnpm install
cd ../server && pnpm install
cd ..

# Run both client & server
pnpm dev

# Open http://localhost:5173
```

> Clone to running app in under 2 minutes

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 19 + Vite | Lightning-fast HMR, minimal bundle |
| Backend | Hono | ~14KB micro framework for API proxy & file caching |
| Styling | Tailwind CSS v4 | Utility-first, robust dark mode system |
| State | Zustand | ~1KB, dual-writes to localStorage and server |
| Diagrams | Mermaid.js | Client-side rendering, lazy-loaded, theme-aware |
| Export | Browser native | `window.print()` for print-perfect PDFs |

## How It Works

1. **Enter your OpenRouter API key** — validated instantly
2. **Pick a model** — Use the Advanced filter to choose from Premium, Balanced, or Economy models like Claude, Gemini, GPT-4o, DeepSeek, etc.
3. **Add Context** — Upload wireframe images or text files 
4. **Describe your product** — Use the AI generator to draft a description from your product name
5. **Click Generate** — PRD streams in real-time with:
   - Executive Summary
   - User Personas & Stories
   - System Architecture
   - User Flow Diagram (Mermaid)
   - ERD (Mermaid)
   - API Endpoints
   - Timeline & more
6. **Refine & Edit** — Chat with the embedded AI assistant for iterative suggestions, or use the Tiptap WYSIWYG editor to make rich-text edits directly.
7. **Export or Auto-save** — Export directly to Notion/Jira/Linear, download as MD/PDF, and access past PRDs anytime from the Sidebar history.

## Project Structure

```
prd-bin/
├── client/               # React frontend (Vite)
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── stores/       # Zustand state stores
│   │   ├── lib/          # API client & prompt templates
│   │   └── App.tsx
│   └── vite.config.ts
├── server/               # Hono backend
│   ├── data/prds/        # Local JSON cache storage
│   └── index.ts          # API proxy & caching logic
├── package.json          # Root scripts
└── README.md
```

## Getting an API Key

1. Go to [OpenRouter](https://openrouter.ai/keys)
2. Create a free account
3. Generate an API key
4. Paste it into prd-bin when prompted

## Docker (Optional)

Docker is completely optional. You only need it if you want to deploy prd-bin to a cloud server without manually installing Node.js, or want to share the app easily.

```bash
docker compose up
# Open http://localhost:3000
```

## License

[MIT](./LICENSE) — Use it however you want.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.
