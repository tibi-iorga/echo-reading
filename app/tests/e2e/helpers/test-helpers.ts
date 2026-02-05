import { Page, expect } from '@playwright/test'

/**
 * Helper functions for E2E tests
 */

export async function uploadPDF(page: Page, pdfPath: string) {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(pdfPath)
  
  // Wait for PDF to load (check for PDF viewer elements)
  await page.waitForTimeout(2000) // Give PDF.js time to render
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 })
}

export async function waitForPDFLoad(page: Page) {
  // Wait for PDF viewer to be ready
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 })
}

export async function navigateToSettings(page: Page) {
  // Wait for NotesPanel tabs to be visible (wait for any tab first to ensure panel is rendered)
  await page.getByRole('tab').first().waitFor({ state: 'visible', timeout: 10000 })
  
  // Now find and click Settings tab
  const settingsTab = page.getByRole('tab', { name: /settings/i })
  await settingsTab.click()
  await page.waitForTimeout(500) // Wait for tab switch
}

export async function navigateToChat(page: Page) {
  // Wait for NotesPanel tabs to be visible
  await page.getByRole('tab').first().waitFor({ state: 'visible', timeout: 10000 })
  
  // Now find and click Chat tab
  const chatTab = page.getByRole('tab', { name: /chat/i })
  await chatTab.click()
  await page.waitForTimeout(500)
}

export async function navigateToNotes(page: Page) {
  // Wait for NotesPanel tabs to be visible
  await page.getByRole('tab').first().waitFor({ state: 'visible', timeout: 10000 })
  
  // Now find and click Notes tab
  const notesTab = page.getByRole('tab', { name: /notes/i })
  await notesTab.click()
  await page.waitForTimeout(500)
}

export async function addAPIKey(page: Page, apiKey: string) {
  await navigateToSettings(page)
  
  // Find API key input and fill it
  const apiKeyInput = page.locator('input[type="password"]').or(page.locator('input[placeholder*="API"]').first())
  await apiKeyInput.fill(apiKey)
  
  // Click test/save button
  const testButton = page.getByRole('button', { name: /test|save/i }).first()
  await testButton.click()
  
  // Wait for success message or connection confirmation
  await page.waitForTimeout(1000)
}

export async function createSyncFile(page: Page, _fileName: string = 'test-notes.json') {
  await navigateToSettings(page)
  
  // Look for sync file section and create new file
  const createButton = page.getByRole('button', { name: /create.*sync|new.*file/i }).first()
  await createButton.click()
  
  // Handle file system dialog (in tests, this will be mocked or handled via route)
  await page.waitForTimeout(1000)
}

export async function selectTextInPDF(page: Page, startX: number = 100, startY: number = 100, endX: number = 300, endY: number = 100) {
  const canvas = page.locator('canvas').first()
  await canvas.hover({ position: { x: startX, y: startY } })
  await page.mouse.down()
  await canvas.hover({ position: { x: endX, y: endY } })
  await page.mouse.up()
  
  // Wait for selection actions to appear
  await page.waitForTimeout(500)
}

export async function goToPage(page: Page, pageNumber: number) {
  // Find page input or navigation controls
  const pageInput = page.locator('input[type="number"]').or(page.getByPlaceholder(/page/i)).first()
  if (await pageInput.isVisible()) {
    await pageInput.fill(pageNumber.toString())
    await pageInput.press('Enter')
  } else {
    // Use navigation buttons
    const currentPage = await page.locator('text=/\\d+/').first().textContent()
    const targetPage = parseInt(currentPage || '1')
    
    if (pageNumber > targetPage) {
      const nextButton = page.getByRole('button', { name: /next|>/ }).first()
      for (let i = targetPage; i < pageNumber; i++) {
        await nextButton.click()
        await page.waitForTimeout(300)
      }
    } else if (pageNumber < targetPage) {
      const prevButton = page.getByRole('button', { name: /previous|<|prev/i }).first()
      for (let i = targetPage; i > pageNumber; i--) {
        await prevButton.click()
        await page.waitForTimeout(300)
      }
    }
  }
  
  await page.waitForTimeout(500)
}

export async function zoomIn(page: Page) {
  const zoomInButton = page.getByRole('button', { name: /zoom.*in|\\+/i }).first()
  await zoomInButton.click()
  await page.waitForTimeout(300)
}

export async function zoomOut(page: Page) {
  const zoomOutButton = page.getByRole('button', { name: /zoom.*out|-/i }).first()
  await zoomOutButton.click()
  await page.waitForTimeout(300)
}

export async function searchInPDF(page: Page, searchTerm: string) {
  // Find search input (might be in toolbar)
  const searchInput = page.locator('input[placeholder*="search" i]').or(page.getByPlaceholder(/search/i)).first()
  await searchInput.fill(searchTerm)
  await searchInput.press('Enter')
  await page.waitForTimeout(1000)
}

export async function addBookmark(page: Page) {
  const bookmarkButton = page.getByRole('button', { name: /bookmark/i }).first()
  await bookmarkButton.click()
  await page.waitForTimeout(500)
}

export async function exportNotes(page: Page) {
  await navigateToNotes(page)
  
  // Find export button/dropdown
  const exportButton = page.getByRole('button', { name: /export/i }).first()
  await exportButton.click()
  
  // Select markdown format if dropdown appears
  const markdownOption = page.getByRole('menuitem', { name: /markdown|md/i }).first()
  if (await markdownOption.isVisible()) {
    await markdownOption.click()
  }
  
  // Wait for download (handled by Playwright's download listener)
  await page.waitForTimeout(1000)
}
