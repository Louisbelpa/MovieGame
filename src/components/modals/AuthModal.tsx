/**
 * modals/AuthModal.tsx
 * Login / register modal with tab switching.
 * Exports useAuthModal() hook to control open/close state.
 */

import { useState } from 'react'
import { create } from 'zustand'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'

// ─── Modal state ─────────────────────────────────────────────────────────────

interface AuthModalStore {
  isOpen: boolean
  open: () => void
  close: () => void
}

const useAuthModalStore = create<AuthModalStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))

export function useAuthModal() {
  const { isOpen, open, close } = useAuthModalStore()
  return { isOpen, open, close }
}

// ─── Form field ───────────────────────────────────────────────────────────────

function Field({
  label,
  id,
  type = 'text',
  value,
  onChange,
  autoComplete,
}: {
  label: string
  id: string
  type?: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-film-text-dim font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-film-border bg-film-gray px-3 py-2.5 text-sm text-film-text placeholder:text-film-text-dim/60 focus:outline-none focus:border-film-gold focus:ring-1 focus:ring-film-gold transition-colors"
      />
    </div>
  )
}

// ─── Login tab ────────────────────────────────────────────────────────────────

function LoginForm({ onSuccess, onSwitch }: { onSuccess: () => void; onSwitch: () => void }) {
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await login(email, password)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Adresse e-mail" id="login-email" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Field label="Mot de passe" id="login-password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />

      {error && (
        <p role="alert" className="text-sm text-film-red bg-film-red/10 border border-film-red/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" isLoading={isLoading} className="w-full mt-1">
        Se connecter
      </Button>

      <p className="text-center text-sm text-film-text-dim">
        Pas de compte ?{' '}
        <button type="button" onClick={onSwitch} className="text-film-gold hover:underline cursor-pointer">
          Créer un compte
        </button>
      </p>
    </form>
  )
}

// ─── Register tab ─────────────────────────────────────────────────────────────

function RegisterForm({ onSuccess, onSwitch }: { onSuccess: () => void; onSwitch: () => void }) {
  const register = useAuthStore((s) => s.register)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  function validate(): string | null {
    if (!displayName.trim()) return 'Le pseudo est requis.'
    if (!email.includes('@')) return 'Adresse e-mail invalide.'
    if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.'
    if (password !== confirm) return 'Les mots de passe ne correspondent pas.'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError(null)
    setIsLoading(true)
    try {
      await register(email, password, displayName.trim())
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du compte.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Pseudo" id="reg-name" value={displayName} onChange={setDisplayName} autoComplete="nickname" />
      <Field label="Adresse e-mail" id="reg-email" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Field label="Mot de passe" id="reg-password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
      <Field label="Confirmer le mot de passe" id="reg-confirm" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />

      {error && (
        <p role="alert" className="text-sm text-film-red bg-film-red/10 border border-film-red/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" isLoading={isLoading} className="w-full mt-1">
        Créer mon compte
      </Button>

      <p className="text-center text-sm text-film-text-dim">
        Déjà un compte ?{' '}
        <button type="button" onClick={onSwitch} className="text-film-gold hover:underline cursor-pointer">
          Se connecter
        </button>
      </p>
    </form>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function AuthModal() {
  const { isOpen, close } = useAuthModal()
  const [tab, setTab] = useState<'login' | 'register'>('login')

  function handleSuccess() {
    close()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      ariaLabel={tab === 'login' ? 'Connexion' : 'Créer un compte'}
    >
      {/* Tabs */}
      <div className="flex mb-6 border-b border-film-border">
        <button
          type="button"
          onClick={() => setTab('login')}
          className={`flex-1 pb-3 text-sm font-medium transition-colors cursor-pointer ${
            tab === 'login'
              ? 'text-film-gold border-b-2 border-film-gold -mb-px'
              : 'text-film-text-dim hover:text-film-text'
          }`}
        >
          Connexion
        </button>
        <button
          type="button"
          onClick={() => setTab('register')}
          className={`flex-1 pb-3 text-sm font-medium transition-colors cursor-pointer ${
            tab === 'register'
              ? 'text-film-gold border-b-2 border-film-gold -mb-px'
              : 'text-film-text-dim hover:text-film-text'
          }`}
        >
          Créer un compte
        </button>
      </div>

      {tab === 'login' ? (
        <LoginForm onSuccess={handleSuccess} onSwitch={() => setTab('register')} />
      ) : (
        <RegisterForm onSuccess={handleSuccess} onSwitch={() => setTab('login')} />
      )}

      {/* Separator */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-film-border" />
        <span className="text-xs text-film-text-dim">ou</span>
        <div className="flex-1 h-px bg-film-border" />
      </div>

      <Button variant="secondary" size="lg" className="w-full" onClick={close}>
        Continuer sans compte
      </Button>
    </Modal>
  )
}
