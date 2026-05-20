import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Copy,
  Check,
  Plus,
  X,
  Film,
  Tv,
  User,
  ChevronDown,
  ChevronLeft,
  UserPlus,
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
import { TopNav } from '@/components/layout/TopNav'
import { loadStats } from '@/lib/storage'
import { isMockEnabled } from '@/mock/mockFlags'
import { MOCK_FRIENDS_RESPONSE, MOCK_LEADERBOARD } from '@/mock/mockData'
import { AuthModal } from '@/components/modals/AuthModal'
import { AuthGateNewDesign } from '@/components/ProfilePage'

// ─── Types ───────────────────────────────────────────────────────────────────

type ModeFilter = 'all' | 'film' | 'series' | 'wiki'
type Period = 'today' | '7d' | '30d' | 'all'

interface TableRow {
  id: number
  displayName: string
  avatarUrl: string | null
  isMe: boolean
  wins: number
  played: number
  winPct: number
  avgAttempts: number | null
  streak: number
  pending?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFilteredScores(
  scores: FriendEntry['scores'],
  mode: ModeFilter
): (FriendScore | null)[] {
  if (mode === 'film') return [scores.film]
  if (mode === 'series') return [scores.series]
  if (mode === 'wiki') return [scores.wiki]
  return [
    scores.film,
    FEATURES.enableSeries ? scores.series : null,
    FEATURES.enableWiki ? scores.wiki : null,
  ]
}

function friendToRow(entry: FriendEntry, mode: ModeFilter): TableRow {
  const scores = getFilteredScores(entry.scores, mode).filter(Boolean) as FriendScore[]
  const played = scores.length
  const wins = scores.filter((s) => s.won).length
  const totalAttempts = scores.reduce((sum, s) => sum + s.attemptsUsed, 0)
  return {
    id: entry.id,
    displayName: entry.displayName,
    avatarUrl: entry.avatarUrl,
    isMe: entry.isMe,
    wins,
    played,
    winPct: played > 0 ? Math.round((wins / played) * 100) : 0,
    avgAttempts: played > 0 ? Math.round((totalAttempts / played) * 10) / 10 : null,
    streak: entry.streak,
  }
}

function leaderboardToRow(entry: LeaderboardEntry, mode: ModeFilter): TableRow {
  let wins: number
  let played: number
  if (mode === 'film') { wins = entry.filmWins; played = entry.filmPlayed }
  else if (mode === 'series') { wins = entry.seriesWins; played = entry.seriesPlayed }
  else if (mode === 'wiki') { wins = entry.wikiWins; played = entry.wikiPlayed }
  else { wins = entry.totalWins; played = entry.totalPlayed }
  return {
    id: entry.id,
    displayName: entry.displayName,
    avatarUrl: entry.avatarUrl,
    isMe: entry.isMe,
    wins,
    played,
    winPct: played > 0 ? Math.round((wins / played) * 100) : 0,
    avgAttempts: entry.avgAttempts ?? null,
    streak: entry.currentStreak,
  }
}

function sortRows(rows: TableRow[]): TableRow[] {
  return [...rows].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    if (b.winPct !== a.winPct) return b.winPct - a.winPct
    const aAvg = a.avgAttempts ?? 99
    const bAvg = b.avgAttempts ?? 99
    return aAvg - bAvg
  })
}

const PERIOD_LABELS: Record<Period, string> = {
  today: "Aujourd'hui",
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  all: 'Toujours',
}

const PERIOD_PODIUM: Record<Period, string> = {
  today: "AUJOURD'HUI",
  '7d': '7 JOURS',
  '30d': '30 JOURS',
  all: 'TOUJOURS',
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  displayName,
  avatarUrl,
  size = 32,
  isMe = false,
}: {
  displayName: string
  avatarUrl: string | null
  size?: number
  isMe?: boolean
}) {
  const initial = displayName.charAt(0).toUpperCase()
  const baseStyle = {
    width: size,
    height: size,
    fontSize: size * 0.38,
    flexShrink: 0,
  }
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className="rounded-full object-cover border border-film-gold/30 shrink-0"
        style={baseStyle}
      />
    )
  }
  return (
    <span
      className={`rounded-full flex items-center justify-center font-bold shrink-0 ${
        isMe
          ? 'bg-film-gold/25 border border-film-gold/50 text-film-gold'
          : 'bg-film-gray/60 border border-film-border/60 text-film-text-dim'
      }`}
      style={baseStyle}
    >
      {initial}
    </span>
  )
}

