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
      if (bookmark.type === 'bookmark' && bookmark.pageText) {
        lines.push(`### Page ${bookmark.pageNumber}`)
        lines.push(`\n${bookmark.pageText}\n`)
      } else {
        lines.push(`- Page ${bookmark.pageNumber}`)
      }
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
      if (bookmark.type === 'bookmark' && bookmark.pageText) {
        lines.push('')
        lines.push(bookmark.pageText)
      }
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
  const bookmarks = annotations.filter((a): a is Extract<typeof a, { type: 'bookmark' }> => a.type === 'bookmark')

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

  if (bookmarks.length > 0) {
    addSpacing(sectionSpacing)

    addText('BOOKMARKS', 14, true)
    addSpacing(sectionSpacing)

    bookmarks.forEach((bookmark) => {
      addText(`Page ${bookmark.pageNumber}`, 11, true, [0, 0, 150])
      if (bookmark.pageText) {
        addSpacing(5)
        addText(bookmark.pageText, 10, false, [0, 0, 0])
      }
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

// ─── Canvas export helpers ───────────────────────────────────────────────────

/**
 * Convert TipTap HTML to a clean Markdown string.
 * Handles the subset of nodes TipTap's StarterKit emits.
 */
export function canvasHtmlToMarkdown(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return walkNodes(doc.body.childNodes)
}

function walkNodes(nodes: NodeListOf<ChildNode>): string {
  let md = ''
  nodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      md += node.textContent ?? ''
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()

    switch (tag) {
      case 'h1':
        md += `# ${inline(el)}\n\n`
        break
      case 'h2':
        md += `## ${inline(el)}\n\n`
        break
      case 'h3':
        md += `### ${inline(el)}\n\n`
        break
      case 'p':
        md += `${inline(el)}\n\n`
        break
      case 'blockquote':
        walkNodes(el.childNodes)
          .trim()
          .split('\n')
          .forEach((line) => {
            md += `> ${line}\n`
          })
        md += '\n'
        break
      case 'ul':
        el.querySelectorAll(':scope > li').forEach((li) => {
          md += `- ${inline(li as HTMLElement)}\n`
        })
        md += '\n'
        break
      case 'ol': {
        let idx = 1
        el.querySelectorAll(':scope > li').forEach((li) => {
          md += `${idx}. ${inline(li as HTMLElement)}\n`
          idx++
        })
        md += '\n'
        break
      }
      case 'pre': {
        const code = el.querySelector('code')
        md += `\`\`\`\n${code?.textContent ?? el.textContent ?? ''}\n\`\`\`\n\n`
        break
      }
      case 'hr':
        md += `---\n\n`
        break
      default:
        md += walkNodes(el.childNodes)
        break
    }
  })
  return md
}

function inline(el: HTMLElement): string {
  let text = ''
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? ''
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const child = node as HTMLElement
    const tag = child.tagName.toLowerCase()
    const inner = inline(child)

    switch (tag) {
      case 'strong':
      case 'b':
        text += `**${inner}**`
        break
      case 'em':
      case 'i':
        text += `*${inner}*`
        break
      case 'code':
        text += `\`${inner}\``
        break
      case 's':
      case 'del':
        text += `~~${inner}~~`
        break
      default:
        text += inner
        break
    }
  })
  return text
}

export function exportCanvasToMarkdown(html: string, metadata?: ExportMetadata): string {
  const lines: string[] = []

  if (metadata?.title) {
    lines.push(`# Canvas — ${metadata.title}`)
    if (metadata.author) {
      lines.push(`**Author:** ${metadata.author}`)
    }
    lines.push('')
  }

  lines.push(canvasHtmlToMarkdown(html).trim())
  lines.push('')
  return lines.join('\n')
}

