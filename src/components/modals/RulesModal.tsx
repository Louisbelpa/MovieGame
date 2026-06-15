/**
 * modals/RulesModal.tsx
 * Tutoriel « Comment jouer » — 3 slides de règles, spécifiques au jeu courant.
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

type RulesSlide = { glyph: string; cls: string; title: string; body: string }

/** Règles « Comment jouer » spécifiques au jeu courant. */
function slidesFor(mode: RulesMode): RulesSlide[] {
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
  const slides = slidesFor(resolvedMode)
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
    if (slide < slides.length - 1) setSlide(slide + 1)
    else handleClose()
  }

  if (!isOpen) return null

  const s = slides[slide]

  const content = (
    <div className="cdym-onb">
      {/* Skip */}
      <button className="cdym-onb-skip" type="button" onClick={handleClose}>Passer</button>

      {/* Illustration */}
      <div className="cdym-onb-art">
        <div className="cdym-onb-card" style={{ transform: 'rotate(-4deg)' }}>
          <GlyphC game={s.glyph} size={84} />
        </div>
      </div>

      {/* Text */}
      <h2 className="cdym-onb-h">{s.title}</h2>
      <p className="cdym-onb-b">{s.body}</p>

      {/* Dots */}
      <div className="cdym-onb-dots">
        {slides.map((_, i) => <i key={i} className={i === slide ? 'on' : ''} />)}
      </div>

      {/* CTA */}
      <button
        type="button"
        className="cdym-btn cdym-btn-primary cdym-btn-block"
        style={{ padding: '16px' }}
        onClick={handleNext}
      >
        {slide === slides.length - 1 ? 'Commencer à jouer' : 'Suivant'}
      </button>
    </div>
  )

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={slide}
        className={`onb-overlay ${s.cls}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={handleClose}
      >
        {/* Inner card — full-screen on mobile, centered card on desktop */}
        <div className="onb-inner" onClick={(e) => e.stopPropagation()}>
          {content}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
