import { useEffect, useRef } from 'react'
import type { DictionaryDefinition } from '@/services/dictionary/dictionaryService'

interface DictionaryPopupProps {
  word: string
  position: { x: number; y: number }
  definitions: DictionaryDefinition[] | null
  isLoading: boolean
  error: string | null
  onClose: () => void
}

export function DictionaryPopup({
  word,
  position,
  definitions,
  isLoading,
  error,
  onClose,
}: DictionaryPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
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

  // Calculate popup position - appear below the selection
  const popupStyle: React.CSSProperties = {
    left: `${position.x}px`,
    top: `${position.y + 10}px`,
    transform: 'translateX(-50%)',
  }

  return (
    <div
      ref={popupRef}
      className="absolute z-50 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl max-w-md min-w-[300px] max-h-[400px] overflow-y-auto"
      style={popupStyle}
    >
      {/* Upward pointing caret */}
      <div
        className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-gray-300 dark:border-b-gray-700"
      />
      <div
        className="absolute -top-[7px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-b-[7px] border-l-transparent border-r-transparent border-b-gray-100 dark:border-b-gray-800"
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-300 dark:border-gray-700">
          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Dictionary</span>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Word */}
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{word}</h3>
          {definitions && definitions[0]?.phonetic && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{definitions[0].phonetic}</p>
          )}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 dark:border-gray-400"></div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">{error}</p>
          </div>
        )}

        {/* Definitions */}
        {definitions && definitions.length > 0 && (
          <div className="space-y-4">
            {definitions.map((entry, entryIndex) => (
              <div key={entryIndex} className="space-y-3">
                {entry.meanings.map((meaning, meaningIndex) => (
                  <div key={meaningIndex}>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 italic mb-2">
                      {meaning.partOfSpeech}
                    </p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                      {meaning.definitions.map((def, defIndex) => (
                        <li key={defIndex} className="text-sm text-gray-800 dark:text-gray-200">
                          <span className="ml-2">{def.definition}</span>
                          {def.example && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 italic mt-1 ml-4">
                              "{def.example}"
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
