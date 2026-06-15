import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { TopNav } from '@/components/layout/TopNav'
import { Footer } from '@/components/layout/Footer'
import { GuestStrip } from '@/components/layout/GuestStrip'
import { useAuthStore } from '@/store/authStore'
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
  const modes = [
    { key: 'film' as const, label: 'FilmGuess', enabled: true },
    { key: 'series' as const, label: 'SerieGuess', enabled: FEATURES.enableSeries },
    { key: 'wiki' as const, label: 'FaceGuess', enabled: FEATURES.enableWiki },
  ].filter((m) => m.enabled)

  if (modes.length <= 1) return null

  return (
    <div className="cdy-seg stats-mode-seg">
      {modes.map(({ key, label }) => (
        <span key={key} className={mode === key ? 'on' : ''} onClick={() => setMode(key)}>
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
  const location = useLocation()
  const [mode, setMode] = useState<StatsMode>('film')
  const [globalStats, setGlobalStats] = useState<GlobalStatsPayload>(EMPTY_STATS)

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

      <main className="cdy-page stats-page">
        <div className="cdy-page-narrow">
          {!user && <GuestStrip />}

          <header className="stats-page-head">
            <h1 className="cdy-h1b stats-page-title">Les stats du jour 📊</h1>
            <p className="cdy-lead stats-page-lead">Comment tu as joué aujourd&apos;hui.</p>
          </header>

          <ModeSelector mode={mode} setMode={setMode} />

          <div className="cdy-stat-grid stats-tiles">
            {tiles.map(({ v, l }) => (
              <div key={l} className="cdy-stat-tile">
                <div className="v" style={{ color: accentColor }}>{v}</div>
                <div className="l">{l}</div>
              </div>
            ))}
          </div>

          <div className="stats-charts">
            <div className="cdy-card stats-chart-card">
              <h3>Mes tentatives</h3>
              <BarChart data={distData} maxVal={maxDist} color={accentColor} />
            </div>
            <div className="cdy-card stats-chart-card">
              <h3>Communauté ({globalStats.totalGames} parties)</h3>
              <BarChart data={communityDist} maxVal={maxCommunity} color={accentColor} />
            </div>
          </div>
        </div>
      </main>

      <div className="page-footer-desktop"><Footer /></div>
      <MobileTabBar activeTab="stats" />
    </div>
  )
}
