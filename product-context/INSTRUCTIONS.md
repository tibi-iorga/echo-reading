# Echo - Project Instructions

## Problem Statement
Users reading non-fiction PDFs need to seamlessly copy context between the document and LLM interfaces. The current workflow of manual copy-paste is inefficient and disrupts the reading flow.

## Target Users
Self-learners who want to deeply understand material at its core.

## Core Value Proposition
Echo is an AI reading companion that allows users to open a PDF, read it, annotate it, and send content to an LLM seamlessly without context switching.

## MVP Features (Must Have)
1. **PDF Reader** - Display and navigate PDF documents with classic Adobe Reader controls (search, bookmarks, page navigation, zoom)
2. **Copy to LLM** - Seamless integration to send selected text/context to LLM
3. **LLM API Key Input** - User can configure their own LLM API key
4. **Export Notes** - Export annotations and notes in Markdown (.md) format (flat list initially)
5. **PDF Selection** - Select and load PDF files from local folder
6. **Annotation System** - Support all annotation types: text highlights, comments/notes attached to selections, and free-form notes

## Future Features (Can Wait)
- User authentication (evaluate if required for MVP)

## Technical Requirements

### Tech Stack Preferences
- **Frontend**: Modern web framework
- **Styling**: Tailwind CSS (minimize custom CSS, use established design patterns)
- **Development**: Localhost initially while nailing UX
- **Deployment**: Web application initially

### Architecture Constraints
- **Local-first**: Everything runs locally initially
- **No authentication**: Not required for MVP (re-evaluate if needed)
- **API Integration**: LLM provider abstraction layer (similar to Cursor's approach)
  - Initial provider: OpenAI
  - Architecture should support multiple providers (Anthropic, etc.) without major refactoring
  - User configures API key for their chosen provider

### Data & Content
- **Input**: Long PDF documents
- **Output**: Markdown (.md) notes and annotations
- **User Actions**: 
  - Read PDFs (consumption)
  - Create notes and annotations (creation)

### Scale & Performance
- Local execution acceptable for initial version
- Optimize for handling long PDF documents

### Security & Compliance
- No specific requirements at this time
- API key storage should be handled securely (local storage acceptable for MVP)

## Success Criteria
User can:
1. Open a PDF from local folder
2. Read and navigate the document
3. Annotate and take notes
4. Select text and send to LLM seamlessly
5. Export all notes and annotations as Markdown

## Development Approach
- Focus on UX refinement during localhost development
- Use established design patterns and libraries
- Keep styling simple with Tailwind, avoid custom CSS where possible
- Iterate on core workflow before adding advanced features

## Timeline & Resources
- Timeline: Flexible
- Budget: Not a constraint
- Maintenance: Self-maintained

## Design Philosophy
- Simple, clean interface
- Minimal custom CSS
- Established software design patterns
- Focus on core reading and annotation workflow

## UI/UX Specifications

### Layout
- **Split view**: PDF viewer on left side, notes panel on right side (similar to NotebookLM or Cursor)
- Responsive split that can be adjusted by user

### PDF Reader Features
- Classic Adobe Reader style controls:
  - Search within document
  - Bookmarks
  - Page navigation (previous/next, jump to page)
  - Zoom controls (zoom in, zoom out, fit to width, fit to page)

### Annotation Types
- **Text highlights**: Select and highlight text in PDF
- **Comments/notes**: Attach notes to specific text selections
- **Free-form notes**: Standalone notes not tied to specific text

### Notes Export
- Export format: Markdown (.md)
- Structure: Flat list initially (can be refined later)
- Include all annotations and notes

### LLM Integration
- Provider abstraction layer for easy switching between LLM providers
- Initial support: OpenAI
- Design for extensibility to other providers (Anthropic, etc.)
