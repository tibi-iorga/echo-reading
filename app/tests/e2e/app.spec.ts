import { test, expect } from '@playwright/test'

test.describe('Echo Reading App - Basic Functionality', () => {
  test('should load the app and display file selector', async ({ page }) => {
    await page.goto('/')
    
    // Check that the app loads
    await expect(page).toHaveTitle(/Echo/)
    
    // Check for the main heading
    await expect(page.getByRole('heading', { name: /Echo/i })).toBeVisible()
    
    // Check for the file selector button
    await expect(page.getByRole('button', { name: /Choose PDF File/i })).toBeVisible()
  })

  test('should show alert when non-PDF file is selected', async ({ page }) => {
    await page.goto('/')
    
    // Create a test text file
    const fileInput = page.locator('input[type="file"]')
    
    // Create a dummy file (non-PDF)
    const buffer = Buffer.from('test content')
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: buffer,
    })
    
    // Check that alert modal appears with the error message
    await expect(page.getByText(/Please select a PDF file/i)).toBeVisible({ timeout: 2000 })
    
    // Verify the OK button is present
    await expect(page.getByRole('button', { name: /OK/i })).toBeVisible()
  })

  test('should have working navigation elements', async ({ page }) => {
    await page.goto('/')
    
    // Check that the app structure is present
    const mainContent = page.locator('body')
    await expect(mainContent).toBeVisible()
    
    // Check for version info in footer
    await expect(page.getByText(/Echo is open source/i)).toBeVisible()
  })
  
  test('should display PDF viewer after valid PDF selection', async ({ page }) => {
    await page.goto('/')
    
    // Note: This test requires a test PDF file
    // You'll need to add a test PDF to tests/fixtures/ directory
    // For now, this is a placeholder structure
    
    // Uncomment and adjust path when you have a test PDF:
    // const fileInput = page.locator('input[type="file"]')
    // await fileInput.setInputFiles('./tests/fixtures/test-text.pdf')
    
    // After PDF loads, check for PDF viewer elements
    // This might include canvas elements or PDF.js specific elements
    // await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 })
  })
})
