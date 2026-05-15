/**
 * FriendsPage.tsx
 * Social leaderboard page — compare today's scores with friends.
 */

import { useEffect, useState, useCallback } from 'react'
import {
  Users,
  Copy,
  Check,
  Flame,
  Plus,
  Share2,
  Trophy,
  Film,
  Tv,
  Landmark,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Medal,
  Target,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAuthModal } from '@/components/modals/AuthModal'
import {
  friendsGetAll,
  friendsAdd,
  friendsAccept,
  friendsRemove,
  friendsGetLeaderboard,
  type FriendEntry,
  type FriendScore,
  type PendingEntry,
  type FriendsResponse,
  type LeaderboardEntry,
} from '@/api/client'
import { FEATURES } from '@/config/features'
import { Footer } from '@/components/layout/Footer'

// ─── Score helpers ────────────────────────────────────────────────────────────

function winsCount(entry: FriendEntry): number {
  return [entry.scores.film, entry.scores.series, entry.scores.wiki]
    .filter((s) => s?.won).length
}

function totalAttempts(entry: FriendEntry): number {
  return [entry.scores.film, entry.scores.series, entry.scores.wiki]
    .reduce((sum, s) => sum + (s?.attemptsUsed ?? 99), 0)
}

function sortedFriends(friends: FriendEntry[]): FriendEntry[] {
  return [...friends].sort((a, b) => {
    const wa = winsCount(a), wb = winsCount(b)
    if (wa !== wb) return wb - wa
    const ta = totalAttempts(a), tb = totalAttempts(b)
    if (ta !== tb) return ta - tb
    return 0
  })
}

const MAX_ATTEMPTS = 5

function AttemptDots({ attemptsUsed, won }: { attemptsUsed: number; won: boolean }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => {
        const filled = i < attemptsUsed
        const isWinDot = won && i === attemptsUsed - 1
        return (
          <span
            key={i}
            className={`w-2 h-2 rounded-full ${
              isWinDot
                ? 'bg-film-green'
                : filled
                  ? 'bg-film-red/70'
                  : 'bg-film-border'
            }`}
          />
        )
      })}
    </span>
  )
}

