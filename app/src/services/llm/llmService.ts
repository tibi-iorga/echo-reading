import type { LLMProvider } from '@/types'
import { OpenAIProvider, type TestConnectionResult } from './providers'

// Extended provider interface with testConnection
interface ExtendedLLMProvider extends LLMProvider {
  testConnection?(apiKey: string): Promise<TestConnectionResult>
}

class LLMService {
  private providers: Map<string, ExtendedLLMProvider> = new Map()
  private currentProvider: ExtendedLLMProvider | null = null

  constructor() {
    this.registerProvider(new OpenAIProvider())
    this.currentProvider = this.providers.get('OpenAI') || null
  }

  registerProvider(provider: ExtendedLLMProvider): void {
    this.providers.set(provider.name, provider)
  }

  setProvider(name: string): void {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`Provider ${name} not found`)
    }
    this.currentProvider = provider
  }

  getCurrentProvider(): ExtendedLLMProvider | null {
    return this.currentProvider
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Test the connection to the current provider
   */
  async testConnection(apiKey: string): Promise<TestConnectionResult> {
    if (!this.currentProvider) {
      return { success: false, message: 'No LLM provider selected' }
    }
    if (!this.currentProvider.testConnection) {
      return { success: false, message: 'Provider does not support connection testing' }
    }
    return this.currentProvider.testConnection(apiKey)
  }

  async sendMessage(message: string, apiKey: string, systemInstructions?: string, conversationHistory?: import('@/types').LLMMessage[]): Promise<string> {
    if (!this.currentProvider) {
      throw new Error('No LLM provider selected')
    }
    return this.currentProvider.sendMessage(message, apiKey, systemInstructions, conversationHistory)
  }
}

export const llmService = new LLMService()
