import { Share2, XCircle, BarChart2, ExternalLink } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface LoseModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'film' | 'series' | 'wiki'
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
  onOpenStats?: () => void
  onPlayOtherMode?: () => void
}

function getPersonTypeLabel(personType?: string): string {
  switch (personType) {
    case 'sportsperson': return 'Sportif·ve'
    case 'artist': return 'Artiste'
    case 'scientist': return 'Scientifique'
    case 'entrepreneur': return 'Entrepreneur·e'
    case 'writer': return 'Ecrivain·e'
    case 'historical_figure': return 'Personnalite historique'
    case 'generic': return 'Personnalite'
    default: return 'Politicien·ne'
  }
}

export function LoseModal({ isOpen, onClose, mode, result, stats, onShare, onOpenStats, onPlayOtherMode }: LoseModalProps) {
  const isWiki = mode === 'wiki'
  const modalTitleId = 'modal-title'
  const modalDescId = 'modal-desc-lose'
  const tmdbUrl = !isWiki && result.tmdbId
    ? `https://www.themoviedb.org/${mode === 'series' ? 'tv' : 'movie'}/${result.tmdbId}`
    : null
  const personTypeLabel = getPersonTypeLabel(result.personType)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Défi échoué"
      ariaLabelledBy={modalTitleId}
      ariaDescribedBy={modalDescId}
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <p id={modalDescId} className="sr-only">
          Résumé de défaite et actions de partage.
        </p>
        <div className="w-16 h-16 rounded-full bg-film-red/10 border border-film-red/30 flex items-center justify-center">
          <XCircle size={32} className="text-film-red" />
        </div>

        <div>
          <p id={modalTitleId} className="text-film-text text-base font-semibold">Pas cette fois...</p>
          <p className="text-film-text-dim text-sm mt-0.5">
            {isWiki ? 'La personne etait...' : mode === 'series' ? 'La serie etait...' : 'Le film etait...'}
          </p>
        </div>

        <div className="w-full film-border rounded-xl overflow-hidden bg-film-black/40">
          {result.photoUrl &&
            (isWiki ? (
              <div className="flex h-60 sm:h-72 md:h-80 w-full items-center justify-center bg-film-black/70">
                <img
                  src={result.photoUrl}
                  alt={result.name}
                  className="max-h-full max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <img src={result.photoUrl} alt={result.name} className="w-full aspect-video object-cover" />
            ))}

          <div className="p-3 text-left">
            {isWiki && (
              <p className="text-xs uppercase tracking-wider text-film-text-dim mb-1">Article Wikipedia</p>
            )}
            <p className="font-title text-lg font-semibold text-film-text leading-tight">{result.name}</p>
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
              <p className="text-sm text-film-text-dim mt-2 line-clamp-4 text-left">
                {result.extract}
              </p>
            )}
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
        {onPlayOtherMode && (
          <Button variant="secondary" size="md" onClick={onPlayOtherMode} className="w-full">
            Essayer un autre mode
          </Button>
        )}

        <div className="text-sm text-film-text-dim">
          <p>Essais: {stats.attemptsUsed}/{stats.maxAttempts}</p>
          <p>Indices utilises: {stats.hintsRevealed}</p>
        </div>

        {(result.wikipediaUrl || tmdbUrl) && (
          <a
            href={result.wikipediaUrl ?? tmdbUrl ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-film-text-dim hover:text-film-text transition-colors"
          >
            <ExternalLink size={12} />
            {isWiki ? 'En savoir plus sur Wikipedia' : 'En savoir plus sur TMDB'}
          </a>
        )}
      </div>
    </Modal>
  )
}
