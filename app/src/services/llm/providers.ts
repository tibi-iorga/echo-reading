import type { LLMProvider, LLMMessage } from '@/types'
import { sanitizeErrorMessage } from './errorSanitizer'

export interface TestConnectionResult {
  success: boolean
  message: string
}

export class OpenAIProvider implements LLMProvider {
  name = 'OpenAI'

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

  async sendMessage(message: string, apiKey: string, systemInstructions?: string, conversationHistory?: LLMMessage[]): Promise<string> {
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
        model: 'gpt-4',
        messages,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      const rawMessage = error.error?.message || 'Failed to send message to OpenAI'
      throw new Error(sanitizeErrorMessage(rawMessage))
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || 'No response'
  }
}

export class AnthropicProvider implements LLMProvider {
  name = 'Anthropic'

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

  async sendMessage(message: string, apiKey: string, systemInstructions?: string, conversationHistory?: LLMMessage[]): Promise<string> {
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
      model: 'claude-3-opus-20240229',
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
