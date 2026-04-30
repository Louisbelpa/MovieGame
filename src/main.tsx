
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Footer } from '@/components/layout/Footer'
import './index.css'


const root = document.getElementById('root')!
const path = window.location.pathname

if (path.startsWith('/admin')) {
  import('./admin/AdminApp').then(({ AdminApp }) => {
    createRoot(root).render(<StrictMode><AdminApp /></StrictMode>)
  })
} else if (path.startsWith('/series')) {
  import('./App').then(({ default: App }) => {
    createRoot(root).render(
      <StrictMode>
        <BrowserRouter>
          <App gameType="series" />
        </BrowserRouter>
      </StrictMode>
    )
  })
} else if (path === '/' || path === '') {
  import('./components/HomePage').then(({ HomePage }) => {
    createRoot(root).render(<StrictMode><HomePage /></StrictMode>)
  })
} else {
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
