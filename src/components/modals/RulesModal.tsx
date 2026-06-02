/**
 * modals/RulesModal.tsx
 * Onboarding premier démarrage — structure MobileOnboarding (3 slides Candy)
 */

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RULES_SEEN_KEY_FILM, RULES_SEEN_KEY_SERIES, RULES_SEEN_KEY_WIKI } from '@/lib/rulesSeen'
import { useGameStore } from '@/store/gameStore'
import { useWikiStore } from '@/store/wikiStore'

type RulesMode = 'film' | 'series' | 'wiki'

function GlyphC({ game, size = 84 }: { game: string; size?: number }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (game === 'film')  return <svg width={size} height={size} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2.5" {...s} /><path d="M3 9h18M3 15h18M8 4v16M16 4v16" {...s} /></svg>
  if (game === 'serie') return <svg width={size} height={size} viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2.5" {...s} /><path d="M8 3l4 4 4-4" {...s} /></svg>
  if (game === 'face')  return <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="9" r="4" {...s} /><path d="M5 20c0-3.8 3.1-6.2 7-6.2s7 2.4 7 6.2" {...s} /></svg>
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" />
}

const SLIDES = [
  {
    g: 'film',
    glyph: 'film',
    cls: 'g-film',
    title: 'Un défi par jour',
    body: 'Trois jeux de devinettes, renouvelés chaque jour à minuit. Tout le monde joue le même défi.',
  },
  {
    g: 'serie',
    glyph: 'serie',
    cls: 'g-serie',
    title: '5 essais, 3 indices',
    body: 'Devine le titre ou la personnalité. Bloqué ? Un indice se dévoile à chaque essai raté.',
  },
  {
    g: 'face',
    glyph: 'face',
    cls: 'g-face',
    title: 'Joue avec tes amis',
    body: 'Compare tes scores, grimpe au classement et partage ta journée en une seule carte.',
  },
]

export function RulesModal({ mode }: { mode?: RulesMode }) {
  const [slide, setSlide] = useState(0)

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
    setSlide(0)
    if (status === 'won') setTimeout(() => openModal('win'), 300)
    else if (status === 'lost') setTimeout(() => openModal('lose'), 300)
  }

  function handleNext() {
    if (slide < SLIDES.length - 1) setSlide(slide + 1)
    else handleClose()
  }

  if (!isOpen) return null

  const s = SLIDES[slide]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(60,48,80,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={handleClose}>
      <AnimatePresence mode="wait">
        <motion.div
          key={slide}
          className={`${s.cls}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--bg)',
            borderRadius: 28,
            border: '2.5px solid var(--line)',
            boxShadow: '0 12px 0 var(--line-2), 0 24px 60px rgba(60,48,80,0.18)',
            width: '100%',
            maxWidth: 360,
            minHeight: 480,
            display: 'flex',
            flexDirection: 'column',
          }}
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ duration: 0.22 }}
        >
          <div className="cdym-onb">
            {/* Skip */}
            <button className="cdym-onb-skip" type="button" onClick={handleClose}>Passer</button>

            {/* Illustration */}
            <div className="cdym-onb-art">
              <div className="cdym-onb-card">
                <GlyphC game={s.glyph} size={84} />
              </div>
            </div>

            {/* Text */}
            <h2 className="cdym-onb-h">{s.title}</h2>
            <p className="cdym-onb-b">{s.body}</p>

            {/* Dots */}
            <div className="cdym-onb-dots">
              {SLIDES.map((_, i) => <i key={i} className={i === slide ? 'on' : ''} />)}
            </div>

            {/* CTA */}
            <button
              type="button"
              className="cdy-btn cdy-btn-primary"
              style={{ width: '100%', padding: '16px' }}
              onClick={handleNext}
            >
              {slide === SLIDES.length - 1 ? 'Commencer à jouer' : 'Suivant'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
