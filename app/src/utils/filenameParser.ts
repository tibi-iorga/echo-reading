export interface ParsedDocumentInfo {
  title: string
  author: string | null
}

/**
 * Parses filename to extract book title and author
 * Handles common patterns:
 * - "Title - Author.pdf"
 * - "Author - Title.pdf"
 * - "Title by Author.pdf"
 * - "Title_by_Author.pdf"
 * - "Title (Author).pdf"
 * - "Author, Title.pdf"
 */
export function parseFilename(filename: string): ParsedDocumentInfo {
  // Remove .pdf extension
  const cleanName = filename.replace(/\.pdf$/i, '').trim()
  
  if (!cleanName) {
    return { title: filename, author: null }
  }

  // Pattern 1: "Title - Author" or "Author - Title"
  const dashPattern = /^(.+?)\s*-\s*(.+)$/
  const dashMatch = cleanName.match(dashPattern)
  if (dashMatch) {
    const [_, part1, part2] = dashMatch
    // Heuristic: if part2 is shorter or contains common author indicators, it's likely the author
    // Otherwise, assume "Title - Author" format
    if (part2.length < part1.length || part2.match(/\b(by|author|written by)\b/i)) {
      return { title: part1.trim(), author: part2.trim() }
    }
    // Could be "Author - Title", but default to "Title - Author" as more common
    return { title: part1.trim(), author: part2.trim() }
  }

  // Pattern 2: "Title by Author"
  const byPattern = /^(.+?)\s+by\s+(.+)$/i
  const byMatch = cleanName.match(byPattern)
  if (byMatch) {
    return { title: byMatch[1].trim(), author: byMatch[2].trim() }
  }

  // Pattern 3: "Title (Author)"
  const parenPattern = /^(.+?)\s*\(([^)]+)\)$/
  const parenMatch = cleanName.match(parenPattern)
  if (parenMatch) {
    return { title: parenMatch[1].trim(), author: parenMatch[2].trim() }
  }

  // Pattern 4: "Author, Title" (comma-separated, author first)
  const commaPattern = /^([^,]+),\s*(.+)$/
  const commaMatch = cleanName.match(commaPattern)
  if (commaMatch) {
    const [_, part1, part2] = commaMatch
    // If part1 is shorter, it's likely the author
    if (part1.length < part2.length || part1.split(/\s+/).length <= 3) {
      return { title: part2.trim(), author: part1.trim() }
    }
  }

  // Pattern 5: Underscores as separators "Title_Author" or "Author_Title"
  const underscorePattern = /^(.+?)_(.+)$/
  const underscoreMatch = cleanName.match(underscorePattern)
  if (underscoreMatch) {
    const [_, part1, part2] = underscoreMatch
    // Default to "Title_Author" format
    return { title: part1.trim().replace(/_/g, ' '), author: part2.trim().replace(/_/g, ' ') }
  }

  // Fallback: use entire filename as title
  // Clean up common separators
  const cleanedTitle = cleanName
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return { title: cleanedTitle, author: null }
}
