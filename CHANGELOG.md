# Changelog

All notable changes to Echo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
