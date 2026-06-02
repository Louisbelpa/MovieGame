/**
 * modals/AuthModal.tsx
 * Login / register modal with tab switching.
 * Exports useAuthModal() hook to control open/close state.
 */

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { useGoogleLogin } from '@react-oauth/google'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { authForgotPassword } from '@/api/client'
import { captureMobileReturnFromUrl } from '@/lib/mobileAuthHandoff'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

// ─── Modal state ─────────────────────────────────────────────────────────────

interface AuthModalStore {
  isOpen: boolean
  initialTab: AuthTab
  open: (tab?: AuthTab) => void
  close: () => void
}

type AuthTab = 'login' | 'register' | 'forgot'

const useAuthModalStore = create<AuthModalStore>((set) => ({
  isOpen: false,
  initialTab: 'login',
  open: (tab = 'login') => set({ isOpen: true, initialTab: tab }),
  close: () => set({ isOpen: false }),
}))

export function useAuthModal() {
  const { isOpen, initialTab, open, close } = useAuthModalStore()
  return { isOpen, initialTab, open, close }
}

// ─── Form field ───────────────────────────────────────────────────────────────

function Field({
  label, id, type = 'text', value, onChange, autoComplete,
}: {
  label: string; id: string; type?: string; value: string
  onChange: (v: string) => void; autoComplete?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
        {label}
      </label>
      <input
        id={id} type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        style={{
          width: '100%', borderRadius: 14, border: '2.5px solid var(--line)',
          background: 'var(--bg)', padding: '12px 14px', fontSize: 15,
          color: 'var(--ink)', outline: 'none', fontFamily: 'Fredoka, sans-serif',
          boxShadow: '0 3px 0 var(--line-2)',
          transition: 'border-color .15s',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'var(--coral)' }}
        onBlur={(e)  => { e.target.style.borderColor = 'var(--line)' }}
      />
    </div>
  )
}

// ─── Login tab ────────────────────────────────────────────────────────────────

