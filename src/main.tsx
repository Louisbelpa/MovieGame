
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { BRAND_NAME, FEATURES } from './config/features'
import { ErrorBoundary } from './components/ErrorBoundary'

function wrap(el: React.ReactNode) {
  return <StrictMode><ErrorBoundary>{el}</ErrorBoundary></StrictMode>
}

function setMeta(title: string, description: string) {
  document.title = title
  const el = document.querySelector<HTMLMetaElement>('meta[name="description"]')
  if (el) el.setAttribute('content', description)
}

const hostname = window.location.hostname
if (hostname === 'cineguessr.fr' || hostname === 'www.cineguessr.fr') {
  const keys = ['cineguess:stats:film', 'cineguess:history:film', 'cineguess:rules_seen']
  const data: Record<string, string> = {}
  keys.forEach(k => { const v = localStorage.getItem(k); if (v) data[k] = v })
  const encoded = btoa(JSON.stringify(data))
  window.location.replace(`https://guesstoday.fr/?migrate=${encoded}`)
} else {
  const params = new URLSearchParams(window.location.search)
  const migrationData = params.get('migrate')
  if (migrationData) {
    try {
      const data = JSON.parse(atob(migrationData)) as Record<string, string>
      Object.entries(data).forEach(([key, value]) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, value)
      })
    } catch {}
    params.delete('migrate')
    const clean = [window.location.pathname, params.toString()].filter(Boolean).join('?')
    window.history.replaceState({}, '', clean)
  }
}

const root = document.getElementById('root')!
const path = window.location.pathname

if (path.startsWith('/admin')) {
  setMeta(`${BRAND_NAME} Admin`, 'Back office de gestion des défis.')
  import('./admin/AdminApp').then(({ AdminApp }) => {
    createRoot(root).render(wrap(<AdminApp />))
  })
} else if (path.startsWith('/series')) {
  if (!FEATURES.enableSeries) {
    window.history.replaceState({}, '', '/films')
    setMeta(
      `${BRAND_NAME} — Devine le film du jour`,
      'Devine le film mystère du jour à partir d\'indices. Un nouveau défi cinéma chaque jour.'
    )
  } else {
    setMeta(
      `${BRAND_NAME} — Devine la série du jour`,
      'Devine la série mystère du jour à partir d\'indices. Un nouveau défi chaque jour.'
    )
  }
  import('./App').then(({ default: App }) => {
    createRoot(root).render(wrap(<App />))
  })
} else if (path.startsWith('/wiki')) {
  if (!FEATURES.enableWiki) {
    window.history.replaceState({}, '', '/films')
    setMeta(
      `${BRAND_NAME} — Devine le film du jour`,
      'Devine le film mystère du jour à partir d\'indices. Un nouveau défi cinéma chaque jour.'
    )
  } else {
    setMeta(
      `${BRAND_NAME} — Devine la personnalité du jour`,
      'Devine la personnalité mystère du jour à partir de sa biographie. Un nouveau défi Personnalités chaque jour.'
    )
  }
  import('./App').then(({ default: App }) => {
    createRoot(root).render(wrap(<App />))
  })
} else if (path === '/' || path === '') {
  const title = FEATURES.enableSeries
    ? (FEATURES.enableWiki
      ? `${BRAND_NAME} — Devine le film, la série ou la personnalité du jour`
      : `${BRAND_NAME} — Devine le film ou la série du jour`)
    : (FEATURES.enableWiki
      ? `${BRAND_NAME} — Devine le film ou la personnalité du jour`
      : `${BRAND_NAME} — Devine le film du jour`)
  const desc = FEATURES.enableSeries
    ? 'Trois jeux quotidiens : devine le film, la série ou la personnalité mystère du jour.'
    : 'Devine le film mystère du jour à partir d\'indices progressifs. Un nouveau défi chaque jour.'
  setMeta(title, desc)
  import('./components/HomePage').then(({ HomePage }) => {
    createRoot(root).render(
      wrap(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      )
    )
  })
} else {
  setMeta(
    `${BRAND_NAME} — Devine le film du jour`,
    'Devine le film mystère du jour à partir d\'indices. Un nouveau défi cinéma chaque jour.'
  )
  import('./App').then(({ default: App }) => {
    createRoot(root).render(wrap(<App />))
  })
}
