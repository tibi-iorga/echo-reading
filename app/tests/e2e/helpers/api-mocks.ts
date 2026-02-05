import { Page, Route } from '@playwright/test'

/**
 * Mock LLM API responses for testing
 */

export interface MockLLMResponse {
  content: string
  error?: boolean
}

export function setupLLMMock(page: Page, responses: MockLLMResponse[] = []) {
  let responseIndex = 0
  
  // Default mock response
  const defaultResponse: MockLLMResponse = {
    content: 'This is a mocked LLM response for testing purposes.',
  }
  
  page.route('https://api.openai.com/v1/**', async (route: Route) => {
    const request = route.request()
    
    // Mock test connection endpoint
    if (request.url().includes('/models')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{ id: 'gpt-4', object: 'model' }],
        }),
      })
      return
    }
    
    // Mock chat completion endpoint
    if (request.url().includes('/chat/completions')) {
      const response = responses[responseIndex] || defaultResponse
      responseIndex++
      
      if (response.error) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              message: response.content || 'Invalid API key',
              type: 'invalid_request_error',
            },
          }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: response.content,
                },
              },
            ],
          }),
        })
      }
      return
    }
    
    // Default: continue with actual request
    await route.continue()
  })
  
  // Mock Anthropic API
  page.route('https://api.anthropic.com/v1/**', async (route: Route) => {
    const request = route.request()
    
    // Mock test connection
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Connected successfully' }),
      })
      return
    }
    
    // Mock message endpoint
    if (request.url().includes('/messages')) {
      const response = responses[responseIndex] || defaultResponse
      responseIndex++
      
      if (response.error) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              message: response.content || 'Invalid API key',
              type: 'authentication_error',
            },
          }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: [
              {
                type: 'text',
                text: response.content,
              },
            ],
          }),
        })
      }
      return
    }
    
    await route.continue()
  })
}

export function setupBadAPIKeyMock(page: Page) {
  page.route('https://api.openai.com/v1/**', async (route: Route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          message: 'Invalid API key provided',
          type: 'invalid_request_error',
        },
      }),
    })
  })
  
  page.route('https://api.anthropic.com/v1/**', async (route: Route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          message: 'Invalid API key',
          type: 'authentication_error',
        },
      }),
    })
  })
}
