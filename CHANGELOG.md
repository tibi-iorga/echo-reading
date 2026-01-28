# Changelog

All notable changes to Echo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
