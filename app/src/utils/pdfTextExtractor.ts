import { pdfjs } from 'react-pdf'
import type { PDFDocumentProxy } from 'pdfjs-dist'

async function extractTextFromDoc(doc: PDFDocumentProxy, pageNumber: number, maxLength: number): Promise<string> {
  if (pageNumber < 1 || pageNumber > doc.numPages) {
    console.warn(`Invalid page number: ${pageNumber}. PDF has ${doc.numPages} pages.`)
    return ''
  }

  const page = await doc.getPage(pageNumber)
  const textContent = await page.getTextContent()

  let text = textContent.items
    .map((item) => {
      if ('str' in item && typeof item.str === 'string') {
        return item.str
      }
      return ''
    })
    .join(' ')
    .trim()

  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '... [truncated]'
  }

  return text
}

export async function extractPageText(pdfDoc: PDFDocumentProxy, pageNumber: number, maxLength?: number): Promise<string>
export async function extractPageText(pdfUrl: string, pageNumber: number, maxLength?: number): Promise<string>
export async function extractPageText(
  pdfDocOrUrl: PDFDocumentProxy | string,
  pageNumber: number,
  maxLength: number = 10000
): Promise<string> {
  try {
    if (typeof pdfDocOrUrl === 'string') {
      const loadingTask = pdfjs.getDocument(pdfDocOrUrl)
      const doc = await loadingTask.promise
      return extractTextFromDoc(doc, pageNumber, maxLength)
    }
    return extractTextFromDoc(pdfDocOrUrl, pageNumber, maxLength)
  } catch (error) {
    console.error('Error extracting page text:', error)
    return ''
  }
}
