# Changelog

All notable changes to Echo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
