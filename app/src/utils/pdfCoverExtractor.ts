import { pdfjs } from 'react-pdf'

/**
 * Renders the first page of a PDF to a canvas and returns it as a JPEG blob.
 * Used for generating book cover thumbnails in the library.
 */
export async function extractPdfCover(file: File, maxWidth: number = 400): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)

  const viewport = page.getViewport({ scale: 1 })
  const scale = maxWidth / viewport.width
  const scaledViewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = scaledViewport.width
  canvas.height = scaledViewport.height

  const ctx = canvas.getContext('2d')!
  await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to convert canvas to blob'))
      },
      'image/jpeg',
      0.85
    )
  })
}
