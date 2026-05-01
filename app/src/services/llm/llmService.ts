import type { LLMProvider, LLMMessage } from '@/types'
import { OpenAIProvider, AnthropicProvider, type TestConnectionResult } from './providers'

interface ExtendedLLMProvider extends LLMProvider {
  testConnection?(apiKey: string): Promise<TestConnectionResult>
}

const MODEL_CACHE_KEY = 'llm_models_cache_v1'
const MODEL_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

// Stable empty reference so getAvailableModels can be called from useSyncExternalStore
// snapshots without producing a new array on every render.
const EMPTY_MODELS: string[] = []

interface ModelCacheFile {
  fetchedAt: number
  byProvider: Record<string, string[]>
}

type ModelCacheListener = () => void

class LLMService {
  private providers: Map<string, ExtendedLLMProvider> = new Map()
  private modelCache: Map<string, string[]> = new Map()
  private listeners: Set<ModelCacheListener> = new Set()

  constructor() {
    this.registerProvider(new OpenAIProvider())
    this.registerProvider(new AnthropicProvider())
    this.hydrateModelCache()
  }

  /**
   * Subscribe to model cache changes (for useSyncExternalStore).
   * Returns an unsubscribe function.
   */
  subscribe = (listener: ModelCacheListener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }

  registerProvider(provider: ExtendedLLMProvider): void {
    this.providers.set(provider.name, provider)
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  hasProvider(name: string): boolean {
    return this.providers.has(name)
  }

  /**
   * Resolve a stored provider name to a known provider, falling back to the
   * first registered one if the name is unknown (e.g. stale settings row).
   */
  resolveProviderId(name: string | null | undefined): string {
    if (name && this.providers.has(name)) return name
    const fallback = this.getAvailableProviders()[0]
    if (!fallback) throw new Error('No LLM providers registered')
    return fallback
  }

  private getProvider(providerId: string): ExtendedLLMProvider {
    const provider = this.providers.get(providerId)
    if (!provider) {
      throw new Error(`Unknown LLM provider: ${providerId}`)
    }
    return provider
  }

  /**
   * Returns the cached live model list for a provider, or its static fallback
   * list if no cache is available. Always safe to call from render — returns
   * a stable empty array for an empty or unknown provider id.
   */
  getAvailableModels(providerId: string): string[] {
    if (!providerId || !this.providers.has(providerId)) return EMPTY_MODELS
    const cached = this.modelCache.get(providerId)
    if (cached && cached.length > 0) return cached
    return this.getProvider(providerId).getAvailableModels()
  }

  /**
   * Returns the provider's preferred default model if it is in the available
   * list, otherwise the first available model.
   */
  getDefaultModel(providerId: string): string {
    const provider = this.getProvider(providerId)
    const preferred = provider.getDefaultModel()
    const available = this.getAvailableModels(providerId)
    if (available.includes(preferred)) return preferred
    return available[0] ?? preferred
  }

  /**
   * Returns true if `model` is in the cached/fallback list for the provider.
   */
  isModelAvailable(providerId: string, model: string): boolean {
    return this.getAvailableModels(providerId).includes(model)
  }

  /**
   * Single decision point for "what model do we send to the provider?".
   * Trusts a non-empty stored model even if it's not in the cached list:
   * the cache may be the static fallback while the live /v1/models fetch is
   * still in flight, and the provider knows best what models are valid.
   * Falls back to the provider's default only when nothing is stored.
   */
  resolveModel(providerId: string, storedModel: string | null | undefined): string {
    if (storedModel && storedModel.length > 0) return storedModel
    return this.getDefaultModel(providerId)
  }

  async fetchAvailableModels(providerId: string, apiKey: string): Promise<string[]> {
    const provider = this.getProvider(providerId)
    if (!provider.fetchAvailableModels) {
      return this.getAvailableModels(providerId)
    }
    try {
      const models = await provider.fetchAvailableModels(apiKey)
      if (models.length > 0) {
        this.modelCache.set(providerId, models)
        this.persistModelCache()
        this.notify()
        return models
      }
    } catch (error) {
      console.warn(`Failed to fetch models for ${providerId}, using fallback list:`, error)
    }
    return this.getAvailableModels(providerId)
  }

  async testConnection(providerId: string, apiKey: string): Promise<TestConnectionResult> {
    const provider = this.getProvider(providerId)
    if (!provider.testConnection) {
      return { success: false, message: 'Provider does not support connection testing' }
    }
    return provider.testConnection(apiKey)
  }

  async sendMessage(
    providerId: string,
    apiKey: string,
    model: string,
    message: string,
    systemInstructions?: string,
    conversationHistory?: LLMMessage[],
  ): Promise<string> {
    return this.getProvider(providerId).sendMessage(message, apiKey, model, systemInstructions, conversationHistory)
  }

  private hydrateModelCache(): void {
    try {
      const raw = localStorage.getItem(MODEL_CACHE_KEY)
      if (!raw) return
      const data = JSON.parse(raw) as ModelCacheFile
      if (!data || typeof data.fetchedAt !== 'number') return
      if (Date.now() - data.fetchedAt > MODEL_CACHE_TTL_MS) return
      for (const [providerId, models] of Object.entries(data.byProvider ?? {})) {
        if (this.providers.has(providerId) && Array.isArray(models)) {
          this.modelCache.set(providerId, models)
        }
      }
    } catch {
      // Corrupt or unreadable cache; ignore and use fallback lists.
    }
  }

  private persistModelCache(): void {
    try {
      const byProvider: Record<string, string[]> = {}
      for (const [providerId, models] of this.modelCache.entries()) {
        byProvider[providerId] = models
      }
      const data: ModelCacheFile = { fetchedAt: Date.now(), byProvider }
      localStorage.setItem(MODEL_CACHE_KEY, JSON.stringify(data))
    } catch {
      // localStorage full or unavailable; the in-memory cache still works.
    }
  }
}

export const llmService = new LLMService()
