import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext'

// Global error handler
window.addEventListener('error', (event) => {
  fetch('http://127.0.0.1:7244/ingest/da4ec1e8-d16e-4eb1-ba8d-203aa9874bed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:error',message:'Global error',data:{message:event.message,filename:event.filename,lineno:event.lineno,colno:event.colno,error:event.error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1,H2,H3,H4,H5'})}).catch(()=>{});
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  fetch('http://127.0.0.1:7244/ingest/da4ec1e8-d16e-4eb1-ba8d-203aa9874bed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:unhandledrejection',message:'Unhandled rejection',data:{reason:event.reason?.toString(),error:event.reason?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1,H2,H3,H4,H5'})}).catch(()=>{});
});

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </React.StrictMode>,
  )
  fetch('http://127.0.0.1:7244/ingest/da4ec1e8-d16e-4eb1-ba8d-203aa9874bed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:render',message:'React render started',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
} catch (error) {
  fetch('http://127.0.0.1:7244/ingest/da4ec1e8-d16e-4eb1-ba8d-203aa9874bed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:render',message:'React render error',data:{error:error instanceof Error?error.message:String(error),stack:error instanceof Error?error.stack:undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
}
