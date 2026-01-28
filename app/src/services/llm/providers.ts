import type { LLMProvider, LLMMessage } from '@/types'

export class OpenAIProvider implements LLMProvider {
  name = 'OpenAI'

  async sendMessage(message: string, apiKey: string, systemInstructions?: string, conversationHistory?: LLMMessage[]): Promise<string> {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/da4ec1e8-d16e-4eb1-ba8d-203aa9874bed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'providers.ts:OpenAIProvider:sendMessage',message:'Sending to OpenAI',data:{messageLength:message.length,messagePreview:message.substring(0,200),hasQuotePrefix:message.startsWith('>'),hasHistory:!!conversationHistory,historyLength:conversationHistory?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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
      throw new Error(error.error?.message || 'Failed to send message to OpenAI')
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || 'No response'
  }
}

export class AnthropicProvider implements LLMProvider {
  name = 'Anthropic'

  async sendMessage(message: string, apiKey: string, systemInstructions?: string, conversationHistory?: LLMMessage[]): Promise<string> {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/da4ec1e8-d16e-4eb1-ba8d-203aa9874bed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'providers.ts:AnthropicProvider:sendMessage',message:'Sending to Anthropic',data:{messageLength:message.length,messagePreview:message.substring(0,200),hasQuotePrefix:message.startsWith('>'),hasHistory:!!conversationHistory,historyLength:conversationHistory?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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

    const body: any = {
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
      throw new Error(error.error?.message || 'Failed to send message to Anthropic')
    }

    const data = await response.json()
    return data.content[0]?.text || 'No response'
  }
}
