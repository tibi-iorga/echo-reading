# Echo

Echo is an AI reading companion that allows users to open a PDF, read it, annotate it, and send content to an LLM seamlessly without context switching.

## Features

- PDF Reader with classic Adobe Reader style controls (search, bookmarks, page navigation, zoom)
- Annotation system supporting highlights, comments, and free form notes
- LLM integration with provider abstraction (OpenAI, Anthropic)
- Export annotations and notes to Markdown format
- Split view layout with PDF on left and notes panel on right

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

## Project Structure

```
app/
├── src/
│   ├── components/      # React components
│   │   ├── PDFViewer/  # PDF viewing components
│   │   ├── NotesPanel/ # Notes and annotations UI
│   │   └── FileSelector/
│   ├── hooks/          # Custom React hooks
│   ├── services/       # Business logic services
│   │   ├── llm/        # LLM provider abstraction
│   │   └── storage/    # Local storage service
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions
├── package.json
└── vite.config.ts
```

## Usage

1. Click "Choose PDF File" to load a PDF document
2. Select text in the PDF to create highlights or comments
3. Use the Notes panel to add free form notes
4. Configure your LLM API key in Settings
5. Use the LLM Chat tab to interact with the AI
6. Export all annotations as Markdown using the Export button

## Tech Stack

- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- react-pdf for PDF rendering
- Local storage for data persistence
