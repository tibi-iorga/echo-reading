import type { LLMProvider, LLMMessage } from '@/types'
import { sanitizeErrorMessage } from './errorSanitizer'

export interface TestConnectionResult {
  success: boolean
  message: string
}

// Stable aliases that never go stale — the API resolves them to the latest dated version
const OPENAI_FALLBACK_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']
const OPENAI_CHAT_MODEL_PREFIXES = ['gpt-', 'o1-', 'o3-', 'o4-', 'chatgpt-']

/**
 * Map HTTP auth failures to a user-facing message. The provider's raw error
 * (e.g. "invalid x-api-key" from Anthropic) leaks implementation details users
 * shouldn't have to think about.
 */
function authErrorMessage(status: number): string | null {
  if (status === 401) return 'Invalid API key.'
  if (status === 403) return 'This API key is not authorised for this provider.'
  return null
}

export class OpenAIProvider implements LLMProvider {
  name = 'OpenAI'

  getAvailableModels(): string[] {
    return OPENAI_FALLBACK_MODELS
  }

  getDefaultModel(): string {
    return 'gpt-4o'
  }

  async fetchAvailableModels(apiKey: string): Promise<string[]> {
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
    return (data.data as Array<{ id: string }>)
      .filter(m => OPENAI_CHAT_MODEL_PREFIXES.some(p => m.id.startsWith(p)))
      .map(m => m.id)
      .sort()
  }

  async testConnection(apiKey: string): Promise<TestConnectionResult> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })

      if (!response.ok) {
        const friendly = authErrorMessage(response.status)
        if (friendly) return { success: false, message: friendly }
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

    if (systemInstructions) {
      messages.push({
        role: 'system',
        content: systemInstructions,
      })
    }

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
      const friendly = authErrorMessage(response.status)
      if (friendly) throw new Error(friendly)
      let errorMessage = 'Failed to send message to OpenAI'
      try {
        const error = await response.json()
        if (error?.error?.message) {
          errorMessage = error.error.message
        } else if (typeof error === 'string') {
          errorMessage = error
        } else if (error?.message) {
          errorMessage = error.message
        }
      } catch {
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(sanitizeErrorMessage(errorMessage))
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || 'No response'
  }
}

// Stable aliases (model name without date) — Anthropic resolves to the latest snapshot
const ANTHROPIC_FALLBACK_MODELS = ['claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-sonnet-4-5']
const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-4-6'

export class AnthropicProvider implements LLMProvider {
  name = 'Anthropic'

  private anthropicHeaders(apiKey: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }
  }

  getAvailableModels(): string[] {
    return ANTHROPIC_FALLBACK_MODELS
  }

  getDefaultModel(): string {
    return ANTHROPIC_DEFAULT_MODEL
  }

  async fetchAvailableModels(apiKey: string): Promise<string[]> {
    const response = await fetch('https://api.anthropic.com/v1/models?limit=100', {
      method: 'GET',
      headers: this.anthropicHeaders(apiKey),
    })

    if (!response.ok) {
      throw new Error('Failed to fetch models')
    }

    const data = await response.json()
    return (data.data as Array<{ id: string; type: string }>)
      .map(m => m.id)
      .filter(id => id.startsWith('claude-'))
      .sort()
  }

  async testConnection(apiKey: string): Promise<TestConnectionResult> {
    try {
      // Use the models endpoint — free, no tokens consumed
      const response = await fetch('https://api.anthropic.com/v1/models?limit=1', {
        method: 'GET',
        headers: this.anthropicHeaders(apiKey),
      })

      if (!response.ok) {
        const friendly = authErrorMessage(response.status)
        if (friendly) return { success: false, message: friendly }
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

    messages.push({
      role: 'user',
      content: message,
    })

    const body: { model: string; max_tokens: number; messages: Array<{ role: string; content: string }>; system?: string } = {
      model,
      max_tokens: 1024,
      messages,
    }

    if (systemInstructions) {
      body.system = systemInstructions
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: this.anthropicHeaders(apiKey),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const friendly = authErrorMessage(response.status)
      if (friendly) throw new Error(friendly)
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      const rawMessage = error.error?.message || 'Failed to send message to Anthropic'
      throw new Error(sanitizeErrorMessage(rawMessage))
    }

    const data = await response.json()
    return data.content[0]?.text || 'No response'
  }
}
