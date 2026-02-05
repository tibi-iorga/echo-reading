import { pdfjs } from 'react-pdf'

/**
 * Extracts text content from a specific page of a PDF
 * @param pdfUrl - The URL or file path of the PDF
 * @param pageNumber - The page number to extract (1-indexed)
 * @param maxLength - Maximum length of text to return (default: 10000 characters)
 * @returns Promise<string> - The extracted text content
 */
export async function extractPageText(pdfUrl: string, pageNumber: number, maxLength: number = 10000): Promise<string> {
  try {
    const loadingTask = pdfjs.getDocument(pdfUrl)
    const pdf = await loadingTask.promise
    
    // Validate page number
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      console.warn(`Invalid page number: ${pageNumber}. PDF has ${pdf.numPages} pages.`)
      return ''
    }
    
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()
    
    // Combine all text items into a single string
    let text = textContent.items
      .map((item) => {
        // TextItem has 'str' property, TextMarkedContent does not
        if ('str' in item && typeof item.str === 'string') {
          return item.str
        }
        return ''
      })
      .join(' ')
      .trim()
    
    // Truncate if too long (roughly ~2500 tokens for 10000 chars)
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '... [truncated]'
    }
    
    return text
  } catch (error) {
    console.error('Error extracting page text:', error)
    return ''
  }
}
