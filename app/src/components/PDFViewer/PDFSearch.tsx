
interface PDFSearchProps {
  searchTerm: string
  onSearchChange: (term: string) => void
}

export function PDFSearch({ searchTerm, onSearchChange }: PDFSearchProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        placeholder="Search in document..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="px-3 py-1 border border-gray-300 rounded text-sm w-64"
      />
    </div>
  )
}
