import { useEffect, useState } from 'react'
import { Smartphone } from 'lucide-react'
import { Footer } from '@/components/layout/Footer'
import { AuthModal, useAuthModal } from '@/components/modals/AuthModal'
import { FEATURES, IOS_APP_STORE_URL } from '@/config/features'
import { useAuthStore } from '@/store/authStore'
import { loadStats, loadHistory, setHistoryEntry } from '@/lib/storage'
import { fetchChallenge, fetchGlobalStats } from '@/api/client'
import { fetchWikiChallenge } from '@/api/wikiClient'
import {
  NewModesAnnouncementModal,
  NEW_MODES_ANNOUNCEMENT_STORAGE_KEY,
  type NewModesAnnouncementVariant,
} from '@/components/modals/NewModesAnnouncementModal'
import { MockDataBanner } from '@/components/dev/MockDataBanner'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
}

function formatDateLong(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  })
}


type TodayStatus = 'won' | 'lost' | null

function outcomeFromChallenge(p: { isGameOver: boolean; outcome: 'won' | 'lost' | null }): TodayStatus {
  if (!p.isGameOver || p.outcome == null) return null
  return p.outcome
}

// ─── Glyph SVG icons (exact replicas from candy-screens.jsx) ─────────────────

function GlyphC({ game, size = 26 }: { game: 'film' | 'serie' | 'face'; size?: number }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (game === 'film')  return <svg width={size} height={size} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2.5" {...s} /><path d="M3 9h18M3 15h18M8 4v16M16 4v16" {...s} /></svg>
  if (game === 'serie') return <svg width={size} height={size} viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2.5" {...s} /><path d="M8 3l4 4 4-4" {...s} /></svg>
  if (game === 'face')  return <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="9" r="4" {...s} /><path d="M5 20c0-3.8 3.1-6.2 7-6.2s7 2.4 7 6.2" {...s} /></svg>
  return null
}

// ─── Nav (homepage — Landing + Hub) ──────────────────────────────────────────

function HomeNav() {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const { open: openAuth } = useAuthModal()
  const maxStreak = Math.max(
    loadStats('film').currentStreak,
    FEATURES.enableWiki   ? loadStats('wiki').currentStreak   : 0,
    FEATURES.enableSeries ? loadStats('series').currentStreak : 0,
  )

  return (
    <header className="cdy-nav">
      {/* Logo */}
      <a href="/" className="cdy-logo" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
        <span className="cdy-die">?</span>
        <span>Guess<span style={{ color: 'var(--coral)' }}>Today</span></span>
      </a>

      {/* Navlinks (connecté, desktop only) */}
      {!isLoading && user && (
        <nav className="cdy-navlinks hidden lg:flex">
          <a href="/"         className="cdy-navlink on">Jeux du jour</a>
          <a href="/profile"  className="cdy-navlink">Stats</a>
          <a href="/friends"  className="cdy-navlink">Classement</a>
          <a href="/friends"  className="cdy-navlink">Amis</a>
        </nav>
      )}

      <span className="cdy-spacer" />

      {/* Right */}
      {isLoading ? (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--line)' }} />
      ) : user ? (
        <>
          {maxStreak > 0 && (
            <span className="cdy-streak">🔥 {maxStreak} jour{maxStreak > 1 ? 's' : ''}</span>
          )}
          <a href="/profile" className="cdy-avatar"
            style={{ background: 'var(--grape)', boxShadow: '0 3px 0 var(--grape-d)', textDecoration: 'none', fontSize: 14 }}>
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt={user.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : user.displayName.charAt(0).toUpperCase()}
          </a>
        </>
      ) : (
        <>
          <button type="button" onClick={() => openAuth('login')} className="cdy-navlink"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Fredoka, sans-serif', fontSize: 15 }}>
            Se connecter
          </button>
          <button type="button" onClick={() => openAuth('register')} className="cdy-btn cdy-btn-primary g-film"
            style={{ padding: '10px 20px', fontSize: 14 }}>
            Créer un compte
          </button>
        </>
      )}
    </header>
  )
}

// ─── Landing (non-connecté) ───────────────────────────────────────────────────

