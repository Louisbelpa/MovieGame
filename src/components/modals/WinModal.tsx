import { motion } from 'framer-motion'
import { Share2, Trophy, BarChart2, ExternalLink, Film, Tv, User, Flame, UserCircle, Users } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/store/authStore'
import { useAuthModal } from '@/components/modals/AuthModal'
import { loadStats } from '@/lib/storage'
import { NextGameCountdown } from '@/components/modals/NextGameCountdown'

// Confetti component — CSS-only, 20 particles
const CONFETTI_COLORS = ['#f5c842','#ffe07a','#10b981','#e63946','#6b7cff','#ff6b9d','#4ecdc4']
function Confetti() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {Array.from({ length: 20 }, (_, i) => {
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
        const left = `${5 + (i * 4.75) % 90}%`
        const delay = `${(i * 0.11).toFixed(2)}s`
        const duration = `${0.9 + (i % 5) * 0.18}s`
        const size = `${5 + (i % 4) * 2}px`
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              left,
              width: size,
              height: size,
              background: color,
              borderRadius: i % 2 === 0 ? '50%' : '2px',
              animation: `confetti-fall ${duration} ${delay} ease-in forwards`,
            }}
          />
        )
      })}
    </div>
  )
}

function PerformanceBadge({ attemptsUsed }: { attemptsUsed: number }) {
  if (attemptsUsed === 1) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-film-gold/20 border-film-gold/40 text-film-gold">
      ⚡ Coup de maître
    </span>
  )
  if (attemptsUsed === 2) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-film-green/30 text-film-green" style={{ background: 'rgba(16,185,129,0.15)' }}>
      ✓ Excellent
    </span>
  )
  if (attemptsUsed === 3) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-film-green/30 text-film-green" style={{ background: 'rgba(16,185,129,0.15)' }}>
      ✓ Bien joué
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-film-border text-film-text-dim bg-film-gray">
      Limite...
    </span>
  )
}

type GameMode = 'film' | 'series' | 'wiki'

const MODE_META: Record<GameMode, { label: string; icon: React.ElementType }> = {
  film:   { label: 'Cinéma',         icon: Film },
  series: { label: 'Séries',         icon: Tv   },
  wiki:   { label: 'Personnalités',  icon: User },
}

interface WinModalProps {
  isOpen: boolean
  onClose: () => void
  mode: GameMode
  result: {
    name: string
    year?: number
    photoUrl?: string | null
    extract?: string | null
    genres?: string[]
    director?: string
    creator?: string
    personType?: string
    profile?: unknown
    wikipediaUrl?: string | null
    tmdbId?: number | null
  }
  stats: {
    attemptsUsed: number
    maxAttempts: number
    hintsRevealed: number
  }
  onShare: () => void
  onShareAll?: () => void
  onOpenStats?: () => void
  unplayedModes?: Array<{ type: GameMode; path: string }>
}

