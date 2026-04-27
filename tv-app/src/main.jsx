import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import AppShell from './AppShell.jsx'

// Quick Boot cache buster — each build gets a unique timestamp injected at compile time.
const BUILD_ID = import.meta.env.VITE_BUILD_ID || ''
if (BUILD_ID) {
  const stored = localStorage.getItem('tv_build_id')
  if (stored && stored !== BUILD_ID) {
    sessionStorage.clear()
    localStorage.setItem('tv_build_id', BUILD_ID)
    window.location.reload()
  } else {
    localStorage.setItem('tv_build_id', BUILD_ID)
  }
}

// On app resume (Quick Boot restore, emulator reopen), fetch build.txt from APK assets.
// build.txt always contains the BUILD_ID from the INSTALLED APK — if it differs from
// the in-memory BUILD_ID, the running JS is stale → reload fresh from the new APK.
if (BUILD_ID) {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return
    try {
      const r = await fetch('./build.txt', { cache: 'no-store' })
      if (!r.ok) return
      const diskId = (await r.text()).trim()
      if (diskId && diskId !== BUILD_ID) {
        sessionStorage.clear()
        localStorage.setItem('tv_build_id', diskId)
        window.location.reload()
      }
    } catch (_) {}
  })
}

// Persistent TV device identity — generated once, survives across sessions
if (!localStorage.getItem('tvDeviceId')) {
  localStorage.setItem('tvDeviceId', crypto.randomUUID())
}

// LG webOS detection
const ua = navigator.userAgent || ''
const isLg = /Web0S|webOS|LG Browser/i.test(ua)

if (isLg) {
  document.body.classList.add('lg-tv')
  console.log('Running on LG TV')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <AppShell>
        <App />
      </AppShell>
    </HashRouter>
  </StrictMode>,
)