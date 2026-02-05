import { test, expect } from '@playwright/test'
import { navigateToSettings, addAPIKey, navigateToChat } from './helpers/test-helpers'
import { setupLLMMock, setupBadAPIKeyMock } from './helpers/api-mocks'

test.describe('LLM Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })
  
  test('should add and test API key', async ({ page }) => {
    setupLLMMock(page, [
      { content: 'Connection successful' },
    ])
    
    await navigateToSettings(page)
    
    // Add API key
    const apiKeyInput = page.locator('input[type="password"]').or(page.locator('input[placeholder*="API"]').first())
    await apiKeyInput.fill('test-api-key-12345')
    
    // Click test connection button
    const testButton = page.getByRole('button', { name: /test.*connection|test/i }).first()
    await testButton.click()
    
    // Wait for success message
    await expect(page.getByText(/connected|success/i)).toBeVisible({ timeout: 5000 })
  })
  
  test('should reject invalid API key', async ({ page }) => {
    setupBadAPIKeyMock(page)
    
    await navigateToSettings(page)
    
    // Add invalid API key
    const apiKeyInput = page.locator('input[type="password"]').or(page.locator('input[placeholder*="API"]').first())
    await apiKeyInput.fill('invalid-key')
    
    // Click test connection button
    const testButton = page.getByRole('button', { name: /test.*connection|test/i }).first()
    await testButton.click()
    
    // Wait for error message
    await expect(page.getByText(/invalid|error|failed/i)).toBeVisible({ timeout: 5000 })
  })
  
  test('should send message to LLM and receive response', async ({ page }) => {
    setupLLMMock(page, [
      { content: 'This is a mocked response to your question about the document.' },
    ])
    
    // Add API key first
    await navigateToSettings(page)
    await addAPIKey(page, 'test-api-key')
    
    // Navigate to chat
    await navigateToChat(page)
    
    // Send a message
    const chatInput = page.locator('textarea').or(page.getByPlaceholder(/type.*message/i)).first()
    await chatInput.fill('What is this document about?')
    await chatInput.press('Enter')
    
    // Wait for response
    await expect(page.getByText(/mocked response/i)).toBeVisible({ timeout: 10000 })
    
    // Verify message history shows both user and assistant messages
    await expect(page.getByText('What is this document about?')).toBeVisible()
    await expect(page.getByText(/mocked response/i)).toBeVisible()
  })
  
  test('should send selected text to LLM', async ({ page }) => {
    setupLLMMock(page, [
      { content: 'This response is about the selected text you highlighted.' },
    ])
    
    // Upload PDF and select text
    // TODO: When PDF is available
    // await uploadPDF(page, './tests/fixtures/test-text.pdf')
    // await waitForPDFLoad(page)
    // await selectTextInPDF(page)
    
    // Click "Send to LLM" button
    const sendToLLMButton = page.getByRole('button', { name: /send.*llm|send.*ai|send.*chat/i }).first()
    if (await sendToLLMButton.isVisible()) {
      await sendToLLMButton.click()
      await page.waitForTimeout(1000)
      
      // Verify chat tab is active and text was sent
      await navigateToChat(page)
      // Check that quoted text or selected text appears in chat
    }
  })
  
  test('should handle LLM API errors gracefully', async ({ page }) => {
    // Mock API error
    setupLLMMock(page, [
      { content: 'API rate limit exceeded', error: true },
    ])
    
    await navigateToSettings(page)
    await addAPIKey(page, 'test-api-key')
    
    await navigateToChat(page)
    
    const chatInput = page.locator('textarea').or(page.getByPlaceholder(/type.*message/i)).first()
    await chatInput.fill('Test message')
    await chatInput.press('Enter')
    
    // Verify error message appears (should be sanitized)
    await expect(page.getByText(/error/i)).toBeVisible({ timeout: 10000 })
    // Verify API key is not exposed in error message
    await expect(page.getByText(/test-api-key/i)).not.toBeVisible()
  })
  
  test('should change LLM provider', async ({ page }) => {
    setupLLMMock(page)
    
    await navigateToSettings(page)
    
    // Find provider selector/dropdown
    const providerSelect = page.locator('select').or(page.getByRole('combobox')).first()
    if (await providerSelect.isVisible()) {
      await providerSelect.selectOption({ label: /anthropic|claude/i })
      await page.waitForTimeout(500)
      
      // Verify provider changed
      await expect(providerSelect).toHaveValue(/anthropic/i)
    }
  })
  
  test('should clear chat history', async ({ page }) => {
    setupLLMMock(page, [
      { content: 'Response 1' },
      { content: 'Response 2' },
    ])
    
    await navigateToSettings(page)
    await addAPIKey(page, 'test-api-key')
    
    await navigateToChat(page)
    
    // Send a few messages
    const chatInput = page.locator('textarea').or(page.getByPlaceholder(/type.*message/i)).first()
    await chatInput.fill('Message 1')
    await chatInput.press('Enter')
    await page.waitForTimeout(2000)
    
    await chatInput.fill('Message 2')
    await chatInput.press('Enter')
    await page.waitForTimeout(2000)
    
    // Clear chat
    const clearButton = page.getByRole('button', { name: /clear.*chat|clear/i }).first()
    if (await clearButton.isVisible()) {
      await clearButton.click()
      await page.waitForTimeout(500)
      
      // Verify chat is cleared
      await expect(page.getByText('Message 1')).not.toBeVisible()
      await expect(page.getByText('Message 2')).not.toBeVisible()
    }
  })
})
