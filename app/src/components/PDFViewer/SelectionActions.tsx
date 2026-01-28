import { useEffect, useRef } from 'react'

interface SelectionActionsProps {
  selectedText: string
  position: { x: number; y: number }
  onHighlight: () => void
  onSendToLLM: () => void
  onDictionary: () => void
  onWikipedia: () => void
  onClose: () => void
}

export function SelectionActions({
  position,
  onHighlight,
  onSendToLLM,
  onDictionary,
  onWikipedia,
  onClose,
}: SelectionActionsProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-fit"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateY(-100%)',
        marginTop: '-8px',
      }}
    >
      <button
        onClick={onHighlight}
        className="block w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700 text-gray-900 dark:text-white text-sm transition-colors whitespace-nowrap"
        title="Add to Highlights"
      >
        Add to Highlights
      </button>
      <button
        onClick={onSendToLLM}
        className="block w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700 text-gray-900 dark:text-white text-sm transition-colors whitespace-nowrap"
        title="Send to Chat"
      >
        Send to Chat
      </button>
      <button
        onClick={onDictionary}
        className="block w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700 text-gray-900 dark:text-white text-sm transition-colors whitespace-nowrap"
        title="Dictionary"
      >
        Dictionary
      </button>
      <button
        onClick={onWikipedia}
        className="block w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700 text-gray-900 dark:text-white text-sm transition-colors whitespace-nowrap"
        title="Search Wikipedia"
      >
        Search Wikipedia
      </button>
    </div>
  )
}
