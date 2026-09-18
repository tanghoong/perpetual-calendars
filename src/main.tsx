import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Offline. The app makes no network requests once it is running — no API, no
// fonts, no analytics — but that never made it available offline, because the
// browser still had to fetch the app itself, and nothing lets it skip that
// without a service worker. sw.js is generated at build time from the actual
// bundle; see vite.config.ts.
//
// Registration is deliberately late and deliberately silent: after `load` so it
// cannot compete with the first paint, and swallowing failures because a
// service worker is an enhancement. It is unavailable over plain HTTP, in some
// private-browsing modes, and wherever the user has disabled it — in all of
// which the app is expected to carry on exactly as before.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}
