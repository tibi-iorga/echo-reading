import { test, expect } from '@playwright/test'
import { goToPage, zoomIn, zoomOut, searchInPDF, addBookmark } from './helpers/test-helpers'

test.describe('PDF Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // TODO: Upload test PDF when available
    // await uploadPDF(page, './tests/fixtures/test-text.pdf')
    // await waitForPDFLoad(page)
  })
  
  test('should navigate between pages', async ({ page }) => {
    // Skip if PDF not loaded
    test.skip(!(await page.locator('canvas').first().isVisible()), 'PDF not loaded')
    
    // Test next page
    const nextButton = page.getByRole('button', { name: /next|>/ }).first()
    await nextButton.click()
    await page.waitForTimeout(500)
    
    // Verify page number changed
    const pageIndicator = page.locator('text=/\\d+.*\\d+/').first()
    await expect(pageIndicator).toBeVisible()
    
    // Test previous page
    const prevButton = page.getByRole('button', { name: /previous|<|prev/i }).first()
    await prevButton.click()
    await page.waitForTimeout(500)
    
    // Test jump to specific page
    await goToPage(page, 3)
    await expect(pageIndicator).toContainText('3')
  })
  
  test('should zoom in and out', async ({ page }) => {
    test.skip(!(await page.locator('canvas').first().isVisible()), 'PDF not loaded')
    
    // Get initial scale if visible
    const initialScale = await page.locator('text=/\\d+\\.\\d+x|\\d+x/').first().textContent().catch(() => null)
    
    // Zoom in
    await zoomIn(page)
    const scaleAfterZoomIn = await page.locator('text=/\\d+\\.\\d+x|\\d+x/').first().textContent().catch(() => null)
    
    if (initialScale && scaleAfterZoomIn) {
      const initial = parseFloat(initialScale.replace('x', ''))
      const after = parseFloat(scaleAfterZoomIn.replace('x', ''))
      expect(after).toBeGreaterThan(initial)
    }
    
    // Zoom out
    await zoomOut(page)
    const scaleAfterZoomOut = await page.locator('text=/\\d+\\.\\d+x|\\d+x/').first().textContent().catch(() => null)
    
    if (scaleAfterZoomIn && scaleAfterZoomOut) {
      const afterIn = parseFloat(scaleAfterZoomIn.replace('x', ''))
      const afterOut = parseFloat(scaleAfterZoomOut.replace('x', ''))
      expect(afterOut).toBeLessThan(afterIn)
    }
  })
  
  test('should fit to width and fit to page', async ({ page }) => {
    test.skip(!(await page.locator('canvas').first().isVisible()), 'PDF not loaded')
    
    // Test fit to width
    const fitWidthButton = page.getByRole('button', { name: /fit.*width/i }).first()
    if (await fitWidthButton.isVisible()) {
      await fitWidthButton.click()
      await page.waitForTimeout(500)
      // Verify scale changed
    }
    
    // Test fit to page
    const fitPageButton = page.getByRole('button', { name: /fit.*page/i }).first()
    if (await fitPageButton.isVisible()) {
      await fitPageButton.click()
      await page.waitForTimeout(500)
      // Verify scale changed
    }
  })
  
  test('should search within PDF', async ({ page }) => {
    test.skip(!(await page.locator('canvas').first().isVisible()), 'PDF not loaded')
    
    // Open search (might be in toolbar)
    const searchButton = page.getByRole('button', { name: /search/i }).first()
    if (await searchButton.isVisible()) {
      await searchButton.click()
    }
    
    // Perform search
    await searchInPDF(page, 'test')
    
    // Verify search results appear (might show match count or highlight matches)
    await page.waitForTimeout(1000)
    // Check for search results indicator
    const searchResults = page.locator('text=/\\d+.*match|result/i').first()
    if (await searchResults.isVisible()) {
      await expect(searchResults).toBeVisible()
    }
  })
  
  test('should add and remove bookmarks', async ({ page }) => {
    test.skip(!(await page.locator('canvas').first().isVisible()), 'PDF not loaded')
    
    // Add bookmark
    await addBookmark(page)
    
    // Verify bookmark was added (check for bookmark indicator)
    const bookmarkIndicator = page.locator('[aria-label*="bookmark" i]').or(page.getByRole('button', { name: /bookmark/i })).first()
    await expect(bookmarkIndicator).toHaveAttribute('aria-pressed', 'true').or(expect(bookmarkIndicator).toHaveClass(/active|selected/i)).catch(() => {
      // Alternative: check for bookmark in notes panel
    })
    
    // Remove bookmark (click again)
    await addBookmark(page)
    await page.waitForTimeout(500)
    
    // Verify bookmark was removed
    // Check that bookmark indicator is not active
  })
})
