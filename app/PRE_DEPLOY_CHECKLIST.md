# Pre-Deployment Checklist

Run these commands before every deployment to catch breaking changes:

## Automated Deployment Check
```bash
cd ..
./deploy-check.bat  # Windows
./deploy-check.sh   # Linux/Mac
```
This automated script runs:

## 1. Dependency Installation
```bash
npm ci
```
Clean install of dependencies.

## 2. Linting & Type Checking
```bash
npm run lint
```
Must pass with 0 errors/warnings.

## 3. Build Test
```bash
npm run build
```
Build must complete without TypeScript errors.

## 4. Unit Tests
```bash
npm run test:run
```
All 40 unit tests must pass.

## 5. Critical E2E Tests
```bash
npx playwright test tests/e2e/deployment-critical.spec.ts
```
Tests critical user flows:
- App loads and displays file selector
- PDF loads and displays UI elements  
- Notes panel functions correctly
- Basic PDF operations work
- Tab navigation works
- File selection errors handled gracefully

## 6. Optional: Full E2E Test Suite (if time permits)
```bash
npm run test:e2e
```
Runs all E2E tests including LLM integration (some may be flaky).

## 7. Manual Smoke Test (if critical changes)
Test these core features manually:
- [ ] Load a PDF file
- [ ] Navigate between pages
- [ ] Create annotations
- [ ] Export annotations
- [ ] Settings functionality

## Testing Strategy Notes

- **deployment-critical.spec.ts**: Stable tests without external dependencies
- **Other E2E tests**: May have flaky LLM integration tests, use for development only
- **Unit tests**: Comprehensive coverage of core utilities and services
- **Mock strategy**: LLM calls are mocked to avoid external API dependencies

## Performance Targets
- [ ] Page load time < 3 seconds
- [ ] PDF rendering responsive
- [ ] No console errors in browser dev tools
- [ ] Build size warnings acceptable (current: ~1.4MB main chunk)