// ─── Podium ───────────────────────────────────────────────────────────────────

const PODIUM_ORDER = [1, 0, 2] // silver | gold | bronze (display order)
const PODIUM_COLORS = [
  { bar: 'bg-[#9aa3ad]/20 border-t border-x border-[#9aa3ad]/30', text: '#9aa3ad', h: 80 },
  { bar: 'bg-film-gold/20 border-t border-x border-film-gold/30', text: '#d4a64a', h: 112 },
  { bar: 'bg-[#c87533]/20 border-t border-x border-[#c87533]/30', text: '#c87533', h: 64 },
]

function PodiumChart({
  rows,
  period,
}: {
  rows: TableRow[]
  period: Period
}) {
  const top3 = rows.slice(0, 3)

  if (top3.length < 2) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Users size={32} className="text-film-text-dim/30" />
        <p className="text-sm text-film-text-dim">Pas encore assez de joueurs.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-film-border/40">
        <span className="text-[10px] font-mono font-bold tracking-widest text-film-text-dim/60 uppercase">
          Podium · {PERIOD_PODIUM[period]}
        </span>
      </div>

      {/* Podium bars */}
      <div className="flex items-end justify-center gap-2 px-4 pt-8 pb-4">
        {PODIUM_ORDER.map((rank) => {
          const entry = top3[rank]
          if (!entry) return <div key={rank} className="flex-1" />
          const { bar, text, h } = PODIUM_COLORS[rank]
          const isGold = rank === 0
          return (
            <div key={entry.id} className="flex-1 flex flex-col items-center gap-1.5">
              {isGold && <span className="text-base mb-0.5">👑</span>}
              <Avatar
                displayName={entry.displayName}
                avatarUrl={entry.avatarUrl}
                size={isGold ? 44 : 36}
                isMe={entry.isMe}
              />
              <span
                className="text-xs font-semibold text-center leading-tight truncate w-full text-center"
                style={{ color: entry.isMe ? '#d4a64a' : 'var(--color-film-text)' }}
              >
                {entry.isMe ? 'Toi' : entry.displayName}
              </span>
              <span className="text-[10px] font-semibold" style={{ color: text }}>
                {entry.wins} ✓
              </span>
              <motion.div
                className={`w-full rounded-t-lg flex items-end justify-center pb-2 ${bar}`}
                style={{ height: h }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.1 + rank * 0.08, duration: 0.45, ease: 'easeOut' }}
                // transformOrigin applied via style for framer-motion
              >
                <span className="text-xs font-bold font-mono" style={{ color: text }}>
                  {rank + 1}
                </span>
              </motion.div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────

function TableRows({
  rows,
  pending,
  onRelancer,
}: {
  rows: TableRow[]
  pending: PendingEntry[]
  onRelancer: (id: number) => void
}) {
  const outgoing = pending.filter((p) => p.direction === 'outgoing')

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="grid gap-x-2 px-4 py-2 border-b border-film-border/40"
        style={{ gridTemplateColumns: '1.5rem 1fr 2.5rem 2.5rem 3rem 2.5rem' }}>
        {(['#', 'JOUEUR', 'V', '%', 'MOY.', '🔥'] as const).map((col) => (
          <span key={col} className={`text-[10px] font-mono font-bold tracking-widest text-film-text-dim/50 uppercase ${col === 'JOUEUR' ? '' : 'text-center'}`}>
            {col}
          </span>
        ))}
      </div>

      {/* Data rows */}
      {rows.map((row, idx) => (
        <motion.div
          key={row.id}
          className={`grid gap-x-2 px-4 py-2.5 items-center border-b border-film-border/20 last:border-0 ${
            row.isMe
              ? 'bg-film-gold/[0.07]'
              : 'hover:bg-film-surface'
          }`}
          style={{ gridTemplateColumns: '1.5rem 1fr 2.5rem 2.5rem 3rem 2.5rem' }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 * idx, duration: 0.25 }}
        >
          {/* Rank */}
          <span className={`text-xs font-bold font-mono text-center ${
            idx === 0 ? 'text-film-gold' : idx === 1 ? 'text-[#9aa3ad]' : idx === 2 ? 'text-[#c87533]' : 'text-film-text-dim/50'
          }`}>
            {idx + 1}
          </span>

          {/* Name */}
          <div className="flex items-center gap-2 min-w-0">
            <Avatar displayName={row.displayName} avatarUrl={row.avatarUrl} size={26} isMe={row.isMe} />
            <span className={`text-sm font-medium truncate ${row.isMe ? 'text-film-gold' : 'text-film-text'}`}>
              {row.isMe ? 'toi' : row.displayName}
            </span>
            {row.isMe && (
              <span className="text-xs text-film-gold/60 shrink-0">· toi</span>
            )}
          </div>

          {/* V — wins */}
          <span className="text-sm font-bold text-film-text text-center">{row.wins}</span>

          {/* % */}
          <span className="text-xs text-film-text-dim text-center">
            {row.played > 0 ? `${row.winPct}%` : '—'}
          </span>

          {/* Moy */}
          <span className="text-xs text-film-text-dim text-center font-mono">
            {row.avgAttempts != null ? row.avgAttempts : '—'}
          </span>

          {/* Streak */}
          <span className={`text-xs font-bold text-center ${row.streak > 0 ? 'text-amber-400' : 'text-film-text-dim/30'}`}>
            {row.streak > 0 ? row.streak : '—'}
          </span>
        </motion.div>
      ))}

      {/* Pending (outgoing) rows */}
      {outgoing.map((p) => (
        <div
          key={`pending-${p.id}`}
          className="grid gap-x-2 px-4 py-2.5 items-center border-b border-film-border/20 last:border-0 opacity-45"
          style={{ gridTemplateColumns: '1.5rem 1fr auto' }}
        >
          <span className="text-xs font-mono text-film-text-dim/40 text-center">—</span>
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-[26px] h-[26px] rounded-full bg-film-border/20 border border-film-border/30 flex items-center justify-center text-xs text-film-text-dim/40 font-bold shrink-0">
              {p.displayName.charAt(0).toUpperCase()}
            </span>
            <span className="text-sm text-film-text-dim truncate">{p.displayName}</span>
            <span className="text-[10px] font-mono font-semibold text-film-text-dim/60 uppercase tracking-wider shrink-0">
              En attente
            </span>
          </div>
          <button
            type="button"
            onClick={() => onRelancer(p.id)}
            className="text-xs text-film-text-dim/60 border border-film-border/40 rounded-lg px-2.5 py-1 hover:text-film-text hover:border-film-border transition-colors cursor-pointer shrink-0"
          >
            Relancer
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Add Friend Modal ─────────────────────────────────────────────────────────

function AddFriendModal({
  myCode,
  onClose,
  onAdded,
}: {
  myCode: string | null
  onClose: () => void
  onAdded: () => void
}) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

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
      setTimeout(() => { onAdded(); onClose() }, 1200)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Erreur réseau')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-md rounded-2xl border border-film-border bg-film-surface p-6 flex flex-col gap-5 shadow-2xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-film-text text-base">Ajouter un ami</h2>
            <p className="text-sm text-film-text-dim mt-0.5">Entre le code ami de la personne à inviter.</p>
          </div>
          <button type="button" onClick={onClose} className="text-film-text-dim hover:text-film-text transition-colors cursor-pointer mt-0.5">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
              placeholder="Ex: KSXF5P4Q"
              maxLength={8}
              className="flex-1 rounded-xl border border-film-border bg-film-dark/70 px-3.5 py-2.5 text-sm text-film-text placeholder-film-text-dim/40 focus:outline-none focus:border-film-gold/50 font-mono tracking-widest"
            />
            <button
              type="submit"
              disabled={status === 'loading' || !code.trim()}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-film-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
              style={{ background: 'var(--sg-films)' }}
            >
              <Plus size={14} />
              Ajouter
            </button>
          </div>
          {status === 'success' && <p className="text-xs text-film-green">Demande envoyée !</p>}
          {status === 'error' && <p className="text-xs text-film-red">{errorMsg || 'Impossible d\'envoyer la demande.'}</p>}
        </form>

        {myCode && (
          <div className="pt-4 border-t border-film-border/40">
            <p className="text-xs text-film-text-dim mb-2">Ton code à partager :</p>
            <CodeChip code={myCode} />
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Code chip ────────────────────────────────────────────────────────────────

function CodeChip({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      type="button"
      onClick={copy}
      title="Copier le code"
      className="flex items-center gap-2 rounded-xl border border-film-border bg-film-dark hover:bg-film-gray px-3 py-1.5 transition-colors cursor-pointer group"
    >
      <span className="text-[10px] font-mono font-bold tracking-widest text-film-text-dim/60 uppercase">Code</span>
      <span className="font-mono text-sm font-bold text-film-gold tracking-widest">{code}</span>
      {copied
        ? <Check size={13} className="text-film-green shrink-0" />
        : <Copy size={13} className="text-film-text-dim/40 group-hover:text-film-text-dim transition-colors shrink-0" />
      }
    </button>
  )
}

// ─── Period Dropdown ──────────────────────────────────────────────────────────

function PeriodDropdown({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-xl border border-film-border bg-film-dark hover:bg-film-dark px-3 py-1.5 text-sm text-film-text-dim hover:text-film-text transition-colors cursor-pointer shrink-0"
      >
        <span className="text-xs text-film-text-dim/60 mr-0.5">Période :</span>
        <span className="font-medium text-film-text">{PERIOD_LABELS[value]}</span>
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-film-border bg-film-surface shadow-xl z-20 overflow-hidden"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => { onChange(k); setOpen(false) }}
                className={`w-full text-left px-3.5 py-2 text-sm transition-colors cursor-pointer ${
                  value === k ? 'text-film-gold bg-film-gold/10' : 'text-film-text-dim hover:text-film-text hover:bg-film-dark/70'
                }`}
              >
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Incoming pending banner ──────────────────────────────────────────────────

function IncomingBanner({
  incoming,
  onAccept,
  onDecline,
}: {
  incoming: PendingEntry[]
  onAccept: (id: number) => void
  onDecline: (id: number) => void
}) {
  if (incoming.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {incoming.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-3 rounded-xl border border-film-border/60 bg-film-surface px-3.5 py-2.5"
        >
          <span className="w-7 h-7 rounded-full bg-film-border/20 border border-film-border/30 flex items-center justify-center text-xs font-bold text-film-text-dim shrink-0">
            {p.displayName.charAt(0).toUpperCase()}
          </span>
          <span className="flex-1 text-sm text-film-text truncate">
            <strong>{p.displayName}</strong> t'invite
          </span>
          <button
            type="button"
            onClick={() => onAccept(p.id)}
            className="rounded-lg bg-film-green/20 border border-film-green/30 px-3 py-1 text-xs font-semibold text-film-green hover:bg-film-green/30 transition-colors cursor-pointer shrink-0"
          >
            Accepter
          </button>
          <button
            type="button"
            onClick={() => onDecline(p.id)}
            className="text-xs text-film-text-dim/50 hover:text-film-text-dim transition-colors cursor-pointer shrink-0"
          >
            Ignorer
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function FriendsPage() {
  const user = useAuthStore((s) => s.user)
  const { open: openAuth } = useAuthModal()
  const navigate = useNavigate()

  const [modeFilter, setModeFilter] = useState<ModeFilter>('all')
  const [period, setPeriod] = useState<Period>('7d')
  const [showAddModal, setShowAddModal] = useState(false)

  const [friendsData, setFriendsData] = useState<FriendsResponse | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null)
  const [loadingFriends, setLoadingFriends] = useState(true)
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true)

  const maxStreak = Math.max(
    loadStats('film').currentStreak,
    loadStats('wiki').currentStreak,
    FEATURES.enableSeries ? loadStats('series').currentStreak : 0,
  )

  const loadFriends = useCallback(() => {
    if (isMockEnabled()) {
      setFriendsData(MOCK_FRIENDS_RESPONSE)
      setLoadingFriends(false)
      return
    }
    setLoadingFriends(true)
    friendsGetAll()
      .then(setFriendsData)
      .catch(() => setFriendsData(null))
      .finally(() => setLoadingFriends(false))
  }, [])

  const loadLeaderboard = useCallback(() => {
    if (isMockEnabled()) {
      setLeaderboard(MOCK_LEADERBOARD)
      setLoadingLeaderboard(false)
      return
    }
    setLoadingLeaderboard(true)
    friendsGetLeaderboard()
      .then((r) => setLeaderboard(r.leaderboard))
      .catch(() => setLeaderboard([]))
      .finally(() => setLoadingLeaderboard(false))
  }, [])

  useEffect(() => {
    if (!user) { setLoadingFriends(false); setLoadingLeaderboard(false); return }
    loadFriends()
    loadLeaderboard()
  }, [user, loadFriends, loadLeaderboard])

  const handleAccept = async (userId: number) => {
    await friendsAccept(userId).catch(() => null)
    loadFriends(); loadLeaderboard()
  }
  const handleDecline = async (userId: number) => {
    await friendsRemove(userId).catch(() => null)
    loadFriends()
  }
  const handleRelancer = (userId: number) => {
    // No backend endpoint yet — cancel and allow re-invite
    void friendsRemove(userId).catch(() => null).then(() => loadFriends())
  }

  // Build table rows based on period + mode
  const tableRows: TableRow[] = (() => {
    if (period === 'today') {
      if (!friendsData) return []
      return sortRows(friendsData.friends.map((f) => friendToRow(f, modeFilter)))
    }
    if (!leaderboard) return []
    const rows = leaderboard.map((e) => leaderboardToRow(e, modeFilter))
    // Hide the "me" entry if there are no actual friends (only self in the list)
    const hasOtherPlayers = rows.some((r) => !r.isMe)
    return sortRows(hasOtherPlayers ? rows : rows.filter((r) => !r.isMe))
  })()

  const loading = period === 'today' ? loadingFriends : loadingLeaderboard
  const pending = friendsData?.pending ?? []
  const incoming = pending.filter((p) => p.direction === 'incoming')
  const myCode = friendsData?.myCode ?? null

  // Mode tabs config
  const modeTabs: { key: ModeFilter; label: string; icon: React.ElementType; color?: string }[] = [
    { key: 'all', label: 'Tous les modes', icon: Users },
    { key: 'film', label: 'Films', icon: Film, color: 'var(--sg-films)' },
    ...(FEATURES.enableSeries ? [{ key: 'series' as ModeFilter, label: 'Séries', icon: Tv, color: 'var(--sg-series)' }] : []),
    ...(FEATURES.enableWiki ? [{ key: 'wiki' as ModeFilter, label: 'Personnalités', icon: User, color: 'var(--sg-wiki)' }] : []),
  ]

  return (
    <div className="min-h-dvh flex flex-col bg-film-black text-film-text">
      {/* Desktop nav */}
      <TopNav />

      {/* Mobile header */}
      <header
        className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-10"
        style={{ background: 'rgba(11,11,26,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Retour"
            className="text-film-text-dim hover:text-film-text transition-colors cursor-pointer"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="font-semibold text-film-text text-base">Amis</h1>
        </div>
        <div className="flex items-center gap-2">
          {maxStreak > 0 && (
            <span className="text-xs font-semibold text-amber-400">🔥 {maxStreak}</span>
          )}
          {user && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              aria-label="Ajouter un ami"
              className="w-7 h-7 rounded-full border border-film-border/60 bg-film-dark/70 flex items-center justify-center text-film-text-dim hover:text-film-text transition-colors cursor-pointer"
            >
              <UserPlus size={14} />
            </button>
          )}
          {user ? (
            <a href="/profile" className="w-7 h-7 rounded-full bg-film-gold/20 border border-film-gold/40 flex items-center justify-center text-xs font-bold text-film-gold overflow-hidden">
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                : user.displayName.charAt(0).toUpperCase()
              }
            </a>
          ) : null}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 lg:py-8">
        {/* Auth gate */}
        {!user && !loadingFriends && (
          FEATURES.newDesign ? (
            <AuthGateNewDesign context="friends" />
          ) : (
            <div className="flex flex-col items-center gap-5 pt-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-film-gold/10 border border-film-gold/25 flex items-center justify-center">
                <Users size={28} className="text-film-gold" />
              </div>
              <div>
                <p className="font-semibold text-film-text text-lg">Défi entre amis</p>
                <p className="text-film-text-dim text-sm mt-1 max-w-xs">
                  Crée un compte pour défier tes amis et comparer vos scores du jour.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openAuth('register')}
                className="rounded-xl px-6 py-2.5 text-sm font-semibold text-film-black transition-colors cursor-pointer"
                style={{ background: 'var(--sg-films)' }}
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
          )
        )}

        {user && (
          <>
            {/* Page header */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
              <div>
                <h1 className="hidden lg:block text-3xl font-bold text-film-text">Amis</h1>
                <p className="hidden lg:block text-sm text-film-text-dim mt-1">Compare tes scores et défie tes proches.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {myCode && <CodeChip code={myCode} />}
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="hidden lg:flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-film-black transition-colors cursor-pointer"
                  style={{ background: 'var(--sg-films)' }}
                >
                  <Plus size={14} />
                  Ajouter un ami
                </button>
              </div>
            </div>

            {/* Incoming pending */}
            {incoming.length > 0 && (
              <div className="mb-5">
                <IncomingBanner
                  incoming={incoming}
                  onAccept={(id) => void handleAccept(id)}
                  onDecline={(id) => void handleDecline(id)}
                />
              </div>
            )}

            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-6">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                {modeTabs.map((tab) => {
                  const Icon = tab.icon
                  const active = modeFilter === tab.key
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setModeFilter(tab.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors cursor-pointer shrink-0 ${
                        active
                          ? 'bg-film-gray border-film-border text-film-text'
                          : 'border-transparent text-film-text-dim hover:text-film-text hover:bg-film-dark/70'
                      }`}
                    >
                      <Icon size={13} style={tab.color ? { color: tab.color } : undefined} />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">
                        {tab.key === 'all' ? 'Tous' : tab.key === 'wiki' ? 'Pers.' : tab.label}
                      </span>
                    </button>
                  )
                })}
              </div>
              <PeriodDropdown value={period} onChange={setPeriod} />
            </div>

            {/* Loading skeleton */}
            {loading && (
              <div className="grid lg:grid-cols-[340px_1fr] gap-5">
                <div className="rounded-2xl border border-film-border bg-film-surface h-64 animate-pulse" />
                <div className="rounded-2xl border border-film-border bg-film-surface h-64 animate-pulse" />
              </div>
            )}

            {/* Content grid */}
            {!loading && (
              <div className="grid lg:grid-cols-[340px_1fr] gap-5 items-start">
                {/* Podium card — only shown when there are players */}
                {tableRows.length > 0 && (
                  <div className="rounded-2xl border border-film-border bg-film-surface overflow-hidden">
                    <PodiumChart rows={tableRows} period={period} />
                  </div>
                )}

                {/* Table card */}
                <div className={`rounded-2xl border border-film-border bg-film-surface overflow-hidden ${tableRows.length === 0 ? 'lg:col-span-2' : ''}`}>
                  {tableRows.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-center px-6">
                      <Users size={32} className="text-film-text-dim/30" />
                      <p className="text-sm text-film-text-dim">Aucun ami pour l'instant.</p>
                      {myCode && (
                        <p className="text-xs text-film-text-dim max-w-xs">
                          Partage ton code <span className="font-mono font-bold text-film-gold">{myCode}</span> pour inviter des amis.
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-film-black mt-1 cursor-pointer"
                        style={{ background: 'var(--sg-films)' }}
                      >
                        <UserPlus size={13} />
                        Ajouter un ami
                      </button>
                    </div>
                  ) : (
                    <TableRows
                      rows={tableRows}
                      pending={pending}
                      onRelancer={handleRelancer}
                    />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />

      {/* Auth modal (for new design auth gate) */}
      {FEATURES.newDesign && <AuthModal />}

      {/* Add friend modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddFriendModal
            myCode={myCode}
            onClose={() => setShowAddModal(false)}
            onAdded={() => { loadFriends(); loadLeaderboard() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
