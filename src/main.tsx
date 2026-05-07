
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { BRAND_NAME, FEATURES } from './config/features'
import { ErrorBoundary } from './components/ErrorBoundary'

function wrap(el: React.ReactNode) {
  return <StrictMode><ErrorBoundary>{el}</ErrorBoundary></StrictMode>
}

const root = document.getElementById('root')!
const path = window.location.pathname

if (path.startsWith('/admin')) {
  document.title = `${BRAND_NAME} Admin`
  import('./admin/AdminApp').then(({ AdminApp }) => {
    createRoot(root).render(wrap(<AdminApp />))
  })
} else if (path.startsWith('/series')) {
  if (!FEATURES.enableSeries) {
    window.history.replaceState({}, '', '/films')
    document.title = `${BRAND_NAME} — Devine le film du jour`
    import('./App').then(({ default: App }) => {
      createRoot(root).render(wrap(<App />))
    })
  } else {
    document.title = `${BRAND_NAME} — Devine la série du jour`
    import('./App').then(({ default: App }) => {
      createRoot(root).render(wrap(<App />))
    })
  }
} else if (path.startsWith('/wiki')) {
  if (!FEATURES.enableWiki) {
    window.history.replaceState({}, '', '/films')
    document.title = `${BRAND_NAME} — Devine le film du jour`
    import('./App').then(({ default: App }) => {
      createRoot(root).render(wrap(<App />))
    })
  } else {
    document.title = `${BRAND_NAME} — Devine la personnalité du jour`
    import('./App').then(({ default: App }) => {
      createRoot(root).render(wrap(<App />))
    })
  }
} else if (path === '/' || path === '') {
  document.title = FEATURES.enableSeries
    ? (FEATURES.enableWiki
      ? `${BRAND_NAME} — Devine le film, la série ou la personnalité du jour`
      : `${BRAND_NAME} — Devine le film ou la série du jour`)
    : (FEATURES.enableWiki
      ? `${BRAND_NAME} — Devine le film ou la personnalité du jour`
      : `${BRAND_NAME} — Devine le film du jour`)
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
  document.title = `${BRAND_NAME} — Devise le film du jour`
  import('./App').then(({ default: App }) => {
    createRoot(root).render(wrap(<App />))
  })
}