const DECK_CARDS = [
  { game: 'serie' as const, cls: 'g-serie', name: 'SerieGuess', rot: -9, x: -150, y: 10, z: 1 },
  { game: 'face'  as const, cls: 'g-face',  name: 'FaceGuess',  rot: 8,  x: 150,  y: 22, z: 2 },
  { game: 'film'  as const, cls: 'g-film',  name: 'FilmGuess',  rot: -1, x: 0,    y: -16, z: 3 },
]

const HOW_STEPS = [
  { cls: 'g-film',  n: '1', h: 'Devine', p: "Une image, une question. Tape ta réponse — l'autocomplétion t'aide à viser juste." },
  { cls: 'g-serie', n: '2', h: 'Débloque des indices', p: 'Chaque essai raté révèle un indice. À toi de trouver avant la fin.' },
  { cls: 'g-face',  n: '3', h: 'Compare & partage', p: 'Garde ta série en vie et défie tes amis sur le score du jour.' },
]

function CandyLanding({ communityCount, onRegister }: { communityCount: number | null; onRegister: () => void }) {
  return (
    <>
      {/* Hero — 2 colonnes */}
      <div className="cdy-hero">
        {/* Colonne texte */}
        <div>
          <span className="cdy-eyebrow">🎬 Le rendez-vous quotidien</span>
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
            <a href="/films" className="cdy-btn cdy-btn-lg cdy-btn-soft" style={{ textDecoration: 'none' }}>
              Voir le défi du jour
            </a>
          </div>
          <div className="cdy-stats">
            <div className="cdy-stat">
              <b style={{ color: 'var(--coral)' }}>142</b>
              <span>jours de défis</span>
            </div>
            <div className="cdy-stat">
              <b style={{ color: 'var(--grape)' }}>{communityCount && communityCount > 1000 ? `${Math.round(communityCount / 1000)}k` : '28k'}</b>
              <span>joueurs / jour</span>
            </div>
            <div className="cdy-stat">
              <b style={{ color: 'var(--sky)' }}>3</b>
              <span>jeux · bientôt +</span>
            </div>
          </div>
        </div>

        {/* Colonne deck de cartes */}
        <div className="cdy-deck">
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

      {/* Comment jouer */}
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
    </>
  )
}

// ─── Game card Hub (structure exacte CandyHub / cdy-gamecard) ─────────────────

interface HubGameCardProps {
  href: string
  game: 'film' | 'serie' | 'face'
  name: string
  label: string
  todayStatus: TodayStatus
  imageUrl?: string | null
  attemptsUsed?: number
  maxAttempts?: number
  disabled?: boolean
}

