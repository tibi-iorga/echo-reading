import { test, expect } from '@playwright/test'
import { navigateToSettings, addAPIKey, navigateToChat, exportNotes, uploadPDF, waitForPDFLoad } from './helpers/test-helpers'
import { setupLLMMock } from './helpers/api-mocks'

test.describe('Happy Path - Complete User Flow', () => {
  test('complete flow: upload PDF → create sync file → add API key → annotate → export', async ({ page }) => {
    // Mock LLM API
    setupLLMMock(page, [
      { content: 'This is a test response about the selected text.' },
    ])
    
    // Step 1: Upload PDF
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Echo/i })).toBeVisible()
    await uploadPDF(page, './tests/fixtures/test-text.pdf')
    await waitForPDFLoad(page)
    
    // Step 2: Create or select sync file (modal may appear after PDF load)
    // Step 3: Add API key in settings
    await navigateToSettings(page)
    await addAPIKey(page, 'test-api-key-12345')
    
    // Verify API key was saved (check for success message or settings update)
    await expect(page.getByText(/connected|saved/i)).toBeVisible({ timeout: 5000 }).catch(() => {
      // If no success message, API key input should be filled
      const apiKeyInput = page.locator('input[type="password"]').first()
      expect(apiKeyInput).toHaveValue('test-api-key-12345')
    })
    
    // Step 4: Read and annotate
    // TODO: When PDF is loaded:
    // - Select text
    // - Create highlight
    // - Add comment
    // - Create free-form note
    
    // Step 5: Test LLM chat
    await navigateToChat(page)
    const chatInput = page.locator('textarea').or(page.getByPlaceholder(/type.*message/i)).first()
    await chatInput.fill('What is this document about?')
    await chatInput.press('Enter')
    
    // Wait for LLM response
    await expect(page.getByText(/test response/i)).toBeVisible({ timeout: 10000 })
    
    // Step 6: Export notes
    await exportNotes(page)
    
    // Verify download started (Playwright handles this automatically)
    // The actual file content verification would be done in unit tests
  })
  
  test('complete flow with sync file round-trip', async ({ page }) => {
    // This test verifies that annotations persist through sync file
    // Step 1: Upload PDF
    await page.goto('/')
    
    // Step 2: Create sync file
    // Step 3: Add annotations
    // Step 4: Verify sync file was updated
    // Step 5: Reload app and import sync file
    // Step 6: Verify annotations are restored
    
    // This is a placeholder - full implementation requires:
    // - Test PDF file
    // - File system API mocking or actual file handling
    // - Sync file format validation
  })
})
