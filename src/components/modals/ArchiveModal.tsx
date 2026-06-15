/**
 * modals/ArchiveModal.tsx
 * Candy design:
 *   Mobile  → plein écran slide-up (cdym-arch-head + cdym-arch-month + grille + légende)
 *   Desktop → carte centrée (cdy-archive-head + cdy-archive-body)
 */

import { useEffect, useLayoutEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useGameStore, getTodayParis } from '@/store/gameStore'
import { fetchChallengeDates, authGetHistory } from '@/api/client'
import { fetchWikiChallengeDates } from '@/api/wikiClient'
import { useWikiStore } from '@/store/wikiStore'
import { useAuthStore } from '@/store/authStore'
import { loadHistory, loadStats } from '@/lib/storage'
import { FEATURES } from '@/config/features'

type DayStatus = 'won' | 'lost' | 'available' | 'none'
type ModeKey = 'film' | 'series' | 'wiki'

function weekdayOffset(iso: string): number {
  const dow = new Date(iso + 'T12:00:00Z').getUTCDay()
  return dow === 0 ? 6 : dow - 1
}

function daysForMonth(ym: string): string[] {
  const [y, m] = ym.split('-').map(Number)
  const count = new Date(y, m, 0).getDate()
  return Array.from({ length: count }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`)
}

function prevMonth(ym: string): string {
  let [y, m] = ym.split('-').map(Number)
  m--
  if (m === 0) { m = 12; y-- }
  return `${y}-${String(m).padStart(2, '0')}`
}

function nextMonth(ym: string): string {
  let [y, m] = ym.split('-').map(Number)
  m++
  if (m === 13) { m = 1; y++ }
  return `${y}-${String(m).padStart(2, '0')}`
}

function monthLabel(ym: string): string {
  const s = new Date(`${ym}-01T12:00:00Z`).toLocaleDateString('fr-FR', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const DOW_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

type ArchiveMode = 'classic' | 'wiki'

type ArchiveModalProps = {
  mode?: ArchiveMode
  challenges?: string[]
}

export function ArchiveModal({ mode = 'classic', challenges }: ArchiveModalProps) {
  const gameUi          = useGameStore((s) => s.ui)
  const gameCloseModal  = useGameStore((s) => s.closeModal)
  const gameLoadDate    = useGameStore((s) => s.loadDate)
  const gameViewingDate = useGameStore((s) => s.viewingDate)
  const gameType        = useGameStore((s) => s.gameType)

  const wikiUi          = useWikiStore((s) => s.ui)
  const wikiCloseModal  = useWikiStore((s) => s.closeModal)
  const wikiLoadDate    = useWikiStore((s) => s.loadDate)
  const wikiViewingDate = useWikiStore((s) => s.viewingDate)

  const user = useAuthStore((s) => s.user)

  const isWiki    = mode === 'wiki'
  const isOpen    = isWiki
    ? (wikiUi.isModalOpen && wikiUi.modalType === 'archive')
    : (gameUi.isModalOpen && gameUi.modalType === 'archive')
  const closeModal = isWiki ? wikiCloseModal : gameCloseModal
  const loadDate   = isWiki ? wikiLoadDate   : gameLoadDate
  const viewingDate = isWiki ? wikiViewingDate : gameViewingDate

  const [challengeDates, setChallengeDates] = useState<Set<string>>(new Set())
  const [historyByMode, setHistoryByMode] = useState<Record<ModeKey, Record<string, 'won' | 'lost'>>>({
    film: {}, series: {}, wiki: {},
  })
  const [loading, setLoading]               = useState(false)
  const [isDesktop, setIsDesktop]           = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  )

  useLayoutEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const today   = getTodayParis()
  const todayYM = today.slice(0, 7)
  const [displayYM, setDisplayYM] = useState(todayYM)

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else        document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, closeModal])

  useEffect(() => {
    if (!isOpen) return
    setDisplayYM(todayYM)
    setLoading(true)
    const datesPromise = challenges
      ? Promise.resolve({ dates: challenges })
      : (isWiki ? fetchWikiChallengeDates(365) : fetchChallengeDates(365, gameType === 'series' ? 'series' : 'film'))

    const serverHistFilm = user ? authGetHistory('film').catch(() => null) : Promise.resolve(null)
    const serverHistSeries = user && FEATURES.enableSeries ? authGetHistory('series').catch(() => null) : Promise.resolve(null)
    const serverHistWiki = user && FEATURES.enableWiki ? authGetHistory('wiki').catch(() => null) : Promise.resolve(null)

    Promise.all([datesPromise, serverHistFilm, serverHistSeries, serverHistWiki])
      .then(([{ dates: modeDates }, serverFilm, serverSeries, serverWiki]) => {
        setChallengeDates(new Set(modeDates))

        function mergeHist(mode: ModeKey, serverHist: { history?: Record<string, 'won' | 'lost'> } | null) {
          let hist = loadHistory(mode)
          const stats = loadStats(mode)
          if (stats.lastPlayedDate === today) {
            hist[today] = (stats.lastWonDate === today) ? 'won' : 'lost'
          }
          if (serverHist?.history) hist = { ...hist, ...serverHist.history }
          return hist
        }

        setHistoryByMode({
          film: mergeHist('film', serverFilm),
          series: FEATURES.enableSeries ? mergeHist('series', serverSeries) : {},
          wiki: FEATURES.enableWiki ? mergeHist('wiki', serverWiki) : {},
        })
      })
      .catch((err) => {
        console.error('[ArchiveModal] Failed to load challenge dates:', err)
      })
      .finally(() => setLoading(false))
  }, [challenges, gameType, isOpen, isWiki, today, todayYM, user])

  const activeDate = viewingDate ?? today
  const days       = daysForMonth(displayYM)

  const earliestYM = challengeDates.size > 0
    ? [...challengeDates].sort()[0].slice(0, 7)
    : todayYM

  const canPrev = displayYM > earliestYM
  const canNext = displayYM < todayYM

  function dayStatus(date: string): DayStatus {
    if (!challengeDates.has(date)) return 'none'
    const hist = historyByMode[histTypeForCurrent()][date]
    return hist ?? 'available'
  }

  function histTypeForCurrent(): ModeKey {
    return isWiki ? 'wiki' : (gameType === 'series' ? 'series' : 'film')
  }

  /** Pastilles film / série / wiki pour un jour donné. */
  function dayModeDots(date: string): Array<'win' | 'lose' | 'none'> {
    const modes: ModeKey[] = [
      'film',
      ...(FEATURES.enableSeries ? (['series'] as const) : []),
      ...(FEATURES.enableWiki ? (['wiki'] as const) : []),
    ]
    return modes.map((m) => {
      const h = historyByMode[m][date]
      if (h === 'won') return 'win'
      if (h === 'lost') return 'lose'
      return 'none'
    })
  }

  const pastDays = days.filter((d) => d <= today)
  const played   = pastDays.filter((d) => dayStatus(d) === 'won' || dayStatus(d) === 'lost').length
  const won      = pastDays.filter((d) => dayStatus(d) === 'won').length
  const total    = pastDays.filter((d) => dayStatus(d) !== 'none').length

  function handleDay(date: string) {
    if (date > today) return
    const s = dayStatus(date)
    if (s === 'none') return
    closeModal()
    void loadDate(date)
  }

  // ── Shared calendar grid ──────────────────────────────────────────────────
  const noChallengesInMonth = !loading && days.filter(d => d <= today).every(d => dayStatus(d) === 'none')

  const calendarGrid = loading ? (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
      <Loader2 size={24} style={{ color: 'var(--ink-2)', animation: 'spin 1s linear infinite' }} />
    </div>
  ) : (
    <>
      {/* DOW header */}
      <div className="cdym-cal-dow">
        {DOW.map((d, i) => (
          <span key={i}><abbr title={DOW_FULL[i]} style={{ textDecoration: 'none' }}>{d}</abbr></span>
        ))}
      </div>

      {/* Day grid */}
      <div className="cdym-cal-grid">
        {days.length > 0 && Array.from({ length: weekdayOffset(days[0]) }).map((_, i) => (
          <div key={`pad-${i}`} className="cdym-cal-day empty" />
        ))}
        {days.map((date) => {
          const s      = dayStatus(date)
          const day    = parseInt(date.slice(8), 10)
          const isActive = date === activeDate
          const isFuture = date > today
          const hasChallenge = challengeDates.has(date)
          const cls = [
            'cdym-cal-day',
            isFuture                  ? 'future' : '',
            !isFuture && !hasChallenge ? 'nodifi' : '',
            s === 'won'               ? 'full'   : '',
            isActive && !isFuture && hasChallenge ? 'today' : '',
          ].filter(Boolean).join(' ')

          return (
            <button
              key={date}
              type="button"
              onClick={() => handleDay(date)}
              disabled={!hasChallenge || isFuture}
              aria-label={
                isFuture ? `${date} – futur`
                  : hasChallenge ? `Défi du ${date}`
                  : `${date} – pas de défi`
              }
              className={cls}
              style={{ cursor: !hasChallenge || isFuture ? 'default' : 'pointer', border: 'none', padding: 0, fontFamily: 'inherit', background: 'none' }}
            >
              <span className="dn">{day}</span>
              {!isFuture && hasChallenge && (
                <span className="dots">
                  {dayModeDots(date).map((dot, j) => (
                    <i key={j} className={dot} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Empty state */}
      {noChallengesInMonth && (
        <p style={{ textAlign: 'center', color: 'var(--ink-2)', fontSize: 13.5, fontWeight: 500, padding: '8px 0 16px' }}>
          Aucun défi pour ce mois.
        </p>
      )}

      {/* Legend */}
      <div className="cdym-arch-legend">
        <span><i className="win" /> Trouvé</span>
        <span><i className="lose" /> Manqué</span>
        <span><i className="none" /> Non joué</span>
        <span style={{ color: 'var(--ink-3)', fontSize: 11.5 }}>· {FEATURES.enableSeries && FEATURES.enableWiki ? '3' : '1'} pastille{(FEATURES.enableSeries && FEATURES.enableWiki) ? 's' : ''} = jeux du jour</span>
        {displayYM !== todayYM && (
          <button
            type="button"
            onClick={() => setDisplayYM(todayYM)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 600, fontSize: 12.5, color: 'var(--acc-d, var(--coral-d))' }}
          >
            Aujourd'hui
          </button>
        )}
      </div>
    </>
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Archive des défis">

          {/* ── Backdrop ────────────────────────────────────────────────── */}
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(60,48,80,0.4)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          />

          {/* ══════════════════════════════════════════════════════════════
              MOBILE — plein écran slide-up (< 1024px)
          ══════════════════════════════════════════════════════════════ */}
          {!isDesktop && (
            <motion.div
              style={{
                position: 'absolute', left: 0, right: 0, bottom: 0,
                top: 60,
                background: 'var(--bg)',
                borderRadius: '24px 24px 0 0',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              {/* Drag pill */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--line-2)' }} />
              </div>

              {/* Scrollable content */}
              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                {/* Head */}
                <div className="cdym-arch-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <h1>Archive des défis 📅</h1>
                    <div className="sub">Rejoue les défis que tu as manqués — chaque jour reste accessible.</div>
                    {!loading && total > 0 && (
                      <div className="sub" style={{ marginTop: 4 }}>
                        {played}/{total} joué{played > 1 ? 's' : ''}
                        {played > 0 && ` · ${won} victoire${won > 1 ? 's' : ''}`}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={closeModal} aria-label="Fermer"
                    style={{ flexShrink: 0, marginLeft: 12, width: 36, height: 36, borderRadius: 11,
                      border: '2.5px solid var(--line)', background: '#fff', display: 'grid', placeItems: 'center',
                      fontSize: 16, cursor: 'pointer', fontWeight: 700, color: 'var(--ink-2)',
                      boxShadow: '0 3px 0 var(--line-2)' }}
                  >✕</button>
                </div>

                {/* Month nav */}
                <div className="cdym-arch-month">
                  <button type="button" onClick={() => setDisplayYM(prevMonth(displayYM))}
                    disabled={!canPrev || loading} className={!canPrev || loading ? 'disabled' : ''}
                    aria-label="Mois précédent">‹</button>
                  <span className="m">{monthLabel(displayYM)}</span>
                  <button type="button" onClick={() => setDisplayYM(nextMonth(displayYM))}
                    disabled={!canNext || loading} className={!canNext || loading ? 'disabled' : ''}
                    aria-label="Mois suivant">›</button>
                </div>

                {calendarGrid}
                <div style={{ height: 24 }} />
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              DESKTOP — carte centrée (≥ 1024px)
          ══════════════════════════════════════════════════════════════ */}
          {isDesktop && (
            <motion.div
              style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', padding: 24, pointerEvents: 'none' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            >
              <div className="cdy-archive" style={{ width: 480, pointerEvents: 'auto', background: '#fff' }}>
                <div className="cdy-archive-head">
                  <span className="ic">📅</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3>Archive des défis</h3>
                    <p>Rejoue les défis que tu as manqués — chaque jour reste accessible.</p>
                    {!loading && total > 0 && (
                      <p style={{ marginTop: 4 }}>
                        {played}/{total} joué{played > 1 ? 's' : ''}
                        {played > 0 && ` · ${won} victoire${won > 1 ? 's' : ''}`}
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={closeModal} aria-label="Fermer" className="cdy-archive-x">✕</button>
                </div>
                <div className="cdy-archive-body">
                  <div className="cdy-archive-month">
                    <button type="button" onClick={() => setDisplayYM(prevMonth(displayYM))}
                      disabled={!canPrev || loading} className={!canPrev || loading ? 'disabled' : ''}
                      aria-label="Mois précédent">‹</button>
                    <span className="m">{monthLabel(displayYM)}</span>
                    <button type="button" onClick={() => setDisplayYM(nextMonth(displayYM))}
                      disabled={!canNext || loading} className={!canNext || loading ? 'disabled' : ''}
                      aria-label="Mois suivant">›</button>
                  </div>
                  {calendarGrid}
                </div>
              </div>
            </motion.div>
          )}

        </div>
      )}
    </AnimatePresence>
  )
}
