import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { storageService } from '@/services/storage/storageService'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    const stored = storageService.getTheme()
    let initialTheme: Theme
    if (stored) {
      initialTheme = stored
    } else {
      // Fall back to system preference
      if (typeof window !== 'undefined') {
        initialTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      } else {
        initialTheme = 'light'
      }
    }
    
    // Apply theme class immediately on mount
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      if (initialTheme === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
    
    return initialTheme
  })

  useEffect(() => {
    // Apply theme class to document root whenever theme changes
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    storageService.saveTheme(newTheme)
    // Apply theme class immediately
    const root = document.documentElement
    if (newTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => {
      const newTheme = currentTheme === 'light' ? 'dark' : 'light'
      storageService.saveTheme(newTheme)
      // Apply theme class immediately
      const root = document.documentElement
      if (newTheme === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
      return newTheme
    })
  }, [])

  // Listen for system theme changes (only if user hasn't set a preference)
  useEffect(() => {
    const stored = storageService.getTheme()
    if (stored) {
      // User has a preference, don't listen to system changes
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      setThemeState(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
