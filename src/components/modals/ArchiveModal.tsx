/**
 * modals/ArchiveModal.tsx
 * Calendar of past challenges — one month at a time, navigable with arrows.
 */

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useGameStore, getTodayParis } from '@/store/gameStore'
import { fetchChallengeDates } from '@/api/client'
import { loadHistory, loadStats } from '@/lib/storage'

type DayStatus = 'won' | 'lost' | 'available' | 'none'

/** Monday-first day-of-week offset for a given ISO date string */
function weekdayOffset(iso: string): number {
  const dow = new Date(iso + 'T12:00:00Z').getUTCDay()
  return dow === 0 ? 6 : dow - 1
}

/** All ISO dates in a YYYY-MM that are ≤ today */
function daysForMonth(ym: string, today: string): string[] {
  const [y, m] = ym.split('-').map(Number)
  const count = new Date(y, m, 0).getDate()
  const days: string[] = []
  for (let d = 1; d <= count; d++) {
    const iso = `${ym}-${String(d).padStart(2, '0')}`
    if (iso <= today) days.push(iso)
  }
  return days
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
  return new Date(`${ym}-01T12:00:00Z`).toLocaleDateString('fr-FR', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export function ArchiveModal() {
  const isOpen = useGameStore((s) => s.ui.isModalOpen && s.ui.modalType === 'archive')
  const closeModal = useGameStore((s) => s.closeModal)
  const loadDate = useGameStore((s) => s.loadDate)
  const viewingDate = useGameStore((s) => s.viewingDate)
  const gameType = useGameStore((s) => s.gameType)

  const [challengeDates, setChallengeDates] = useState<Set<string>>(new Set())
  const [history, setHistory] = useState<Record<string, 'won' | 'lost'>>({})
  const [loading, setLoading] = useState(false)

  const today = getTodayParis()
  const todayYM = today.slice(0, 7)
  const [displayYM, setDisplayYM] = useState(todayYM)

  useEffect(() => {
    if (!isOpen) return
    setDisplayYM(todayYM)
    setLoading(true)
    fetchChallengeDates(365, gameType)
      .then(({ dates }) => {
        setChallengeDates(new Set(dates))
        // Historique local
        let hist = loadHistory()
        // Toujours compléter le jour courant si lastPlayedDate correspond à aujourd'hui
        const stats = loadStats()
        if (stats.lastPlayedDate === today) {
          hist[today] = (stats.lastWonDate === today) ? 'won' : 'lost'
        }
        // Si l'historique est vide ou partiel, on tente de compléter à partir des stats globaux (pour le dernier jour joué)
        if ((Object.keys(hist).length === 0 || hist[stats.lastPlayedDate ?? ''] === undefined) && stats.lastPlayedDate) {
          const d = stats.lastPlayedDate
          hist[d] = (stats.lastWonDate === d) ? 'won' : 'lost'
        }
        setHistory(hist)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isOpen, todayYM, gameType])

  const activeDate = viewingDate ?? today
  const days = daysForMonth(displayYM, today)

  // Earliest month that has a challenge
  const earliestYM = challengeDates.size > 0
    ? [...challengeDates].sort()[0].slice(0, 7)
    : todayYM

  const canPrev = displayYM > earliestYM
  const canNext = displayYM < todayYM

  function status(date: string): DayStatus {
    if (!challengeDates.has(date)) return 'none'
    return history[date] ?? 'available'
  }

  // Month stats
  const played  = days.filter((d) => status(d) === 'won' || status(d) === 'lost').length
  const won     = days.filter((d) => status(d) === 'won').length
  const total   = days.filter((d) => status(d) !== 'none').length

  function handleDay(date: string) {
    if (status(date) === 'none') return
    closeModal()
    loadDate(date)
  }

  return (
    <Modal isOpen={isOpen} onClose={closeModal}>
      <div className="flex flex-col gap-4">

        {/* ── Month navigation ── */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setDisplayYM(prevMonth(displayYM))}
            disabled={!canPrev || loading}
            className="p-1.5 rounded-lg text-film-text-dim hover:text-film-text hover:bg-white/5 transition-colors disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="text-center min-w-0">
            <p className="font-title font-semibold text-film-text capitalize truncate">
              {monthLabel(displayYM)}
            </p>
            {!loading && total > 0 && (
              <p className="text-[11px] text-film-text-dim">
                {played}/{total} joué{played > 1 ? 's' : ''}
                {played > 0 && ` · ${won} victoire${won > 1 ? 's' : ''}`}
              </p>
            )}
          </div>

          <button
            onClick={() => setDisplayYM(nextMonth(displayYM))}
            disabled={!canNext || loading}
            className="p-1.5 rounded-lg text-film-text-dim hover:text-film-text hover:bg-white/5 transition-colors disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* ── Calendar ── */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-film-text-dim" />
          </div>
        ) : (
          <div>
            {/* Day-of-week header */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DOW.map((d, i) => (
                <div key={i} className="text-center text-[10px] text-film-text-dim font-medium py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {days.length > 0 && Array.from({ length: weekdayOffset(days[0]) }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {days.map((date) => {
                const s = status(date)
                const day = parseInt(date.slice(8), 10)
                const isActive = date === activeDate

                return (
                  <button
                    key={date}
                    onClick={() => handleDay(date)}
                    disabled={s === 'none'}
                    title={s !== 'none' ? `Défi du ${date}` : undefined}
                    className={[
                      'aspect-square rounded-lg text-xs font-medium transition-all leading-none flex items-center justify-center',
                      s === 'none'   ? 'text-film-text-dim/20 cursor-default' : 'cursor-pointer',
                      s === 'won'    ? 'bg-film-green/20 text-film-green hover:bg-film-green/30 border border-film-green/30' : '',
                      s === 'lost'   ? 'bg-film-red/20 text-film-red hover:bg-film-red/30 border border-film-red/30' : '',
                      s === 'available' ? 'bg-film-gold/15 text-film-gold hover:bg-film-gold/25 border border-film-gold/30' : '',
                      isActive && s !== 'none' ? 'ring-2 ring-film-gold ring-offset-1 ring-offset-film-black' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Legend ── */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-film-text-dim border-t border-film-border pt-3">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-film-green/25 border border-film-green/40 inline-block" />
            Gagné
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-film-red/25 border border-film-red/40 inline-block" />
            Perdu
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-film-gold/20 border border-film-gold/40 inline-block" />
            À jouer
          </span>
          {displayYM !== todayYM && (
            <button
              onClick={() => setDisplayYM(todayYM)}
              className="ml-auto text-xs text-film-gold hover:underline cursor-pointer"
            >
              Aujourd'hui
            </button>
          )}
        </div>

      </div>
    </Modal>
  )
}
