import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext'

// Global error handler
window.addEventListener('error', (_event) => {
  // Error handling can be added here if needed
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (_event) => {
  // Error handling can be added here if needed
});

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </React.StrictMode>,
  )
} catch (error) {
  // Error handling can be added here if needed
}
