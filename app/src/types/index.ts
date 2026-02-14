export type AnnotationType = 'highlight' | 'note' | 'bookmark'

export interface TextSelection {
  pageNumber: number
  text: string
  coordinates?: {
    x: number
    y: number
    width: number
    height: number
    // For multi-line selections, store individual rectangles per line
    rects?: Array<{
      x: number
      y: number
      width: number
      height: number
    }>
  }
}

export interface Highlight extends TextSelection {
  id: string
  type: 'highlight'
  color?: string
  note?: string
  createdAt: Date
}

export interface FreeFormNote {
  id: string
  type: 'note'
  content: string
  createdAt: Date
  pageNumber?: number
}

export interface Bookmark {
  id: string
  type: 'bookmark'
  pageNumber: number
  createdAt: Date
}

export type Annotation = Highlight | FreeFormNote | Bookmark

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMProvider {
  name: string
  sendMessage: (message: string, apiKey: string, model: string, systemInstructions?: string, conversationHistory?: LLMMessage[]) => Promise<string>
  getAvailableModels(): string[]
  getDefaultModel(): string
  fetchAvailableModels?(apiKey: string): Promise<string[]>
}

export interface PDFDocument {
  file: File
  url: string
  numPages: number
}
