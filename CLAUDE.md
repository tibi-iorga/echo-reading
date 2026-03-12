# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Echo is a client-side React application — an AI reading companion for PDFs. Users open PDFs, annotate them, chat with LLMs (OpenAI/Anthropic) about document content, write structured notes in a Canvas editor, and export everything. All data stays on-device (localStorage, IndexedDB for encrypted API keys, optional File System API sync).

## Repository Layout

The app source lives in `app/`. All npm commands must be run from the `app/` directory.

- `app/src/App.tsx` — Main component (~1000 lines), manages top-level state and orchestrates the split-view layout (PDF left, notes panel right)
- `app/src/components/` — React components organized by feature (PDFViewer/, NotesPanel/, FileSelector/, modals)
- `app/src/hooks/` — Custom hooks: `usePDF`, `useAnnotations`, `useCanvas`, `useKeyboardShortcuts`
- `app/src/services/` — Business logic layer:
  - `llm/` — Multi-provider LLM abstraction (`llmService.ts`, `providers.ts`)
  - `storage/` — localStorage persistence + encrypted IndexedDB for API keys (`secureKeyStorage.ts`)
  - `fileSync/` — Cross-browser sync via File System Access API
  - `dictionary/` — Dictionary lookup service
- `app/src/types/index.ts` — All shared TypeScript types
- `app/src/utils/` — Export (MD/PDF/TXT), PDF text extraction, filename parsing, markdown rendering
- `app/src/contexts/ThemeContext.tsx` — Dark/light mode via CSS class
- `product-context/` — Project requirements and documentation (not committed to git)

## Commands

All commands run from the `app/` directory:

```bash
npm run dev              # Dev server at localhost:5173
npm run build            # TypeScript check + Vite production build
npm run lint             # ESLint (errors on unused vars, warns on react-refresh)
npm run test:run         # Unit tests (Vitest, single run)
npm run test             # Unit tests in watch mode
npm run test:coverage    # Unit tests with coverage report
npm run test:e2e         # Full Playwright E2E suite
npx playwright test tests/e2e/deployment-critical.spec.ts  # Stable E2E subset (preferred pre-deploy)
```

Run a single test file: `npx vitest run src/utils/filenameParser.test.ts`

Run a single E2E test: `npx playwright test tests/e2e/deployment-critical.spec.ts`

## Architecture Notes

**State management**: No Redux/Zustand — state lives in custom hooks (`usePDF`, `useAnnotations`, `useCanvas`) called from `App.tsx` and passed down via props. ThemeContext is the only React Context.

**LLM abstraction**: `services/llm/providers.ts` defines provider implementations; `llmService.ts` exposes a unified interface. Adding a new LLM provider means adding a provider class and registering it.

**Storage tiers**: (1) localStorage for annotations, settings, reading progress; (2) IndexedDB with encryption for API keys (`secureKeyStorage.ts`); (3) optional File System Access API for cross-browser sync files.

**Canvas editor**: Built on TipTap (rich text). Supports slash commands — `/notes` pulls in highlights from the current document.

**Path alias**: `@/` maps to `app/src/` (configured in both `tsconfig.json` and `vite.config.ts`).

## Conventions

- **Commit messages**: Conventional format — `feat:`, `fix:`, `refactor:`, `docs:`, `style:`, `chore:`, `security:`, `test:`
- **Unused variables**: Prefix with `_` to suppress ESLint errors (e.g., `_selectedText`)
- **TypeScript**: Strict mode enabled with `noUnusedLocals` and `noUnusedParameters`
- **Styling**: Tailwind CSS; dark mode via class strategy
- **Install flag**: Use `npm install --legacy-peer-deps` (React 19 peer dep compatibility)

## Deployment

Pushes to `master` auto-deploy to Vercel. Always run build, lint, and tests before pushing. The `vercel.json` configures SPA routing (all routes rewrite to `index.html`) and asset caching.

## Testing

- **Unit tests**: Vitest + React Testing Library. Test files colocated with source (`*.test.ts`, `*.test.tsx`). Setup in `src/test/setup.ts` mocks browser APIs (matchMedia, IntersectionObserver, ResizeObserver). Custom render with ThemeProvider in `src/test/utils.tsx`.
- **E2E tests**: Playwright in `tests/e2e/`. `deployment-critical.spec.ts` is the stable subset without external API calls.
- **Test fixtures**: `tests/fixtures/` (sample PDFs — not committed to git)
