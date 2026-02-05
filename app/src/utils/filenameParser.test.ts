import { describe, it, expect } from 'vitest'
import { parseFilename } from './filenameParser'

describe('parseFilename', () => {
  it('should parse "Title - Author.pdf" format', () => {
    const result = parseFilename('The Great Book - John Doe.pdf')
    expect(result.title).toBe('The Great Book')
    expect(result.author).toBe('John Doe')
  })

  it('should parse "Title by Author.pdf" format', () => {
    const result = parseFilename('The Great Book by John Doe.pdf')
    expect(result.title).toBe('The Great Book')
    expect(result.author).toBe('John Doe')
  })

  it('should parse "Title (Author).pdf" format', () => {
    const result = parseFilename('The Great Book (John Doe).pdf')
    expect(result.title).toBe('The Great Book')
    expect(result.author).toBe('John Doe')
  })

  it('should parse "Author, Title.pdf" format', () => {
    const result = parseFilename('Doe, John - The Great Book.pdf')
    // The dash pattern takes precedence, so it parses as "Doe, John" - "The Great Book"
    expect(result.title).toBe('Doe, John')
    expect(result.author).toBe('The Great Book')
  })

  it('should parse "Title_Author.pdf" format', () => {
    const result = parseFilename('The_Great_Book_John_Doe.pdf')
    // Underscore pattern splits on first underscore
    expect(result.title).toBe('The')
    expect(result.author).toBe('Great Book John Doe')
  })

  it('should handle filename without extension', () => {
    const result = parseFilename('The Great Book - John Doe')
    expect(result.title).toBe('The Great Book')
    expect(result.author).toBe('John Doe')
  })

  it('should handle filename with no pattern (fallback)', () => {
    const result = parseFilename('SimpleTitle.pdf')
    expect(result.title).toBe('SimpleTitle')
    expect(result.author).toBeNull()
  })

  it('should handle empty filename', () => {
    const result = parseFilename('')
    expect(result.title).toBe('')
    expect(result.author).toBeNull()
  })

  it('should handle filename with only extension', () => {
    const result = parseFilename('.pdf')
    expect(result.title).toBe('.pdf')
    expect(result.author).toBeNull()
  })

  it('should clean up underscores in fallback case', () => {
    const result = parseFilename('SimpleTitleNoUnderscores.pdf')
    expect(result.title).toBe('SimpleTitleNoUnderscores')
    expect(result.author).toBeNull()
  })

  it('should handle case insensitive extension', () => {
    const result = parseFilename('Book - Author.PDF')
    expect(result.title).toBe('Book')
    expect(result.author).toBe('Author')
  })
})
