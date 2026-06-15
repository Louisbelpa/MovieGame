/**
 * modals/RulesModal.tsx
 * Tutoriel interactif « Comment jouer » (maquette Candy cdym-tuto).
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
  return null
}

const TUTO_CFG: Record<RulesMode, {
  glyph: string
  cls: string
  name: string
  intro: string
  maxAttempts: number
  placeholder: string
  wrong: string
  answer: string
  firstMeta: string
  hints: [{ l: string; v: string }, { l: string; v: string }]
  mediaNote: string
}> = {
  film: {
    glyph: 'film', cls: 'g-film', name: 'FilmGuess',
    intro: 'Devine le film du jour.',
    maxAttempts: 5,
    placeholder: 'Interstellar…',
    wrong: 'Inception',
    answer: 'Interstellar',
    firstMeta: 'Année · 2010',
    hints: [{ l: 'Année', v: '2014' }, { l: 'Genre', v: 'Sci-Fi' }],
    mediaNote: 'Reviens chaque jour pour un nouveau défi et garde ta série 🔥.',
  },
  series: {
    glyph: 'serie', cls: 'g-serie', name: 'SerieGuess',
    intro: 'Devine la série du jour.',
    maxAttempts: 5,
    placeholder: 'Breaking Bad…',
    wrong: 'Better Call Saul',
    answer: 'Breaking Bad',
    firstMeta: 'Créateur · Gilligan',
    hints: [{ l: 'Année', v: '2008' }, { l: 'Créateur', v: 'V. Gilligan' }],
    mediaNote: 'Reviens chaque jour pour un nouveau défi et garde ta série 🔥.',
  },
  wiki: {
    glyph: 'face', cls: 'g-face', name: 'FaceGuess',
    intro: 'Devine la personnalité — photo floue.',
    maxAttempts: 5,
    placeholder: 'Cate Blanchett…',
    wrong: 'Naomi Watts',
    answer: 'Cate Blanchett',
    firstMeta: 'Nationalité · Australie',
    hints: [{ l: 'Domaine', v: 'Cinéma' }, { l: 'Nationalité', v: 'Australienne' }],
    mediaNote: 'La photo reste floutée : appuie-toi sur la bio. Reviens chaque jour pour garder ta série 🔥.',
  },
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
  const cfg = TUTO_CFG[resolvedMode]
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
    if (status === 'won') setTimeout(() => openModal('win'), 300)
    else if (status === 'lost') setTimeout(() => openModal('lose'), 300)
  }

  if (!isOpen) return null

  const slots = Array.from({ length: cfg.maxAttempts }, (_, i) => i < 2)

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className={cfg.cls} ariaLabel="Comment jouer">
      <div className={`cdym-tuto ${cfg.cls}`} style={{ margin: '-8px -4px 0' }}>
        <div className="cdym-tuto-head">
          <span className="ic"><GlyphC game={cfg.glyph} size={24} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3>Comment jouer</h3>
            <p>{cfg.name} · {cfg.intro}</p>
          </div>
          <button type="button" className="cdym-tuto-x" onClick={handleClose} aria-label="Fermer">✕</button>
        </div>

        <div className="cdym-tuto-body">
          <div className="cdym-tuto-demo">
            <div className="cdym-tuto-lbl"><span className="n">1</span><span className="tx">Tu as {cfg.maxAttempts} essais</span></div>
            <div className="cdym-ar-slots">
              {slots.map((used, i) => <i key={i} className={used ? 'used' : ''} />)}
            </div>
            <div className="demo-input">{cfg.placeholder}</div>
          </div>

          <div className="cdym-tuto-demo">
            <div className="cdym-tuto-lbl"><span className="n">2</span><span className="tx">Chaque erreur te rapproche</span></div>
            <div className="demo-board">
              <div className="cdym-ar-row wrong"><i>✕</i><span>{cfg.wrong}</span><em>{cfg.firstMeta}</em></div>
              <div className="cdym-ar-row correct"><i>✓</i><span>{cfg.answer}</span></div>
            </div>
          </div>

          <div className="cdym-tuto-demo">
            <div className="cdym-tuto-lbl"><span className="n">3</span><span className="tx">Des indices se débloquent</span></div>
            <div className="cdym-ar-hints">
              <div className="cdym-ar-hint on"><span className="hl">{cfg.hints[0].l}</span><span className="hv">{cfg.hints[0].v}</span></div>
              <div className="cdym-ar-hint on"><span className="hl">{cfg.hints[1].l}</span><span className="hv">{cfg.hints[1].v}</span></div>
              <div className="cdym-ar-hint"><span className="hl">Ind. 3</span><span className="hv">🔒</span></div>
            </div>
            <p className="cdym-tuto-note">{cfg.mediaNote}</p>
          </div>
        </div>

        <div className="cdym-tuto-foot">
          <button type="button" onClick={handleClose} className="cdym-btn cdym-btn-primary cdym-btn-block" style={{ padding: '15px' }}>
            C&apos;est parti !
          </button>
          <button type="button" onClick={handleClose} className="cdym-locked-ghost" style={{ marginTop: 8 }}>
            Ne plus afficher
          </button>
        </div>
      </div>
    </Modal>
  )
}