function LoginForm({ onSuccess, onSwitch, onForgot }: { onSuccess: () => void; onSwitch: () => void; onForgot: () => void }) {
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
    <form onSubmit={handleSubmit}>
      <div className="cdym-field">
        <label htmlFor="login-email">E-mail</label>
        <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="ton@email.com" />
      </div>
      <div className="cdym-field">
        <label htmlFor="login-password">Mot de passe</label>
        <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" />
      </div>

      {error && (
        <p role="alert" style={{ fontSize: 13, color: 'var(--wrong-d)', background: 'var(--wrong-soft)', border: '1.5px solid var(--wrong)', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={isLoading} className="cdy-btn cdy-btn-primary" style={{ width: '100%', padding: '15px', marginTop: 4 }}>
        {isLoading ? '…' : 'Se connecter'}
      </button>

      <div className="cdym-auth-foot">
        Pas de compte ?{' '}
        <b onClick={onSwitch}>Créer un compte</b>
      </div>
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <button type="button" onClick={onForgot} style={{ color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Fredoka, sans-serif' }}>
          Mot de passe oublié ?
        </button>
      </div>
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
    <form onSubmit={handleSubmit}>
      <div className="cdym-field">
        <label htmlFor="reg-name">Pseudo</label>
        <input id="reg-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="nickname" placeholder="marius" />
      </div>
      <div className="cdym-field">
        <label htmlFor="reg-email">E-mail</label>
        <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="marius@email.com" />
      </div>
      <div className="cdym-field">
        <label htmlFor="reg-password">Mot de passe</label>
        <input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="8 caractères minimum" />
      </div>
      <div className="cdym-field">
        <label htmlFor="reg-confirm">Confirmer</label>
        <input id="reg-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" placeholder="••••••••" />
      </div>

      {error && (
        <p role="alert" style={{ fontSize: 13, color: 'var(--wrong-d)', background: 'var(--wrong-soft)', border: '1.5px solid var(--wrong)', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={isLoading} className="cdy-btn cdy-btn-primary" style={{ width: '100%', padding: '15px', marginTop: 4 }}>
        {isLoading ? '…' : 'Créer mon compte'}
      </button>

      <div className="cdym-auth-foot">
        Déjà un compte ?{' '}
        <b onClick={onSwitch}>Se connecter</b>
      </div>
      <p className="cdym-auth-legal">
        En continuant, tu acceptes les Conditions d'utilisation et la Politique de confidentialité.
      </p>
    </form>
  )
}

// ─── Forgot password tab ─────────────────────────────────────────────────────

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    try {
      await authForgotPassword(email)
    } catch {
      // Always show success to avoid email enumeration
    } finally {
      setIsLoading(false)
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <div style={{ background: 'var(--correct-soft)', border: '1.5px solid var(--correct)', borderRadius: 14, padding: '14px 16px', fontSize: 14, color: 'var(--correct-d)' }}>
          Si un compte existe pour <strong>{email}</strong>, tu vas recevoir un e-mail dans quelques minutes.
        </div>
        <button type="button" onClick={onBack} className="cdy-btn cdy-btn-soft" style={{ width: '100%', justifyContent: 'center' }}>
          Retour à la connexion
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-film-text-dim">
        Saisis ton adresse e-mail et on t'envoie un lien pour réinitialiser ton mot de passe.
      </p>
      <Field label="Adresse e-mail" id="forgot-email" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Button type="submit" size="lg" isLoading={isLoading} className="w-full mt-1">
        Envoyer le lien
      </Button>
      <button type="button" onClick={onBack} className="text-center text-sm text-film-text-dim hover:text-film-text cursor-pointer">
        Retour
      </button>
    </form>
  )
}

// ─── Google Sign-In button ───────────────────────────────────────────────────

function GoogleSignInButton({ onSuccess }: { onSuccess: () => void }) {
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLogin = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      setError(null)
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        })
        const info = await res.json() as { sub: string; email: string; name: string; picture?: string }
        await loginWithGoogle(info.sub, info.email, info.name, info.picture)
        onSuccess()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connexion Google échouée.')
      }
    },
    onError: () => setError('Connexion Google échouée. Veuillez réessayer.'),
  })

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className="gsi-material-button"
        onClick={() => handleGoogleLogin()}
      >
        <div className="gsi-material-button-state" />
        <div className="gsi-material-button-content-wrapper">
          <div className="gsi-material-button-icon">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
          </div>
          <span className="gsi-material-button-contents">Continuer avec Google</span>
        </div>
      </button>
      {error && (
        <p className="text-xs text-film-red">{error}</p>
      )}
    </div>
  )
}

// ─── Apple Sign-In button ─────────────────────────────────────────────────────

type AppleIDWindow = typeof window & {
  AppleID?: {
    auth: {
      init: (o: object) => void
      signIn: () => Promise<{
        authorization: { id_token: string }
        user?: { name?: { firstName?: string; lastName?: string } }
      }>
    }
  }
}

function AppleSignInButton({ onSuccess }: { onSuccess: () => void }) {
  const loginWithApple = useAuthStore((s) => s.loginWithApple)

  async function handleAppleSignIn() {
    if (!document.getElementById('apple-signin-sdk')) {
      await new Promise<void>((resolve) => {
        const s = document.createElement('script')
        s.id = 'apple-signin-sdk'
        s.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'
        s.onload = () => resolve()
        document.head.appendChild(s)
      })
    }
    const clientId = import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined
    const redirectUri = import.meta.env.VITE_APPLE_REDIRECT_URI as string | undefined
    if (!clientId || !redirectUri) {
      alert('Apple Sign-In non configuré pour le web.')
      return
    }
    try {
      const w = window as AppleIDWindow
      w.AppleID?.auth.init({ clientId, scope: 'name email', redirectURI: redirectUri, usePopup: true })
      const result = await w.AppleID!.auth.signIn()
      const identityToken = result.authorization.id_token
      const firstName = result.user?.name?.firstName
      const lastName = result.user?.name?.lastName
      const displayName = firstName ? `${firstName}${lastName ? ' ' + lastName : ''}` : undefined
      await loginWithApple(identityToken, displayName)
      onSuccess()
    } catch (err: unknown) {
      const code = (err as { error?: string }).error
      if (code !== 'popup_closed_by_user') {
        alert('Connexion Apple échouée. Veuillez réessayer.')
      }
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleAppleSignIn()}
      className="w-full flex items-center justify-center gap-2 cursor-pointer"
      style={{ background: '#1a1a1a', color: '#fff', borderRadius: 14, padding: '13px 18px', fontSize: 14, fontWeight: 600, border: 'none', boxShadow: '0 5px 0 #000', fontFamily: 'Fredoka, sans-serif', transition: 'transform .08s', }}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4 fill-current flex-shrink-0"
        aria-hidden
      >
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
      Continuer avec Apple
    </button>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function AuthModal() {
  const { isOpen, initialTab, open, close } = useAuthModal()
  const [tab, setTab] = useState<AuthTab>('login')
  const mobileReturnURL = useAuthStore((s) => s.mobileReturnURL)
  const clearMobileReturnURL = useAuthStore((s) => s.clearMobileReturnURL)

  // Open directly to register if URL contains ?auth=register (& ?platform=ios from app)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    captureMobileReturnFromUrl()
    const authParam = params.get('auth')
    if (authParam === 'register' || authParam === 'login') {
      open(authParam)
      params.delete('auth')
      const newSearch = params.toString()
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash
      window.history.replaceState(null, '', newUrl)
    }
  }, [open])

  useEffect(() => {
    if (isOpen) setTab(initialTab)
  }, [initialTab, isOpen])

  // Mobile handoff: account created, show return button instead of closing
  if (mobileReturnURL) {
    return (
      <Modal isOpen={true} onClose={() => {}} ariaLabel="Retour à l'application">
        <div className="flex flex-col items-center gap-6 py-4 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-film-gold/10">
            <span className="text-3xl">🎬</span>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-film-text">Compte créé !</h2>
            <p className="text-sm text-film-text-dim">
              Retournez dans l'application pour commencer à jouer.
            </p>
          </div>
          <a
            href={mobileReturnURL}
            onClick={clearMobileReturnURL}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
            style={{ background: 'linear-gradient(180deg, #e8c06a, #d4a64a, #a07030)', color: '#1a0f00' }}
          >
            Ouvrir GuessToday
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
          <p className="text-xs text-film-text-dim">
            Si l'application ne s'ouvre pas,{' '}
            <button
              type="button"
              className="underline cursor-pointer"
              onClick={clearMobileReturnURL}
            >
              continuer sur le site
            </button>
          </p>
        </div>
      </Modal>
    )
  }

  function handleSuccess() {
    close()
  }

  const ariaLabel =
    tab === 'login' ? 'Connexion' : tab === 'register' ? 'Créer un compte' : 'Mot de passe oublié'

  return (
    <Modal isOpen={isOpen} onClose={close} ariaLabel={ariaLabel}>
      <div className="cdym-auth g-film" style={{ padding: 0 }}>

        {/* Logo */}
        <span className="cdym-auth-logo">
          <span className="d">?</span>
          Guess<span style={{ color: 'var(--coral)' }}>Today</span>
        </span>

        {tab === 'forgot' ? (
          /* ── Mot de passe oublié ── */
          <>
            <h1 className="cdym-auth-h">Mot de passe oublié</h1>
            <p className="cdym-auth-sub">On t'envoie un lien pour réinitialiser.</p>
            <ForgotPasswordForm onBack={() => setTab('login')} />
          </>
        ) : (
          <>
            {/* Title + sub */}
            <h1 className="cdym-auth-h">
              {tab === 'register' ? 'Crée ton compte' : 'Bon retour !'}
            </h1>
            <p className="cdym-auth-sub">
              {tab === 'register'
                ? 'Garde ta série, tes stats et défie tes amis.'
                : 'Connecte-toi pour reprendre ta série.'}
            </p>

            {/* Social buttons ABOVE form */}
            <div className="cdym-social">
              <AppleSignInButton onSuccess={handleSuccess} />
              {GOOGLE_CLIENT_ID && <GoogleSignInButton onSuccess={handleSuccess} />}
            </div>

            {/* Divider */}
            <div className="cdym-divider">ou avec un e-mail</div>

            {/* Form */}
            {tab === 'login' ? (
              <LoginForm onSuccess={handleSuccess} onSwitch={() => setTab('register')} onForgot={() => setTab('forgot')} />
            ) : (
              <RegisterForm onSuccess={handleSuccess} onSwitch={() => setTab('login')} />
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
