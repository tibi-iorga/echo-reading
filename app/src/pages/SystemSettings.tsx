import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { llmService } from '@/services/llm/llmService'
import { storageService } from '@/services/storage/storageService'
import { useTheme } from '@/contexts/ThemeContext'
import { useSystemSettings } from '@/hooks/useSystemSettings'
import { VERSION } from '@/constants/version'
import { ConfirmModal } from '@/components/ConfirmModal/ConfirmModal'

const DEFAULT_CHAT_INSTRUCTIONS = `You are a helpful reading assistant. The user is currently reading "{{document_title}}"{{document_author}}.

Your role is to help users deeply understand the material they are reading.

When users share text from their PDF:
- Provide clear, accurate explanations
- Help clarify complex concepts
- Connect ideas to broader themes when relevant
- Ask follow-up questions if the user's question is unclear
- Be concise but thorough

The user is actively reading and learning, so prioritize clarity and understanding over brevity.`

type SettingsTab = 'llm' | 'appearance'

export function SystemSettings() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { settings, loading, saveSettings } = useSystemSettings()

  const [activeTab, setActiveTab] = useState<SettingsTab>('llm')

  // API Key state
  const [apiKey, setApiKey] = useState('')
  const [savedApiKey, setSavedApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'testing' | 'connected' | 'failed'>('untested')
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isInFallbackMode, setIsInFallbackMode] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [showRemoveApiKeyConfirm, setShowRemoveApiKeyConfirm] = useState(false)

  // Provider/Model state
  const [selectedProvider, setSelectedProvider] = useState('OpenAI')
  const [selectedModel, setSelectedModel] = useState('')
  const [savedProvider, setSavedProvider] = useState('OpenAI')
  const [savedModel, setSavedModel] = useState('')

  // Chat instructions state
  const [chatInstructions, setChatInstructions] = useState('')
  const [savedChatInstructions, setSavedChatInstructions] = useState('')

  // Save state
  const [isSavingLLM, setIsSavingLLM] = useState(false)
  const [showSuccessLLM, setShowSuccessLLM] = useState(false)
  const [isSavingInstructions, setIsSavingInstructions] = useState(false)
  const [showSuccessInstructions, setShowSuccessInstructions] = useState(false)

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const storedKey = await storageService.getApiKey()
      setIsInFallbackMode(storageService.isApiKeyInFallbackMode())

      const storedProvider = storageService.getProvider() || 'OpenAI'
      setSelectedProvider(storedProvider)
      setSavedProvider(storedProvider)
      llmService.setProvider(storedProvider)

      if (storedKey) {
        setApiKey(storedKey)
        setSavedApiKey(storedKey)

        setConnectionStatus('testing')
        try {
          const result = await llmService.testConnection(storedKey)
          if (result.success) {
            setConnectionStatus('connected')
          } else {
            setConnectionStatus('failed')
            setConnectionError(result.message)
          }
        } catch (error) {
          setConnectionStatus('failed')
          setConnectionError(error instanceof Error ? error.message : 'Connection test failed')
        }
      }

      const currentProvider = llmService.getCurrentProvider()
      const defaultModel = currentProvider?.getDefaultModel() || 'gpt-4o'
      const storedModel = storageService.getModel()
      const availableModels = currentProvider?.getAvailableModels() || []
      const modelToUse = (storedModel && availableModels.includes(storedModel)) ? storedModel : defaultModel
      setSelectedModel(modelToUse)
      setSavedModel(modelToUse)

      const storedInstructions = storageService.getChatInstructions()
      if (storedInstructions) {
        setChatInstructions(storedInstructions)
        setSavedChatInstructions(storedInstructions)
      } else {
        setChatInstructions(DEFAULT_CHAT_INSTRUCTIONS)
        setSavedChatInstructions(DEFAULT_CHAT_INSTRUCTIONS)
      }
    }

    loadSettings()
  }, [])

  // Hydrate from system settings when they load from the API
  useEffect(() => {
    if (!settings || loading) return

    const storedProvider = storageService.getProvider() || 'OpenAI'
    if (storedProvider !== selectedProvider) {
      setSelectedProvider(storedProvider)
      setSavedProvider(storedProvider)
      llmService.setProvider(storedProvider)
    }

    const storedModel = storageService.getModel() || ''
    if (storedModel && storedModel !== selectedModel) {
      setSelectedModel(storedModel)
      setSavedModel(storedModel)
    }

    const storedInstructions = storageService.getChatInstructions()
    if (storedInstructions && storedInstructions !== chatInstructions) {
      setChatInstructions(storedInstructions)
      setSavedChatInstructions(storedInstructions)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, loading])

  const hasUnsavedLLMChanges = () => {
    const apiKeyChanged = apiKey.trim() !== savedApiKey
    const providerChanged = selectedProvider !== savedProvider
    const modelChanged = selectedModel !== savedModel
    return apiKeyChanged || providerChanged || modelChanged
  }

  const hasUnsavedInstructionsChanges = () => {
    return chatInstructions.trim() !== savedChatInstructions
  }

  const handleSaveLLM = async () => {
    setIsSavingLLM(true)
    setConnectionError(null)

    await new Promise(resolve => setTimeout(resolve, 150))

    const hadApiKeyBefore = await storageService.hasApiKey()

    if (apiKey.trim()) {
      await storageService.setApiKey(apiKey.trim())
      setSavedApiKey(apiKey.trim())

      storageService.setModel(selectedModel)
      storageService.setProvider(selectedProvider)
      setSavedModel(selectedModel)
      setSavedProvider(selectedProvider)
      llmService.setProvider(selectedProvider)

      saveSettings({ llmProvider: selectedProvider, llmModel: selectedModel })

      setConnectionStatus('testing')
      try {
        const result = await llmService.testConnection(apiKey.trim())
        if (result.success) {
          setConnectionStatus('connected')

          const currentProvider = llmService.getCurrentProvider()
          if (currentProvider?.fetchAvailableModels) {
            try {
              await currentProvider.fetchAvailableModels(apiKey.trim())
              const availableModels = currentProvider.getAvailableModels()
              if (!availableModels.includes(selectedModel)) {
                const defaultModel = currentProvider.getDefaultModel()
                setSelectedModel(defaultModel)
                storageService.setModel(defaultModel)
                setSavedModel(defaultModel)
                saveSettings({ llmModel: defaultModel })
              }
            } catch {
              console.warn('Failed to fetch models, using fallback list')
            }
          }
        } else {
          setConnectionStatus('failed')
          setConnectionError(result.message)
        }
      } catch (error) {
        setConnectionStatus('failed')
        setConnectionError(error instanceof Error ? error.message : 'Connection test failed')
      }
    } else {
      await storageService.removeApiKey()
      setSavedApiKey('')
      setConnectionStatus('untested')

      storageService.setModel(selectedModel)
      storageService.setProvider(selectedProvider)
      setSavedModel(selectedModel)
      setSavedProvider(selectedProvider)
      llmService.setProvider(selectedProvider)

      saveSettings({ llmProvider: selectedProvider, llmModel: selectedModel })
    }

    const hasApiKeyAfter = await storageService.hasApiKey()
    if (hadApiKeyBefore !== hasApiKeyAfter) {
      window.dispatchEvent(new CustomEvent('apiKeySaved'))
    }

    setIsSavingLLM(false)
    setShowSuccessLLM(true)
    setTimeout(() => setShowSuccessLLM(false), 3000)
  }

  const handleConfirmRemoveApiKey = async () => {
    setShowRemoveApiKeyConfirm(false)
    setIsRemoving(true)

    try {
      await storageService.removeApiKey()
      setApiKey('')
      setSavedApiKey('')
      setConnectionStatus('untested')
      setConnectionError(null)
      window.dispatchEvent(new CustomEvent('apiKeySaved'))
    } catch (error) {
      console.error('Failed to remove API key:', error)
    } finally {
      setIsRemoving(false)
    }
  }

  const handleSaveInstructions = async () => {
    setIsSavingInstructions(true)
    await new Promise(resolve => setTimeout(resolve, 150))

    storageService.setChatInstructions(chatInstructions.trim())
    setSavedChatInstructions(chatInstructions.trim())

    saveSettings({ chatInstructions: chatInstructions.trim() })

    setIsSavingInstructions(false)
    setShowSuccessInstructions(true)
    setTimeout(() => setShowSuccessInstructions(false), 3000)
  }

  const handleThemeToggle = () => {
    toggleTheme()
    const newTheme = theme === 'light' ? 'dark' : 'light'
    saveSettings({ theme: newTheme })
  }

  const selectStyle = `appearance-none bg-no-repeat bg-right`
  const selectBg = { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundSize: '1.25rem', backgroundPosition: 'right 0.5rem center' }

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'llm', label: 'LLM Settings' },
    { key: 'appearance', label: 'Appearance' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header — matches Library's header pattern */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/library')}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            title="Back to library"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
        </div>

        {/* Tab bar */}
        <div className="max-w-6xl mx-auto px-6">
          <nav className="flex gap-6 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-8">

        {/* LLM Settings tab */}
        {activeTab === 'llm' && (
          <div className="space-y-8">
            {/* API Key section */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">API Key</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Configure your AI provider and credentials.</p>

              <div className="space-y-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Your API key stays on this device and is sent only to the selected provider when you ask a question.
                    We have no server, so we never receive or store your key.
                  </p>
                </div>

                {isInFallbackMode && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Your browser does not support persistent secure storage. Your API key will only be kept for this session and will need to be re-entered after closing the browser.
                    </p>
                  </div>
                )}

                {/* Provider */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">AI Provider</label>
                  <select
                    value={selectedProvider}
                    onChange={(e) => {
                      const newProvider = e.target.value
                      setSelectedProvider(newProvider)
                      setSavedProvider(newProvider)
                      llmService.setProvider(newProvider)
                      storageService.setProvider(newProvider)
                      setApiKey('')
                      const currentProvider = llmService.getCurrentProvider()
                      const defaultModel = currentProvider?.getDefaultModel() || ''
                      setSelectedModel(defaultModel)
                      setSavedModel(defaultModel)
                      storageService.setModel(defaultModel)
                      setConnectionStatus('untested')
                      setConnectionError(null)
                    }}
                    className={`w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${selectStyle}`}
                    style={selectBg}
                  >
                    {llmService.getAvailableProviders().map((provider) => (
                      <option key={provider} value={provider}>{provider}</option>
                    ))}
                  </select>
                </div>

                {/* API Key input */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <span>API Key</span>
                    {connectionStatus === 'testing' && (
                      <svg className="w-3.5 h-3.5 animate-spin text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {connectionStatus === 'connected' && (
                      <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Connected" />
                    )}
                    {connectionStatus === 'failed' && (
                      <svg className="w-3.5 h-3.5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label={connectionError || 'Connection failed'}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value)
                        if (e.target.value.trim() !== savedApiKey) {
                          setConnectionStatus('untested')
                          setConnectionError(null)
                        }
                      }}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title={showApiKey ? 'Hide API key' : 'Show API key'}
                    >
                      {showApiKey ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    <a
                      href={selectedProvider === 'OpenAI' ? 'https://platform.openai.com/api-keys' : 'https://console.anthropic.com/settings/keys'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 dark:text-blue-400 hover:underline"
                    >
                      Get your API key from {selectedProvider}
                    </a>
                  </p>
                </div>

                {/* Model */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className={`w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${selectStyle}`}
                    style={selectBg}
                  >
                    {llmService.getCurrentProvider()?.getAvailableModels().map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Select which model to use for chat responses. Make sure your API key has access to the selected model.
                  </p>
                </div>

                {connectionStatus === 'failed' && connectionError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{connectionError}</p>
                )}

                {/* Save / Remove buttons */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <button
                    onClick={handleSaveLLM}
                    disabled={isSavingLLM || connectionStatus === 'testing' || !hasUnsavedLLMChanges()}
                    className={`w-full px-4 py-2 text-white rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${
                      showSuccessLLM
                        ? 'bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700'
                        : hasUnsavedLLMChanges()
                        ? 'bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700'
                        : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {showSuccessLLM ? (
                      <>
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="whitespace-nowrap">Saved</span>
                      </>
                    ) : isSavingLLM || connectionStatus === 'testing' ? (
                      <>
                        <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="whitespace-nowrap">{connectionStatus === 'testing' ? 'Testing...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <span className="whitespace-nowrap">Save</span>
                    )}
                  </button>

                  {savedApiKey && (
                    <button
                      onClick={() => setShowRemoveApiKeyConfirm(true)}
                      disabled={isRemoving}
                      className="w-full px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRemoving ? 'Removing...' : 'Remove API Key'}
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Divider */}
            <hr className="border-gray-200 dark:border-gray-800" />

            {/* Chat Instructions section */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Chat Instructions</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                System prompt sent to the LLM to guide how it responds. Customize this to control behavior, tone, and focus.
              </p>

              <div className="space-y-4">
                <div>
                  <textarea
                    value={chatInstructions}
                    onChange={(e) => setChatInstructions(e.target.value)}
                    placeholder="Enter system instructions for the LLM..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500"
                    rows={12}
                  />
                  <div className="flex justify-end mt-1">
                    <div className="relative group">
                      <span className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help">
                        What's {'{{ }}'}?
                      </span>
                      <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10 pointer-events-none">
                        <div className="text-gray-300">
                          <code className="px-1 py-0.5 bg-gray-700 rounded text-gray-200">{'{{document_title}}'}</code> and <code className="px-1 py-0.5 bg-gray-700 rounded text-gray-200">{'{{document_author}}'}</code> are automatically replaced with the current document's information.
                        </div>
                        <div className="absolute top-full right-4 -mt-1">
                          <div className="w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <button
                    onClick={handleSaveInstructions}
                    disabled={isSavingInstructions || !hasUnsavedInstructionsChanges()}
                    className={`w-full px-4 py-2 text-white rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${
                      showSuccessInstructions
                        ? 'bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700'
                        : hasUnsavedInstructionsChanges()
                        ? 'bg-orange-500 dark:bg-orange-600 hover:bg-orange-600 dark:hover:bg-orange-700'
                        : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {showSuccessInstructions ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Saved</span>
                      </>
                    ) : isSavingInstructions ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                  {chatInstructions !== DEFAULT_CHAT_INSTRUCTIONS && (
                    <button
                      onClick={() => setChatInstructions(DEFAULT_CHAT_INSTRUCTIONS)}
                      className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 transition-colors text-sm"
                    >
                      Reset to Default
                    </button>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Appearance tab */}
        {activeTab === 'appearance' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Appearance</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Customize the look of your reading environment.</p>

            <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-800">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Theme</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Switch between light and dark mode</p>
              </div>
              <button
                onClick={handleThemeToggle}
                type="button"
                className="flex-shrink-0 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-sm font-medium text-gray-900 dark:text-white transition-colors flex items-center gap-2"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? (
                  <>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    <span className="whitespace-nowrap">Dark Mode</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="whitespace-nowrap">Light Mode</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-12 pb-4">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Echo v{VERSION}
          </p>
        </div>
      </main>

      {/* Remove API Key confirmation */}
      <ConfirmModal
        isOpen={showRemoveApiKeyConfirm}
        title="Remove API Key"
        message="Are you sure you want to remove your API key? You will need to enter it again to use the AI chat features."
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleConfirmRemoveApiKey}
        onCancel={() => setShowRemoveApiKeyConfirm(false)}
        variant="danger"
      />
    </div>
  )
}
