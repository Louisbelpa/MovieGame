import { useNavigate } from 'react-router-dom'
import type { LandingStatsPayload } from '@/api/client'
import { GlyphC } from '@/components/hub/GlyphC'

const DECK_CARDS = [
  { game: 'serie' as const, cls: 'g-serie', name: 'SerieGuess', rot: -9, x: -150, y: 10, z: 1 },
  { game: 'face' as const, cls: 'g-face', name: 'FaceGuess', rot: 8, x: 150, y: 22, z: 2 },
  { game: 'film' as const, cls: 'g-film', name: 'FilmGuess', rot: -1, x: 0, y: -16, z: 3 },
]

const DECK_LIST = [
  { game: 'film' as const, name: 'FilmGuess', label: 'Le film du jour' },
  { game: 'serie' as const, name: 'SerieGuess', label: 'La série du jour' },
  { game: 'face' as const, name: 'FaceGuess', label: 'La personnalité du jour' },
]

const HOW_STEPS = [
  { cls: 'g-film', n: '1', h: 'Devine', p: 'Une image, une question. Tape ta réponse et valide — à toi de trouver le bon titre.' },
  { cls: 'g-serie', n: '2', h: 'Débloque des indices', p: 'Chaque essai raté révèle un indice. À toi de trouver avant la fin.' },
  { cls: 'g-face', n: '3', h: 'Compare & partage', p: 'Garde ta série en vie et défie tes amis sur le score du jour.' },
]

function LandingStats({ landing }: { landing: LandingStatsPayload | null }) {
  const players = landing
    ? (landing.playersPerDay > 1000 ? `${Math.round(landing.playersPerDay / 1000)}k` : landing.playersPerDay)
    : '—'

  return (
    <div className="cdy-landing-stats">
      <div>
        <b style={{ color: 'var(--coral)' }}>{landing ? landing.challengeDays : '—'}</b>
        <span>jours de défis</span>
      </div>
      <div>
        <b style={{ color: 'var(--grape)' }}>{players}</b>
        <span>joueurs / jour</span>
      </div>
      <div>
        <b style={{ color: 'var(--sky)' }}>3</b>
        <span>jeux · bientôt +</span>
      </div>
    </div>
  )
}

export function CandyLanding({
  landing,
  onRegister,
}: {
  landing: LandingStatsPayload | null
  onRegister: () => void
  onOpenMenu?: () => void
}) {
  const navigate = useNavigate()

  return (
    <div className="cdy-landing flex flex-col flex-1 min-h-0">
      <div className="cdy-landing-scroll flex-1 overflow-y-auto pb-20 lg:pb-0">
        <div className="cdy-hero">
          <div className="cdy-hero-copy">
            <span className="cdy-eyebrow">Le rendez-vous quotidien</span>
            <h1 className="cdy-h1">
              Trois devinettes.<br />
              Une par jour.<br />
              <span className="c1">Tout le monde</span> joue le <span className="c2">même défi.</span>
            </h1>
            <p className="cdy-sub">
              Films, séries, personnalités. 5 essais, des indices qui se dévoilent,
              et un score à comparer avec tes amis.
            </p>
            <div className="cdy-cta">
              <button type="button" onClick={onRegister} className="cdy-btn cdy-btn-lg cdy-btn-primary g-film">
                Créer un compte gratuit
              </button>
              <button type="button" onClick={() => navigate('/films')} className="cdy-btn cdy-btn-lg cdy-btn-soft">
                Voir le défi du jour
              </button>
            </div>
            <LandingStats landing={landing} />
          </div>

          <div className="cdy-deck" aria-hidden>
            {DECK_CARDS.map((d) => (
              <div
                key={d.game}
                className={`cdy-deckcard ${d.cls}`}
                style={{
                  transform: `translate(calc(-50% + ${d.x}px), calc(-50% + ${d.y}px)) rotate(${d.rot}deg)`,
                  zIndex: d.z,
                }}
              >
                <div className="dk-day cdy-mono">Défi #142</div>
                <div className="dk-ph"><GlyphC game={d.game} size={40} /></div>
                <div className="dk-name">{d.name}</div>
                <div className="dk-foot">5 essais · 3 indices</div>
              </div>
            ))}
          </div>
        </div>

        <div className="cdy-landing-deck-list">
          {DECK_LIST.map(({ game, name, label }) => (
            <div key={game} className={`cdy-landing-deck-item g-${game}`}>
              <span className="g"><GlyphC game={game} size={26} /></span>
              <div>
                <div className="n">{name}</div>
                <div className="s">{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="cdy-how">
          <div className="cdy-how-grid">
            {HOW_STEPS.map(({ cls, n, h, p }) => (
              <div key={n} className={`cdy-step ${cls}`}>
                <div className="n">{n}</div>
                <h4>{h}</h4>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