export function WinModal({ isOpen, onClose, mode, result, stats, onShare, onShareAll, onOpenStats, unplayedModes }: WinModalProps) {
  const isWiki = mode === 'wiki'
  const modalTitleId = 'modal-title-win'
  const modalDescId = 'modal-desc'
  const user = useAuthStore((s) => s.user)
  const { open: openAuth } = useAuthModal()
  const statsType = mode === 'wiki' ? 'wiki' : mode === 'series' ? 'series' : 'film'
  const currentStreak = isOpen ? loadStats(statsType).currentStreak : 0
  const tmdbUrl = !isWiki && result.tmdbId
    ? `https://www.themoviedb.org/${mode === 'series' ? 'tv' : 'movie'}/${result.tmdbId}`
    : null
  const learnMoreUrl = isWiki ? (result.wikipediaUrl ?? null) : tmdbUrl

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      headerContent={
        <div className="flex items-center gap-2">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 15, delay: 0.05 }}
            className="w-8 h-8 rounded-full bg-film-gold/15 border border-film-gold/30 flex items-center justify-center"
          >
            <Trophy size={16} className="text-film-gold" />
          </motion.div>
          <span id={modalTitleId} className="font-title text-xl font-bold text-film-text">Bravo !</span>
        </div>
      }
      ariaLabelledBy={modalTitleId}
      ariaDescribedBy={modalDescId}
    >
      <div className="relative flex flex-col items-center gap-4 text-center">
        {stats.attemptsUsed <= 3 && <Confetti />}
        <p id={modalDescId} className="sr-only">Résumé de victoire et actions de partage.</p>

        {currentStreak > 0 && (
          <p className="text-2xl font-black font-title text-amber-400 animate-streak-bounce">
            🔥 {currentStreak}
          </p>
        )}

        <PerformanceBadge attemptsUsed={stats.attemptsUsed} />

        <div className="w-full film-border rounded-xl overflow-hidden">
          {result.photoUrl && (
            isWiki ? (
              <div className="flex h-48 w-full items-center justify-center bg-film-gray">
                <img src={result.photoUrl} alt={result.name} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <img src={result.photoUrl} alt={result.name} className="w-full aspect-video object-cover" />
            )
          )}
          <div className="p-3 text-left">
            <div className="flex items-start justify-between gap-2">
              <p className="font-title text-2xl sm:text-3xl font-black text-gradient-gold leading-tight">{result.name}</p>
              {learnMoreUrl && (
                <a href={learnMoreUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-film-text-dim hover:text-film-text transition-colors mt-0.5">
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {!isWiki && result.year && <Badge variant="muted">{result.year}</Badge>}
              {!isWiki && result.director && <Badge variant="muted">{result.director}</Badge>}
              {!isWiki && result.genres?.slice(0, 2).map((g) => (
                <Badge key={g} variant="gold">{g}</Badge>
              ))}
              {isWiki && result.personType && <Badge variant="gold">{result.personType}</Badge>}
            </div>
            {result.extract && (
              <p className="text-sm text-film-text-dim mt-2 line-clamp-3 text-left">{result.extract}</p>
            )}
            <p className="text-xs text-film-text-dim mt-2">
              {stats.attemptsUsed}/{stats.maxAttempts} essais · {stats.hintsRevealed} indice{stats.hintsRevealed !== 1 ? 's' : ''} utilisé{stats.hintsRevealed !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex gap-2 w-full">
          {onOpenStats && (
            <Button onClick={onOpenStats} variant="secondary" size="md" className="flex-1">
              <BarChart2 size={15} />
              Stats
            </Button>
          )}
          <Button onClick={onShare} variant="primary" size="md" className="flex-1">
            <Share2 size={15} />
            Partager
          </Button>
        </div>

        {onShareAll && (
          <Button onClick={onShareAll} variant="secondary" size="md" className="w-full">
            <Share2 size={15} />
            Partager les 3 jeux 🎬📺🏛️
          </Button>
        )}

        {unplayedModes && unplayedModes.length > 0 && (
          <div className="w-full">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-px bg-film-border" />
              <p className="text-xs text-film-text-dim shrink-0">Jouer aussi aujourd'hui</p>
              <div className="flex-1 h-px bg-film-border" />
            </div>
            <div className="flex gap-2">
              {unplayedModes.map(({ type, path }) => {
                const { label, icon: Icon } = MODE_META[type]
                return (
                  <a key={type} href={path} className="flex-1">
                    <Button variant="secondary" size="md" className="w-full">
                      <Icon size={14} />
                      {label}
                    </Button>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {!user && (
          <div className="w-full rounded-xl border border-film-gold/30 bg-film-gold/8 p-3 flex items-center gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-film-gold/15 flex items-center justify-center">
              <Flame size={15} className="text-film-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-film-text">
                {stats.attemptsUsed === 1
                  ? 'Coup de maître ! Sauvegarde cette performance.'
                  : currentStreak >= 3
                    ? `Série de ${currentStreak} jours 🔥 — ne la perds pas.`
                    : 'Sauvegarde tes stats sur un compte gratuit.'}
              </p>
              <p className="text-xs text-film-text-dim">Gratuit · synchronisé sur tous tes appareils.</p>
            </div>
            <button
              type="button"
              onClick={() => { onClose(); openAuth('register') }}
              className="shrink-0 text-xs font-semibold text-film-gold hover:underline cursor-pointer whitespace-nowrap flex items-center gap-1"
            >
              <UserCircle size={13} />
              Créer un compte
            </button>
          </div>
        )}

        {user && (
          <a href="/friends" className="w-full">
            <Button variant="secondary" size="md" className="w-full">
              <Users size={15} />
              Voir les scores de mes amis
            </Button>
          </a>
        )}

        <p className="text-xs font-semibold text-film-text-dim">
          Prochain défi dans <NextGameCountdown />
        </p>
      </div>
    </Modal>
  )
}

