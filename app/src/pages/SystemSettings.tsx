import { useState, useEffect, useSyncExternalStore } from 'react'
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
type ConnectionStatus = 'untested' | 'testing' | 'connected' | 'failed'
type EditingRow = 'none' | 'apiKey' | 'model'

const VALIDATE_DEBOUNCE_MS = 500

export function SystemSettings() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { settings, loading, saveSettings } = useSystemSettings()

  const [activeTab, setActiveTab] = useState<SettingsTab>('llm')

  // Persisted source-of-truth values
  const [savedApiKey, setSavedApiKey] = useState('')
  const [savedProvider, setSavedProvider] = useState('OpenAI')
  const [savedModel, setSavedModel] = useState('')
  const [isInFallbackMode, setIsInFallbackMode] = useState(false)

  // Working draft values used during setup or inline edit.
  // draftProvider starts blank in first-run setup so the dropdown shows a
  // "Select a provider" placeholder rather than silently defaulting to one.
  const [draftProvider, setDraftProvider] = useState('')
  const [draftApiKey, setDraftApiKey] = useState('')
  const [draftModel, setDraftModel] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  // Mode + edit state
  // forceSetupMode is set when a configured user clicks "Change" on Provider —
  // they need to re-enter a key for the new provider, so we treat it as setup.
  const [forceSetupMode, setForceSetupMode] = useState(false)
  const [editingRow, setEditingRow] = useState<EditingRow>('none')
  const [modelEditReason, setModelEditReason] = useState<string | null>(null)

  // Connection state for the draft key (auto-validated as it changes)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('untested')
  const [connectionError, setConnectionError] = useState<string | null>(null)
  // Snapshot of the saved key's last-known status, so the summary view can
  // restore it after the user opens and cancels an inline Replace.
  const [savedKeyStatus, setSavedKeyStatus] = useState<ConnectionStatus>('untested')
  const [savedKeyError, setSavedKeyError] = useState<string | null>(null)

  // Saving / removing flags
  const [isFinishingSetup, setIsFinishingSetup] = useState(false)
  const [isSavingRow, setIsSavingRow] = useState(false)
  const [showSuccessLLM, setShowSuccessLLM] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [showRemoveApiKeyConfirm, setShowRemoveApiKeyConfirm] = useState(false)

  // Chat instructions state
  const [chatInstructions, setChatInstructions] = useState('')
  const [savedChatInstructions, setSavedChatInstructions] = useState('')
  const [isSavingInstructions, setIsSavingInstructions] = useState(false)
  const [showSuccessInstructions, setShowSuccessInstructions] = useState(false)

  // Derived: setup mode shows the stepper, configured mode shows the summary.
  // forceSetupMode lets a configured user temporarily re-enter setup when
  // changing providers (since a new provider needs a new key).
  const mode: 'setup' | 'configured' = savedApiKey && !forceSetupMode ? 'configured' : 'setup'

  // The provider whose model list the dropdown should reflect:
  // setup → the draft provider being configured
  // configured (editing model row) → the saved provider
  const dropdownProvider = mode === 'setup' ? draftProvider : savedProvider

  // Reactive model list — re-renders when llmService updates the cache after a
  // background fetchAvailableModels resolves.
  const availableModels = useSyncExternalStore(
    llmService.subscribe,
    () => llmService.getAvailableModels(dropdownProvider),
  )

  // Initial load — hydrate saved values from storage and silently test the key.
  useEffect(() => {
    let cancelled = false

    const loadSettings = async () => {
      const storedKey = await storageService.getApiKey()
      if (cancelled) return

      setIsInFallbackMode(storageService.isApiKeyInFallbackMode())

      const storedProvider = llmService.resolveProviderId(storageService.getProvider())
      setSavedProvider(storedProvider)
      // Only seed the draft from storage when there's actually a saved key
      // (configured user). For first-run setup leave it blank so the user
      // makes an explicit choice.
      if (storedKey) {
        setDraftProvider(storedProvider)
      }

      if (storedKey) {
        setSavedApiKey(storedKey)
        setConnectionStatus('testing')
        try {
          const result = await llmService.testConnection(storedProvider, storedKey)
          if (cancelled) return
          if (result.success) {
            setConnectionStatus('connected')
            setSavedKeyStatus('connected')
            setSavedKeyError(null)
            // Refresh the live model list so the dropdown reflects what the
            // key actually has access to.
            void llmService.fetchAvailableModels(storedProvider, storedKey)
          } else {
            setConnectionStatus('failed')
            setConnectionError(result.message)
            setSavedKeyStatus('failed')
            setSavedKeyError(result.message)
          }
        } catch (error) {
          if (cancelled) return
          const msg = error instanceof Error ? error.message : 'Connection test failed'
          setConnectionStatus('failed')
          setConnectionError(msg)
          setSavedKeyStatus('failed')
          setSavedKeyError(msg)
        }
      }

      const storedModel = storageService.getModel()
      const modelToUse = storedModel && storedModel.length > 0
        ? storedModel
        : llmService.getDefaultModel(storedProvider)
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

    void loadSettings()
    return () => { cancelled = true }
  }, [])

  // Hydrate from cross-device settings when they load from the API.
  // Only updates saved* values; never overwrites in-progress drafts.
  useEffect(() => {
    if (!settings || loading) return

    const remoteProvider = llmService.resolveProviderId(storageService.getProvider())
    if (remoteProvider !== savedProvider) {
      setSavedProvider(remoteProvider)
    }

    const remoteModel = storageService.getModel() || ''
    if (remoteModel && remoteModel !== savedModel) {
      setSavedModel(remoteModel)
    }

    const remoteInstructions = storageService.getChatInstructions()
    if (remoteInstructions && remoteInstructions !== chatInstructions) {
      setChatInstructions(remoteInstructions)
      setSavedChatInstructions(remoteInstructions)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, loading])

  // Auto-validate the draft API key as it changes.
  // Active when in setup mode or when editing the apiKey row inline.
  useEffect(() => {
    const shouldValidate =
      (mode === 'setup' || editingRow === 'apiKey') && draftApiKey.trim().length > 0

    if (!shouldValidate) {
      // Reset transient status when there's nothing to validate.
      setConnectionStatus(prev => (prev === 'testing' || prev === 'failed' ? 'untested' : prev))
      setConnectionError(null)
      return
    }

    let cancelled = false
    setConnectionStatus('testing')
    setConnectionError(null)

    const handle = setTimeout(async () => {
      try {
        const result = await llmService.testConnection(draftProvider, draftApiKey.trim())
        if (cancelled) return
        if (result.success) {
          setConnectionStatus('connected')
          // Pull the live model list so the dropdown reflects this key's
          // access. Fire-and-forget; subscribers re-render when it lands.
          void llmService.fetchAvailableModels(draftProvider, draftApiKey.trim())
          // Pre-select a sensible default so step 3 isn't empty.
          setDraftModel(prev => prev || llmService.getDefaultModel(draftProvider))
        } else {
          setConnectionStatus('failed')
          setConnectionError(result.message)
        }
      } catch (err) {
        if (cancelled) return
        setConnectionStatus('failed')
        setConnectionError(err instanceof Error ? err.message : 'Connection test failed')
      }
    }, VALIDATE_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [draftApiKey, draftProvider, mode, editingRow])

  // ---- Setup mode handlers ---------------------------------------------------

  function handleProviderDraftChange(newProvider: string) {
    setDraftProvider(newProvider)
    setDraftApiKey('')
    setDraftModel('')
    setConnectionStatus('untested')
    setConnectionError(null)
  }

  async function handleFinishSetup() {
    if (connectionStatus !== 'connected' || !draftApiKey || !draftModel) return

    setIsFinishingSetup(true)
    try {
      await storageService.setApiKey(draftApiKey.trim())
      storageService.setProvider(draftProvider)
      storageService.setModel(draftModel)

      setSavedApiKey(draftApiKey.trim())
      setSavedProvider(draftProvider)
      setSavedModel(draftModel)
      setSavedKeyStatus('connected')
      setSavedKeyError(null)

      saveSettings({ llmProvider: draftProvider, llmModel: draftModel })

      setForceSetupMode(false)
      setShowSuccessLLM(true)
      setTimeout(() => setShowSuccessLLM(false), 3000)

      window.dispatchEvent(new CustomEvent('apiKeySaved'))
    } finally {
      setIsFinishingSetup(false)
    }
  }

  function handleCancelSetup() {
    // forceSetupMode: configured user mid provider switch — restore configured
    // view with the original saved values intact.
    // First-run setup: clear all drafts back to defaults; stay on the page.
    if (forceSetupMode) {
      setForceSetupMode(false)
      setDraftProvider(savedProvider)
    } else {
      setDraftProvider('')
    }
    setDraftApiKey('')
    setDraftModel('')
    setShowApiKey(false)
    setConnectionStatus('untested')
    setConnectionError(null)
  }

  // ---- Configured mode: row edit handlers -----------------------------------

  function handleStartChangeProvider() {
    setForceSetupMode(true)
    setDraftProvider(savedProvider)
    setDraftApiKey('')
    setDraftModel('')
    setConnectionStatus('untested')
    setConnectionError(null)
  }

  function handleStartReplaceKey() {
    setEditingRow('apiKey')
    setDraftProvider(savedProvider)
    setDraftApiKey('')
    setShowApiKey(false)
    setConnectionStatus('untested')
    setConnectionError(null)
  }

  function handleCancelKeyEdit() {
    setEditingRow('none')
    setDraftApiKey('')
    // Restore the saved key's last-known status — we never actually changed it.
    setConnectionStatus(savedKeyStatus)
    setConnectionError(savedKeyError)
  }

  async function handleSaveKeyEdit() {
    if (connectionStatus !== 'connected' || !draftApiKey) return

    setIsSavingRow(true)
    try {
      const newKey = draftApiKey.trim()
      await storageService.setApiKey(newKey)
      setSavedApiKey(newKey)
      // Save succeeded only after auto-validation, so the saved key is connected.
      setSavedKeyStatus('connected')
      setSavedKeyError(null)

      // Pull the live model list with the new key. If the saved model isn't
      // available under it, drop the user into the model row to pick again.
      const models = await llmService.fetchAvailableModels(savedProvider, newKey)
      if (savedModel && models.length > 0 && !models.includes(savedModel)) {
        setDraftModel(llmService.getDefaultModel(savedProvider))
        setEditingRow('model')
        setModelEditReason('Your previous model is not available with this key. Pick a new one.')
      } else {
        setEditingRow('none')
      }

      window.dispatchEvent(new CustomEvent('apiKeySaved'))
    } catch (err) {
      setConnectionStatus('failed')
      setConnectionError(err instanceof Error ? err.message : 'Failed to save key')
    } finally {
      setIsSavingRow(false)
    }
  }

  function handleStartChangeModel() {
    setEditingRow('model')
    setDraftModel(savedModel || llmService.getDefaultModel(savedProvider))
    setModelEditReason(null)
  }

  function handleCancelModelEdit() {
    setEditingRow('none')
    setDraftModel('')
    setModelEditReason(null)
  }

  function handleSaveModelEdit() {
    if (!draftModel) return
    setIsSavingRow(true)
    try {
      storageService.setModel(draftModel)
      setSavedModel(draftModel)
      saveSettings({ llmModel: draftModel })
      setEditingRow('none')
      setModelEditReason(null)
    } finally {
      setIsSavingRow(false)
    }
  }

  // ---- API key removal -------------------------------------------------------

  const handleConfirmRemoveApiKey = async () => {
    setShowRemoveApiKeyConfirm(false)
    setIsRemoving(true)
    try {
      await storageService.removeApiKey()
      setSavedApiKey('')
      setDraftApiKey('')
      setEditingRow('none')
      setConnectionStatus('untested')
      setConnectionError(null)
      setSavedKeyStatus('untested')
      setSavedKeyError(null)
      window.dispatchEvent(new CustomEvent('apiKeySaved'))
    } catch (error) {
      console.error('Failed to remove API key:', error)
    } finally {
      setIsRemoving(false)
    }
  }

  // ---- Chat instructions -----------------------------------------------------

  const hasUnsavedInstructionsChanges = () => chatInstructions.trim() !== savedChatInstructions

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

  // ---- Render helpers --------------------------------------------------------

  const selectStyle = `appearance-none bg-no-repeat bg-right`
  const selectBg = { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundSize: '1.25rem', backgroundPosition: 'right 0.5rem center' }

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'llm', label: 'LLM Settings' },
    { key: 'appearance', label: 'Appearance' },
  ]

  const maskedKey = (key: string) => {
    if (!key) return ''
    if (key.length <= 8) return '•'.repeat(key.length)
    return `${key.slice(0, 7)}••••${key.slice(-4)}`
  }

  function StatusPill({ status }: { status: ConnectionStatus }) {
    if (status === 'testing') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Testing…
        </span>
      )
    }
    if (status === 'connected') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-500" /> Connected
        </span>
      )
    }
    if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <span className="w-2 h-2 rounded-full bg-red-500" /> Failed
        </span>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
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

      <main className="max-w-2xl mx-auto px-6 py-8">

        {activeTab === 'llm' && (
          <div className="space-y-8">
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

                {mode === 'setup' ? (
                  /* ---------- SETUP MODE: stepper ---------- */
                  <div>
                    {forceSetupMode && (
                      <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
                        <div className="flex-1 text-sm text-amber-900 dark:text-amber-200">
                          Switching providers will replace your current setup.
                        </div>
                        <button
                          onClick={handleCancelSetup}
                          className="text-xs font-medium text-amber-900 dark:text-amber-200 underline hover:no-underline"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    <ol className="space-y-6">
                      {/* Step 1: Provider */}
                      <li className="flex gap-3 items-start">
                        <StepBadge complete={!!draftProvider} number={1} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Choose your provider
                          </div>
                          <select
                            value={draftProvider}
                            onChange={(e) => handleProviderDraftChange(e.target.value)}
                            className={`w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${selectStyle}`}
                            style={selectBg}
                          >
                            <option value="" disabled hidden>Select a provider…</option>
                            {llmService.getAvailableProviders().map((provider) => (
                              <option key={provider} value={provider}>{provider}</option>
                            ))}
                          </select>
                        </div>
                      </li>

                      {/* Step 2: API Key — disabled until a provider is picked */}
                      <li className="flex gap-3 items-start">
                        <StepBadge
                          number={2}
                          complete={connectionStatus === 'connected'}
                          disabled={!draftProvider}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm font-medium ${
                              draftProvider
                                ? 'text-gray-900 dark:text-gray-100'
                                : 'text-gray-400 dark:text-gray-500'
                            }`}>
                              Add your API key
                            </span>
                            <StatusPill status={connectionStatus} />
                          </div>
                          <div className="relative">
                            <input
                              type={showApiKey ? 'text' : 'password'}
                              value={draftApiKey}
                              onChange={(e) => setDraftApiKey(e.target.value)}
                              placeholder="sk-..."
                              disabled={!draftProvider}
                              className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:bg-gray-100 dark:disabled:bg-gray-800/50 disabled:cursor-not-allowed disabled:text-gray-400 dark:disabled:text-gray-500"
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              disabled={!draftProvider}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={showApiKey ? 'Hide API key' : 'Show API key'}
                            >
                              {showApiKey ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                          </div>
                          {connectionStatus === 'failed' && connectionError && (
                            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{connectionError}</p>
                          )}
                          {draftProvider && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              <a
                                href={draftProvider === 'OpenAI' ? 'https://platform.openai.com/api-keys' : 'https://console.anthropic.com/settings/keys'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 dark:text-blue-400 hover:underline"
                              >
                                Get your API key from {draftProvider}
                              </a>
                            </p>
                          )}
                        </div>
                      </li>

                      {/* Step 3: Model — always visible, disabled until step 2 validates */}
                      <li className="flex gap-3 items-start">
                        <StepBadge
                          number={3}
                          complete={false}
                          disabled={connectionStatus !== 'connected'}
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium mb-2 ${
                            connectionStatus === 'connected'
                              ? 'text-gray-900 dark:text-gray-100'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}>
                            Choose a model
                          </div>
                          <select
                            value={connectionStatus === 'connected' ? draftModel : ''}
                            onChange={(e) => setDraftModel(e.target.value)}
                            disabled={connectionStatus !== 'connected'}
                            className={`w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800/50 disabled:cursor-not-allowed disabled:text-gray-400 dark:disabled:text-gray-500 ${selectStyle}`}
                            style={selectBg}
                          >
                            {connectionStatus === 'connected' ? (
                              availableModels.map((model) => (
                                <option key={model} value={model}>{model}</option>
                              ))
                            ) : (
                              <option value="">—</option>
                            )}
                          </select>
                          {connectionStatus === 'connected' && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              We've pre-selected a sensible default. Change it if you'd like.
                            </p>
                          )}
                        </div>
                      </li>
                    </ol>

                    <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                      <button
                        onClick={handleFinishSetup}
                        disabled={isFinishingSetup || connectionStatus !== 'connected' || !draftModel}
                        className={`flex-1 px-4 py-2 text-white rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${
                          showSuccessLLM
                            ? 'bg-green-500 dark:bg-green-600'
                            : connectionStatus === 'connected' && draftModel && !isFinishingSetup
                            ? 'bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700'
                            : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                        }`}
                      >
                        {showSuccessLLM ? (
                          <><CheckIcon /> <span>Setup complete</span></>
                        ) : isFinishingSetup ? (
                          <><SpinnerIcon /> <span>Saving…</span></>
                        ) : (
                          <span>Finish setup</span>
                        )}
                      </button>
                      <button
                        onClick={handleCancelSetup}
                        disabled={isFinishingSetup}
                        className="flex-shrink-0 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ---------- CONFIGURED MODE: summary + inline edit ---------- */
                  <div>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">

                      {/* Provider row */}
                      <SummaryRow
                        label="AI Provider"
                        dim={editingRow !== 'none'}
                        action={editingRow === 'none' ? (
                          <button
                            onClick={handleStartChangeProvider}
                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Change
                          </button>
                        ) : undefined}
                      >
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {savedProvider}
                        </div>
                      </SummaryRow>

                      {/* API Key row */}
                      <SummaryRow
                        label="API Key"
                        dim={editingRow === 'model'}
                        highlight={editingRow === 'apiKey'}
                        action={editingRow === 'none' ? (
                          <button
                            onClick={handleStartReplaceKey}
                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Replace
                          </button>
                        ) : undefined}
                      >
                        {editingRow === 'apiKey' ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400">Paste a new key — we'll validate it automatically.</span>
                              <StatusPill status={connectionStatus} />
                            </div>
                            <div className="relative">
                              <input
                                type={showApiKey ? 'text' : 'password'}
                                value={draftApiKey}
                                onChange={(e) => setDraftApiKey(e.target.value)}
                                placeholder="sk-..."
                                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                title={showApiKey ? 'Hide API key' : 'Show API key'}
                              >
                                {showApiKey ? <EyeOffIcon /> : <EyeIcon />}
                              </button>
                            </div>
                            {connectionStatus === 'failed' && connectionError && (
                              <p className="text-xs text-red-600 dark:text-red-400">{connectionError}</p>
                            )}
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                onClick={handleCancelKeyEdit}
                                disabled={isSavingRow}
                                className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md disabled:opacity-50"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSaveKeyEdit}
                                disabled={isSavingRow || connectionStatus !== 'connected'}
                                className="px-3 py-1.5 text-sm text-white bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isSavingRow ? 'Saving…' : 'Save'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-sm font-mono text-gray-900 dark:text-gray-100">
                              {maskedKey(savedApiKey)}
                            </div>
                            <div className="mt-1"><StatusPill status={connectionStatus} /></div>
                          </>
                        )}
                      </SummaryRow>

                      {/* Model row */}
                      <SummaryRow
                        label="Model"
                        dim={editingRow === 'apiKey'}
                        highlight={editingRow === 'model'}
                        action={editingRow === 'none' ? (
                          <button
                            onClick={handleStartChangeModel}
                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Change
                          </button>
                        ) : undefined}
                      >
                        {editingRow === 'model' ? (
                          <div className="space-y-2">
                            {modelEditReason && (
                              <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-2">
                                {modelEditReason}
                              </p>
                            )}
                            <select
                              value={draftModel}
                              onChange={(e) => setDraftModel(e.target.value)}
                              className={`w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${selectStyle}`}
                              style={selectBg}
                              autoFocus
                            >
                              {availableModels.map((model) => (
                                <option key={model} value={model}>{model}</option>
                              ))}
                            </select>
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                onClick={handleCancelModelEdit}
                                disabled={isSavingRow}
                                className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md disabled:opacity-50"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSaveModelEdit}
                                disabled={isSavingRow || !draftModel || draftModel === savedModel}
                                className="px-3 py-1.5 text-sm text-white bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isSavingRow ? 'Saving…' : 'Save'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {savedModel}
                          </div>
                        )}
                      </SummaryRow>

                    </div>

                    <div className="flex justify-end mt-4">
                      <button
                        onClick={() => setShowRemoveApiKeyConfirm(true)}
                        disabled={isRemoving || editingRow !== 'none'}
                        className="text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                      >
                        {isRemoving ? 'Removing…' : 'Remove API key'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <hr className="border-gray-200 dark:border-gray-800" />

            {/* Chat Instructions section (unchanged) */}
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
                      <><CheckIcon /> <span>Saved</span></>
                    ) : isSavingInstructions ? (
                      <><SpinnerIcon /> <span>Saving...</span></>
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

        <div className="text-center pt-12 pb-4">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Echo v{VERSION}
          </p>
        </div>
      </main>

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

// ---- Small render helpers --------------------------------------------------

function StepBadge({ number, complete, disabled = false }: { number: number; complete: boolean; disabled?: boolean }) {
  if (complete) {
    return (
      <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
        ✓
      </span>
    )
  }
  if (disabled) {
    return (
      <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
        {number}
      </span>
    )
  }
  return (
    <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
      {number}
    </span>
  )
}

function SummaryRow({
  label,
  children,
  action,
  dim = false,
  highlight = false,
}: {
  label: string
  children: React.ReactNode
  action?: React.ReactNode
  dim?: boolean
  highlight?: boolean
}) {
  return (
    <div
      className={`px-4 py-3 transition-opacity ${
        highlight ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
      } ${dim ? 'opacity-50' : ''}`}
    >
      {action ? (
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
            {children}
          </div>
          <div className="flex-shrink-0">{action}</div>
        </div>
      ) : (
        <>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
          {children}
        </>
      )}
    </div>
  )
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}
