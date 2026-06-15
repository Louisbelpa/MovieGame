import { useEffect, useState } from 'react'
import { Smartphone } from 'lucide-react'
import { Footer } from '@/components/layout/Footer'
import { CandyNav } from '@/components/layout/CandyNav'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { MobileDrawer } from '@/components/layout/MobileDrawer'
import { useAuthModal } from '@/components/modals/AuthModal'
import { FEATURES, IOS_APP_STORE_URL } from '@/config/features'
import { useAuthStore } from '@/store/authStore'
import { maxAttemptsForMode } from '@/lib/gameRules'
import { loadHistory, loadGameState, setHistoryEntry } from '@/lib/storage'
import { buildAllShareText, type AllShareGame } from '@/lib/utils'
import { nativeShare } from '@/lib/share'
import type { GuessEntry } from '@/types'
import { fetchChallenge, fetchLandingStats, type LandingStatsPayload } from '@/api/client'
import { fetchWikiChallenge } from '@/api/wikiClient'
import {
  NewModesAnnouncementModal,
  NEW_MODES_ANNOUNCEMENT_STORAGE_KEY,
  type NewModesAnnouncementVariant,
} from '@/components/modals/NewModesAnnouncementModal'
import { MockDataBanner } from '@/components/dev/MockDataBanner'
import { CandyLanding } from '@/components/hub/CandyLanding'
import { CandyHub, CandyHubSkeleton } from '@/components/hub/CandyHub'
import { getTodayParis, type TodayStatus } from '@/components/hub/types'

function outcomeFromChallenge(p: { isGameOver: boolean; outcome: 'won' | 'lost' | null }): TodayStatus {
  if (!p.isGameOver || p.outcome == null) return null
  return p.outcome
}

function IosBanner() {
  if (!FEATURES.enableIosBanner) return null
  return (
    <div style={{ padding: '0 32px 32px' }}>
      <a
        href={IOS_APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="cdy-card"
        style={{ display: 'flex', alignItems: 'center', gap: 18, padding: 20, textDecoration: 'none' }}
      >
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

export function HomePage() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [announcementVariant, setAnnouncementVariant] = useState<NewModesAnnouncementVariant | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [serverToday, setServerToday] = useState<{ film: TodayStatus; series: TodayStatus; wiki: TodayStatus } | null>(null)
  const [attemptsUsed, setAttemptsUsed] = useState<{ film?: number; series?: number; wiki?: number }>({})
  const [landingStats, setLandingStats] = useState<LandingStatsPayload | null>(null)

  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const { open: openAuth } = useAuthModal()

  const today = getTodayParis()
  const filmStatus: TodayStatus = serverToday?.film ?? loadHistory('film')[today] ?? null
  const seriesStatus: TodayStatus = serverToday?.series ?? loadHistory('series')[today] ?? null
  const wikiStatus: TodayStatus = serverToday?.wiki ?? loadHistory('wiki')[today] ?? null

  useEffect(() => {
    if (!user) { setServerToday(null); return }
    let cancelled = false
    async function sync() {
      const [fr, sr, wr] = await Promise.allSettled([
        fetchChallenge('film'),
        FEATURES.enableSeries ? fetchChallenge('series') : Promise.resolve(null),
        FEATURES.enableWiki ? fetchWikiChallenge() : Promise.resolve(null),
      ])
      if (cancelled) return
      const film = fr.status === 'fulfilled' ? outcomeFromChallenge(fr.value) : null
      const series = sr.status === 'fulfilled' && sr.value ? outcomeFromChallenge(sr.value) : null
      const wiki = wr.status === 'fulfilled' && wr.value ? outcomeFromChallenge(wr.value) : null
      setServerToday({ film, series, wiki })
      setAttemptsUsed({
        film: fr.status === 'fulfilled' && film === 'won' ? (fr.value as unknown as { attempts?: unknown[] }).attempts?.length : undefined,
        series: sr.status === 'fulfilled' && sr.value && series === 'won' ? (sr.value as unknown as { attempts?: unknown[] }).attempts?.length : undefined,
        wiki: wr.status === 'fulfilled' && wr.value && wiki === 'won' ? (wr.value as unknown as { attempts?: unknown[] }).attempts?.length : undefined,
      })
      if (film) setHistoryEntry(today, film, 'film')
      if (series) setHistoryEntry(today, series, 'series')
      if (wiki) setHistoryEntry(today, wiki, 'wiki')
    }
    void sync()
    return () => { cancelled = true }
  }, [user, today])

  useEffect(() => {
    if (isLoading || user) return
    fetchLandingStats().then(setLandingStats).catch(() => {})
  }, [user, isLoading])

  useEffect(() => {
    try {
      if (localStorage.getItem(NEW_MODES_ANNOUNCEMENT_STORAGE_KEY)) return
      if (FEATURES.enableSeries && FEATURES.enableWiki) setAnnouncementVariant('both')
      else if (FEATURES.enableSeries) setAnnouncementVariant('series')
      else if (FEATURES.enableWiki) setAnnouncementVariant('wiki')
    } catch {}
  }, [])

  async function handleShareDay() {
    const order = [
      { type: 'film' as const, enabled: true, status: filmStatus, attempts: attemptsUsed.film },
      { type: 'series' as const, enabled: FEATURES.enableSeries, status: seriesStatus, attempts: attemptsUsed.series },
      { type: 'wiki' as const, enabled: FEATURES.enableWiki, status: wikiStatus, attempts: attemptsUsed.wiki },
    ]
    const games: AllShareGame[] = order.filter((m) => m.enabled).flatMap((m) => {
      const local = loadGameState(m.type)
      if (local && local.challengeId === today && (local.status === 'won' || local.status === 'lost')) {
        return [{ mode: m.type, guesses: local.guesses, won: local.status === 'won', maxAttempts: maxAttemptsForMode(m.type) }]
      }
      if (m.status === 'won' || m.status === 'lost') {
        const won = m.status === 'won'
        const max = maxAttemptsForMode(m.type)
        const n = won ? Math.min(max, Math.max(1, m.attempts ?? 1)) : max
        const guesses: GuessEntry[] = Array.from({ length: n }, (_, i) => ({
          value: '',
          status: won && i === n - 1 ? 'correct' : 'wrong',
          timestamp: 0,
        }))
        return [{ mode: m.type, guesses, won, maxAttempts: max }]
      }
      return []
    })
    if (games.length === 0) return
    const result = await nativeShare(buildAllShareText(today, games))
    if (result === 'copied') {
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    }
  }

  return (
    <div className="cdy" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <CandyNav active="jeux" onOpenMenu={() => setDrawerOpen(true)} />

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-20 lg:pb-0 lg:overflow-visible">
        {isLoading ? (
          <CandyHubSkeleton />
        ) : user ? (
          <CandyHub
            user={user}
            today={today}
            filmStatus={filmStatus}
            seriesStatus={seriesStatus}
            wikiStatus={wikiStatus}
            attemptsUsed={attemptsUsed}
            onShareDay={handleShareDay}
            shareCopied={shareCopied}
          />
        ) : (
          <CandyLanding
            landing={landingStats}
            onRegister={() => openAuth('register')}
          />
        )}
      </div>

      <div className="page-footer-desktop">
        <IosBanner />
        <Footer />
      </div>

      <MobileTabBar activeTab="games" />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {announcementVariant && (
        <NewModesAnnouncementModal isOpen onClose={() => setAnnouncementVariant(null)} variant={announcementVariant} />
      )}
      <MockDataBanner />
    </div>
  )
}
