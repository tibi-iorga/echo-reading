import type { LLMProvider } from '@/types'
import { OpenAIProvider } from './providers'

class LLMService {
  private providers: Map<string, LLMProvider> = new Map()
  private currentProvider: LLMProvider | null = null

  constructor() {
    this.registerProvider(new OpenAIProvider())
    this.currentProvider = this.providers.get('OpenAI') || null
  }

  registerProvider(provider: LLMProvider): void {
    this.providers.set(provider.name, provider)
  }

  setProvider(name: string): void {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`Provider ${name} not found`)
    }
    this.currentProvider = provider
  }

  getCurrentProvider(): LLMProvider | null {
    return this.currentProvider
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  async sendMessage(message: string, apiKey: string, systemInstructions?: string, conversationHistory?: import('@/types').LLMMessage[]): Promise<string> {
    if (!this.currentProvider) {
      throw new Error('No LLM provider selected')
    }
    return this.currentProvider.sendMessage(message, apiKey, systemInstructions, conversationHistory)
  }
}

export const llmService = new LLMService()
