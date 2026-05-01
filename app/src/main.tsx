import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/react'
import { AppRoutes } from './AppRoutes'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { storageService } from './services/storage/storageService'
import { llmService } from './services/llm/llmService'

// Global error handler
window.addEventListener('error', () => {
  // Error handling can be added here if needed
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', () => {
  // Error handling can be added here if needed
});

// Initialize secure storage before rendering the app
// This handles migration from localStorage and sets up encrypted IndexedDB
async function initializeApp() {
  try {
    await storageService.initialize()
  } catch (error) {
    // Storage initialization failed, but app can still run
    // API key will need to be re-entered
    console.warn('Failed to initialize secure storage:', error)
  }

  // Refresh the live model list for the active provider in the background
  // so Chat (and Settings) reflect what the API key actually has access to,
  // not just the static fallback list. Fire-and-forget; never blocks render.
  void (async () => {
    try {
      const apiKey = await storageService.getApiKey()
      if (!apiKey) return
      const providerId = llmService.resolveProviderId(storageService.getProvider())
      await llmService.fetchAvailableModels(providerId, apiKey)
    } catch {
      // Network or provider error — fallback list stays in use.
    }
  })()

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/sign-in" signInFallbackRedirectUrl="/library" signUpFallbackRedirectUrl="/library">
        <ThemeProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ThemeProvider>
      </ClerkProvider>
    </React.StrictMode>,
  )
}

initializeApp()
