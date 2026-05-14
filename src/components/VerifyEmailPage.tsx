import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { authVerifyEmail } from '@/api/client'
import { useAuthStore } from '@/store/authStore'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const token = params.get('token') ?? ''

  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending')

  useEffect(() => {
    if (!token) { setStatus('error'); return }
    authVerifyEmail(token)
      .then(() => {
        void fetchMe()
        setStatus('success')
      })
      .catch(() => setStatus('error'))
  }, [token, fetchMe])

  return (
    <div className="min-h-screen bg-film-black flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-film-gold">GuessToday</h1>

        {status === 'pending' && (
          <p className="text-film-text-dim text-sm">Vérification en cours…</p>
        )}

        {status === 'success' && (
          <>
            <div className="rounded-lg bg-film-green/10 border border-film-green/30 px-4 py-3 text-sm text-film-green">
              Adresse e-mail confirmée ! Merci.
            </div>
            <Button size="lg" className="w-full" onClick={() => navigate('/')}>
              Jouer
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <p className="text-film-red text-sm">Ce lien est invalide ou a expiré.</p>
            <Button variant="secondary" size="lg" className="w-full" onClick={() => navigate('/')}>
              Retour à l'accueil
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
