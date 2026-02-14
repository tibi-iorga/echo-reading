# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Development server:
```bash
cd app && npm run dev
```

Build:
```bash
cd app && npm run build
```

Linting:
```bash
cd app && npm run lint
```

Testing:
```bash
cd app && npm test          # Run unit tests with Vitest
cd app && npm run test:run  # Run tests once
cd app && npm run test:e2e  # Run Playwright E2E tests (currently disabled)
```

Version management:
```bash
cd app && npm run version:patch  # Bump patch version
cd app && npm run version:minor  # Bump minor version
cd app && npm run version:major  # Bump major version
```

Pre-deployment check:
```bash
./deploy-check.bat  # Windows
./deploy-check.sh   # Linux/Mac
```

## Project Architecture

This is a React-based PDF reader application with AI chat capabilities. All development happens in the `app/` directory.

### Core Architecture

- **React 19** frontend with TypeScript
- **Vite** for build tooling and development server
- **Tailwind CSS** for styling
- **react-pdf** (PDF.js wrapper) for PDF rendering
- **Local storage** for data persistence with encrypted IndexedDB for API keys
- **File sync service** for optional external annotation storage

### Key Services

- `storageService` (`app/src/services/storage/storageService.ts`): Manages all local storage, IndexedDB encryption, and file sync coordination
- `llmService` (`app/src/services/llm/llmService.ts`): Provider abstraction for LLM APIs (supports OpenAI and Anthropic Claude)
- `fileSyncService` (`app/src/services/fileSync/fileSyncService.ts`): Optional sync to external files

### Component Structure

- `PDFViewer/` - PDF rendering, text selection, highlights overlay, search, navigation
- `NotesPanel/` - Annotations list, chat interface, settings panel with tabbed layout
- `FileSelector/` - Initial file picker and drag-drop
- Various modals for highlights, notes, export, settings

### State Management

- React hooks for PDF state (`usePDF`), annotations (`useAnnotations`), keyboard shortcuts
- Local state in `App.tsx` coordinates all components
- Persistent state via `storageService` with versioned data migration

### Data Models

Core types in `app/src/types/index.ts`:
- `Annotation` union type: `Highlight | FreeFormNote | Bookmark`
- `TextSelection` with page coordinates for PDF text selections
- `LLMProvider` interface for chat provider abstraction

### Key Features

1. **PDF Rendering**: Uses react-pdf/PDF.js with custom highlight overlays
2. **Text Selection**: Captures coordinates for precise highlight positioning
3. **Annotations**: Highlights with notes, free-form notes, bookmarks
4. **LLM Integration**: Multi-provider chat (OpenAI/Anthropic) with document context
5. **Export**: Markdown, text, and PDF export of annotations
6. **File Sync**: Optional sync to external files for cross-device annotations

### Development Patterns

- Uses custom hooks for complex state logic
- Services follow singleton pattern with class-based architecture
- TypeScript strict mode with comprehensive type definitions
- Tailwind for all styling with utility-first approach
- Error boundaries and graceful fallbacks for PDF rendering issues

## Testing Notes

- Unit tests use Vitest with React Testing Library
- E2E tests use Playwright (currently disabled in config)
- Test migration scripts for storage service data versioning
- Manual testing required for PDF rendering and LLM integration