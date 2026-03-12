# Echo App

The frontend application for [Echo](https://www.echoreading.com), an AI reading companion for PDFs.

## Tech Stack

- React 19 with TypeScript (strict mode)
- Vite for build tooling
- Tailwind CSS for styling (dark mode via class strategy)
- react-pdf for PDF rendering
- TipTap for the Canvas rich text editor
- Clerk for authentication
- Supabase for backend (PostgreSQL + Storage)

## Getting Started

### Prerequisites

- Node.js 18+

### Installation

```bash
npm install --legacy-peer-deps
```

### Environment Variables

Create `.env.local` in this directory:

```
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build

```bash
npm run build
```

### Tests

```bash
npm run test:run          # Unit tests (Vitest, single run)
npm run test              # Unit tests in watch mode
npm run test:coverage     # Unit tests with coverage
npm run test:e2e          # Full Playwright E2E suite
```

## Project Structure

```
app/
├── src/
│   ├── components/
│   │   ├── auth/           # Sign-in, sign-up pages
│   │   ├── landing/        # Public landing page
│   │   ├── layout/         # ProtectedLayout, SupabaseProvider
│   │   ├── Library/        # Book grid, upload, edit modals
│   │   ├── PDFViewer/      # PDF rendering, highlights overlay
│   │   ├── NotesPanel/     # Annotations, chat, canvas tabs
│   │   ├── reading/        # Reading view orchestration
│   │   └── ConfirmModal/   # Shared confirmation modal
│   ├── hooks/              # usePDF, useAnnotations, useCanvas, useLibrary
│   ├── services/
│   │   ├── llm/            # Multi-provider LLM abstraction
│   │   ├── storage/        # localStorage + encrypted IndexedDB
│   │   ├── supabase/       # Supabase client, service, types
│   │   └── dictionary/     # Dictionary lookup
│   ├── contexts/           # ThemeContext (dark/light mode)
│   ├── pages/              # SystemSettings
│   ├── types/              # Shared TypeScript types
│   ├── utils/              # Export, PDF text extraction, parsers
│   ├── App.tsx             # Main reading view component
│   ├── AppRoutes.tsx       # Route definitions
│   └── main.tsx            # Entry point (Clerk + Router + Theme)
├── public/                 # Static assets (favicon)
├── tests/                  # E2E tests (Playwright)
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── vercel.json             # Vercel deployment config
```

## Usage

1. Sign up or sign in at the landing page
2. Upload a PDF from the Library view
3. Open a book to start reading
4. Select text to create highlights or look up definitions
5. Use the Chat tab to ask questions about the document (requires an API key in Settings)
6. Use the Canvas tab to write structured notes (type `/notes` to import highlights)
7. Export your annotations and canvas as Markdown, PDF, or plain text

## Contributing

See the repository root for [CONTRIBUTING.md](../CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md).
