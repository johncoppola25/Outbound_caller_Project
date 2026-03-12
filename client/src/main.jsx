import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import './index.css'

const root = document.getElementById('root')
if (!root) {
  const h1 = document.createElement('h1')
  h1.style.cssText = 'padding:20px;color:red'
  h1.textContent = 'Root element not found'
  document.body.appendChild(h1)
} else {
  ;(async () => {
    try {
      const { default: App } = await import('./App.jsx')
      ReactDOM.createRoot(root).render(
        <React.StrictMode>
          <HelmetProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </HelmetProvider>
        </React.StrictMode>,
      )
    } catch (err) {
      console.error('Failed to load app:', err)
      root.textContent = ''
      const container = document.createElement('div')
      container.style.cssText = 'padding:40px;font-family:sans-serif'

      const h1 = document.createElement('h1')
      h1.style.color = '#151c30'
      h1.textContent = 'Failed to load app'
      container.appendChild(h1)

      const p1 = document.createElement('p')
      p1.style.cssText = 'color:#755f4e;margin:16px 0'
      p1.textContent = err.message
      container.appendChild(p1)

      const p2 = document.createElement('p')
      p2.style.cssText = 'color:#99826a;font-size:14px'
      p2.textContent = 'Check the browser console (F12) for details.'
      container.appendChild(p2)

      const btn = document.createElement('button')
      btn.style.cssText = 'margin-top:20px;padding:12px 24px;background:#1e2a45;color:white;border:none;border-radius:8px;cursor:pointer'
      btn.textContent = 'Reload'
      btn.addEventListener('click', () => location.reload())
      container.appendChild(btn)

      root.appendChild(container)
    }
  })()
}
