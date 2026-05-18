import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function VerifyEmailPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-film-black flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-film-gold">GuessToday</h1>
        <p className="text-film-text-dim text-sm">Ce lien n'est plus disponible.</p>
        <Button variant="secondary" size="lg" className="w-full" onClick={() => navigate('/')}>
          Retour à l'accueil
        </Button>
      </div>
    </div>
  )
}
