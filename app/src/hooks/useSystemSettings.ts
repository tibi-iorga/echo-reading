import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/react'
import { storageService } from '@/services/storage/storageService'
import { llmService } from '@/services/llm/llmService'
import * as api from '@/services/api/apiService'

interface SystemSettings {
  theme: 'light' | 'dark'
  llmProvider: string
  llmModel: string
  chatInstructions: string
}

/**
 * Hook that manages system-level settings with Cross-device sync.
 *
 * On mount: fetches from the API and hydrates localStorage.
 * On save: writes to both localStorage (for immediate local reads) and Supabase (for cross-device sync).
 *
 * API key is NOT synced — it stays in encrypted IndexedDB per-device.
 */
export function useSystemSettings() {
  const { userId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<SystemSettings | null>(null)

  // Load settings: fetch from the API, fall back to localStorage
  useEffect(() => {
    if (!userId) return

    const load = async () => {
      setLoading(true)
      try {
        const remote = await api.getUserSettings(userId)

        if (remote) {
          // Hydrate localStorage from the API (remote wins)
          if (remote.theme === 'light' || remote.theme === 'dark') {
            storageService.saveTheme(remote.theme)
          }
          if (remote.llmProvider) {
            storageService.setProvider(remote.llmProvider)
            llmService.setProvider(remote.llmProvider)
          }
          if (remote.llmModel) {
            storageService.setModel(remote.llmModel)
          }
          if (remote.chatInstructions !== null) {
            storageService.setChatInstructions(remote.chatInstructions)
          }

          setSettings({
            theme: (remote.theme === 'light' || remote.theme === 'dark') ? remote.theme : 'light',
            llmProvider: remote.llmProvider || 'OpenAI',
            llmModel: remote.llmModel || '',
            chatInstructions: remote.chatInstructions || storageService.getChatInstructions() || '',
          })
        } else {
          // No remote settings — read from localStorage
          const storedProvider = storageService.getProvider() || 'OpenAI'
          llmService.setProvider(storedProvider)

          setSettings({
            theme: storageService.getTheme() || 'light',
            llmProvider: storedProvider,
            llmModel: storageService.getModel() || '',
            chatInstructions: storageService.getChatInstructions() || '',
          })
        }
      } catch (err) {
        console.warn('Failed to load remote settings, using local:', err)
        const storedProvider = storageService.getProvider() || 'OpenAI'
        llmService.setProvider(storedProvider)

        setSettings({
          theme: storageService.getTheme() || 'light',
          llmProvider: storedProvider,
          llmModel: storageService.getModel() || '',
          chatInstructions: storageService.getChatInstructions() || '',
        })
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [userId])

  // Save a subset of settings to both localStorage and Supabase
  const saveSettings = useCallback(async (updates: Partial<SystemSettings>) => {
    if (!userId) return

    // Write to localStorage immediately
    if (updates.theme) {
      storageService.saveTheme(updates.theme)
    }
    if (updates.llmProvider) {
      storageService.setProvider(updates.llmProvider)
      llmService.setProvider(updates.llmProvider)
    }
    if (updates.llmModel) {
      storageService.setModel(updates.llmModel)
    }
    if (updates.chatInstructions !== undefined) {
      storageService.setChatInstructions(updates.chatInstructions)
    }

    // Update local state
    setSettings(prev => prev ? { ...prev, ...updates } : null)

    // Sync to Supabase (fire-and-forget with error logging)
    const supabaseUpdates: Parameters<typeof api.saveUserSettings>[1] = {}
    if (updates.theme) supabaseUpdates.theme = updates.theme
    if (updates.llmProvider) supabaseUpdates.llm_provider = updates.llmProvider
    if (updates.llmModel !== undefined) supabaseUpdates.llm_model = updates.llmModel
    if (updates.chatInstructions !== undefined) supabaseUpdates.chat_instructions = updates.chatInstructions

    try {
      await api.saveUserSettings(userId, supabaseUpdates)
    } catch (err) {
      console.warn('Failed to sync settings to Supabase:', err)
    }
  }, [userId])

  return { settings, loading, saveSettings }
}
