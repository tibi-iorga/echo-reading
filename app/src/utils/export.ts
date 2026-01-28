import type { Annotation } from '@/types'
import { jsPDF } from 'jspdf'

export interface ExportMetadata {
  title?: string
  author?: string | null
}

export function exportToMarkdown(annotations: Annotation[], metadata?: ExportMetadata): string {
  const lines: string[] = []
  
  // Add document metadata if available
  if (metadata?.title) {
    if (metadata.author) {
      lines.push(`# ${metadata.title}\n\n**Author:** ${metadata.author}\n`)
    } else {
      lines.push(`# ${metadata.title}\n`)
    }
    lines.push('')
  } else {
    lines.push('# Reading Notes\n')
  }

  const highlights = annotations.filter((a): a is Extract<typeof a, { type: 'highlight' }> => a.type === 'highlight')
  const notes = annotations.filter((a) => a.type === 'note')
  const bookmarks = annotations.filter((a) => a.type === 'bookmark')

  if (highlights.length > 0) {
    lines.push('## Highlights\n')
    highlights.forEach((highlight) => {
      if (highlight.pageNumber === 0) {
        lines.push(`### Saved from chat`)
      } else {
        lines.push(`### Page ${highlight.pageNumber}`)
      }
      lines.push(`> ${highlight.text}`)
      if (highlight.note) {
        lines.push(`\n**Note:** ${highlight.note}\n`)
      }
      lines.push('')
    })
  }

  if (notes.length > 0) {
    lines.push('## Free Form Notes\n')
    notes.forEach((note) => {
      const pageRef = note.pageNumber ? ` (Page ${note.pageNumber})` : ''
      lines.push(`### Note${pageRef}`)
      lines.push(`\n${note.content}\n`)
    })
  }

  if (bookmarks.length > 0) {
    lines.push('## Bookmarks\n')
    bookmarks.forEach((bookmark) => {
      lines.push(`- Page ${bookmark.pageNumber}`)
    })
    lines.push('')
  }

  return lines.join('\n')
}

export function exportToText(annotations: Annotation[], metadata?: ExportMetadata): string {
  const lines: string[] = []
  
  // Add document metadata if available
  if (metadata?.title) {
    if (metadata.author) {
      lines.push(`${metadata.title}`)
      lines.push(`Author: ${metadata.author}`)
    } else {
      lines.push(`${metadata.title}`)
    }
    lines.push('')
    lines.push('='.repeat(60))
    lines.push('')
  } else {
    lines.push('Reading Notes')
    lines.push('='.repeat(60))
    lines.push('')
  }

  const highlights = annotations.filter((a): a is Extract<typeof a, { type: 'highlight' }> => a.type === 'highlight')
  const notes = annotations.filter((a) => a.type === 'note')
  const bookmarks = annotations.filter((a) => a.type === 'bookmark')

  if (highlights.length > 0) {
    lines.push('HIGHLIGHTS')
    lines.push('-'.repeat(60))
    lines.push('')
    highlights.forEach((highlight) => {
      if (highlight.pageNumber === 0) {
        lines.push('Saved from chat')
      } else {
        lines.push(`Page ${highlight.pageNumber}`)
      }
      lines.push('')
      lines.push(highlight.text)
      if (highlight.note) {
        lines.push('')
        lines.push(`Note: ${highlight.note}`)
      }
      lines.push('')
      lines.push('-'.repeat(60))
      lines.push('')
    })
  }

  if (notes.length > 0) {
    lines.push('FREE FORM NOTES')
    lines.push('-'.repeat(60))
    lines.push('')
    notes.forEach((note) => {
      const pageRef = note.pageNumber ? ` (Page ${note.pageNumber})` : ''
      lines.push(`Note${pageRef}`)
      lines.push('')
      lines.push(note.content)
      lines.push('')
      lines.push('-'.repeat(60))
      lines.push('')
    })
  }

  if (bookmarks.length > 0) {
    lines.push('BOOKMARKS')
    lines.push('-'.repeat(60))
    lines.push('')
    bookmarks.forEach((bookmark) => {
      lines.push(`Page ${bookmark.pageNumber}`)
      lines.push('')
      lines.push('-'.repeat(60))
      lines.push('')
    })
  }

  return lines.join('\n')
}

export async function exportToPDF(annotations: Annotation[], metadata?: ExportMetadata): Promise<Blob> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const maxWidth = pageWidth - (margin * 2)
  let yPos = margin
  const lineHeight = 7
  const sectionSpacing = 10

  // Helper function to add text with word wrapping
  const addText = (text: string, fontSize: number, isBold: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize)
    doc.setTextColor(color[0], color[1], color[2])
    if (isBold) {
      doc.setFont('helvetica', 'bold')
    } else {
      doc.setFont('helvetica', 'normal')
    }
    
    const lines = doc.splitTextToSize(text, maxWidth)
    
    for (const line of lines) {
      if (yPos + lineHeight > pageHeight - margin) {
        doc.addPage()
        yPos = margin
      }
      doc.text(line, margin, yPos)
      yPos += lineHeight
    }
    
    doc.setFont('helvetica', 'normal')
  }

  // Helper function to add spacing
  const addSpacing = (spacing: number) => {
    if (yPos + spacing > pageHeight - margin) {
      doc.addPage()
      yPos = margin
    } else {
      yPos += spacing
    }
  }

  // Add document metadata if available
  if (metadata?.title) {
    addText(metadata.title, 18, true)
    addSpacing(3)
    if (metadata.author) {
      addText(`Author: ${metadata.author}`, 12)
    }
    addSpacing(sectionSpacing)
  } else {
    addText('Reading Notes', 18, true)
    addSpacing(sectionSpacing)
  }

  const highlights = annotations.filter((a): a is Extract<typeof a, { type: 'highlight' }> => a.type === 'highlight')
  const notes = annotations.filter((a) => a.type === 'note')

  if (highlights.length > 0) {
    addText('HIGHLIGHTS', 14, true)
    addSpacing(sectionSpacing)
    
    highlights.forEach((highlight) => {
      // Page number or source
      if (highlight.pageNumber === 0) {
        addText('Saved from chat', 11, true, [0, 0, 150])
      } else {
        addText(`Page ${highlight.pageNumber}`, 11, true, [0, 0, 150])
      }
      addSpacing(5)
      
      // Highlight text
      addText(highlight.text, 10, false, [0, 0, 0])
      addSpacing(5)
      
      // Note if present
      if (highlight.note) {
        addText(`Note: ${highlight.note}`, 9, false, [100, 100, 100])
        addSpacing(5)
      }
      
      addSpacing(sectionSpacing)
    })
  }

  if (notes.length > 0) {
    addSpacing(sectionSpacing)
    
    addText('FREE FORM NOTES', 14, true)
    addSpacing(sectionSpacing)
    
    notes.forEach((note) => {
      const pageRef = note.pageNumber ? ` (Page ${note.pageNumber})` : ''
      addText(`Note${pageRef}`, 11, true, [0, 0, 150])
      addSpacing(5)
      addText(note.content, 10, false, [0, 0, 0])
      addSpacing(sectionSpacing)
    })
  }

  return doc.output('blob')
}

export function downloadMarkdown(content: string, filename: string = 'highlights.md'): void {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadText(content: string, filename: string = 'highlights.txt'): void {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function downloadPDF(blob: Blob, filename: string = 'highlights.pdf'): Promise<void> {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportToJSON(annotations: Annotation[]): string {
  return JSON.stringify(annotations, null, 2)
}

export function downloadJSON(annotations: Annotation[], filename: string = 'notes.json'): void {
  const content = exportToJSON(annotations)
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
