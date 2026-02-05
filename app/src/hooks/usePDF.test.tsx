import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { usePDF } from './usePDF'

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
const mockRevokeObjectURL = vi.fn()

global.URL.createObjectURL = mockCreateObjectURL
global.URL.revokeObjectURL = mockRevokeObjectURL

describe('usePDF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with null PDF', () => {
    const { result } = renderHook(() => usePDF())
    expect(result.current.pdf).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should load PDF file', async () => {
    const { result } = renderHook(() => usePDF())
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    // Mock FileReader
    interface FileReaderEvent {
      target: { result: ArrayBuffer }
    }
    let onloadCallback: ((e: FileReaderEvent) => void) | null = null
    const mockFileReader = {
      readAsArrayBuffer: vi.fn(function (this: FileReader, _blob: Blob) {
        // Simulate async file reading
        setTimeout(() => {
          if (onloadCallback) {
            onloadCallback({ target: { result: new ArrayBuffer(8) } })
          }
        }, 10)
      }),
      get onload() {
        return onloadCallback
      },
      set onload(callback: ((e: FileReaderEvent) => void) | null) {
        onloadCallback = callback
      },
      onerror: null as ((e: Event) => void) | null,
    }
    global.FileReader = vi.fn(() => mockFileReader) as unknown as typeof FileReader

    act(() => {
      result.current.loadPDF(file)
    })

    expect(result.current.loading).toBe(true)
    expect(mockCreateObjectURL).toHaveBeenCalledWith(file)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.pdf).not.toBeNull()
    expect(result.current.pdf?.file).toBe(file)
    expect(result.current.error).toBeNull()
  })

  it('should handle PDF load error', async () => {
    const { result } = renderHook(() => usePDF())
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    let onerrorCallback: ((e: Event) => void) | null = null
    const mockFileReader = {
      readAsArrayBuffer: vi.fn(function (this: FileReader) {
        setTimeout(() => {
          if (onerrorCallback) {
            onerrorCallback(new Event('error'))
          }
        }, 10)
      }),
      onload: null as ((e: Event) => void) | null,
      get onerror() {
        return onerrorCallback
      },
      set onerror(callback: ((e: Event) => void) | null) {
        onerrorCallback = callback
      },
    }
    global.FileReader = vi.fn(() => mockFileReader) as unknown as typeof FileReader

    act(() => {
      result.current.loadPDF(file)
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load PDF')
    expect(result.current.pdf).toBeNull()
    expect(mockRevokeObjectURL).toHaveBeenCalled()
  })

  it('should clear PDF and revoke URL', async () => {
    const { result } = renderHook(() => usePDF())
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    interface FileReaderEvent {
      target: { result: ArrayBuffer }
    }
    let onloadCallback: ((e: FileReaderEvent) => void) | null = null
    const mockFileReader = {
      readAsArrayBuffer: vi.fn(function (this: FileReader) {
        setTimeout(() => {
          if (onloadCallback) {
            onloadCallback({ target: { result: new ArrayBuffer(8) } })
          }
        }, 10)
      }),
      get onload() {
        return onloadCallback
      },
      set onload(callback: ((e: FileReaderEvent) => void) | null) {
        onloadCallback = callback
      },
      onerror: null as ((e: Event) => void) | null,
    }
    global.FileReader = vi.fn(() => mockFileReader) as unknown as typeof FileReader

    act(() => {
      result.current.loadPDF(file)
    })

    await waitFor(() => {
      expect(result.current.pdf).not.toBeNull()
    })

    act(() => {
      result.current.clearPDF()
    })

    expect(result.current.pdf).toBeNull()
    expect(mockRevokeObjectURL).toHaveBeenCalled()
  })
})
