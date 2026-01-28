import { useRef, useEffect } from 'react'

interface ResizeHandleProps {
  onResize: (newWidth: number) => void
  minWidth?: number
  maxWidth?: number
}

export function ResizeHandle({ onResize, minWidth = 250, maxWidth = 800 }: ResizeHandleProps) {
  const handleRef = useRef<HTMLDivElement>(null)
  const isResizingRef = useRef(false)
  const parentRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const handle = handleRef.current
    if (!handle) return

    parentRef.current = handle.parentElement

    const startResize = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      isResizingRef.current = true
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      // Disable transitions during resize for smooth dragging
      if (parentRef.current) {
        parentRef.current.style.transition = 'none'
      }

      const startX = e.clientX
      const startWidth = parentRef.current?.getBoundingClientRect().width || 384

      const doResize = (e: MouseEvent) => {
        if (!isResizingRef.current) return
        
        const deltaX = startX - e.clientX // Inverted because we're resizing from the left
        const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX))
        onResize(newWidth)
      }

      const stopResize = () => {
        isResizingRef.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        
        // Re-enable transitions after resize
        if (parentRef.current) {
          parentRef.current.style.transition = ''
        }
        
        document.removeEventListener('mousemove', doResize)
        document.removeEventListener('mouseup', stopResize)
      }

      document.addEventListener('mousemove', doResize)
      document.addEventListener('mouseup', stopResize)
    }

    handle.addEventListener('mousedown', startResize)

    return () => {
      handle.removeEventListener('mousedown', startResize)
    }
  }, [onResize, minWidth, maxWidth])

  return (
    <div
      ref={handleRef}
      className="absolute left-0 top-0 bottom-0 w-1 bg-transparent hover:bg-blue-500 cursor-col-resize transition-colors z-10 group"
      style={{ marginLeft: '-2px' }}
      title="Drag to resize sidebar"
    >
      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-300 group-hover:bg-blue-500 transition-colors" />
    </div>
  )
}
