import { useEffect, useRef } from 'react'

export interface SelectionAction {
  id: string
  label: string
  onClick: () => void
  title?: string
}

interface SelectionActionsProps {
  position: { x: number; y: number }
  actions: SelectionAction[]
  onClose: () => void
}

export function SelectionActions({
  position,
  actions,
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

  if (actions.length === 0) return null

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
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.onClick}
          className="block w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700 text-gray-900 dark:text-white text-sm transition-colors whitespace-nowrap"
          title={action.title || action.label}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}