function HubGameCard({ href, game, name, label, todayStatus, imageUrl, attemptsUsed, maxAttempts = 5, disabled }: HubGameCardProps) {
  const cls = game === 'film' ? 'g-film' : game === 'serie' ? 'g-serie' : 'g-face'
  const isWon  = todayStatus === 'won'
  const isLost = todayStatus === 'lost'
  const done   = isWon || isLost

  const Tag = disabled ? 'div' : 'a'
  const tagProps = disabled ? {} : { href }

  return (
    <Tag {...tagProps} className={`cdy-gamecard ${cls}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>
      {/* Top coloré */}
      <div className="cdy-gc-top">
        <div className="cdy-gc-glyph">
          <GlyphC game={game} size={26} />
        </div>
        <div className="cdy-gc-name">{name}</div>
        <div className="cdy-gc-label">{label}</div>
      </div>

      {/* Image / placeholder */}
      <div className={`cdy-gc-img${!imageUrl && !done ? ' locked' : ''}`}
        style={{ position: 'relative', overflow: 'hidden' }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            aria-hidden
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(7px)', transform: 'scale(1.06)' }}
          />
        ) : null}
        {done && !imageUrl && <span style={{ fontSize: 28, opacity: .45 }}>🎬</span>}
      </div>

      {/* Corps blanc */}
      <div className="cdy-gc-body">
        {done ? (
          <>
            <div className={`cdy-gc-status ${isWon ? 'done' : 'todo'}`}>
              <span className="tk">{isWon ? '✓' : '✕'}</span>
              {isWon
                ? `Trouvé en ${attemptsUsed ?? '?'}/${maxAttempts}`
                : `Perdu (${maxAttempts}/${maxAttempts})`}
              {isWon && attemptsUsed && (
                <span className="cdy-dots" style={{ marginLeft: 'auto' }}>
                  {Array.from({ length: maxAttempts }).map((_, i) => (
                    <i key={i} className={
                      i < (attemptsUsed - 1) ? 'w' :
                      i === (attemptsUsed - 1) ? 'g' : ''
                    } />
                  ))}
                </span>
              )}
            </div>
            <button type="button" className="cdy-btn cdy-btn-soft" style={{ width: '100%' }}
              onClick={(e) => { e.preventDefault(); window.location.href = href }}>
              Voir le résultat
            </button>
          </>
        ) : disabled ? (
          <>
            <div className="cdy-gc-status todo"><span className="tk">·</span> Bientôt disponible</div>
            <button type="button" className="cdy-btn cdy-btn-soft" style={{ width: '100%', opacity: .5 }} disabled>
              Non disponible
            </button>
          </>
        ) : (
          <>
            <div className="cdy-gc-status todo"><span className="tk">·</span> Pas encore joué</div>
            <button type="button" className="cdy-btn cdy-btn-primary" style={{ width: '100%' }}>
              Jouer maintenant →
            </button>
          </>
        )}
      </div>
    </Tag>
  )
}

// ─── Hub (connecté) ───────────────────────────────────────────────────────────

interface HubProps {
  user: { displayName: string; avatarUrl: string | null }
  today: string
  filmStatus: TodayStatus
  seriesStatus: TodayStatus
  wikiStatus: TodayStatus
  imageUrls: { film?: string; series?: string; wiki?: string }
  attemptsUsed: { film?: number; series?: number; wiki?: number }
  onShareDay: () => void
}

function CandyHub({ user, today, filmStatus, seriesStatus, wikiStatus, imageUrls, attemptsUsed, onShareDay }: HubProps) {
  const firstName = user.displayName.split(' ')[0]
  const maxStreak = Math.max(
    loadStats('film').currentStreak,
    FEATURES.enableWiki   ? loadStats('wiki').currentStreak   : 0,
    FEATURES.enableSeries ? loadStats('series').currentStreak : 0,
  )

  const modes = [
    { enabled: true,                 status: filmStatus,   label: '🎬' },
    { enabled: FEATURES.enableSeries, status: seriesStatus, label: '📺' },
    { enabled: FEATURES.enableWiki,   status: wikiStatus,   label: '🧑' },
  ].filter(m => m.enabled)

  const doneCount = modes.filter(m => m.status !== null).length
  const totalCount = modes.length

  const score = modes.filter(m => m.status === 'won').length

  return (
    <div className="cdy-hub">
      {/* En-tête */}
      <div className="cdy-hubhead">
        <div>
          <div className="cdy-hello">Salut {firstName} 👋</div>
          <div className="cdy-date cdy-mono">{formatDateLong(today)}</div>
        </div>
        {maxStreak > 0 && (
          <span className="cdy-streak" style={{ fontSize: 17, padding: '11px 18px' }}>
            🔥 {maxStreak} jour{maxStreak > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Barre de progression du jour */}
      <div className="cdy-daybar">
        <div>
          <div className="dd-title">
            {doneCount === totalCount ? 'Tous les défis terminés !' : 'Les défis du jour t\'attendent'}
          </div>
          <div className="dd-sub">Reviens chaque jour pour {totalCount} nouvelles devinettes.</div>
        </div>
        <div className="cdy-prog">
          <span className="dd-sub" style={{ fontWeight: 700, color: 'var(--ink)' }}>{doneCount} / {totalCount} terminé</span>
          <span className="cdy-progdots">
            {modes.map((m, i) => <i key={i} className={m.status !== null ? 'done' : ''} />)}
          </span>
        </div>
      </div>

      {/* Grille 3 game cards */}
      <div className="cdy-games">
        <HubGameCard
          href="/films"
          game="film"
          name="FilmGuess"
          label="Le film du jour"
          todayStatus={filmStatus}
          imageUrl={imageUrls.film}
          attemptsUsed={attemptsUsed.film}
        />
        {FEATURES.enableSeries ? (
          <HubGameCard
            href="/series"
            game="serie"
            name="SerieGuess"
            label="La série du jour"
            todayStatus={seriesStatus}
            imageUrl={imageUrls.series}
            attemptsUsed={attemptsUsed.series}
          />
        ) : (
          <HubGameCard href="/series" game="serie" name="SerieGuess" label="La série du jour" todayStatus={null} disabled />
        )}
        {FEATURES.enableWiki ? (
          <HubGameCard
            href="/wiki"
            game="face"
            name="FaceGuess"
            label="La personnalité du jour"
            todayStatus={wikiStatus}
            imageUrl={imageUrls.wiki}
            attemptsUsed={attemptsUsed.wiki}
          />
        ) : (
          <HubGameCard href="/wiki" game="face" name="FaceGuess" label="La personnalité du jour" todayStatus={null} disabled />
        )}
      </div>

      {/* Score du jour récap */}
      <div className="cdy-summary">
        <div>
          <div className="sm-label cdy-mono">TON SCORE DU JOUR</div>
          <div className="sm-score">
            {score}
            <span style={{ fontSize: 26, color: 'var(--ink-3)', fontWeight: 400 }}> / {totalCount} jeux</span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center' }}>
          {doneCount < totalCount && (
            <span className="cdy-mono" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              Termine les {totalCount} pour partager ta journée
            </span>
          )}
          <button
            type="button"
            onClick={onShareDay}
            className="cdy-btn"
            style={{ background: 'var(--mint)', color: '#fff', boxShadow: '0 6px 0 var(--mint-d)', padding: '14px 24px', fontSize: 15 }}
          >
            Partager ma journée
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── iOS banner ───────────────────────────────────────────────────────────────

function IosBanner() {
  if (!FEATURES.enableIosBanner) return null
  return (
    <div style={{ padding: '0 32px 32px' }}>
      <a href={IOS_APP_STORE_URL} target="_blank" rel="noopener noreferrer"
        className="cdy-card" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: 20, textDecoration: 'none' }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--coral-soft)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Smartphone size={24} style={{ color: 'var(--coral)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>GuessToday sur iOS</p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>Application native — notifications quotidiennes — gratuit</p>
        </div>
        <img src="/app-store-badge-fr.svg" alt="App Store" height={38} style={{ flexShrink: 0 }} />
      </a>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function HomePage() {
  const [announcementVariant, setAnnouncementVariant] = useState<NewModesAnnouncementVariant | null>(null)
  const [serverToday, setServerToday] = useState<{ film: TodayStatus; series: TodayStatus; wiki: TodayStatus } | null>(null)
  const [imageUrls,    setImageUrls]    = useState<{ film?: string; series?: string; wiki?: string }>({})
  const [attemptsUsed, setAttemptsUsed] = useState<{ film?: number; series?: number; wiki?: number }>({})
  const [communityCount, setCommunityCount] = useState<number | null>(null)

  const fetchMe = useAuthStore((s) => s.fetchMe)
  const user    = useAuthStore((s) => s.user)
  const { open: openAuth } = useAuthModal()

  const today       = getTodayParis()
  const localFilm   = loadHistory('film')[today]   ?? null
  const localSeries = loadHistory('series')[today] ?? null
  const localWiki   = loadHistory('wiki')[today]   ?? null

  const filmStatus:   TodayStatus = serverToday?.film   ?? localFilm
  const seriesStatus: TodayStatus = serverToday?.series ?? localSeries
  const wikiStatus:   TodayStatus = serverToday?.wiki   ?? localWiki

  useEffect(() => { void fetchMe() }, [fetchMe])

  // Sync today's statuses from server (connecté)
  useEffect(() => {
    if (!user) { setServerToday(null); return }
    let cancelled = false
    async function sync() {
      const [fr, sr, wr] = await Promise.allSettled([
        fetchChallenge('film'),
        FEATURES.enableSeries ? fetchChallenge('series') : Promise.resolve(null),
        FEATURES.enableWiki   ? fetchWikiChallenge()     : Promise.resolve(null),
      ])
      if (cancelled) return
      const film   = fr.status === 'fulfilled' ? outcomeFromChallenge(fr.value) : null
      const series = sr.status === 'fulfilled' && sr.value ? outcomeFromChallenge(sr.value) : null
      const wiki   = wr.status === 'fulfilled' && wr.value ? outcomeFromChallenge(wr.value) : null
      setServerToday({ film, series, wiki })
      setImageUrls({
        film:   fr.status === 'fulfilled' ? fr.value.imageUrl : undefined,
        series: sr.status === 'fulfilled' && sr.value ? sr.value.imageUrl : undefined,
        wiki:   wr.status === 'fulfilled' && wr.value ? (wr.value as { imageUrl?: string }).imageUrl : undefined,
      })
      // Attempts used (from challenge guesses array length when won)
      setAttemptsUsed({
        film:   fr.status === 'fulfilled' && film === 'won' ? (fr.value as unknown as { attempts?: unknown[] }).attempts?.length : undefined,
        series: sr.status === 'fulfilled' && sr.value && series === 'won' ? (sr.value as unknown as { attempts?: unknown[] }).attempts?.length : undefined,
        wiki:   wr.status === 'fulfilled' && wr.value && wiki === 'won' ? (wr.value as unknown as { attempts?: unknown[] }).attempts?.length : undefined,
      })
      if (film)   setHistoryEntry(today, film,   'film')
      if (series) setHistoryEntry(today, series, 'series')
      if (wiki)   setHistoryEntry(today, wiki,   'wiki')
    }
    void sync()
    return () => { cancelled = true }
  }, [user, today])

  // Fetch images for guests
  useEffect(() => {
    if (user) return
    Promise.allSettled([
      fetchChallenge('film'),
      FEATURES.enableWiki   ? fetchWikiChallenge()     : Promise.resolve(null),
      FEATURES.enableSeries ? fetchChallenge('series') : Promise.resolve(null),
    ]).then(([fr, wr, sr]) => {
      setImageUrls({
        film:   fr.status === 'fulfilled' ? fr.value.imageUrl : undefined,
        wiki:   wr.status === 'fulfilled' && wr.value ? (wr.value as { imageUrl?: string }).imageUrl : undefined,
        series: sr.status === 'fulfilled' && sr.value ? sr.value.imageUrl : undefined,
      })
    }).catch(() => {})
    fetchGlobalStats().then((s) => setCommunityCount(s.totalGames)).catch(() => {})
  }, [user])

  useEffect(() => {
    try {
      if (localStorage.getItem(NEW_MODES_ANNOUNCEMENT_STORAGE_KEY)) return
      if (FEATURES.enableSeries && FEATURES.enableWiki) setAnnouncementVariant('both')
      else if (FEATURES.enableSeries) setAnnouncementVariant('series')
      else if (FEATURES.enableWiki)   setAnnouncementVariant('wiki')
    } catch {}
  }, [])

  function handleShareDay() {
    // TODO: partage journée complète
    navigator.clipboard?.writeText(`GuessToday — ${today}`).catch(() => {})
  }

  return (
    <div className="cdy" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <HomeNav />

      {user ? (
        /* ── Hub connecté (CandyHub) ── */
        <CandyHub
          user={user}
          today={today}
          filmStatus={filmStatus}
          seriesStatus={seriesStatus}
          wikiStatus={wikiStatus}
          imageUrls={imageUrls}
          attemptsUsed={attemptsUsed}
          onShareDay={handleShareDay}
        />
      ) : (
        /* ── Landing non-connecté (CandyLanding) ── */
        <CandyLanding
          communityCount={communityCount}
          onRegister={() => openAuth('register')}
        />
      )}

      <IosBanner />
      <Footer />
      <AuthModal />

      {announcementVariant && (
        <NewModesAnnouncementModal isOpen onClose={() => setAnnouncementVariant(null)} variant={announcementVariant} />
      )}
      <MockDataBanner />
    </div>
  )
}
