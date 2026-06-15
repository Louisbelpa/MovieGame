import { useAuthModal } from '@/components/modals/AuthModal'

/** Bandeau invité stats — une seule structure, styles responsives. */
export function GuestStrip() {
  const { open: openAuth } = useAuthModal()

  return (
    <div className="guest-strip">
      <span className="e" aria-hidden>👤</span>
      <div className="guest-strip-text">
        <div className="t">Connecte-toi pour sauvegarder tes stats</div>
        <div className="s">Tes stats actuelles sont locales à ce navigateur.</div>
      </div>
      <button
        type="button"
        onClick={() => openAuth('register')}
        className="cdy-btn cdy-btn-primary guest-strip-btn"
      >
        <span className="guest-strip-btn-long">Créer un compte</span>
        <span className="guest-strip-btn-short">Compte</span>
      </button>
    </div>
  )
}
