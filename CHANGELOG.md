# Changelog

All notable changes to Echo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.1] - 2026-03-13

### Added
- **Click-to-find highlight**: Clicking a highlight underline in the PDF scrolls to and briefly highlights the corresponding annotation in the notes panel
- **Feedback link**: Library header now includes a link to the Featurebase feedback board

### Fixed
- Smart quotes, em dashes, and other Unicode characters in PDF highlights no longer display as garbled text (e.g. `â€™` → `'`)

### Changed
- Highlights now render as subtle underlines instead of semi-transparent background fills, eliminating subpixel anti-aliasing artifacts at edges
- Close button navigates directly back to library without confirmation modal (all data auto-saves)
- Library header uses text labels (Settings, Feedback) instead of icons for clarity

## [0.6.0] - 2026-03-12

### Added
- **Supabase backend**: Books, annotations, canvas content, reading progress, and user settings now persist in Supabase (replaces local-only storage)
- **Authentication**: Clerk-based sign-in/sign-up with protected routes
- **Library view**: Book grid with cover thumbnails, upload modal, edit/delete, and Kindle-style reading progress indicators
- **Settings page**: Redesigned with sidebar navigation — Account (Clerk), LLM Settings, and Appearance sections
- **Client-side routing**: React Router with `/library`, `/read/:id`, `/settings`, `/sign-in`, `/sign-up` routes
- **Book upload**: PDF upload to Supabase Storage with automatic cover extraction and page count detection
- Supabase schema reference (`supabase-schema.sql`) and annotation migration script

### Changed
- PDF toolbar moved from bottom to top of the reading view for design consistency
- Toolbar height aligned with notes panel tab bar (`h-[61px]`)
- Reading progress now uses `last_page_read` (sequential position) instead of `furthest_page` (highest page visited)
- Keyboard shortcut: replaced Settings (S) with Canvas (V)
- Storage layer refactored — Supabase is now source of truth with localStorage as cache

### Removed
- Legacy file sync service (`fileSyncService.ts`)
- Inline settings panel from notes sidebar
- Import notes modal and open file modal (replaced by Library)
- Unsaved notes warning component (no longer needed with cloud sync)
- Deploy check scripts (redundant with CI)

## [0.5.0] - 2026-02-27

### Added
- **Canvas**: New writing tab in the right panel — a TipTap-based markdown editor for composing structured thinking alongside your reading
  - Rich text formatting toolbar: bold, italic, strikethrough, headings (H1–H3), bullet lists, numbered lists, blockquotes
  - BubbleMenu for quick formatting on text selection
  - `/notes` slash command to pull in highlights, notes, and bookmarks as formatted blockquotes
  - Slash command menu with keyboard navigation (arrow keys, Enter, Escape)
  - Canvas export modal with Markdown and plain text download
  - Copy to clipboard in both Notes and Canvas export modals
  - Canvas content persisted per PDF with auto-save (debounced 500ms)
  - Canvas content included in sync file for cross-browser persistence
  - Empty state placeholder: "Capture your thinking while you read. Type / to pull in your notes."
- Highlight note editing: inline modal to add or edit notes on existing highlights

### Changed
- Unified all content text to 16px across Chat, Notes, Canvas, and Export modals for consistent reading experience
- Chat input textarea bumped from 14px to 16px to match message content
- Toolbar formatting buttons sized consistently with action buttons
- Bullet list and numbered list icons redesigned for visual clarity

