import type { LLMProvider, LLMMessage } from '@/types'
import { sanitizeErrorMessage } from './errorSanitizer'

export interface TestConnectionResult {
  success: boolean
  message: string
}

export class OpenAIProvider implements LLMProvider {
  name = 'OpenAI'
  private cachedModels: string[] | null = null

  getAvailableModels(): string[] {
    // Return cached models or fallback list
    return this.cachedModels || [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
    ]
  }

  getDefaultModel(): string {
    const models = this.getAvailableModels()
    return models.includes('gpt-4o') ? 'gpt-4o' : models[0]
  }

  async fetchAvailableModels(apiKey: string): Promise<string[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch models')
      }

      const data = await response.json()
      const models = data.data
        .filter((model: { id: string }) => model.id.includes('gpt'))
        .map((model: { id: string }) => model.id)
        .sort()
      
      this.cachedModels = models
      return models
    } catch (error) {
      console.warn('Failed to fetch OpenAI models, using fallback list:', error)
      return this.getAvailableModels()
    }
  }

  /**
   * Test the API connection by calling the models endpoint
   * This is free and confirms the key is valid
   */
  async testConnection(apiKey: string): Promise<TestConnectionResult> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
        const rawMessage = error.error?.message || 'Failed to connect to OpenAI'
        return {
          success: false,
          message: sanitizeErrorMessage(rawMessage),
        }
      }

      return {
        success: true,
        message: 'Connected successfully',
      }
    } catch (error) {
      return {
        success: false,
        message: sanitizeErrorMessage(error instanceof Error ? error.message : 'Network error'),
      }
    }
  }

  async sendMessage(message: string, apiKey: string, model: string, systemInstructions?: string, conversationHistory?: LLMMessage[]): Promise<string> {
    const messages: Array<{ role: string; content: string }> = []
    
    // Add system instructions if provided
    if (systemInstructions) {
      messages.push({
        role: 'system',
        content: systemInstructions,
      })
    }
    
    // Add conversation history (excluding system messages, as we handle that separately)
    if (conversationHistory) {
      for (const msg of conversationHistory) {
        if (msg.role !== 'system') {
          messages.push({
            role: msg.role,
            content: msg.content,
          })
        }
      }
    }
    
    // Add current user message
    messages.push({
      role: 'user',
      content: message,
    })

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      let errorMessage = 'Failed to send message to OpenAI'
      try {
        const error = await response.json()
        // OpenAI error format: { error: { message: string, type: string, ... } }
        if (error?.error?.message) {
          errorMessage = error.error.message
        } else if (typeof error === 'string') {
          errorMessage = error
        } else if (error?.message) {
          errorMessage = error.message
        }
      } catch {
        // If JSON parsing fails, use status text or default message
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(sanitizeErrorMessage(errorMessage))
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || 'No response'
  }
}

export class AnthropicProvider implements LLMProvider {
  name = 'Anthropic'
  private cachedModels: string[] | null = null

  getAvailableModels(): string[] {
    // Return cached models or fallback list
    return this.cachedModels || [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-haiku-20240307',
    ]
  }

  getDefaultModel(): string {
    const models = this.getAvailableModels()
    // Prefer Sonnet models, then Haiku
    const preferredOrder = ['claude-3-5-sonnet', 'claude-3-sonnet', 'claude-3-5-haiku', 'claude-3-haiku']
    for (const preferred of preferredOrder) {
      const found = models.find(model => model.includes(preferred))
      if (found) return found
    }
    return models[0]
  }

  async fetchAvailableModels(apiKey: string): Promise<string[]> {
    // Anthropic doesn't have a models endpoint, so we test common models
    const commonModels = [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022', 
      'claude-3-haiku-20240307',
      'claude-3-sonnet-20240229',
      'claude-3-opus-20240229',
    ]

    const availableModels: string[] = []

    for (const model of commonModels) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model,
            max_tokens: 1,
            messages: [{ role: 'user', content: 'Hi' }],
          }),
        })

        if (response.ok || response.status === 400) {
          // 400 might be due to low max_tokens, but model exists
          availableModels.push(model)
        }
      } catch (error) {
        // Skip models that fail
        continue
      }
    }

    if (availableModels.length > 0) {
      this.cachedModels = availableModels
      return availableModels
    }

    console.warn('Failed to detect Anthropic models, using fallback list')
    return this.getAvailableModels()
  }

  /**
   * Test the API connection
   * Anthropic does not have a simple models endpoint, so we use a minimal message
   */
  async testConnection(apiKey: string): Promise<TestConnectionResult> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
        const rawMessage = error.error?.message || 'Failed to connect to Anthropic'
        return {
          success: false,
          message: sanitizeErrorMessage(rawMessage),
        }
      }

      return {
        success: true,
        message: 'Connected successfully',
      }
    } catch (error) {
      return {
        success: false,
        message: sanitizeErrorMessage(error instanceof Error ? error.message : 'Network error'),
      }
    }
  }

  async sendMessage(message: string, apiKey: string, model: string, systemInstructions?: string, conversationHistory?: LLMMessage[]): Promise<string> {
    const messages: Array<{ role: string; content: string }> = []
    
    // Add conversation history (excluding system messages, as we handle that separately)
    if (conversationHistory) {
      for (const msg of conversationHistory) {
        if (msg.role !== 'system') {
          messages.push({
            role: msg.role,
            content: msg.content,
          })
        }
      }
    }
    
    // Add current user message
    messages.push({
      role: 'user',
      content: message,
    })

    const body: { model: string; max_tokens: number; messages: Array<{ role: string; content: string }>; system?: string } = {
      model,
      max_tokens: 1024,
      messages,
    }

    // Anthropic uses a separate 'system' field for system instructions
    if (systemInstructions) {
      body.system = systemInstructions
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      const rawMessage = error.error?.message || 'Failed to send message to Anthropic'
      throw new Error(sanitizeErrorMessage(rawMessage))
    }

    const data = await response.json()
    return data.content[0]?.text || 'No response'
  }
}