export function exportCanvasToHtml(html: string, metadata?: ExportMetadata): string {
  const title = metadata?.title ? `Canvas — ${metadata.title}` : 'Canvas'
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 700px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; line-height: 1.6; }
    blockquote { border-left: 3px solid #d1d5db; margin: 1rem 0; padding: 0.5rem 1rem; color: #4b5563; }
    pre { background: #f3f4f6; padding: 1rem; border-radius: 0.375rem; overflow-x: auto; }
    code { background: #f3f4f6; padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-size: 0.9em; }
    pre code { background: none; padding: 0; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
  </style>
</head>
<body>
${html}
</body>
</html>`
}

export function exportCanvasToText(html: string, metadata?: ExportMetadata): string {
  const md = canvasHtmlToMarkdown(html)
  // Strip markdown formatting to get plain text
  const plain = md
    .replace(/^#{1,3}\s+/gm, '')        // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')    // bold
    .replace(/\*(.+?)\*/g, '$1')         // italic
    .replace(/~~(.+?)~~/g, '$1')         // strikethrough
    .replace(/`([^`]+)`/g, '$1')         // inline code
    .replace(/^>\s?/gm, '  ')            // blockquotes → indent
    .replace(/^- /gm, '• ')              // bullet list
    .replace(/^```\n?/gm, '')            // code fences
    .replace(/^---$/gm, '────────────────────') // hr

  const lines: string[] = []

  if (metadata?.title) {
    lines.push(metadata.title)
    if (metadata.author) {
      lines.push(`Author: ${metadata.author}`)
    }
    lines.push('='.repeat(60))
    lines.push('')
  }

  lines.push(plain.trim())
  lines.push('')
  return lines.join('\n')
}

export async function exportCanvasToPDF(html: string, metadata?: ExportMetadata): Promise<Blob> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const maxWidth = pageWidth - (margin * 2)
  let yPos = margin
  const lineHeight = 7
  const sectionSpacing = 10

  const addText = (text: string, fontSize: number, isBold: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize)
    doc.setTextColor(color[0], color[1], color[2])
    doc.setFont('helvetica', isBold ? 'bold' : 'normal')

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

  const addSpacing = (spacing: number) => {
    if (yPos + spacing > pageHeight - margin) {
      doc.addPage()
      yPos = margin
    } else {
      yPos += spacing
    }
  }

  // Title
  if (metadata?.title) {
    addText(metadata.title, 18, true)
    addSpacing(3)
    if (metadata.author) {
      addText(`Author: ${metadata.author}`, 12)
    }
    addSpacing(sectionSpacing)
  }

  // Parse and render the HTML
  const parser = new DOMParser()
  const parsed = parser.parseFromString(html, 'text/html')

  function renderNodes(nodes: NodeListOf<ChildNode>) {
    nodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim()
        if (text) addText(text, 10)
        return
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return
      const el = node as HTMLElement
      const tag = el.tagName.toLowerCase()

      switch (tag) {
        case 'h1':
          addSpacing(5)
          addText(el.textContent ?? '', 16, true)
          addSpacing(sectionSpacing)
          break
        case 'h2':
          addSpacing(5)
          addText(el.textContent ?? '', 14, true)
          addSpacing(sectionSpacing)
          break
        case 'h3':
          addSpacing(3)
          addText(el.textContent ?? '', 12, true)
          addSpacing(sectionSpacing)
          break
        case 'p':
          addText(el.textContent ?? '', 10)
          addSpacing(5)
          break
        case 'blockquote':
          addText(el.textContent ?? '', 10, false, [100, 100, 100])
          addSpacing(5)
          break
        case 'ul':
          el.querySelectorAll(':scope > li').forEach((li) => {
            addText(`• ${li.textContent ?? ''}`, 10)
            addSpacing(3)
          })
          addSpacing(5)
          break
        case 'ol': {
          let idx = 1
          el.querySelectorAll(':scope > li').forEach((li) => {
            addText(`${idx}. ${li.textContent ?? ''}`, 10)
            addSpacing(3)
            idx++
          })
          addSpacing(5)
          break
        }
        case 'pre':
          addText(el.textContent ?? '', 9, false, [60, 60, 60])
          addSpacing(sectionSpacing)
          break
        case 'hr':
          addSpacing(sectionSpacing)
          break
        default:
          renderNodes(el.childNodes)
          break
      }
    })
  }

  renderNodes(parsed.body.childNodes)

  return doc.output('blob')
}

export function downloadHtml(content: string, filename: string = 'canvas.html'): void {
  const blob = new Blob([content], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Annotation export helpers ──────────────────────────────────────────────

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
