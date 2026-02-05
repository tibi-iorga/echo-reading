# Testing Setup

Automated testing is now set up for this project. This allows you to verify that changes don't break existing functionality without manual testing.

## Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Run tests in watch mode (recommended during development)
npm test

# Run tests once
npm run test:run

# Run tests with coverage report
npm run test:coverage
```

## What's Included

### Testing Framework
- **Vitest** - Fast unit test runner (works seamlessly with Vite)
- **React Testing Library** - Component testing utilities
- **jsdom** - Browser environment simulation

### Example Tests Created
1. **Utility Tests** (`src/utils/filenameParser.test.ts`)
   - Tests filename parsing logic
   - Covers various filename patterns

2. **Service Tests** (`src/services/storage/storageService.test.ts`)
   - Tests storage service functionality
   - Mocks secure storage dependencies

3. **Hook Tests** (`src/hooks/usePDF.test.tsx`)
   - Tests PDF loading hook
   - Verifies error handling

4. **Component Tests** (`src/components/FileSelector/FileSelector.test.tsx`)
   - Tests file selection component
   - Verifies user interactions

### CI/CD Integration
- GitHub Actions workflow (`.github/workflows/test.yml`)
- Runs unit tests (Vitest) and E2E tests (Playwright) automatically on push/PR
- Includes linting and type checking

## Writing New Tests

### Test File Location
Place test files next to the code they test:
- `MyComponent.tsx` → `MyComponent.test.tsx`
- `myFunction.ts` → `myFunction.test.ts`

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from './myFunction'

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction('input')).toBe('expected')
  })
})
```

### Testing React Components

```typescript
import { render, screen } from '@/test/utils'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

## Running Tests Before Committing

Before committing changes, run:

```bash
# Unit tests (fast)
npm run test:run

# E2E tests (slower, but comprehensive)
npm run test:e2e
```

This ensures:
- ✅ All unit tests pass
- ✅ All E2E tests pass
- ✅ No regressions introduced
- ✅ Type checking passes
- ✅ Linting passes

**Note:** For quick development feedback, run unit tests frequently. Always run E2E tests before committing to master.

## Coverage Goals

Aim for good test coverage on:
- **Critical utilities** (80%+) - filenameParser, export utils
- **Services** (70%+) - storageService, fileSyncService
- **Hooks** (80%+) - usePDF, useAnnotations
- **Components** (60%+) - Focus on user interactions

## Common Testing Patterns

### Mocking localStorage
```typescript
localStorage.setItem('key', 'value')
// Test code
localStorage.clear() // Auto-cleared between tests
```

### Mocking Async Functions
```typescript
import { vi } from 'vitest'

vi.mock('./module', () => ({
  asyncFunction: vi.fn().mockResolvedValue('result'),
}))
```

### Testing User Interactions
```typescript
import userEvent from '@testing-library/user-event'

const user = userEvent.setup()
await user.click(button)
await user.type(input, 'text')
```

## Troubleshooting

### Tests fail with "Cannot find module"
- Make sure paths in `vitest.config.ts` match your `tsconfig.json`
- Check that `@/` alias is properly configured

### React 19 compatibility warnings
- Using `--legacy-peer-deps` is fine for now
- Testing Library will add React 19 support in future versions

### Coverage not showing
- Run `npm run test:coverage`
- Check `coverage/` directory for HTML report

## E2E Testing with Playwright

E2E tests verify complete user flows in real browsers:

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (interactive)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run with visible browser
npm run test:e2e:headed
```

E2E tests are located in `tests/e2e/` and test:
- App loading and file selector
- File upload flows
- PDF viewing (when test PDFs are available)
- User interactions end-to-end

## Next Steps

1. **Add more tests** as you make changes
2. **Test critical paths** - file loading, annotations, sync, export
3. **Test edge cases** - empty files, invalid data, errors
4. **Keep tests updated** - Update tests when changing functionality
5. **Write E2E tests** for new user flows

For more details, see `src/test/README.md`.
