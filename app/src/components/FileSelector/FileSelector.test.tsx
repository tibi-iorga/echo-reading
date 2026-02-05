import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, act } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { FileSelector } from './FileSelector'

describe('FileSelector', () => {
  it('should render file input and button', () => {
    const mockOnFileSelect = vi.fn()
    render(<FileSelector onFileSelect={mockOnFileSelect} />)
    
    const input = document.querySelector('input[type="file"]')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'file')
    expect(input).toHaveAttribute('accept', '.pdf')
    
    expect(screen.getByText('Choose PDF File')).toBeInTheDocument()
  })

  it('should call onFileSelect when PDF file is selected', async () => {
    const user = userEvent.setup()
    const mockOnFileSelect = vi.fn()
    render(<FileSelector onFileSelect={mockOnFileSelect} />)
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeInTheDocument()
    
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    
    await user.upload(input, file)
    
    await waitFor(() => {
      expect(mockOnFileSelect).toHaveBeenCalledTimes(1)
    })
    expect(mockOnFileSelect).toHaveBeenCalledWith(file)
  })

  it('should show alert when non-PDF file is selected', async () => {
    const mockOnFileSelect = vi.fn()
    render(<FileSelector onFileSelect={mockOnFileSelect} />)
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    
    // Create a non-PDF file
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    
    // Mock the files property since jsdom doesn't fully support FileList
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
      configurable: true,
    })
    
    // Manually trigger the change event wrapped in act()
    act(() => {
      const changeEvent = new Event('change', { bubbles: true })
      input.dispatchEvent(changeEvent)
    })
    
    // AlertModal renders via portal to document.body
    await waitFor(
      () => {
        // Look for the modal content in document.body
        const modal = document.body.querySelector('[class*="fixed inset-0"]')
        expect(modal).toBeInTheDocument()
        expect(modal?.textContent).toContain('Please select a PDF file')
      },
      { timeout: 2000 }
    )
    expect(mockOnFileSelect).not.toHaveBeenCalled()
  })

  it('should only accept PDF files', () => {
    const mockOnFileSelect = vi.fn()
    render(<FileSelector onFileSelect={mockOnFileSelect} />)
    
    const input = document.querySelector('input[type="file"]')
    expect(input).toHaveAttribute('accept', '.pdf')
  })
})
