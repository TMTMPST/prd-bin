# Contributing to prd-bin

Thanks for wanting to contribute! 🎉

## Development Setup

```bash
# Fork & clone
git clone https://github.com/<your-username>/prd-bin.git
cd prd-bin

# Install dependencies
pnpm install
cd client && pnpm install
cd ../server && pnpm install
cd ..

# Start dev servers (client + server)
pnpm dev
```

- Frontend runs at `http://localhost:5173`
- Backend proxy runs at `http://localhost:3001`

## Project Overview

- `client/` — React 19 + Vite + Tailwind CSS v4 frontend
- `server/` — Hono backend (proxies OpenRouter API)

## Coding Standards

- **TypeScript** — strict mode, no `any` unless absolutely necessary
- **ESLint + Prettier** — run `pnpm lint` before submitting
- **Components** — functional components with hooks
- **State** — Zustand stores in `client/src/stores/`

## Pull Request Guidelines

1. Fork the repo and create a branch from `main`
2. Keep PRs focused — one feature or fix per PR
3. Write clear commit messages
4. Make sure `pnpm build` passes
5. Describe what your PR does and why

## Reporting Bugs

Use GitHub Issues with the `bug` label. Include:
- Steps to reproduce
- Expected vs actual behavior  
- Browser & OS info

## Feature Requests

Use GitHub Issues with the `enhancement` label. Describe:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives considered
