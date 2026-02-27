import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useRef,
} from 'react'
import type { Editor, Range } from '@tiptap/react'

export interface CommandMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

interface CommandItem {
  id: string
  label: string
  description: string
  icon: React.ReactNode
}

const COMMANDS: CommandItem[] = [
  {
    id: 'notes',
    label: 'Import Note',
    description: 'Insert from highlights & notes',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'h1',
    label: 'Heading 1',
    description: 'Large heading',
    icon: <span className="text-xs font-bold w-5 text-center">H1</span>,
  },
  {
    id: 'h2',
    label: 'Heading 2',
    description: 'Medium heading',
    icon: <span className="text-xs font-bold w-5 text-center">H2</span>,
  },
  {
    id: 'h3',
    label: 'Heading 3',
    description: 'Small heading',
    icon: <span className="text-xs font-bold w-5 text-center">H3</span>,
  },
  {
    id: 'blist',
    label: 'Bullet List',
    description: 'Unordered list',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  },
  {
    id: 'list',
    label: 'Numbered List',
    description: 'Ordered list',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
  },
  {
    id: 'quote',
    label: 'Quote',
    description: 'Blockquote',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
  },
  {
    id: 'code',
    label: 'Code Block',
    description: 'Code snippet',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    id: 'divider',
    label: 'Divider',
    description: 'Horizontal line',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeWidth={2} d="M3 12h18" />
      </svg>
    ),
  },
]

function executeCommand(id: string, editor: Editor, range: Range) {
  editor.chain().focus().deleteRange(range).run()

  switch (id) {
    case 'h1':
      editor.chain().focus().toggleHeading({ level: 1 }).run()
      break
    case 'h2':
      editor.chain().focus().toggleHeading({ level: 2 }).run()
      break
    case 'h3':
      editor.chain().focus().toggleHeading({ level: 3 }).run()
      break
    case 'blist':
      editor.chain().focus().toggleBulletList().run()
      break
    case 'list':
      editor.chain().focus().toggleOrderedList().run()
      break
    case 'quote':
      editor.chain().focus().toggleBlockquote().run()
      break
    case 'code':
      editor.chain().focus().toggleCodeBlock().run()
      break
    case 'divider':
      editor.chain().focus().setHorizontalRule().run()
      break
  }
}

// Main component
interface CommandMenuProps {
  editor: Editor
  range: Range
  query: string
  onImportNote: (cursorRect: DOMRect) => void
  command: (props: Record<string, unknown>) => void
}

export const CommandMenu = forwardRef<CommandMenuRef, CommandMenuProps>(
  ({ editor, range, query, onImportNote }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const listRef = useRef<HTMLDivElement>(null)

    // Filter commands by query
    const filteredCommands = COMMANDS.filter((cmd) => {
      if (!query) return true
      const q = query.toLowerCase()
      return cmd.id.includes(q) || cmd.label.toLowerCase().includes(q)
    })

    // Keep refs in sync so onKeyDown always sees current values
    const stateRef = useRef({ filteredCommands, editor, range, onImportNote })
    stateRef.current = { filteredCommands, editor, range, onImportNote }

    // Reset selection when query changes
    useEffect(() => {
      setSelectedIndex(0)
    }, [query])

    // Scroll selected item into view
    useEffect(() => {
      const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined
      el?.scrollIntoView({ block: 'nearest' })
    }, [selectedIndex])

    const handleSelect = (index: number) => {
      const cmd = filteredCommands[index]
      if (!cmd) return

      if (cmd.id === 'notes') {
        // Capture cursor position BEFORE deleting the slash text
        const coords = editor.view.coordsAtPos(range.from)
        const cursorRect = new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top)
        editor.chain().focus().deleteRange(range).run()
        onImportNote(cursorRect)
        return
      }

      executeCommand(cmd.id, editor, range)
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        const s = stateRef.current
        const maxIndex = s.filteredCommands.length - 1

        if (event.key === 'ArrowUp') {
          setSelectedIndex((prev) => (prev <= 0 ? Math.max(maxIndex, 0) : prev - 1))
          return true
        }

        if (event.key === 'ArrowDown') {
          setSelectedIndex((prev) => (prev >= maxIndex ? 0 : prev + 1))
          return true
        }

        if (event.key === 'Enter') {
          setSelectedIndex((currentIndex) => {
            const cmd = s.filteredCommands[currentIndex]
            if (!cmd) return currentIndex

            if (cmd.id === 'notes') {
              // Capture cursor position BEFORE deleting the slash text
              const coords = s.editor.view.coordsAtPos(s.range.from)
              const cursorRect = new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top)
              s.editor.chain().focus().deleteRange(s.range).run()
              // Use setTimeout to let the suggestion plugin close first
              setTimeout(() => s.onImportNote(cursorRect), 0)
            } else {
              executeCommand(cmd.id, s.editor, s.range)
            }
            return currentIndex
          })
          return true
        }

        // Let all other keys pass through to the editor
        return false
      },
    }))

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden w-64">
        <div ref={listRef} className="max-h-72 overflow-y-auto py-1">
          {filteredCommands.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-400 dark:text-gray-500 text-center">
              No commands found
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                onClick={() => handleSelect(index)}
                className={`w-full text-left px-3 py-1.5 flex items-center gap-3 text-sm transition-colors ${
                  index === selectedIndex
                    ? 'bg-blue-50 dark:bg-blue-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center text-gray-500 dark:text-gray-400 flex-shrink-0">
                  {cmd.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-gray-900 dark:text-gray-200 font-medium">{cmd.label}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{cmd.description}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    )
  }
)

CommandMenu.displayName = 'CommandMenu'
