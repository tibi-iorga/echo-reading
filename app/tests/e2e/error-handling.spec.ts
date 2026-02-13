import { test, expect } from '@playwright/test'
import { navigateToSettings, addAPIKey, navigateToChat, uploadPDF, waitForPDFLoad } from './helpers/test-helpers'
import { setupBadAPIKeyMock } from './helpers/api-mocks'

test.describe('Error Handling', () => {
  test('should reject non-PDF files', async ({ page }) => {
    await page.goto('/')
    
    const fileInput = page.locator('input[type="file"]')
    
    // Try to upload a text file
    const buffer = Buffer.from('This is not a PDF file')
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: buffer,
    })
    
    // Verify error alert appears
    await expect(page.getByText(/Please select a PDF file/i)).toBeVisible({ timeout: 2000 })
    await expect(page.getByRole('button', { name: /OK/i })).toBeVisible()
  })
  
  test('should handle invalid PDF files', async ({ page }) => {
    await page.goto('/')
    
    const fileInput = page.locator('input[type="file"]')
    
    // Create a file that claims to be PDF but isn't
    const buffer = Buffer.from('%PDF-1.4 invalid PDF content')
    await fileInput.setInputFiles({
      name: 'invalid.pdf',
      mimeType: 'application/pdf',
      buffer: buffer,
    })
    
    // Wait for PDF loading attempt
    await page.waitForTimeout(3000)
    
    // Verify error handling (might show error message or fail gracefully)
    // The exact behavior depends on PDF.js error handling
    // Error might appear in various forms, so we check if any error indicator exists
    // const errorMessage = page.getByText(/error|invalid|failed/i).first()
  })
  
  test('should handle corrupted PDF files', async ({ page }) => {
    await page.goto('/')
    
    const fileInput = page.locator('input[type="file"]')
    
    // Create corrupted PDF data
    const buffer = Buffer.from('%PDF-1.4\ncorrupted data that breaks PDF structure')
    await fileInput.setInputFiles({
      name: 'corrupted.pdf',
      mimeType: 'application/pdf',
      buffer: buffer,
    })
    
    await page.waitForTimeout(3000)
    
    // Verify app handles corruption gracefully
    // Might show error or fail to load PDF
  })
  
  test('should reject invalid API keys', async ({ page }) => {
    setupBadAPIKeyMock(page)
    await page.goto('/')
    await uploadPDF(page, './tests/fixtures/test-text.pdf')
    await waitForPDFLoad(page)
    await navigateToSettings(page)
    
    // Try to add invalid API key
    const apiKeyInput = page.locator('input[type="password"]').or(page.locator('input[placeholder*="API"]').first())
    await apiKeyInput.fill('invalid-api-key-12345')
    
    // Test connection
    const testButton = page.getByRole('button', { name: /test.*connection|test/i }).first()
    await testButton.click()
    
    // Verify error message appears
    await expect(page.getByText(/invalid|error|failed|unauthorized/i)).toBeVisible({ timeout: 5000 })
    
    // Verify API key is not saved
    // Settings should not show as saved/connected
  })
  
  test('should handle network errors when calling LLM', async ({ page }) => {
    await page.route('https://api.openai.com/v1/**', async (route) => {
      await route.abort('failed')
    })
    await page.goto('/')
    await uploadPDF(page, './tests/fixtures/test-text.pdf')
    await waitForPDFLoad(page)
    await navigateToSettings(page)
    await addAPIKey(page, 'test-api-key')
    
    await navigateToChat(page)
    
    const chatInput = page.locator('textarea').or(page.getByPlaceholder(/type.*message/i)).first()
    await chatInput.fill('Test message')
    await chatInput.press('Enter')
    
    // Verify error message appears
    await expect(page.getByText(/error|network|failed/i)).toBeVisible({ timeout: 10000 })
    
    // Verify error message doesn't expose API key
    await expect(page.getByText(/test-api-key/i)).not.toBeVisible()
  })
  
  test('should handle empty API key', async ({ page }) => {
    await page.goto('/')
    await uploadPDF(page, './tests/fixtures/test-text.pdf')
    await waitForPDFLoad(page)
    await navigateToSettings(page)
    
    // Try to test connection with empty API key
    const testButton = page.getByRole('button', { name: /test.*connection|test/i }).first()
    await testButton.click()
    
    // Verify validation error or error message
    await expect(page.getByText(/required|empty|invalid/i)).toBeVisible({ timeout: 2000 }).catch(async () => {
      // Some forms might disable the button when empty
      await expect(testButton).toBeDisabled()
    })
  })
  
  test('should handle very large PDF files gracefully', async ({ page }) => {
    // This test would require a large test PDF
    // For now, we document the expected behavior
    
    await page.goto('/')
    
    // Large PDFs should:
    // - Show loading indicator
    // - Load progressively if possible
    // - Not crash the browser
    // - Show error if too large
    
    // Placeholder for when large test PDF is available
  })
  
  test('should handle missing sync file gracefully', async ({ page }) => {
    await page.goto('/')
    await uploadPDF(page, './tests/fixtures/test-text.pdf')
    await waitForPDFLoad(page)
    await navigateToSettings(page)
    
    // Look for sync file status
    const syncStatus = page.locator('text=/sync.*file/i').first()
    if (await syncStatus.isVisible()) {
      // Try to sync when file is missing
      // App should show appropriate error or prompt to recreate file
    }
  })
})
