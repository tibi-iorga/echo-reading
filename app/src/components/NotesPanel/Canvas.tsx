import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { NotesCommand } from './canvas/NotesCommand'
import { NotesPicker } from './canvas/NotesPicker'
import { CanvasExportPreviewModal } from './canvas/CanvasExportPreviewModal'
import {
  exportCanvasToMarkdown,
  exportCanvasToText,
  exportCanvasToPDF,
  downloadMarkdown,
  downloadText,
  downloadPDF,
} from '@/utils/export'
import type { ExportFormat } from './ExportDropdown'
import type { Annotation } from '@/types'

interface CanvasProps {
  content: string
  onContentChange: (content: string) => void
  annotations: Annotation[]
  documentMetadata?: { title: string; author: string | null } | null
}

export function Canvas({ content, onContentChange, annotations, documentMetadata }: CanvasProps) {
  const isInitialLoadRef = useRef(true)
  const lastExternalContentRef = useRef(content)
  const [showNotesPicker, setShowNotesPicker] = useState(false)
  const [pickerPosition, setPickerPosition] = useState<{ top: number; left: number } | null>(null)
  const [showExportPreview, setShowExportPreview] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleImportNote = useCallback((cursorRect: DOMRect) => {
    if (!containerRef.current) {
      setPickerPosition(null)
      setShowNotesPicker(true)
      return
    }

    const containerRect = containerRef.current.getBoundingClientRect()
    setPickerPosition({
      top: cursorRect.bottom - containerRect.top + containerRef.current.scrollTop + 4,
      left: cursorRect.left - containerRect.left,
    })
    setShowNotesPicker(true)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Capture your thinking while you read. Type / to pull in your notes.',
      }),
      NotesCommand.configure({
        onImportNote: handleImportNote,
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'canvas-editor prose dark:prose-invert max-w-none focus:outline-none min-h-full px-4 py-3',
      },
    },
  })

  // Keep the onImportNote callback in sync when it changes
  useEffect(() => {
    if (editor) {
      editor.extensionManager.extensions
        .filter((ext) => ext.name === 'slashCommand')
        .forEach((ext) => {
          ext.options.onImportNote = handleImportNote
        })
    }
  }, [editor, handleImportNote])

  // Set content on initial load or when pdfId changes (content comes from storage)
  useEffect(() => {
    if (!editor) return

    // On initial load or when content changes from external source (e.g., switching PDFs)
    if (isInitialLoadRef.current || content !== lastExternalContentRef.current) {
      const currentContent = editor.getHTML()
      // Only update if content actually differs (avoid cursor reset)
      if (currentContent !== content) {
        editor.commands.setContent(content || '')
      }
      isInitialLoadRef.current = false
      lastExternalContentRef.current = content
    }
  }, [editor, content])

  // Update ref when onContentChange updates content through typing
  useEffect(() => {
    lastExternalContentRef.current = content
  }, [content])

  // Handle note selection from the picker
  const handleNoteSelect = useCallback(
    (annotation: Annotation) => {
      if (!editor) return

      let text: string
      let pageNumber: number

      if (annotation.type === 'highlight') {
        text = `"${annotation.text}"`
        pageNumber = annotation.pageNumber
      } else if (annotation.type === 'note') {
        text = annotation.content
        pageNumber = annotation.pageNumber ?? 0
      } else {
        text = annotation.pageText || 'Bookmark'
        pageNumber = annotation.pageNumber
      }

      const pageRef = pageNumber > 0 ? ` — Page ${pageNumber}` : ''

      // Insert a blockquote with the annotation text
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: `${text}${pageRef}` }],
            },
          ],
        })
        .run()

      setShowNotesPicker(false)
    },
    [editor]
  )

  // Import note from toolbar button (no cursor position available, use fallback)
  const handleToolbarImportNote = useCallback(() => {
    if (!containerRef.current) {
      setPickerPosition(null)
      setShowNotesPicker(true)
      return
    }

    // If editor has a selection, anchor near the cursor
    if (editor) {
      const { from } = editor.state.selection
      const coords = editor.view.coordsAtPos(from)
      const containerRect = containerRef.current.getBoundingClientRect()
      setPickerPosition({
        top: coords.bottom - containerRect.top + containerRef.current.scrollTop + 4,
        left: coords.left - containerRect.left,
      })
    } else {
      setPickerPosition(null)
    }
    setShowNotesPicker(true)
  }, [editor])

  // Export canvas content
  const handleExport = useCallback((format: ExportFormat) => {
    if (!editor) return
    const html = editor.getHTML()
    const metadata = documentMetadata ? { title: documentMetadata.title, author: documentMetadata.author } : undefined
    const baseName = documentMetadata?.title?.replace(/\s+/g, '_') || 'canvas'

    if (format === 'markdown') {
      const md = exportCanvasToMarkdown(html, metadata)
      downloadMarkdown(md, `${baseName}_canvas.md`)
    } else if (format === 'txt') {
      const text = exportCanvasToText(html, metadata)
      downloadText(text, `${baseName}_canvas.txt`)
    } else if (format === 'pdf') {
      exportCanvasToPDF(html, metadata).then((blob) => {
        downloadPDF(blob, `${baseName}_canvas.pdf`)
      })
    }
    setShowExportPreview(false)
  }, [editor, documentMetadata])

  const isEmpty = !editor || editor.isEmpty

  return (
    <div ref={containerRef} className="flex-1 flex flex-col min-h-0 relative">
      {/* Toolbar */}
      {editor && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-0.5">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold"
            >
              <span className="font-bold text-sm">B</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic"
            >
              <span className="italic text-sm">I</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              title="Strikethrough"
            >
              <span className="line-through text-sm">S</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              title="Code"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </ToolbarButton>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              <span className="text-sm font-bold">H1</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <span className="text-sm font-bold">H2</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              <span className="text-sm font-bold">H3</span>
            </ToolbarButton>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet List"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="4" cy="7" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="4" cy="17" r="1.5" fill="currentColor" stroke="none" />
                <path strokeLinecap="round" strokeWidth={2} d="M9 7h11M9 12h11M9 17h11" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Numbered List"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <text x="2" y="9" fontSize="8" fontFamily="sans-serif" fill="currentColor" stroke="none">1</text>
                <text x="2" y="14.5" fontSize="8" fontFamily="sans-serif" fill="currentColor" stroke="none">2</text>
                <text x="2" y="20" fontSize="8" fontFamily="sans-serif" fill="currentColor" stroke="none">3</text>
                <path strokeLinecap="round" strokeWidth={2} d="M9 7h11M9 12h11M9 17h11" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="Quote"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </ToolbarButton>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToolbarImportNote}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus:outline-none"
              title="Import Note"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button
              onClick={() => setShowExportPreview(true)}
              disabled={isEmpty}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none"
              title="Export"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {/* Editor */}
      <div className="flex-1 min-h-0 overflow-auto relative">
        {editor && (
          <BubbleMenu
            editor={editor}
            options={{ placement: 'top', offset: 8 }}
            className="flex items-center gap-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-1"
          >
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold"
            >
              <span className="font-bold text-xs">B</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic"
            >
              <span className="italic text-xs">I</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              title="Code"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </ToolbarButton>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              title="Strikethrough"
            >
              <span className="line-through text-xs">S</span>
            </ToolbarButton>
          </BubbleMenu>
        )}
        <EditorContent
          editor={editor}
          className="min-h-full"
        />
        {showNotesPicker && (
          <NotesPicker
            annotations={annotations}
            onSelect={handleNoteSelect}
            onClose={() => setShowNotesPicker(false)}
            position={pickerPosition}
          />
        )}
      </div>
      <CanvasExportPreviewModal
        isOpen={showExportPreview}
        canvasHtml={editor?.getHTML() ?? ''}
        documentMetadata={documentMetadata}
        onExport={handleExport}
        onClose={() => setShowExportPreview(false)}
      />
    </div>
  )
}

function ToolbarButton({
  onClick,
  isActive,
  title,
  children,
}: {
  onClick: () => void
  isActive: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
        isActive
          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  )
}
