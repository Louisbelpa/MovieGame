import { FEATURES } from '@/config/features'
import { maxAttemptsForMode } from '@/lib/gameRules'
import { loadStats } from '@/lib/storage'
import { HubGameCard } from '@/components/hub/HubGameCard'
import { formatDateLong, type TodayStatus } from '@/components/hub/types'

interface CandyHubProps {
  user: { displayName: string; avatarUrl: string | null }
  today: string
  filmStatus: TodayStatus
  seriesStatus: TodayStatus
  wikiStatus: TodayStatus
  attemptsUsed: { film?: number; series?: number; wiki?: number }
  onShareDay: () => void
  shareCopied: boolean
}

export function CandyHub({
  user,
  today,
  filmStatus,
  seriesStatus,
  wikiStatus,
  attemptsUsed,
  onShareDay,
  shareCopied,
}: CandyHubProps) {
  const firstName = user.displayName.split(' ')[0]
  const maxStreak = Math.max(
    loadStats('film').currentStreak,
    FEATURES.enableWiki ? loadStats('wiki').currentStreak : 0,
    FEATURES.enableSeries ? loadStats('series').currentStreak : 0,
  )

  const modes = [
    { enabled: true, status: filmStatus },
    { enabled: FEATURES.enableSeries, status: seriesStatus },
    { enabled: FEATURES.enableWiki, status: wikiStatus },
  ].filter((m) => m.enabled)

  const doneCount = modes.filter((m) => m.status !== null).length
  const totalCount = modes.length
  const score = modes.filter((m) => m.status === 'won').length

  return (
    <div className="cdy-hub">
      <div className="cdy-hubhead">
        <div>
          <div className="cdy-hello">Salut {firstName} 👋</div>
          <div className="cdy-date cdy-mono">{formatDateLong(today)}</div>
        </div>
        {maxStreak > 0 && (
          <span className="cdy-streak cdy-hub-streak">
            🔥 {maxStreak} jour{maxStreak > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="cdy-daybar">
        <div>
          <div className="dd-title">
            {doneCount === totalCount ? 'Tous les défis terminés !' : 'Les défis du jour t\'attendent'}
          </div>
          <div className="dd-sub">Reviens chaque jour pour {totalCount} nouvelles devinettes.</div>
        </div>
        <div className="cdy-prog">
          <span className="dd-sub" style={{ fontWeight: 700, color: 'var(--ink)' }}>
            {doneCount} / {totalCount} terminé
          </span>
          <span className="cdy-progdots">
            {modes.map((m, i) => <i key={i} className={m.status !== null ? 'done' : ''} />)}
          </span>
        </div>
      </div>

      <div className="cdy-games">
        <HubGameCard
          href="/films"
          game="film"
          name="FilmGuess"
          label="Le film du jour"
          todayStatus={filmStatus}
          attemptsUsed={attemptsUsed.film}
        />
        {FEATURES.enableSeries ? (
          <HubGameCard
            href="/series"
            game="serie"
            name="SerieGuess"
            label="La série du jour"
            todayStatus={seriesStatus}
            attemptsUsed={attemptsUsed.series}
          />
        ) : (
          <HubGameCard
            href="/series"
            game="serie"
            name="SerieGuess"
            label="La série du jour"
            todayStatus={null}
            disabled
          />
        )}
        {FEATURES.enableWiki ? (
          <HubGameCard
            href="/wiki"
            game="face"
            name="FaceGuess"
            label="La personnalité du jour"
            todayStatus={wikiStatus}
            attemptsUsed={attemptsUsed.wiki}
            maxAttempts={maxAttemptsForMode('wiki')}
          />
        ) : (
          <HubGameCard
            href="/wiki"
            game="face"
            name="FaceGuess"
            label="La personnalité du jour"
            todayStatus={null}
            disabled
          />
        )}
      </div>

      <div className="cdy-summary">
        <div className="cdy-summary-score">
          <div className="sm-label cdy-mono">TON SCORE DU JOUR</div>
          <div className="sm-score">
            {score}
            <span style={{ fontSize: 26, color: 'var(--ink-3)', fontWeight: 400 }}> / {totalCount} jeux</span>
          </div>
        </div>
        <div className="cdy-summary-actions">
          {doneCount < totalCount && (
            <p className="cdy-summary-hint cdy-mono">
              Termine les {totalCount} pour partager ta journée
            </p>
          )}
          <button
            type="button"
            onClick={onShareDay}
            disabled={doneCount < totalCount}
            className="cdy-btn cdy-summary-share"
            style={{
              background: 'var(--mint)',
              color: '#fff',
              boxShadow: doneCount < totalCount ? 'none' : '0 6px 0 var(--mint-d)',
              padding: '14px 24px',
              fontSize: 15,
              opacity: doneCount < totalCount ? 0.45 : 1,
              cursor: doneCount < totalCount ? 'not-allowed' : 'pointer',
            }}
          >
            {shareCopied ? '✓ Copié !' : 'Partager ma journée'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function CandyHubSkeleton() {
  const block = 'animate-pulse'
  const bg = { background: 'var(--line)', borderRadius: 12 }
  return (
    <div className="cdy-hub" aria-busy="true" aria-label="Chargement">
      <div className="cdy-hubhead">
        <div>
          <div className={block} style={{ ...bg, width: 180, height: 28, marginBottom: 10 }} />
          <div className={block} style={{ ...bg, width: 220, height: 18 }} />
        </div>
      </div>
      <div className="cdy-daybar">
        <div className={block} style={{ ...bg, width: '60%', height: 48 }} />
      </div>
      <div className="cdy-games">
        {[0, 1, 2].map((i) => (
          <div key={i} className={block} style={{ ...bg, minHeight: 220, borderRadius: 20 }} />
        ))}
      </div>
    </div>
  )
}
