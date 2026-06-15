import type { ReactNode } from 'react'
import { useAuthModal } from '@/components/modals/AuthModal'

interface CandyLockedGateProps {
  context: 'profile' | 'friends' | 'classement'
  preview: ReactNode
}

const COPY = {
  profile: {
    icon: '👤',
    title: 'Ton profil t\'attend',
    body: 'Crée un compte gratuit pour sauvegarder tes stats, garder ta série et accéder à ton historique depuis n\'importe quel appareil.',
    perks: ['🔥 Ta série', '📊 Tes stats', '🕑 Historique'],
  },
  friends: {
    icon: '👥',
    title: 'Joue avec tes amis',
    body: 'Crée un compte gratuit pour défier tes amis et comparer vos scores du jour.',
    perks: ['➕ Ajouter des amis', '⚔️ Défis', '📊 Comparaison'],
  },
  classement: {
    icon: '🏆',
    title: 'Rejoins le classement',
    body: 'Crée un compte pour apparaître au classement et suivre ta progression face aux autres joueurs.',
    perks: ['🏆 Classement', '🔥 Série', '👥 Amis'],
  },
} as const

/** Mur d'inscription avec aperçu flouté de la page cible (maquette CandyLockedPage). */
export function CandyLockedGate({ context, preview }: CandyLockedGateProps) {
  const { open: openAuth } = useAuthModal()
  const cfg = COPY[context]

  return (
    <div style={{ position: 'relative', minHeight: '50vh' }}>
      <div style={{ filter: 'blur(5px)', opacity: 0.45, pointerEvents: 'none', userSelect: 'none' }} aria-hidden>
        {preview}
      </div>
      <div
        className="cdy-locked-scrim"
        style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 20 }}
      >
        <div className="cdy-locked-card" style={{ maxWidth: 400, width: '100%' }}>
          <div className="lk">{cfg.icon}</div>
          <h2>{cfg.title}</h2>
          <p>{cfg.body}</p>
          <div className="cdy-locked-perks">
            {cfg.perks.map((p) => (
              <span key={p} className="cdy-locked-perk">{p}</span>
            ))}
          </div>
          <div className="cdy-locked-cta">
            <button type="button" onClick={() => openAuth('register')} className="cdy-btn cdy-btn-primary" style={{ width: '100%' }}>
              Créer un compte gratuit
            </button>
            <button type="button" onClick={() => openAuth('login')} className="cdym-locked-ghost" style={{ marginTop: 10 }}>
              Se connecter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
