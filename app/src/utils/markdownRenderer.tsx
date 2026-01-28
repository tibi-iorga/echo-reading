import React from 'react'

/**
 * Simple markdown renderer for basic formatting
 * Supports: **bold**, *italic*, `code`, numbered lists
 */
export function renderMarkdown(text: string): React.ReactNode[] {
  let keyCounter = 0

  // Regex patterns for inline markdown (order matters - bold before italic)
  const boldRegex = /\*\*(.+?)\*\*/g
  const codeRegex = /`(.+?)`/g

  const processInlineMarkdown = (text: string): React.ReactNode[] => {
    if (!text) return []

    const nodes: React.ReactNode[] = []
    let lastIndex = 0
    const matches: Array<{ index: number; length: number; type: string; content: string }> = []

    // Find all matches - process bold first, then italic, then code
    let match
    
    // Find bold matches
    boldRegex.lastIndex = 0
    while ((match = boldRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: 'bold',
        content: match[1],
      })
    }
    
    // Find italic matches (avoiding ** by checking context)
    // Simple approach: find *text* but ensure it's not part of **text**
    const italicPattern = /\*([^*\n]+?)\*/g
    italicPattern.lastIndex = 0
    while ((match = italicPattern.exec(text)) !== null) {
      // Check if this is part of a bold match (should start with ** or end with **)
      const before = text.substring(Math.max(0, match.index - 1), match.index)
      const after = text.substring(match.index + match[0].length, match.index + match[0].length + 1)
      // If before or after is *, it's part of bold, skip it
      if (before !== '*' && after !== '*') {
        matches.push({
          index: match.index,
          length: match[0].length,
          type: 'italic',
          content: match[1],
        })
      }
    }
    
    // Find code matches
    codeRegex.lastIndex = 0
    while ((match = codeRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: 'code',
        content: match[1],
      })
    }

    // Sort matches by index
    matches.sort((a, b) => a.index - b.index)

    // Remove overlapping matches (keep the first one)
    const filteredMatches: typeof matches = []
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]
      const overlaps = filteredMatches.some(
        (m) =>
          (match.index >= m.index && match.index < m.index + m.length) ||
          (m.index >= match.index && m.index < match.index + match.length)
      )
      if (!overlaps) {
        filteredMatches.push(match)
      }
    }

    // Process text with matches
    filteredMatches.forEach((match) => {
      // Add text before match
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index)
        if (beforeText) {
          nodes.push(
            <React.Fragment key={`text-${keyCounter++}`}>
              {beforeText}
            </React.Fragment>
          )
        }
      }

      // Add formatted content
      let content: React.ReactNode = match.content
      if (match.type === 'bold') {
        content = <strong key={`bold-${keyCounter++}`}>{match.content}</strong>
      } else if (match.type === 'italic') {
        content = <em key={`italic-${keyCounter++}`}>{match.content}</em>
      } else if (match.type === 'code') {
        content = (
          <code
            key={`code-${keyCounter++}`}
            className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono text-gray-900 dark:text-gray-100"
          >
            {match.content}
          </code>
        )
      }

      nodes.push(content)
      lastIndex = match.index + match.length
    })

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex)
      if (remainingText) {
        nodes.push(
          <React.Fragment key={`text-${keyCounter++}`}>
            {remainingText}
          </React.Fragment>
        )
      }
    }

    return nodes.length > 0 ? nodes : [text]
  }

  // Split by newlines to handle paragraphs and lists
  const lines = text.split('\n')
  const result: React.ReactNode[] = []
  let listItems: React.ReactNode[] = []
  let listKey: string | null = null

  const flushList = () => {
    if (listItems.length > 0 && listKey) {
      result.push(
        <ul key={listKey} className="list-decimal list-inside space-y-1 my-2">
          {listItems}
        </ul>
      )
      listItems = []
      listKey = null
    }
  }

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim()
    
    // Empty line - flush list if we have one, add paragraph break
    if (trimmedLine === '') {
      flushList()
      if (lineIndex < lines.length - 1) {
        result.push(<br key={`br-${keyCounter++}`} />)
      }
      return
    }

    // Numbered list item (e.g., "1. **Bold text**")
    const numberedListMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/)
    if (numberedListMatch) {
      if (!listKey) {
        listKey = `list-${keyCounter++}`
      }
      const listContent = processInlineMarkdown(numberedListMatch[2])
      listItems.push(
        <li key={`li-${keyCounter++}`} className="ml-4">
          {listContent}
        </li>
      )
      return
    }

    // Regular paragraph - flush list first
    flushList()
    
    const processed = processInlineMarkdown(line)
    result.push(...processed)
    
    if (lineIndex < lines.length - 1) {
      result.push(<br key={`br-${keyCounter++}`} />)
    }
  })

  // Flush any remaining list
  flushList()

  return result.length > 0 ? result : [text]
}
