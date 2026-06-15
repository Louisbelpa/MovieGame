import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { TopNav } from '@/components/layout/TopNav'
import { Footer } from '@/components/layout/Footer'
import { useAuthStore } from '@/store/authStore'
import { useAuthModal } from '@/components/modals/AuthModal'
import { fetchGlobalStats } from '@/api/client'
import type { GlobalStatsPayload } from '@/api/client'
import { loadStats } from '@/lib/storage'
import { FEATURES } from '@/config/features'

type StatsMode = 'film' | 'series' | 'wiki'

const EMPTY_STATS: GlobalStatsPayload = {
  totalGames: 0, totalWins: 0, totalLosses: 0,
  winRate: 0, winsByAttempt: {}, lastUpdated: '',
}

function ModeSelector({ mode, setMode }: { mode: StatsMode; setMode: (m: StatsMode) => void }) {
  const allModes: Array<{ key: StatsMode; label: string; enabled: boolean }> = [
    { key: 'film',   label: 'FilmGuess',  enabled: true },
    { key: 'series', label: 'SerieGuess', enabled: FEATURES.enableSeries },
    { key: 'wiki',   label: 'FaceGuess',  enabled: FEATURES.enableWiki },
  ]
  const modes = allModes.filter((m) => m.enabled)

  if (modes.length <= 1) return null

  return (
    <div className="cdy-seg" style={{ alignSelf: 'flex-start' }}>
      {modes.map(({ key, label }) => (
        <span
          key={key}
          className={mode === key ? 'on' : ''}
          onClick={() => setMode(key)}
        >
          {label}
        </span>
      ))}
    </div>
  )
}

function BarChart({ data, maxVal, color }: { data: [string, number][]; maxVal: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map(([k, v]) => (
        <div key={k} className="cdy-bar-row">
          <span className="cdy-bar-key">{k}</span>
          <div className="cdy-bar-track">
            <div
              className="cdy-bar-fill"
              style={{
                width: maxVal > 0 ? `${Math.max(4, Math.round((v / maxVal) * 100))}%` : '4%',
                background: color,
              }}
            >
              {v > 0 ? v : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function StatsPage() {
  const user = useAuthStore((s) => s.user)
  const { open: openAuth } = useAuthModal()
  const location = useLocation()

  const [mode, setMode] = useState<StatsMode>('film')
  const [globalStats, setGlobalStats] = useState<GlobalStatsPayload>(EMPTY_STATS)

  // Derive mode from URL path
  useEffect(() => {
    if (location.pathname.includes('wiki')) setMode('wiki')
    else if (location.pathname.includes('series')) setMode('series')
    else setMode('film')
  }, [location.pathname])

  useEffect(() => {
    fetchGlobalStats().then(setGlobalStats).catch(() => setGlobalStats(EMPTY_STATS))
  }, [mode])

  const personal = loadStats(mode)
  const winRate = personal.gamesPlayed > 0
    ? Math.round((personal.gamesWon / personal.gamesPlayed) * 100)
    : 0

  const distData: [string, number][] = ([1, 2, 3, 4, 5] as const).map((k) => [
    String(k),
    personal.guessDistribution[k] ?? 0,
  ])
  const maxDist = Math.max(1, ...distData.map(([, v]) => v))

  const winsByAttempt = globalStats.winsByAttempt ?? {}
  const communityDist: [string, number][] = [1, 2, 3, 4, 5].map((k) => [String(k), winsByAttempt[k] ?? 0])
  const maxCommunity = Math.max(1, ...communityDist.map(([, v]) => v))

  const accentColor = mode === 'wiki' ? 'var(--sky)' : mode === 'series' ? 'var(--grape)' : 'var(--coral)'
  const gCls = mode === 'wiki' ? 'g-face' : mode === 'series' ? 'g-serie' : 'g-film'

  const tiles = [
    { v: personal.gamesPlayed, l: 'Parties jouées' },
    { v: `${winRate}%`, l: 'Taux de victoire' },
    { v: personal.currentStreak, l: 'Série en cours' },
    { v: personal.maxStreak, l: 'Meilleure série' },
  ]

  return (
    <div className={gCls} style={{ background: 'var(--bg)', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <TopNav />

      {/* Desktop layout */}
      <main className="cdy-page hidden lg:block" style={{ flex: 1 }}>
        <div className="cdy-page-narrow">
          {!user && (
            <div className="cdy-guest-strip">
              <span className="e">👤</span>
              <div>
                <div className="t">Connecte-toi pour sauvegarder tes stats</div>
                <div className="s">Tes stats actuelles sont locales à ce navigateur.</div>
              </div>
              <button type="button" onClick={() => openAuth('register')} className="cdy-btn cdy-btn-primary b" style={{ padding: '10px 18px', fontSize: 14 }}>
                Créer un compte
              </button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 26, marginBottom: 8 }}>
            <h1 className="cdy-h1b">Les stats du jour 📊</h1>
          </div>
          <p className="cdy-lead">Comment tu as joué aujourd'hui.</p>

          <ModeSelector mode={mode} setMode={setMode} />

          <div className="cdy-stat-grid" style={{ margin: '28px 0' }}>
            {tiles.map(({ v, l }) => (
              <div key={l} className="cdy-stat-tile">
                <div className="v" style={{ color: accentColor }}>{v}</div>
                <div className="l">{l}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
            <div className="cdy-card" style={{ padding: 26 }}>
              <h3 style={{ margin: '0 0 16px', fontWeight: 700, fontSize: 18 }}>Mes tentatives</h3>
              <BarChart data={distData} maxVal={maxDist} color={accentColor} />
            </div>
            <div className="cdy-card" style={{ padding: 26 }}>
              <h3 style={{ margin: '0 0 16px', fontWeight: 700, fontSize: 18 }}>Communauté ({globalStats.totalGames} parties)</h3>
              <BarChart data={communityDist} maxVal={maxCommunity} color={accentColor} />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile layout */}
      <div className="lg:hidden" style={{ flex: 1, paddingBottom: 80 }}>
        {!user && (
          <div className="cdym-guest-strip">
            <span className="e">👤</span>
            <div style={{ flex: 1 }}>
              <div className="t">Connecte-toi pour sauvegarder</div>
              <div className="s">Stats locales à ce navigateur</div>
            </div>
            <button type="button" onClick={() => openAuth('register')} className="cdy-btn cdy-btn-primary" style={{ padding: '9px 14px', fontSize: 13 }}>
              Compte
            </button>
          </div>
        )}

        <div style={{ padding: '16px 16px 0' }}>
          <h1 style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 24 }}>Stats 📊</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)' }}>Tes résultats aujourd'hui</p>
        </div>

        <div style={{ padding: '14px 16px 0' }}>
          <ModeSelector mode={mode} setMode={setMode} />
        </div>

        <div className="cdym-stat-grid" style={{ padding: '14px 16px 0' }}>
          {tiles.map(({ v, l }) => (
            <div key={l} className="cdym-stat-t">
              <div className="v" style={{ color: accentColor }}>{v}</div>
              <div className="l">{l}</div>
            </div>
          ))}
        </div>

        <div className="cdym-card-m">
          <h3>Mes tentatives</h3>
          <BarChart data={distData} maxVal={maxDist} color={accentColor} />
        </div>

        <div className="cdym-card-m">
          <h3>Communauté ({globalStats.totalGames} parties)</h3>
          <BarChart data={communityDist} maxVal={maxCommunity} color={accentColor} />
        </div>
      </div>

      <div className="hidden lg:block"><Footer /></div>
      <MobileTabBar activeTab="stats" />
    </div>
  )
}
