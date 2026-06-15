/**
 * modals/RulesModal.tsx
 * Tutoriel « Comment jouer » — règles du jeu courant, dans une modale centrée standard.
 */

import { Modal } from '@/components/ui/Modal'
import { RULES_SEEN_KEY_FILM, RULES_SEEN_KEY_SERIES, RULES_SEEN_KEY_WIKI } from '@/lib/rulesSeen'
import { useGameStore } from '@/store/gameStore'
import { useWikiStore } from '@/store/wikiStore'

type RulesMode = 'film' | 'series' | 'wiki'

function GlyphC({ game, size = 24 }: { game: string; size?: number }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (game === 'film')  return <svg width={size} height={size} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2.5" {...s} /><path d="M3 9h18M3 15h18M8 4v16M16 4v16" {...s} /></svg>
  if (game === 'serie') return <svg width={size} height={size} viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2.5" {...s} /><path d="M8 3l4 4 4-4" {...s} /></svg>
  if (game === 'face')  return <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="9" r="4" {...s} /><path d="M5 20c0-3.8 3.1-6.2 7-6.2s7 2.4 7 6.2" {...s} /></svg>
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" />
}

type Rule = { glyph: string; cls: string; title: string; body: string }

/** Règles « Comment jouer » spécifiques au jeu courant. */
function rulesFor(mode: RulesMode): Rule[] {
  const noun  = mode === 'wiki' ? 'une personnalité' : mode === 'series' ? 'une série' : 'un film'
  const glyph = mode === 'wiki' ? 'face' : mode === 'series' ? 'serie' : 'film'
  const cls   = mode === 'wiki' ? 'g-face' : mode === 'series' ? 'g-serie' : 'g-film'
  const hints = mode === 'wiki'
    ? 'année de naissance, nationalité, domaine…'
    : mode === 'series'
      ? 'année, créateur, acteur principal…'
      : 'année, réalisateur, acteur principal…'
  return [
    {
      glyph, cls,
      title: `Devine ${noun} chaque jour`,
      body: 'Un nouveau défi à minuit (heure de Paris), le même pour tout le monde. Tape ton hypothèse dans la barre de recherche.',
    },
    {
      glyph, cls,
      title: '5 essais, des indices',
      body: `À chaque mauvaise réponse, un indice se dévoile (${hints}). Trouve avant d'épuiser tes 5 essais.`,
    },
    {
      glyph, cls,
      title: 'Garde ta série 🔥',
      body: 'Réussis le défi pour allonger ta série, grimper au classement et partager ton score avec tes amis.',
    },
  ]
}

export function RulesModal({ mode }: { mode?: RulesMode }) {
  const gameUi         = useGameStore((s) => s.ui)
  const gameCloseModal = useGameStore((s) => s.closeModal)
  const gameStatus     = useGameStore((s) => s.status)
  const gameOpenModal  = useGameStore((s) => s.openModal)
  const gameType       = useGameStore((s) => s.gameType)

  const wikiUi         = useWikiStore((s) => s.ui)
  const wikiCloseModal = useWikiStore((s) => s.closeModal)
  const wikiStatus     = useWikiStore((s) => s.status)
  const wikiOpenModal  = useWikiStore((s) => s.openModal)

  const resolvedMode: RulesMode = mode ?? (gameType === 'series' ? 'series' : 'film')
  const rules     = rulesFor(resolvedMode)
  const isWiki    = resolvedMode === 'wiki'
  const isOpen    = isWiki
    ? (wikiUi.isModalOpen && wikiUi.modalType === 'rules')
    : (gameUi.isModalOpen && gameUi.modalType === 'rules')
  const closeModal = isWiki ? wikiCloseModal : gameCloseModal
  const status     = isWiki ? wikiStatus     : gameStatus
  const openModal  = isWiki ? wikiOpenModal  : gameOpenModal

  const rulesSeenKey = resolvedMode === 'wiki' ? RULES_SEEN_KEY_WIKI
    : resolvedMode === 'series' ? RULES_SEEN_KEY_SERIES
    : RULES_SEEN_KEY_FILM

  function handleClose() {
    try { localStorage.setItem(rulesSeenKey, '1') } catch { /* private browsing */ }
    closeModal()
    // Si la partie est déjà finie, on enchaîne sur la modale résultat.
    if (status === 'won') setTimeout(() => openModal('win'), 300)
    else if (status === 'lost') setTimeout(() => openModal('lose'), 300)
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Comment jouer" className={rules[0].cls}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {rules.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{
              flexShrink: 0, width: 46, height: 46, borderRadius: 13,
              display: 'grid', placeItems: 'center',
              background: 'var(--acc-soft, var(--bg))', color: 'var(--acc, var(--ink))',
              border: '2px solid var(--line)',
            }}>
              <GlyphC game={r.glyph} size={24} />
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{r.title}</div>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ink-2)', fontWeight: 400, lineHeight: 1.5 }}>{r.body}</p>
            </div>
          </div>
        ))}
        <button type="button" onClick={handleClose} className="cdy-btn cdy-btn-primary" style={{ width: '100%', marginTop: 4 }}>
          Compris, jouons !
        </button>
      </div>
    </Modal>
  )
}
