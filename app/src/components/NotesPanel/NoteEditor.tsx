import { useState } from 'react'

interface NoteEditorProps {
  onAdd: (content: string, pageNumber?: number) => void
}

export function NoteEditor({ onAdd }: NoteEditorProps) {
  const [content, setContent] = useState('')
  const [pageNumber, setPageNumber] = useState<string>('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (content.trim()) {
      const page = pageNumber ? parseInt(pageNumber, 10) : undefined
      onAdd(content.trim(), page)
      setContent('')
      setPageNumber('')
    }
  }

  return (
    <div className="border border-gray-200 rounded p-3">
      <h3 className="text-sm font-semibold mb-2">Add Free Form Note</h3>
      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter your note..."
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2 resize-none"
          rows={4}
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={pageNumber}
            onChange={(e) => setPageNumber(e.target.value)}
            placeholder="Page (optional)"
            min={1}
            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            Add Note
          </button>
        </div>
      </form>
    </div>
  )
}
