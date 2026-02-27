import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface SelectionAction {
  id: string
  label: string
  onClick: () => void
  title?: string
}

const VERTICAL_PADDING = 8
const MIN_SPACE_ABOVE_TO_SHOW_MENU_ABOVE = 140

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
  const [showBelow, setShowBelow] = useState(() => position.y < MIN_SPACE_ABOVE_TO_SHOW_MENU_ABOVE)

  useLayoutEffect(() => {
    const menu = menuRef.current
    if (!menu) return

    const menuRect = menu.getBoundingClientRect()

    // If the menu's top edge is clipped by the viewport, switch to showing below
    if (menuRect.top < 0) {
      setShowBelow(true)
    }
  }, [position])

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
        top: showBelow ? `${position.y + VERTICAL_PADDING}px` : `${position.y}px`,
        transform: showBelow ? 'none' : 'translateY(-100%)',
        marginTop: showBelow ? 0 : -VERTICAL_PADDING,
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
