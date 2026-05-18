import { Share2, XCircle, BarChart2, ExternalLink, Film, Tv, User, UserCircle, Users } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/store/authStore'
import { useAuthModal } from '@/components/modals/AuthModal'
import { NextGameCountdown } from '@/components/modals/NextGameCountdown'

type GameMode = 'film' | 'series' | 'wiki'

const MODE_META: Record<GameMode, { label: string; icon: React.ElementType }> = {
  film: { label: 'Cinéma', icon: Film },
  series: { label: 'Séries', icon: Tv },
  wiki: { label: 'Personnalités', icon: User },
}

interface LoseModalProps {
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
    personType?: string
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

function getPersonTypeLabel(personType?: string): string {
  switch (personType) {
    case 'sportsperson': return 'Sportif·ve'
    case 'artist': return 'Artiste'
    case 'scientist': return 'Scientifique'
    case 'entrepreneur': return 'Entrepreneur·e'
    case 'writer': return 'Ecrivain·e'
    case 'historical_figure': return 'Personnalité historique'
    case 'generic': return 'Personnalité'
    default: return 'Politicien·ne'
  }
}

export function LoseModal({ isOpen, onClose, mode, result, stats, onShare, onShareAll, onOpenStats, unplayedModes }: LoseModalProps) {
  const isWiki = mode === 'wiki'
  const modalTitleId = 'modal-title'
  const modalDescId = 'modal-desc-lose'
  const user = useAuthStore((s) => s.user)
  const { open: openAuth } = useAuthModal()
  const tmdbUrl = !isWiki && result.tmdbId
    ? `https://www.themoviedb.org/${mode === 'series' ? 'tv' : 'movie'}/${result.tmdbId}`
    : null
  const learnMoreUrl = isWiki ? result.wikipediaUrl : tmdbUrl
  const personTypeLabel = getPersonTypeLabel(result.personType)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      headerContent={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-film-red/10 border border-film-red/30 flex items-center justify-center">
            <XCircle size={16} className="text-film-red" />
          </div>
          <span id={modalTitleId} className="font-title font-semibold text-film-text">Pas cette fois...</span>
        </div>
      }
      ariaLabelledBy={modalTitleId}
      ariaDescribedBy={modalDescId}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <p id={modalDescId} className="sr-only">Résumé de défaite et actions de partage.</p>

        <div className="w-full film-border rounded-xl overflow-hidden bg-film-black/40">
          {result.photoUrl && (
            isWiki ? (
              <div className="flex h-48 w-full items-center justify-center bg-film-black/70">
                <img src={result.photoUrl} alt={result.name} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <img src={result.photoUrl} alt={result.name} className="w-full aspect-video object-cover" />
            )
          )}
          <div className="p-3 text-left">
            <div className="flex items-start justify-between gap-2">
              <p className="font-title text-lg font-semibold text-film-text leading-tight">{result.name}</p>
              {learnMoreUrl && (
                <a href={learnMoreUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-film-text-dim hover:text-film-text transition-colors mt-0.5">
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {isWiki ? (
                <Badge variant="gold">{personTypeLabel}</Badge>
              ) : (
                <>
                  {result.year && <Badge variant="muted">{result.year}</Badge>}
                  {result.director && <Badge variant="muted">{result.director}</Badge>}
                  {result.genres?.slice(0, 2).map((genre) => (
                    <Badge key={genre} variant="amber">{genre}</Badge>
                  ))}
                </>
              )}
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
            <Button variant="secondary" size="md" onClick={onOpenStats} className="flex-1">
              <BarChart2 size={15} />
              Stats
            </Button>
          )}
          <Button variant="primary" size="md" onClick={onShare} className="flex-1">
            <Share2 size={15} />
            Partager
          </Button>
        </div>

        {onShareAll && (
          <Button variant="secondary" size="md" onClick={onShareAll} className="w-full">
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

        {user && (
          <a href="/friends" className="w-full">
            <Button variant="secondary" size="md" className="w-full">
              <Users size={15} />
              Voir les scores de mes amis
            </Button>
          </a>
        )}

        {!user && (
          <div className="w-full rounded-xl border border-film-border bg-white/[0.03] p-3 flex items-center gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
              <UserCircle size={15} className="text-film-text-dim" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-film-text">Protège ta progression</p>
              <p className="text-xs text-film-text-dim">Un compte gratuit sauvegarde tes stats et ta série.</p>
            </div>
            <button
              type="button"
              onClick={() => { onClose(); openAuth('register') }}
              className="shrink-0 text-xs font-semibold text-film-gold hover:underline cursor-pointer whitespace-nowrap"
            >
              Créer un compte
            </button>
          </div>
        )}

        <p className="text-xs text-film-text-dim">
          Prochain défi dans <NextGameCountdown />
        </p>
      </div>
    </Modal>
  )
}

