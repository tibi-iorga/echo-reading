import type { Annotation } from '@/types'

export type ImportFormat = 'json' | 'markdown' | 'unknown'

export interface ImportResult {
  success: boolean
  annotations: Annotation[]
  format: ImportFormat
  error?: string
}

/**
 * Detects the format of imported content
 */
export function detectFormat(content: string): ImportFormat {
  const trimmed = content.trim()
  
  // Try JSON first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed)
      return 'json'
    } catch {
      // Not valid JSON, continue
    }
  }
  
  // Check for markdown patterns
  if (trimmed.includes('# Reading Notes') || 
      trimmed.includes('## Highlights') || 
      trimmed.includes('## Free Form Notes') ||
      trimmed.includes('### Page') ||
      trimmed.includes('> ')) {
    return 'markdown'
  }
  
  return 'unknown'
}

/**
 * Parses JSON format (full export with annotations array)
 */
function parseJSON(content: string): ImportResult {
  try {
    const data = JSON.parse(content)
    
    // Handle different JSON structures
    let annotations: Annotation[] = []
    
    if (Array.isArray(data)) {
      // Direct array of annotations
      annotations = data
    } else if (data.annotations && Array.isArray(data.annotations)) {
      // Object with annotations property
      annotations = data.annotations
    } else if (data.version && data.annotations) {
      // Versioned format
      annotations = data.annotations
    }
    
    // Validate and normalize annotations
    const normalized: Annotation[] = []
    for (const ann of annotations) {
      if (!ann.type || !ann.id) continue
      
      // Normalize dates
      const createdAt = ann.createdAt 
        ? (ann.createdAt instanceof Date ? ann.createdAt : new Date(ann.createdAt))
        : new Date()
      
      if (ann.type === 'highlight') {
        normalized.push({
          id: ann.id,
          type: 'highlight',
          pageNumber: ann.pageNumber ?? 0,
          text: ann.text || '',
          note: ann.note,
          color: ann.color,
          coordinates: ann.coordinates,
          createdAt,
        })
      } else if (ann.type === 'note') {
        normalized.push({
          id: ann.id,
          type: 'note',
          content: ann.content || '',
          pageNumber: ann.pageNumber,
          createdAt,
        })
      } else if (ann.type === 'bookmark') {
        normalized.push({
          id: ann.id,
          type: 'bookmark',
          pageNumber: ann.pageNumber ?? 0,
          createdAt,
        })
      }
    }
    
    return {
      success: true,
      annotations: normalized,
      format: 'json',
    }
  } catch (error) {
    return {
      success: false,
      annotations: [],
      format: 'json',
      error: error instanceof Error ? error.message : 'Invalid JSON format',
    }
  }
}

/**
 * Parses Markdown format (your current export format)
 */
function parseMarkdown(content: string): ImportResult {
  try {
    const annotations: Annotation[] = []
    const lines = content.split('\n')
    
    let currentSection: 'highlights' | 'notes' | null = null
    let currentHighlight: { pageNumber: number; text: string; note?: string } | null = null
    let currentNote: { content: string; pageNumber?: number } | null = null
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Section headers
      if (line.startsWith('## Highlights')) {
        currentSection = 'highlights'
        continue
      } else if (line.startsWith('## Free Form Notes')) {
        currentSection = 'notes'
        continue
      }
      
      // Page headers for highlights
      if (line.startsWith('### Page ')) {
        // Save previous highlight if exists
        if (currentHighlight) {
          annotations.push({
            id: `highlight_${Date.now()}_${annotations.length}`,
            type: 'highlight',
            pageNumber: currentHighlight.pageNumber,
            text: currentHighlight.text,
            note: currentHighlight.note,
            createdAt: new Date(),
          })
        }
        
        const pageMatch = line.match(/### Page (\d+)/)
        currentHighlight = {
          pageNumber: pageMatch ? parseInt(pageMatch[1], 10) : 0,
          text: '',
        }
        continue
      } else if (line.startsWith('### Saved from chat')) {
        if (currentHighlight) {
          annotations.push({
            id: `highlight_${Date.now()}_${annotations.length}`,
            type: 'highlight',
            pageNumber: currentHighlight.pageNumber,
            text: currentHighlight.text,
            note: currentHighlight.note,
            color: 'blue',
            createdAt: new Date(),
          })
        }
        currentHighlight = {
          pageNumber: 0,
          text: '',
        }
        continue
      } else if (line.startsWith('### Note')) {
        // Save previous note if exists
        if (currentNote) {
          annotations.push({
            id: `note_${Date.now()}_${annotations.length}`,
            type: 'note',
            content: currentNote.content,
            pageNumber: currentNote.pageNumber,
            createdAt: new Date(),
          })
        }
        
        const pageMatch = line.match(/### Note.*\(Page (\d+)\)/)
        currentNote = {
          content: '',
          pageNumber: pageMatch ? parseInt(pageMatch[1], 10) : undefined,
        }
        continue
      }
      
      // Process content based on current section
      if (currentSection === 'highlights' && currentHighlight) {
        if (line.startsWith('> ')) {
          // Highlighted text
          currentHighlight.text = line.substring(2).trim()
        } else if (line.startsWith('**Note:**')) {
          // Note on highlight
          currentHighlight.note = line.replace('**Note:**', '').trim()
        }
      } else if (currentSection === 'notes' && currentNote) {
        if (line.trim() && !line.startsWith('#')) {
          // Note content
          if (currentNote.content) {
            currentNote.content += '\n' + line
          } else {
            currentNote.content = line
          }
        }
      }
    }
    
    // Save last items
    if (currentHighlight && currentHighlight.text) {
      annotations.push({
        id: `highlight_${Date.now()}_${annotations.length}`,
        type: 'highlight',
        pageNumber: currentHighlight.pageNumber,
        text: currentHighlight.text,
        note: currentHighlight.note,
        createdAt: new Date(),
      })
    }
    
    if (currentNote && currentNote.content) {
      annotations.push({
        id: `note_${Date.now()}_${annotations.length}`,
        type: 'note',
        content: currentNote.content,
        pageNumber: currentNote.pageNumber,
        createdAt: new Date(),
      })
    }
    
    return {
      success: true,
      annotations,
      format: 'markdown',
    }
  } catch (error) {
    return {
      success: false,
      annotations: [],
      format: 'markdown',
      error: error instanceof Error ? error.message : 'Failed to parse markdown',
    }
  }
}

/**
 * Imports annotations from file content
 */
export function importAnnotations(content: string): ImportResult {
  const format = detectFormat(content)
  
  switch (format) {
    case 'json':
      return parseJSON(content)
    case 'markdown':
      return parseMarkdown(content)
    default:
      return {
        success: false,
        annotations: [],
        format: 'unknown',
        error: 'Unsupported file format. Please use JSON or Markdown.',
      }
  }
}

/**
 * Reads file content as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      resolve(e.target?.result as string)
    }
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    reader.readAsText(file)
  })
}
