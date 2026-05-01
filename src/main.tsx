
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { BRAND_NAME, FEATURES } from './config/features'


const root = document.getElementById('root')!
const path = window.location.pathname

if (path.startsWith('/admin')) {
  document.title = `${BRAND_NAME} Admin`
  import('./admin/AdminApp').then(({ AdminApp }) => {
    createRoot(root).render(<StrictMode><AdminApp /></StrictMode>)
  })
} else if (path.startsWith('/series')) {
  if (!FEATURES.enableSeries) {
    window.history.replaceState({}, '', '/films')
    document.title = `${BRAND_NAME} — Devine le film du jour`
    import('./App').then(({ default: App }) => {
      createRoot(root).render(
        <StrictMode>
          <BrowserRouter>
            <App gameType="film" />
          </BrowserRouter>
        </StrictMode>
      )
    })
  } else {
    document.title = `${BRAND_NAME} — Devine la série du jour`
    import('./App').then(({ default: App }) => {
      createRoot(root).render(
        <StrictMode>
          <BrowserRouter>
            <App gameType="series" />
          </BrowserRouter>
        </StrictMode>
      )
    })
  }
} else if (path.startsWith('/wiki')) {
  if (!FEATURES.enableWiki) {
    window.history.replaceState({}, '', '/films')
    document.title = `${BRAND_NAME} — Devine le film du jour`
    import('./App').then(({ default: App }) => {
      createRoot(root).render(<StrictMode><BrowserRouter><App gameType="film" /></BrowserRouter></StrictMode>)
    })
  } else {
    document.title = `${BRAND_NAME} — Devine la personnalité du jour`
    import('./WikiApp').then(({ WikiApp }) => {
      createRoot(root).render(<StrictMode><BrowserRouter><WikiApp /></BrowserRouter></StrictMode>)
    })
  }
} else if (path === '/' || path === '') {
  document.title = FEATURES.enableSeries
    ? `${BRAND_NAME} — Devine le film ou la série du jour`
    : `${BRAND_NAME} — Devine le film du jour`
  import('./components/HomePage').then(({ HomePage }) => {
    createRoot(root).render(<StrictMode><HomePage /></StrictMode>)
  })
} else {
  document.title = `${BRAND_NAME} — Devine le film du jour`
  import('./App').then(({ default: App }) => {
    createRoot(root).render(
      <StrictMode>
        <BrowserRouter>
          <App gameType="film" />
        </BrowserRouter>
      </StrictMode>
    )
  })
}
