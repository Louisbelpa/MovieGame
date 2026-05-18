import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { authResetPassword } from '@/api/client'
import { useAuthModal } from '@/components/modals/AuthModal'

function Field({
  label, id, value, onChange,
}: {
  label: string; id: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-film-text-dim font-medium">{label}</label>
      <input
        id={id} type="password" value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
        className="w-full rounded-lg border border-film-border bg-film-gray px-3 py-2.5 text-sm text-film-text placeholder:text-film-text-dim/60 focus:outline-none focus:border-film-gold focus:ring-1 focus:ring-film-gold transition-colors"
      />
    </div>
  )
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { open } = useAuthModal()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  if (!token) {
    return (
      <div className="min-h-screen bg-film-black flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <p className="text-film-red text-sm">Lien invalide ou manquant.</p>
          <button onClick={() => navigate('/')} className="mt-4 text-film-gold text-sm hover:underline cursor-pointer">
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Au moins 8 caractères.'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    setError(null)
    setIsLoading(true)
    try {
      await authResetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ce lien est invalide ou a expiré.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-film-black flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <h1 className="text-2xl font-bold text-film-gold mb-2">GuessToday</h1>
        <h2 className="text-lg font-semibold text-film-text mb-6">Nouveau mot de passe</h2>

        {done ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-film-green/10 border border-film-green/30 px-4 py-3 text-sm text-film-green">
              Mot de passe mis à jour ! Tu peux maintenant te connecter.
            </div>
            <Button size="lg" className="w-full" onClick={() => { navigate('/'); open('login') }}>
              Se connecter
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Nouveau mot de passe" id="rp-password" value={password} onChange={setPassword} />
            <Field label="Confirmer le mot de passe" id="rp-confirm" value={confirm} onChange={setConfirm} />
            {error && (
              <p role="alert" className="text-sm text-film-red bg-film-red/10 border border-film-red/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" isLoading={isLoading} className="w-full mt-1">
              Enregistrer le mot de passe
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
