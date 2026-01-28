import React, { useEffect, useState, useRef } from 'react'

interface HighlightOverlayProps {
  highlights: Array<{ id: string; pageNumber: number; coordinates?: { x: number; y: number; width: number; height: number; rects?: Array<{ x: number; y: number; width: number; height: number }> } }>
  currentPage: number
  scale: number
}

export function HighlightOverlay({ highlights, currentPage, scale }: HighlightOverlayProps) {
  const [pageHighlights, setPageHighlights] = useState<Array<{ id: string; coordinates: { x: number; y: number; width: number; height: number; rects?: Array<{ x: number; y: number; width: number; height: number }> } }>>([])
  const [textLayerOffset, setTextLayerOffset] = useState<{ x: number; y: number } | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Separate effect to calculate text layer offset
  useEffect(() => {
    const calculateOffset = () => {
      if (overlayRef.current) {
        const pageElement = overlayRef.current.parentElement?.querySelector('.react-pdf__Page')
        const textLayer = pageElement?.querySelector('.react-pdf__Page__textContent') as HTMLElement
        const parentWrapper = overlayRef.current.parentElement
        
        if (textLayer && parentWrapper) {
          const textLayerRect = textLayer.getBoundingClientRect()
          const parentRect = parentWrapper.getBoundingClientRect()
          const calculatedOffset = {
            x: textLayerRect.left - parentRect.left,
            y: textLayerRect.top - parentRect.top,
          }
          
          setTextLayerOffset(calculatedOffset)
          return true
        } else {
          setTextLayerOffset(null)
          return false
        }
      }
      return false
    }
    
    // Try immediately
    if (!calculateOffset()) {
      // Retry with a small delay and also set up an observer to watch for text layer
      const timeoutId = setTimeout(() => {
        calculateOffset()
      }, 50)
      
      // Also watch for DOM changes in case text layer loads asynchronously
      const observer = new MutationObserver(() => {
        if (calculateOffset()) {
          observer.disconnect()
        }
      })
      
      if (overlayRef.current?.parentElement) {
        observer.observe(overlayRef.current.parentElement, {
          childList: true,
          subtree: true,
        })
      }
      
      return () => {
        clearTimeout(timeoutId)
        observer.disconnect()
      }
    }
  }, [currentPage, scale])

  useEffect(() => {
    const currentPageHighlights = highlights
      .filter(h => h.pageNumber === currentPage && h.coordinates)
      .map(h => ({
        id: h.id,
        coordinates: h.coordinates!,
      }))
    setPageHighlights(currentPageHighlights)
  }, [highlights, currentPage, scale, textLayerOffset])

  if (pageHighlights.length === 0) {
    return null
  }

  // Position overlay to match text layer position
  const overlayStyle: React.CSSProperties = textLayerOffset
    ? {
        position: 'absolute',
        left: `${textLayerOffset.x}px`,
        top: `${textLayerOffset.y}px`,
        pointerEvents: 'none',
        zIndex: 10,
      }
    : {
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
      }

  return (
    <div
      ref={overlayRef}
      style={overlayStyle}
    >
      {pageHighlights.map((highlight) => {
        // If we have individual rects for multi-line selections, render each separately
        // Otherwise, fall back to the single bounding box for backward compatibility
        const rectsToRender = highlight.coordinates.rects && highlight.coordinates.rects.length > 0
          ? highlight.coordinates.rects
          : [{
              x: highlight.coordinates.x,
              y: highlight.coordinates.y,
              width: highlight.coordinates.width,
              height: highlight.coordinates.height,
            }]
        
        return (
          <React.Fragment key={highlight.id}>
            {rectsToRender.map((rect, index) => {
              const renderedLeft = rect.x * scale
              const renderedTop = rect.y * scale
              const renderedWidth = rect.width * scale
              const renderedHeight = rect.height * scale
              
              const renderedStyle = {
                position: 'absolute' as const,
                left: `${renderedLeft}px`,
                top: `${renderedTop}px`,
                width: `${renderedWidth}px`,
                height: `${renderedHeight}px`,
                backgroundColor: 'rgba(253, 224, 71, 0.4)',
                pointerEvents: 'none' as const,
              }
              
              return (
                <div
                  key={`${highlight.id}-rect-${index}`}
                  style={renderedStyle}
                />
              )
            })}
          </React.Fragment>
        )
      })}
    </div>
  )
}