### Technical
- Added TipTap v3 editor dependencies (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`, `@tiptap/extension-placeholder`, `@tiptap/suggestion`)
- Extended `SyncFileData` interface with `canvasContent` field
- All sync file write paths preserve canvas content (annotations, page progress, metadata saves)
- Canvas editor styles managed via `.canvas-editor` CSS class (no Tailwind Typography plugin required)

## [0.4.0] - 2026-02-14

### Added
- Multi-provider LLM support: Choose between OpenAI and Anthropic Claude in Settings
- Dynamic model fetching: Available models are now fetched from APIs instead of using hardcoded lists
- Provider selection dropdown with auto-save functionality
- CORS support for Anthropic Claude API direct browser access
- Automatic API key clearing when switching providers for better UX

### Changed
- Updated Settings UI to be provider-agnostic with dynamic API key links
- Chat warning messages now reference "API key" instead of "OpenAI API key"
- Provider selection is now saved immediately when changed (no Save button required)
- Improved model selection logic with intelligent defaults based on availability

### Technical
- Added `fetchAvailableModels` method to LLM provider interface
- Enhanced LLM service architecture to support multiple providers seamlessly
- Added proper TypeScript types for dynamic model fetching
- Implemented fallback model lists for offline/error scenarios

## [0.3.2] - 2026-02-13

### Fixed
- Sync file annotations are now properly used as source of truth when opening a book (previously stale localStorage annotations could persist)
- Fixed data bleeding between books by clearing sync file handle when opening a new PDF
- Settings panel now refreshes sync file status when sync file is set via OpenFileModal

## [0.3.1] - 2026-02-13

### Added
- Keyboard shortcut for common actions
- Copy option when text is selected in chat and document view ([#2](https://github.com/tibi-iorga/echo-reading/issues/2))

### Fixed
- Chat assistant responses now render markdown correctly (headings, numbered lists) ([#1](https://github.com/tibi-iorga/echo-reading/issues/1))

### Changed
- Chat markdown rendering now uses react-markdown library for proper formatting (replaces custom renderer)
- E2E tests and Playwright config updates

## [0.3.0] - 2026-02-07

### Added
- **Export preview modal**: Preview annotations before exporting with a clean visual summary
- **Multi-format export**: Export notes to Markdown, PDF, or plain text formats
- **API key connection status**: Visual indicator (green dot for connected, red X for failed) with automatic testing on load and save
- **Shared SelectionActions component**: Reusable component for text selection menus in PDF viewer and chat
- **Clear chat confirmation**: Confirmation modal before clearing chat history to prevent accidental data loss
- **Responsive tab bar**: Tab buttons switch to icon-only mode when panel is narrow

### Changed
- Redesigned AnnotationList with accent colored borders, cleaner layout, and overflow menu for actions
- Improved SettingsPanel section headers with text truncation for narrow panels
- OpenFileModal cancel now properly clears PDF state instead of keeping it
- Various UI polish and layout improvements for better experience in narrow panels

## [0.2.0] - 2026-02-05

### Changed
- **Major UI redesign**: Complete overhaul of user interface components for improved usability and modern design
  - Redesigned NotesPanel with improved tab navigation and layout
  - Redesigned SettingsPanel with better organization and visual hierarchy
  - Redesigned FileSelector with enhanced file selection experience
  - Redesigned OpenFileModal with improved workflow and feedback
  - Redesigned PDFViewer with better controls and navigation
  - Redesigned Chat interface with improved message display and interactions
  - Added new AlertModal and ConfirmModal components for consistent user feedback
  - Added PDFToolbar component for better PDF navigation controls
  - Improved overall visual consistency and spacing across all components

### Fixed
- Fixed all TypeScript lint errors by replacing 'any' types with proper type definitions
- Fixed React hooks dependency warnings in App, NotesPanel, and SettingsPanel components
- Fixed TypeScript compilation errors in pdfTextExtractor utility
- Improved E2E test helpers to properly wait for UI elements before interaction
- Fixed unused variable warnings in test files
- Added role='tab' attributes to NotesPanel tabs for improved accessibility

### Security
- Updated jspdf from 4.0.0 to 4.1.0 to address high-severity vulnerabilities:
  - PDF Injection in AcroFormChoiceField (GHSA-pqxr-3g65-p328)
  - Denial of Service via Unvalidated BMP Dimensions (GHSA-95fx-jjr5-f39c)
  - Stored XMP Metadata Injection (GHSA-vm32-vv63-w422)
  - Shared State Race Condition in addJS Plugin (GHSA-cjw8-79x6-5cj4)

### Changed (Technical)
- Improved type safety across codebase with proper TypeScript interfaces

### Note
- E2E tests requiring PDF files will fail until test fixtures are added to the repository
- Remaining security vulnerabilities (pdfjs-dist, vite/esbuild) require breaking changes and will be addressed in a future update

## [0.1.5] - 2026-01-29

### Fixed
- Create Sync File button in the unsynced notes banner now switches to Settings and expands the Sync File section

## [0.1.4] - 2026-01-29

### Added
- Document metadata placeholders in chat instructions: `{{document_title}}` and `{{document_author}}` are automatically replaced with current document info
- Reset to Default button for chat instructions
- Tooltip explaining placeholder syntax in Chat Instructions section
- Custom favicon (vinyl record icon)

### Changed
- Default chat instructions now include document context automatically
- Existing users with old default instructions are auto-migrated to new format

## [0.1.3] - 2026-01-28

### Security
- API keys are now encrypted at rest using Web Crypto AES-GCM in IndexedDB instead of plain localStorage
- Error messages are sanitized to prevent accidental API key exposure in console output or UI
- Added SECURITY.md documenting data handling and security model

### Added
- API connection testing to validate keys before saving
- Automatic migration of existing API keys from localStorage to encrypted storage
- Fallback mode for browsers without IndexedDB CryptoKey support (in-memory storage)

### Fixed
- Rules of hooks violation in PDFViewer component

## [0.1.2] - 2025-01-28

### Changed
- Replaced browser alert with inline error state in Chat component when API key is missing
- Refactored Settings panel to use per-section save buttons with clear saved/unsaved states
- Improved API key management UX with "Save Changes" button text for unsaved states

### Added
- Ability to clear/remove API key from Settings panel
- Real-time API key status updates in Chat component
- Inline error message in Chat when API key is not configured with link to Settings

### Fixed
- Chat input no longer allows typing when API key is not set (previously showed browser alert after typing)
- Settings panel now shows only OpenAI as LLM provider option

### Removed
- Anthropic provider support (simplified to OpenAI only)
- Browser alert popup for missing API key

## [0.1.1] - 2025-01-28

### Added
- Version display in settings panel

### Fixed
- Removed exposed debug logging endpoints and UUID from public repository

### Security
- Removed all debug logging calls that exposed UUID and localhost endpoint
- Fixed security issue where debug endpoint UUID was publicly visible

## [0.1.0] - 2025-01-28

### Added
- Initial stable release
- PDF reading with Adobe Reader-style controls (search, bookmarks, page navigation, zoom)
- Annotation system supporting highlights, comments, and free-form notes
- LLM chat integration with provider abstraction (OpenAI, Anthropic)
- Export annotations and notes to Markdown format
- Split view layout with PDF on left and notes panel on right
- Local-first architecture with localStorage persistence
- Data migration system for backward compatibility
- Theme support (light/dark mode)
- Dictionary lookup for selected text
- File sync support for external annotation files

### Changed
- (none)

### Fixed
- (none)

### Security
- (none)
