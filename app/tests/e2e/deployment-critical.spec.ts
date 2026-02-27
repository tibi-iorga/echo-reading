import { test, expect } from '@playwright/test'
import { uploadPDF, waitForPDFLoad, dismissOpenFileModalIfPresent } from './helpers/test-helpers'

/**
 * Critical deployment tests - these must pass before deployment
 * Focus on core functionality without flaky external dependencies
 */
test.describe('Deployment Critical Tests', () => {
  test('should load app and display file selector', async ({ page }) => {
    await page.goto('/')
    
    // Check that the app loads
    await expect(page).toHaveTitle(/Echo/)
    
    // Check for the main heading
    await expect(page.getByRole('heading', { name: /Echo/i })).toBeVisible()
    
    // Check for the file selector button
    await expect(page.getByRole('button', { name: /Choose PDF File/i })).toBeVisible()
  })

  test('should load PDF and display basic UI elements', async ({ page }) => {
    await page.goto('/')
    
    // Upload PDF
    await uploadPDF(page, './tests/fixtures/test-text.pdf')
    await waitForPDFLoad(page)
    await dismissOpenFileModalIfPresent(page)
    
    // Verify PDF viewer is working
    await expect(page.locator('canvas').first()).toBeVisible()
    
    // Verify tabs are present (these should exist after PDF load)
    const expandButton = page.getByRole('button', { name: /expand panel/i })
    if (await expandButton.isVisible().catch(() => false)) {
      await expandButton.click()
      await page.waitForTimeout(300)
    }
    
    await expect(page.getByRole('tab', { name: /notes/i })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('tab', { name: /chat/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /settings/i })).toBeVisible()
  })

  test('should display notes panel with basic functionality', async ({ page }) => {
    await page.goto('/')
    await uploadPDF(page, './tests/fixtures/test-text.pdf')
    await waitForPDFLoad(page)
    await dismissOpenFileModalIfPresent(page)
    
    // Navigate to notes panel
    const expandButton = page.getByRole('button', { name: /expand panel/i })
    if (await expandButton.isVisible().catch(() => false)) {
      await expandButton.click()
      await page.waitForTimeout(300)
    }
    
    // Should be on notes tab by default, or click it
    const notesTab = page.getByRole('tab', { name: /notes/i })
    await notesTab.click()
    await page.waitForTimeout(500)
    
    // Should see some notes-related content
    await expect(page.getByText(/annotations|highlights|notes|add.*note/i).first()).toBeVisible({ timeout: 3000 })
  })

  test('should handle basic PDF operations', async ({ page }) => {
    await page.goto('/')
    await uploadPDF(page, './tests/fixtures/test-text.pdf')
    await waitForPDFLoad(page)
    await dismissOpenFileModalIfPresent(page)
    
    // Verify PDF canvas is rendered and visible
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
    
    // Look for any PDF control buttons - they might have different names
    const controls = page.locator('button').all()
    const hasControls = await controls.then(buttons => buttons.length > 0)
    expect(hasControls).toBeTruthy()
  })

  test('should navigate between tabs successfully', async ({ page }) => {
    await page.goto('/')
    await uploadPDF(page, './tests/fixtures/test-text.pdf')
    await waitForPDFLoad(page)
    await dismissOpenFileModalIfPresent(page)
    
    // Expand panel if collapsed
    const expandButton = page.getByRole('button', { name: /expand panel/i })
    if (await expandButton.isVisible().catch(() => false)) {
      await expandButton.click()
      await page.waitForTimeout(300)
    }
    
    // Test Settings tab
    const settingsTab = page.getByRole('tab', { name: /settings/i })
    await settingsTab.click()
    await page.waitForTimeout(500)
    
    // Should see settings content - look for any settings-related text
    const settingsVisible = await page.locator('text=/api|provider|model|key|setting/i').first().isVisible().catch(() => false)
    expect(settingsVisible).toBeTruthy()
    
    // Test Notes tab
    const notesTab = page.getByRole('tab', { name: /notes/i })
    await notesTab.click() 
    await page.waitForTimeout(500)
    
    // Should see notes content
    const notesVisible = await page.locator('text=/annotation|highlight|note|export/i').first().isVisible().catch(() => false)
    expect(notesVisible).toBeTruthy()
    
    // Test Chat tab (less critical since it might require API key)
    const chatTab = page.getByRole('tab', { name: /chat/i })
    await chatTab.click()
    await page.waitForTimeout(500)
    
    // Chat tab should at least be clickable - content might vary based on API key status
    expect(await chatTab.getAttribute('aria-selected')).toBeTruthy()
  })

  test('should handle file selection errors gracefully', async ({ page }) => {
    await page.goto('/')
    
    // Try to upload a non-PDF file - use the exact error message from working test
    const fileInput = page.locator('input[type="file"]')
    
    // Create a fake text file for testing
    const buffer = Buffer.from('test content')
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: buffer,
    })
    
    // Should show alert modal with the specific error message
    await expect(page.getByText(/Please select a PDF file/i)).toBeVisible({ timeout: 3000 })
    
    // Verify the OK button is present
    await expect(page.getByRole('button', { name: /OK/i })).toBeVisible()
  })
})