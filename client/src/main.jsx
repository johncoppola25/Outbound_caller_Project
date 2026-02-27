import React from 'react'
import ReactDOM from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import './index.css'

const root = document.getElementById('root')
if (!root) {
  document.body.innerHTML = '<h1 style="padding:20px;color:red">Root element not found</h1>'
} else {
  ;(async () => {
    try {
      const { default: App } = await import('./App.jsx')
      ReactDOM.createRoot(root).render(
        <React.StrictMode>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </React.StrictMode>,
      )
    } catch (err) {
      console.error('Failed to load app:', err)
      root.innerHTML = `
        <div style="padding:40px;font-family:sans-serif">
          <h1 style="color:#151c30">Failed to load app</h1>
          <p style="color:#755f4e;margin:16px 0">${err.message}</p>
          <p style="color:#99826a;font-size:14px">Check the browser console (F12) for details.</p>
          <button onclick="location.reload()" style="margin-top:20px;padding:12px 24px;background:#1e2a45;color:white;border:none;border-radius:8px;cursor:pointer">Reload</button>
        </div>
      `
    }
  })()
}
