import { useState, useCallback } from 'react'
import type { PDFDocument } from '@/types'

export function usePDF() {
  const [pdf, setPdf] = useState<PDFDocument | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPDF = useCallback((file: File) => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/da4ec1e8-d16e-4eb1-ba8d-203aa9874bed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePDF.ts:9',message:'loadPDF called',data:{fileName:file.name,fileSize:file.size,fileType:file.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    setLoading(true)
    setError(null)

    const url = URL.createObjectURL(file)
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/da4ec1e8-d16e-4eb1-ba8d-203aa9874bed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePDF.ts:14',message:'URL created',data:{url,urlValid:!!url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    
    const reader = new FileReader()
    reader.onload = () => {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/da4ec1e8-d16e-4eb1-ba8d-203aa9874bed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePDF.ts:17',message:'FileReader onload',data:{resultLength:reader.result ? (reader.result as ArrayBuffer).byteLength : null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      setPdf({
        file,
        url,
        numPages: 0,
      })
      setLoading(false)
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/da4ec1e8-d16e-4eb1-ba8d-203aa9874bed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePDF.ts:23',message:'PDF state set',data:{pdfSet:true,url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
    }

    reader.onerror = () => {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/da4ec1e8-d16e-4eb1-ba8d-203aa9874bed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePDF.ts:26',message:'FileReader error',data:{error:reader.error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      setError('Failed to load PDF')
      setLoading(false)
      URL.revokeObjectURL(url)
    }

    reader.readAsArrayBuffer(file)
  }, [])

  const clearPDF = useCallback(() => {
    if (pdf?.url) {
      URL.revokeObjectURL(pdf.url)
    }
    setPdf(null)
    setError(null)
  }, [pdf])

  return {
    pdf,
    loading,
    error,
    loadPDF,
    clearPDF,
  }
}
