# Test Fixtures

This directory contains test files used by E2E tests.

## Required Test PDFs

To run the full E2E test suite, you need to add the following test PDF files:

1. **test-text.pdf** - A PDF with selectable text content
   - Used for: Text selection, highlighting, search tests
   - Should have multiple pages with readable text

2. **test-images.pdf** - A PDF with images/pictures
   - Used for: Testing PDF rendering with images
   - Should contain embedded images

3. **test-scanned.pdf** - A scanned PDF (image-based, no selectable text)
   - Used for: Testing PDF handling without text layer
   - Should be a scanned document

## Creating Test PDFs

You can create simple test PDFs using various tools:

- Online PDF generators
- LibreOffice/Word → Export as PDF
- Image to PDF converters (for scanned PDFs)

## Test Sync Files

Test sync files (JSON format) can also be placed here for testing sync file import/export functionality.

Example sync file structure:
```json
{
  "metadata": {
    "title": "Test Document",
    "author": "Test Author"
  },
  "annotations": [],
  "furthestPage": null,
  "lastPageRead": null
}
```
