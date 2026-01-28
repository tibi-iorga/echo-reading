import { useState, useRef, useEffect } from 'react'
import { llmService } from '@/services/llm/llmService'
import { storageService } from '@/services/storage/storageService'
import type { LLMMessage } from '@/types'
import { renderMarkdown } from '@/utils/markdownRenderer'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  quotedText?: string | null
}

interface ChatProps {
  quotedText?: string | null
  onQuotedTextClear?: () => void
  messages?: Message[]
  onMessagesChange?: (messages: Message[]) => void
  documentMetadata?: { title: string; author: string | null } | null
  currentPage?: number
  currentPageText?: string
  onSaveInsight?: (text: string) => void
  onClearChat?: () => void
}

interface QuotedMessageProps {
  text: string
  onClose: () => void
}

function QuotedMessage({ text, onClose }: QuotedMessageProps) {
  const truncatedText = text.length > 100 ? text.substring(0, 100) + '...' : text
  
  return (
    <div className="mx-4 mb-2 p-3 bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-500 dark:border-blue-400 rounded flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quoted text</div>
        <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{truncatedText}</div>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
        aria-label="Remove quote"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function UserMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-end mb-4 px-4">
      <div className="max-w-[80%] rounded-lg bg-blue-500 text-white px-4 py-2">
        {message.quotedText && (
          <div className="mb-2 pb-2 border-b border-blue-400/30">
            <div className="flex items-start gap-2">
              <div className="w-1 bg-white/40 rounded flex-shrink-0" style={{ minHeight: '40px' }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-blue-100/70 mb-0.5">Quoted text</div>
                <div className="text-sm text-blue-50/80 line-clamp-2 whitespace-pre-wrap break-words">{message.quotedText}</div>
              </div>
            </div>
          </div>
        )}
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
      </div>
    </div>
  )
}

interface AssistantMessageProps {
  content: string
  onSaveInsight?: (text: string) => void
}

function AssistantMessage({ content, onSaveInsight }: AssistantMessageProps) {
  const [selectedText, setSelectedText] = useState<string>('')
  const contentRef = useRef<HTMLDivElement>(null)

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim())
    } else {
      setSelectedText('')
    }
  }

  const handleSave = () => {
    if (selectedText && onSaveInsight) {
      onSaveInsight(selectedText)
      setSelectedText('')
      window.getSelection()?.removeAllRanges()
    }
  }

  useEffect(() => {
    const element = contentRef.current
    if (element) {
      element.addEventListener('mouseup', handleTextSelection)
      return () => {
        element.removeEventListener('mouseup', handleTextSelection)
      }
    }
  }, [])

  return (
    <div className="flex justify-start mb-4 px-4 group">
      <div className="max-w-[80%] rounded-lg bg-gray-100 dark:bg-gray-800 px-4 py-2 relative">
        <div 
          ref={contentRef}
          className="whitespace-pre-wrap break-words select-text text-gray-900 dark:text-gray-100"
          onMouseUp={handleTextSelection}
        >
          {renderMarkdown(content)}
        </div>
        {selectedText && (
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={handleSave}
              className="text-xs px-2 py-1 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save insight
            </button>
            <button
              onClick={() => {
                setSelectedText('')
                window.getSelection()?.removeAllRanges()
              }}
              className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      {!selectedText && (
        <button
          onClick={() => {
            // Save full message directly
            if (onSaveInsight && content.trim()) {
              onSaveInsight(content.trim())
            }
          }}
          className="ml-2 self-end mb-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          title="Save this message as an insight to your highlights"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      )}
    </div>
  )
}

export function Chat({ quotedText, onQuotedTextClear, messages: externalMessages, onMessagesChange, documentMetadata, currentPage, currentPageText, onSaveInsight, onClearChat }: ChatProps = {}) {
  const [internalMessages, setInternalMessages] = useState<Message[]>([])
  const messages = externalMessages ?? internalMessages
  const setMessages = onMessagesChange ?? setInternalMessages
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [includePageContext, setIncludePageContext] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-focus textarea when quoted text is set (user sent text to chat)
  useEffect(() => {
    if (quotedText) {
      // Use requestAnimationFrame and setTimeout to ensure the tab has switched and DOM is ready
      requestAnimationFrame(() => {
        setTimeout(() => {
          textareaRef.current?.focus()
        }, 100)
      })
    }
  }, [quotedText])

  const handleSend = async () => {
    const userMessage = input.trim()
    if (!userMessage || isLoading) return

    const apiKey = storageService.getApiKey()
    if (!apiKey) {
      alert('Please configure your API key in Settings first.')
      return
    }

    // Determine what quoted text to include in the message
    // If includePageContext is enabled, use currentPageText as quoted text
    // Otherwise, use manually quoted text if available
    let messageQuotedText: string | null = null
    if (includePageContext && currentPageText && currentPageText.trim()) {
      messageQuotedText = currentPageText.trim()
    } else if (quotedText) {
      messageQuotedText = quotedText
    }

    // Create user message with quoted text
    const userMessageObj: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      quotedText: messageQuotedText,
    }

    // Add user message immediately
    const newMessages = [...messages, userMessageObj]
    setMessages(newMessages)
    
    // Clear input and quoted text
    setInput('')
    if (onQuotedTextClear) {
      onQuotedTextClear()
    }
    
    // Uncheck the include page context checkbox after sending
    if (includePageContext) {
      setIncludePageContext(false)
    }

    // Focus textarea immediately after clearing input
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)

    setIsLoading(true)

    try {
      // Build the message to send to LLM (include quoted text if present)
      let messageToSend = userMessage
      if (messageQuotedText) {
        const quotePrefix = `> ${messageQuotedText.split('\n').join('\n> ')}\n\n`
        messageToSend = quotePrefix + userMessage
      }

      // Build conversation history from existing messages
      const conversationHistory: LLMMessage[] = messages.map((msg) => {
        // For user messages, include quoted text if it was present
        if (msg.role === 'user') {
          let content = msg.content
          if (msg.quotedText) {
            const quotePrefix = `> ${msg.quotedText.split('\n').join('\n> ')}\n\n`
            content = quotePrefix + msg.content
          }
          return {
            role: 'user',
            content,
          }
        } else {
          return {
            role: 'assistant',
            content: msg.content,
          }
        }
      })

      // Get system instructions from storage
      let systemInstructions = storageService.getChatInstructions() || ''

      // Build document context string
      let documentContext = ''
      if (documentMetadata) {
        if (documentMetadata.author) {
          documentContext = `[Document: "${documentMetadata.title}" by ${documentMetadata.author}]\n\n`
        } else {
          documentContext = `[Document: "${documentMetadata.title}"]\n\n`
        }
      }

      // Add page context if toggle is enabled and page text is available
      if (includePageContext && currentPageText && currentPageText.trim()) {
        const pageContext = `[Current Page ${currentPage || '?'} Content]\n${currentPageText.trim()}\n\n`
        if (documentContext) {
          documentContext = documentContext + pageContext
        } else {
          documentContext = pageContext
        }
      }

      // Prepend document context to system instructions
      if (documentContext && systemInstructions) {
        systemInstructions = documentContext + systemInstructions
      } else if (documentContext) {
        systemInstructions = documentContext.trim()
      }

      // Send to LLM with conversation history
      const response = await llmService.sendMessage(messageToSend, apiKey, systemInstructions || undefined, conversationHistory)

      // Add assistant response
      setMessages([...newMessages, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
      }])
    } catch (error) {
      // Add error message
      setMessages([...newMessages, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
      }])
    } finally {
      setIsLoading(false)
      // Refocus textarea after response completes
      requestAnimationFrame(() => {
        setTimeout(() => {
          textareaRef.current?.focus()
        }, 0)
      })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Chat</h2>
        {messages.length > 0 && onClearChat && (
          <button
            onClick={onClearChat}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Clear chat and start a new conversation"
          >
            Clear chat
          </button>
        )}
      </div>
      {/* Messages area */}
      <div className="flex-1 overflow-auto pt-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p className="text-sm">Explore the document deeper by asking questions,<br />or select text in the PDF to quote it and focus on specific passages.</p>
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id}>
            {message.role === 'user' ? (
              <UserMessage message={message} />
            ) : (
              <AssistantMessage content={message.content} onSaveInsight={onSaveInsight} />
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start mb-4 px-4">
            <div className="max-w-[80%] rounded-lg bg-gray-100 dark:bg-gray-800 px-4 py-2">
              <div className="text-gray-500 dark:text-gray-400">Thinking...</div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div>
        {quotedText && (
          <QuotedMessage 
            text={quotedText} 
            onClose={() => {
              if (onQuotedTextClear) {
                onQuotedTextClear()
              }
            }} 
          />
        )}
        {includePageContext && currentPageText && (
          <div className="mx-4 mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-500 rounded text-xs text-gray-600 dark:text-gray-300">
            Page {currentPage || '?'} context will be included
          </div>
        )}
        <div className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includePageContext}
                onChange={(e) => setIncludePageContext(e.target.checked)}
                disabled={!currentPageText || isLoading}
                className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 bg-white dark:bg-gray-700"
              />
              <span>Include current page as context</span>
            </label>
            <div className="relative group">
              <button
                type="button"
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                aria-label="Help"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10 pointer-events-none">
                <div className="text-gray-300">
                  When enabled, the full text content of the current page will be automatically included in your message. This helps the assistant understand the context of your question and provide more relevant answers based on what you're currently reading.
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                  <div className="w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
