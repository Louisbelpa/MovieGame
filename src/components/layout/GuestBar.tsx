import { useAuthModal } from '@/components/modals/AuthModal'
import { useAuthStore } from '@/store/authStore'

/** Bandeau « Tu joues en invité » — visible pendant la partie sans compte. */
export function GuestBar() {
  const user = useAuthStore((s) => s.user)
  const { open: openAuth } = useAuthModal()

  if (user) return null

  return (
    <div className="guestbar">
      <span className="gb-emoji e" aria-hidden>👋</span>
      <div className="gb-text">
        <div className="gb-title t">Tu joues en invité</div>
        <div className="gb-sub s">Crée un compte pour sauvegarder ta série et tes stats.</div>
      </div>
      <button
        type="button"
        onClick={() => openAuth('register')}
        className="cdy-btn cdy-btn-primary g-film gb-btn"
      >
        Créer un compte
      </button>
    </div>
  )
}
