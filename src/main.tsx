import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const root = document.getElementById('root')!

if (window.location.pathname.startsWith('/admin')) {
  // Lazy-load the admin bundle only when needed
  import('./admin/AdminApp').then(({ AdminApp }) => {
    createRoot(root).render(
      <StrictMode>
        <AdminApp />
      </StrictMode>
    )
  })
} else {
  import('./App').then(({ default: App }) => {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  })
}
