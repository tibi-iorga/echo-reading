import { test, expect } from '@playwright/test'
import { navigateToNotes } from './helpers/test-helpers'

test.describe('Annotations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // TODO: Upload test PDF when available
    // await uploadPDF(page, './tests/fixtures/test-text.pdf')
    // await waitForPDFLoad(page)
  })
  
  test('should create highlight from text selection', async ({ page }) => {
    test.skip(!(await page.locator('canvas').first().isVisible()), 'PDF not loaded')
    
    // Select text in PDF
    await selectTextInPDF(page)
    
    // Look for highlight action button
    const highlightButton = page.getByRole('button', { name: /highlight/i }).first()
    await highlightButton.click()
    await page.waitForTimeout(500)
    
    // Verify highlight was created
    // Check notes panel for new highlight
    await navigateToNotes(page)
    await expect(page.getByText(/highlight/i)).toBeVisible({ timeout: 2000 })
  })
  
  test('should add comment to highlight', async ({ page }) => {
    test.skip(!(await page.locator('canvas').first().isVisible()), 'PDF not loaded')
    
    // First create a highlight
    await selectTextInPDF(page)
    const highlightButton = page.getByRole('button', { name: /highlight/i }).first()
    await highlightButton.click()
    await page.waitForTimeout(500)
    
    // Click on the highlight to add comment
    // This might open a modal or inline editor
    const highlightElement = page.locator('[data-highlight]').or(page.getByText(/highlight/i)).first()
    await highlightElement.click()
    await page.waitForTimeout(500)
    
    // Add comment text
    const commentInput = page.locator('textarea').or(page.getByPlaceholder(/comment|note/i)).first()
    await commentInput.fill('This is a test comment')
    
    // Save comment
    const saveButton = page.getByRole('button', { name: /save|done/i }).first()
    await saveButton.click()
    await page.waitForTimeout(500)
    
    // Verify comment appears in notes panel
    await navigateToNotes(page)
    await expect(page.getByText('This is a test comment')).toBeVisible()
  })
  
  test('should create free-form note', async ({ page }) => {
    test.skip(!(await page.locator('canvas').first().isVisible()), 'PDF not loaded')
    
    await navigateToNotes(page)
    
    // Find "Add Note" or "New Note" button
    const addNoteButton = page.getByRole('button', { name: /add.*note|new.*note|create.*note/i }).first()
    await addNoteButton.click()
    await page.waitForTimeout(500)
    
    // Fill in note content
    const noteInput = page.locator('textarea').or(page.getByPlaceholder(/note|content/i)).first()
    await noteInput.fill('This is a free-form note')
    
    // Save note
    const saveButton = page.getByRole('button', { name: /save|done/i }).first()
    await saveButton.click()
    await page.waitForTimeout(500)
    
    // Verify note appears in notes list
    await expect(page.getByText('This is a free-form note')).toBeVisible()
  })
  
  test('should edit annotation', async ({ page }) => {
    test.skip(!(await page.locator('canvas').first().isVisible()), 'PDF not loaded')
    
    // Create a highlight first
    await selectTextInPDF(page)
    const highlightButton = page.getByRole('button', { name: /highlight/i }).first()
    await highlightButton.click()
    await page.waitForTimeout(500)
    
    await navigateToNotes(page)
    
    // Find the annotation and click edit
    const annotationItem = page.locator('[data-annotation]').or(page.getByText(/highlight/i)).first()
    await annotationItem.hover()
    
    const editButton = page.getByRole('button', { name: /edit/i }).first()
    await editButton.click()
    await page.waitForTimeout(500)
    
    // Modify the comment/note
    const editInput = page.locator('textarea').or(page.locator('input[type="text"]')).first()
    await editInput.fill('Edited comment text')
    
    // Save changes
    const saveButton = page.getByRole('button', { name: /save/i }).first()
    await saveButton.click()
    await page.waitForTimeout(500)
    
    // Verify changes were saved
    await expect(page.getByText('Edited comment text')).toBeVisible()
  })
  
  test('should delete annotation', async ({ page }) => {
    test.skip(!(await page.locator('canvas').first().isVisible()), 'PDF not loaded')
    
    // Create an annotation first
    await selectTextInPDF(page)
    const highlightButton = page.getByRole('button', { name: /highlight/i }).first()
    await highlightButton.click()
    await page.waitForTimeout(500)
    
    await navigateToNotes(page)
    
    // Find the annotation and delete it
    const annotationItem = page.locator('[data-annotation]').or(page.getByText(/highlight/i)).first()
    await annotationItem.hover()
    
    const deleteButton = page.getByRole('button', { name: /delete|remove/i }).first()
    await deleteButton.click()
    await page.waitForTimeout(500)
    
    // Confirm deletion if confirmation dialog appears
    const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i }).first()
    if (await confirmButton.isVisible()) {
      await confirmButton.click()
    }
    
    await page.waitForTimeout(500)
    
    // Verify annotation was removed
    await expect(annotationItem).not.toBeVisible()
  })
})
