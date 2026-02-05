# Testing Guide

This project uses [Vitest](https://vitest.dev/) for unit and integration testing, along with [React Testing Library](https://testing-library.com/react) for component testing.

## Running Tests

```bash
# Run tests in watch mode (recommended during development)
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Writing Tests

### Test File Naming

Test files should be named `*.test.ts` or `*.test.tsx` and placed next to the file they're testing, or in a `__tests__` directory.

### Example: Testing a Utility Function

```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from './myFunction'

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction('input')).toBe('expected output')
  })
})
```

### Example: Testing a React Component

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/utils'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent prop="value" />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### Example: Testing a Hook

```typescript
import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMyHook } from './useMyHook'

describe('useMyHook', () => {
  it('should return expected value', async () => {
    const { result } = renderHook(() => useMyHook())
    await waitFor(() => {
      expect(result.current.value).toBe('expected')
    })
  })
})
```

## Test Utilities

The `src/test/utils.tsx` file exports a custom `render` function that includes all necessary providers (ThemeProvider, etc.). Use this instead of the default `render` from `@testing-library/react`.

## Mocking

### Mocking localStorage

localStorage is automatically cleared between tests. To mock specific values:

```typescript
localStorage.setItem('key', 'value')
```

### Mocking Modules

```typescript
import { vi } from 'vitest'

vi.mock('./module', () => ({
  exportedFunction: vi.fn(() => 'mocked value'),
}))
```

### Mocking Browser APIs

Common browser APIs are mocked in `src/test/setup.ts`:
- `window.matchMedia`
- `IntersectionObserver`
- `ResizeObserver`

## Best Practices

1. **Test behavior, not implementation** - Focus on what the component/function does, not how it does it
2. **Use descriptive test names** - Test names should clearly describe what is being tested
3. **Keep tests isolated** - Each test should be independent and not rely on other tests
4. **Test edge cases** - Don't just test the happy path
5. **Mock external dependencies** - Mock API calls, file system operations, etc.
6. **Clean up after tests** - Use `afterEach` or `cleanup` to reset state between tests

## Coverage Goals

Aim for:
- **Critical utilities**: 80%+ coverage
- **Services**: 70%+ coverage
- **Components**: 60%+ coverage (focus on user interactions)
- **Hooks**: 80%+ coverage

Run `npm run test:coverage` to see current coverage.