function ScoreBadge({ score, icon: Icon }: { score: FriendScore | null; icon: React.ElementType }) {
  if (!score) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-film-text-dim/50">
        <Icon size={10} className="opacity-40" />
        <span>—</span>
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        score.won ? 'text-film-green' : 'text-film-red'
      }`}
    >
      <Icon size={10} />
      {score.won ? String(score.attemptsUsed) : '✗'}
    </span>
  )
}

function ScoreCard({
  score,
  label,
  icon: Icon,
  accent,
}: {
  score: FriendScore | null
  label: string
  icon: React.ElementType
  accent: string
}) {
  const notPlayed = !score
  const won = score?.won ?? false
  const statusColor = notPlayed ? undefined : won ? 'text-film-green' : 'text-film-red'
  const bgColor = notPlayed
    ? 'bg-white/[0.02]'
    : won
      ? 'bg-film-green/[0.06]'
      : 'bg-film-red/[0.06]'
  const borderColor = notPlayed
    ? 'border-film-border/40'
    : won
      ? 'border-film-green/25'
      : 'border-film-red/25'

  return (
    <div className={`flex-1 flex flex-col items-center gap-2 rounded-xl border px-3 py-3 ${bgColor} ${borderColor}`}>
      {/* Mode label */}
      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
        <Icon size={10} />
        {label}
      </span>

      {/* Main score */}
      <span className={`text-2xl font-bold font-mono leading-none ${notPlayed ? 'text-film-text-dim/30' : statusColor}`}>
        {notPlayed ? '—' : won ? String(score!.attemptsUsed) : '✗'}
      </span>

      {/* Attempt dots */}
      {score ? (
        <AttemptDots attemptsUsed={score.attemptsUsed} won={score.won} />
      ) : (
        <span className="flex gap-0.5">
          {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
            <span key={i} className="w-2 h-2 rounded-full bg-film-border/30" />
          ))}
        </span>
      )}

      {/* Status text */}
      <span className={`text-[10px] font-medium leading-tight text-center ${notPlayed ? 'text-film-text-dim/40 italic' : statusColor}`}>
        {notPlayed
          ? 'Pas joué'
          : won
            ? score!.attemptsUsed === 1 ? 'Du premier coup !' : `en ${score!.attemptsUsed} essais`
            : `Perdu — ${score!.attemptsUsed}/${MAX_ATTEMPTS}`}
      </span>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-7 h-7 rounded-full border-2 border-film-gold/30 border-t-film-gold animate-spin" />
    </div>
  )
}

function CodeCard({
  code,
  onShare,
}: {
  code: string
  onShare: () => void
}) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-xl border border-film-gold/40 bg-film-gold/8 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-film-gold mb-2">
        Mon code ami
      </p>
      <div className="flex items-center gap-2">
        <span className="flex-1 font-mono text-xl font-bold text-film-text tracking-widest">
          {code}
        </span>
        <button
          type="button"
          onClick={copy}
          title="Copier le code"
          className="flex items-center gap-1.5 rounded-lg border border-film-border px-3 py-1.5 text-sm text-film-text-dim hover:text-film-text hover:bg-white/5 transition-colors cursor-pointer"
        >
          {copied ? <Check size={14} className="text-film-green" /> : <Copy size={14} />}
          {copied ? 'Copié !' : 'Copier'}
        </button>
        <button
          type="button"
          onClick={onShare}
          title="Partager"
          className="flex items-center gap-1.5 rounded-lg border border-film-border px-3 py-1.5 text-sm text-film-text-dim hover:text-film-text hover:bg-white/5 transition-colors cursor-pointer"
        >
          <Share2 size={14} />
          Partager
        </button>
      </div>
    </div>
  )
}

function AddFriendForm({
  onAdded,
}: {
  onAdded: () => void
}) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setStatus('loading')
    setErrorMsg('')
    try {
      await friendsAdd(trimmed)
      setStatus('success')
      setCode('')
      setTimeout(() => setStatus('idle'), 2500)
      onAdded()
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Erreur réseau')
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-2 mt-3">
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
          placeholder="Code ami (ex: AB12CD34)"
          maxLength={8}
          className="flex-1 rounded-lg border border-film-border bg-white/5 px-3 py-2 text-sm text-film-text placeholder-film-text-dim focus:outline-none focus:border-film-gold/60 font-mono tracking-wider"
        />
        <button
          type="submit"
          disabled={status === 'loading' || !code.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-film-gold px-4 py-2 text-sm font-semibold text-film-black hover:bg-film-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <Plus size={14} />
          Ajouter
        </button>
      </div>
      {status === 'success' && (
        <p className="text-xs text-film-green">Demande envoyée !</p>
      )}
      {status === 'error' && (
        <p className="text-xs text-film-red">{errorMsg || 'Impossible d\'envoyer la demande.'}</p>
      )}
    </form>
  )
}

function LeaderboardRow({
  rank,
  entry,
  onRemove,
}: {
  rank: number
  entry: FriendEntry
  onRemove: (id: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isFirst = rank === 1

  return (
    <div
      className={`rounded-xl overflow-hidden transition-colors ${
        entry.isMe
          ? 'bg-film-gold/10 border border-film-gold/25'
          : 'border border-transparent hover:border-film-border/50'
      }`}
    >
      {/* Main row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="group w-full flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer"
      >
        {/* Rank */}
        <span
          className={`w-6 text-center text-sm font-bold shrink-0 ${
            isFirst ? 'text-film-gold' : 'text-film-text-dim'
          }`}
        >
          {isFirst ? <Trophy size={14} className="inline text-film-gold" /> : rank}
        </span>

        {/* Name + streak */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-film-text truncate">
              {entry.displayName}
            </span>
            {entry.isMe && (
              <span className="text-xs text-film-gold font-normal shrink-0">· toi</span>
            )}
            {entry.streak > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-orange-400 shrink-0">
                <Flame size={10} />
                {entry.streak}
              </span>
            )}
          </div>
        </div>

        {/* Mode scores */}
        <div className="flex items-center gap-3 shrink-0">
          <ScoreBadge score={entry.scores.film} icon={Film} />
          {FEATURES.enableSeries && <ScoreBadge score={entry.scores.series} icon={Tv} />}
          {FEATURES.enableWiki && <ScoreBadge score={entry.scores.wiki} icon={Landmark} />}
        </div>

        {/* Chevron */}
        <span
          className={`shrink-0 text-film-text-dim/40 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {/* Detail panel */}
      {expanded && (
        <div className="px-3 pb-3 pt-2 border-t border-film-border/30">
          <div className="flex gap-2">
            <ScoreCard score={entry.scores.film} label="Films" icon={Film} accent="#4d8ee8" />
            {FEATURES.enableSeries && (
              <ScoreCard score={entry.scores.series} label="Séries" icon={Tv} accent="#1eb088" />
            )}
            {FEATURES.enableWiki && (
              <ScoreCard score={entry.scores.wiki} label="Perso." icon={Landmark} accent="#9b7de8" />
            )}
          </div>
          {!entry.isMe && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(entry.id) }}
              className="mt-2.5 text-xs text-film-text-dim/40 hover:text-film-red transition-colors cursor-pointer"
            >
              Retirer cet ami
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function PendingSection({
  pending,
  onAccept,
  onDecline,
  onCancel,
}: {
  pending: PendingEntry[]
  onAccept: (id: number) => void
  onDecline: (id: number) => void
  onCancel: (id: number) => void
}) {
  if (pending.length === 0) return null

  const incoming = pending.filter((p) => p.direction === 'incoming')
  const outgoing = pending.filter((p) => p.direction === 'outgoing')

  return (
    <div className="mt-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-film-text-dim mb-3">
        Invitations
      </p>
      <div className="flex flex-col gap-2">
        {incoming.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-xl border border-film-border px-3 py-2.5"
          >
            <span className="flex-1 text-sm text-film-text truncate">{p.displayName}</span>
            <span className="text-xs text-film-text-dim mr-1">t'invite</span>
            <button
              type="button"
              onClick={() => onAccept(p.id)}
              className="rounded-lg bg-film-green/20 border border-film-green/30 px-3 py-1 text-xs font-semibold text-film-green hover:bg-film-green/30 transition-colors cursor-pointer"
            >
              Accepter
            </button>
            <button
              type="button"
              onClick={() => onDecline(p.id)}
              className="rounded-lg border border-film-border px-3 py-1 text-xs text-film-text-dim hover:text-film-text hover:bg-white/5 transition-colors cursor-pointer"
            >
              Ignorer
            </button>
          </div>
        ))}
        {outgoing.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-xl border border-film-border px-3 py-2.5"
          >
            <span className="flex-1 text-sm text-film-text truncate">{p.displayName}</span>
            <span className="text-xs text-film-text-dim mr-1">en attente</span>
            <button
              type="button"
              onClick={() => onCancel(p.id)}
              className="rounded-lg border border-film-border px-3 py-1 text-xs text-film-text-dim hover:text-film-red hover:border-film-red/40 transition-colors cursor-pointer"
            >
              Annuler
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Global leaderboard ───────────────────────────────────────────────────────

function Avatar({ entry, size = 32 }: { entry: LeaderboardEntry; size?: number }) {
  const style = { width: size, height: size }
  if (entry.avatarUrl) {
    return (
      <img
        src={entry.avatarUrl}
        alt={entry.displayName}
        className="rounded-full object-cover border border-film-gold/30 shrink-0"
        style={style}
      />
    )
  }
  return (
    <span
      className="rounded-full bg-film-gold/20 border border-film-gold/30 flex items-center justify-center font-bold text-film-gold shrink-0"
      style={{ ...style, fontSize: size * 0.38 }}
    >
      {entry.displayName.charAt(0).toUpperCase()}
    </span>
  )
}

const MEDAL = ['🥇', '🥈', '🥉']
const PODIUM_HEIGHT = ['h-24', 'h-16', 'h-12']
const PODIUM_ORDER = [1, 0, 2] // silver left, gold center, bronze right

function Podium({ top3 }: { top3: LeaderboardEntry[] }) {
  return (
    <div className="flex items-end justify-center gap-2 pt-4 pb-2">
      {PODIUM_ORDER.map((i) => {
        const e = top3[i]
        if (!e) return <div key={i} className="flex-1" />
        const isGold = i === 0
        return (
          <div key={e.id} className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-xl">{MEDAL[i]}</span>
            <Avatar entry={e} size={isGold ? 48 : 40} />
            <span className={`text-xs font-semibold text-center leading-tight truncate w-full text-center ${e.isMe ? 'text-film-gold' : 'text-film-text'}`}>
              {e.isMe ? 'Toi' : e.displayName}
            </span>
            <span className="text-[10px] text-film-text-dim">{e.totalWins} victoire{e.totalWins !== 1 ? 's' : ''}</span>
            <div className={`w-full rounded-t-lg ${isGold ? 'bg-film-gold/20 border-t border-x border-film-gold/30' : 'bg-white/[0.04] border-t border-x border-film-border/40'} ${PODIUM_HEIGHT[i]}`} />
          </div>
        )
      })}
    </div>
  )
}

function GlobalLeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  const [sortKey, setSortKey] = useState<'totalWins' | 'winRate' | 'currentStreak'>('totalWins')

  const sorted = [...entries].sort((a, b) => {
    if (sortKey === 'winRate') return b.winRate - a.winRate || b.totalWins - a.totalWins
    if (sortKey === 'currentStreak') return b.currentStreak - a.currentStreak || b.totalWins - a.totalWins
    return b.totalWins - a.totalWins || b.winRate - a.winRate
  })

  const SortBtn = ({ k, label }: { k: typeof sortKey; label: string }) => (
    <button
      type="button"
      onClick={() => setSortKey(k)}
      className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer ${sortKey === k ? 'bg-film-gold/20 text-film-gold' : 'text-film-text-dim hover:text-film-text'}`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-col gap-2">
      {/* Sort controls */}
      <div className="flex items-center gap-1 justify-end">
        <span className="text-[10px] text-film-text-dim mr-1">Trier par</span>
        <SortBtn k="totalWins" label="Victoires" />
        <SortBtn k="winRate" label="% victoire" />
        <SortBtn k="currentStreak" label="Série" />
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1.5rem_1fr_2rem_2rem_2rem_3rem_2rem] gap-x-2 px-3 text-[10px] text-film-text-dim/60 font-semibold uppercase tracking-wider">
        <span>#</span>
        <span>Joueur</span>
        <span className="text-center"><Film size={9} className="inline" /></span>
        {FEATURES.enableSeries && <span className="text-center"><Tv size={9} className="inline" /></span>}
        {FEATURES.enableWiki && <span className="text-center"><Landmark size={9} className="inline" /></span>}
        <span className="text-center"><Target size={9} className="inline" /></span>
        <span className="text-center"><Flame size={9} className="inline" /></span>
      </div>

      {sorted.map((e, idx) => (
        <div
          key={e.id}
          className={`group grid grid-cols-[1.5rem_1fr_2rem_2rem_2rem_3rem_2rem] gap-x-2 items-center px-3 py-2.5 rounded-xl border transition-colors ${
            e.isMe
              ? 'bg-film-gold/8 border-film-gold/25'
              : 'border-transparent hover:border-film-border/50 hover:bg-white/[0.02]'
          }`}
        >
          <span className="text-xs font-bold text-film-text-dim text-center">
            {idx < 3 ? MEDAL[idx] : idx + 1}
          </span>
          <div className="flex items-center gap-2 min-w-0">
            <Avatar entry={e} size={24} />
            <span className={`text-sm font-medium truncate ${e.isMe ? 'text-film-gold' : 'text-film-text'}`}>
              {e.isMe ? 'Toi' : e.displayName}
            </span>
          </div>
          <span className="text-xs font-semibold text-center text-film-gold">{e.filmWins}</span>
          {FEATURES.enableSeries && <span className="text-xs font-semibold text-center text-purple-400">{e.seriesWins}</span>}
          {FEATURES.enableWiki && <span className="text-xs font-semibold text-center text-film-green">{e.wikiWins}</span>}
          <span className="text-xs font-semibold text-center text-film-text-dim">
            {e.totalPlayed > 0 ? `${Math.round(e.winRate * 100)}%` : '—'}
          </span>
          <span className={`text-xs font-semibold text-center ${e.currentStreak > 0 ? 'text-orange-400' : 'text-film-text-dim/40'}`}>
            {e.currentStreak > 0 ? `🔥${e.currentStreak}` : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

function GlobalLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    friendsGetLeaderboard()
      .then((r) => setEntries(r.leaderboard))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  if (!entries || entries.length <= 1) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Trophy size={32} className="text-film-text-dim" />
        <p className="text-film-text-dim text-sm">Ajoutez des amis pour voir le classement global.</p>
      </div>
    )
  }

  const top3 = entries.slice(0, 3)

  return (
    <div className="flex flex-col gap-6">
      <Podium top3={top3} />
      <GlobalLeaderboardTable entries={entries} />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function getTodayLocal(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
}

function formatDateLabel(date: string, today: string): string {
  if (date === today) return "Aujourd'hui"
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yStr = yesterday.toISOString().slice(0, 10)
  if (date === yStr) return 'Hier'
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(date + 'T12:00:00')
  )
}

export function FriendsPage() {
  const user = useAuthStore((s) => s.user)
  const { open: openAuth } = useAuthModal()

  const [tab, setTab] = useState<'today' | 'global'>('today')
  const [data, setData] = useState<FriendsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocal)

  const load = useCallback((date: string) => {
    setLoading(true)
    const param = date === getTodayLocal() ? undefined : date
    friendsGetAll(param)
      .then((res) => { setData(res); setSelectedDate(res.date) })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    load(selectedDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const today = data?.today ?? getTodayLocal()
  const isToday = selectedDate === today

  const goDay = (delta: number) => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    const next = d.toISOString().slice(0, 10)
    if (next > today) return
    setSelectedDate(next)
    load(next)
  }

  const handleShare = () => {
    if (!data?.myCode) return
    const text = `Rejoins-moi sur GuessToday ! Mon code : ${data.myCode}`
    if (navigator.share) {
      void navigator.share({ title: 'GuessToday — Amis', text })
    } else {
      void navigator.clipboard.writeText(text)
    }
  }

  const reload = useCallback(() => load(selectedDate), [load, selectedDate])

  const handleAccept = async (userId: number) => {
    await friendsAccept(userId).catch(() => null)
    reload()
  }

  const handleDecline = async (userId: number) => {
    await friendsRemove(userId).catch(() => null)
    reload()
  }

  const handleCancel = async (userId: number) => {
    await friendsRemove(userId).catch(() => null)
    reload()
  }

  const handleRemove = async (userId: number) => {
    await friendsRemove(userId).catch(() => null)
    reload()
  }

  const ranked = data ? sortedFriends(data.friends) : []

  return (
    <div className="min-h-dvh flex flex-col bg-film-black text-film-text">
      {/* Minimal header */}
      <header className="border-b border-film-border bg-film-black/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <a
            href="/films"
            className="text-film-text-dim hover:text-film-text transition-colors text-sm"
          >
            ← Retour
          </a>
          <div className="flex-1" />
          <Users size={18} className="text-film-gold" />
          <span className="font-semibold text-film-text">Amis</span>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {/* Auth gate */}
        {!user && !loading && (
          <div className="flex flex-col items-center gap-5 pt-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-film-gold/10 border border-film-gold/25 flex items-center justify-center">
              <Users size={28} className="text-film-gold" />
            </div>
            <div>
              <p className="font-semibold text-film-text text-lg">Défi entre amis</p>
              <p className="text-film-text-dim text-sm mt-1">
                Crée un compte pour défier tes amis et comparer vos scores du jour.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="rounded-lg bg-film-gold px-6 py-2.5 text-sm font-semibold text-film-black hover:bg-film-gold/90 transition-colors cursor-pointer"
            >
              Créer un compte
            </button>
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="text-sm text-film-text-dim hover:text-film-text transition-colors cursor-pointer"
            >
              Déjà un compte ? Se connecter
            </button>
          </div>
        )}

        {/* Loading */}
        {user && loading && <Spinner />}

        {/* Content */}
        {user && !loading && data && (
          <div className="flex flex-col gap-5">
            {/* My code card */}
            {data.myCode && (
              <CodeCard code={data.myCode} onShare={handleShare} />
            )}

            {/* Add friend */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-film-text-dim mb-1">
                Ajouter un ami
              </p>
              <AddFriendForm onAdded={reload} />
            </div>

            {/* Pending */}
            <PendingSection
              pending={data.pending}
              onAccept={(id) => void handleAccept(id)}
              onDecline={(id) => void handleDecline(id)}
              onCancel={(id) => void handleCancel(id)}
            />

            {/* Tab switcher */}
            <div className="flex rounded-xl border border-film-border overflow-hidden">
              <button
                type="button"
                onClick={() => setTab('today')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${tab === 'today' ? 'bg-film-gold/15 text-film-gold' : 'text-film-text-dim hover:text-film-text hover:bg-white/5'}`}
              >
                <Calendar size={13} />
                Aujourd'hui
              </button>
              <div className="w-px bg-film-border" />
              <button
                type="button"
                onClick={() => setTab('global')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${tab === 'global' ? 'bg-film-gold/15 text-film-gold' : 'text-film-text-dim hover:text-film-text hover:bg-white/5'}`}
              >
                <Medal size={13} />
                Classement
              </button>
            </div>

            {/* Today tab */}
            {tab === 'today' && (
              <>
                {/* Date navigator */}
                <div className="flex items-center gap-2 rounded-xl border border-film-border bg-white/[0.02] px-3 py-2">
                  <button type="button" onClick={() => goDay(-1)} className="flex items-center justify-center w-7 h-7 rounded-lg text-film-text-dim hover:text-film-text hover:bg-white/5 transition-colors cursor-pointer" aria-label="Jour précédent">
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-film-text">
                    <Calendar size={13} className="text-film-text-dim" />
                    <span className="capitalize">{formatDateLabel(selectedDate, today)}</span>
                  </div>
                  <button type="button" onClick={() => goDay(1)} disabled={isToday} className="flex items-center justify-center w-7 h-7 rounded-lg text-film-text-dim hover:text-film-text hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-default" aria-label="Jour suivant">
                    <ChevronRight size={16} />
                  </button>
                </div>

                {ranked.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <Users size={32} className="text-film-text-dim" />
                    <p className="text-film-text-dim text-sm">Aucun ami pour l'instant.</p>
                    {data.myCode && (
                      <p className="text-xs text-film-text-dim max-w-xs">
                        Partage ton code <span className="font-mono font-semibold text-film-gold">{data.myCode}</span> pour inviter des amis.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-film-text-dim">Classement du jour</p>
                      <div className="flex items-center gap-3 text-[10px] text-film-text-dim/60">
                        <span className="flex items-center gap-1"><Film size={9} /> Films</span>
                        {FEATURES.enableSeries && <span className="flex items-center gap-1"><Tv size={9} /> Séries</span>}
                        {FEATURES.enableWiki && <span className="flex items-center gap-1"><Landmark size={9} /> Wiki</span>}
                      </div>
                    </div>
                    {ranked.map((entry, idx) => (
                      <LeaderboardRow key={entry.id} rank={idx + 1} entry={entry} onRemove={(id) => void handleRemove(id)} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Global tab */}
            {tab === 'global' && (
              <GlobalLeaderboard />
            )}
          </div>
        )}

        {/* Fetch failed */}
        {user && !loading && !data && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-film-text-dim text-sm">Impossible de charger les amis.</p>
            <button
              type="button"
              onClick={() => void reload()}
              className="text-sm text-film-gold hover:underline cursor-pointer"
            >
              Réessayer
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
