import { SelectionActions as SharedSelectionActions, type SelectionAction } from '@/components/SelectionActions/SelectionActions'

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
  const actions: SelectionAction[] = [
    { id: 'highlight', label: 'Add to Highlights', onClick: onHighlight },
    { id: 'sendToChat', label: 'Send to Chat', onClick: onSendToLLM },
    { id: 'dictionary', label: 'Dictionary', onClick: onDictionary },
    { id: 'wikipedia', label: 'Search Wikipedia', onClick: onWikipedia },
  ]

  return (
    <SharedSelectionActions
      position={position}
      actions={actions}
      onClose={onClose}
    />
  )
}
