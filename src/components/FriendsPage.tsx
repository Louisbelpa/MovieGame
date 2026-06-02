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
import { useUiPrefsStore } from '@/store/uiPrefsStore'
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

function nameHue(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return h % 360
}

function Avatar({
  displayName,
  avatarUrl,
  size = 32,
}: {
  displayName: string
  avatarUrl: string | null
  size?: number
  isMe?: boolean
}) {
  const initial = displayName.charAt(0).toUpperCase()
  const hue = nameHue(displayName)
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
        className="rounded-full object-cover shrink-0"
        style={baseStyle}
      />
    )
  }
  return (
    <span
      className="rounded-full flex items-center justify-center font-bold shrink-0"
      style={{
        ...baseStyle,
        background: `oklch(0.66 0.16 ${hue}deg)`,
        color: '#fff',
        boxShadow: `0 2px 0 oklch(0.52 0.16 ${hue}deg)`,
      }}
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
      {/* Header — cdy-thead */}
      <div className="cdy-thead" style={{ gridTemplateColumns: '44px 1fr 80px 70px 60px 50px', borderBottom: '2.5px solid var(--line)' }}>
        {(['#', 'Joueur', 'Victoires', '%', 'Moy.', '🔥'] as const).map((col) => (
          <span key={col}>{col}</span>
        ))}
      </div>

      {/* Data rows — cdy-trow */}
      {rows.map((row, idx) => (
        <motion.div
          key={row.id}
          className={`cdy-trow${row.isMe ? ' me' : ''}`}
          style={{ gridTemplateColumns: '44px 1fr 80px 70px 60px 50px' }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 * idx, duration: 0.25 }}
        >
          {/* Rank */}
          <span className={`rk${idx < 3 ? ' top' : ''}`}>{idx + 1}</span>

          {/* Name */}
          <div className="flex items-center gap-2 min-w-0">
            <Avatar displayName={row.displayName} avatarUrl={row.avatarUrl} size={28} isMe={row.isMe} />
            <span style={{ fontWeight: row.isMe ? 700 : 600, fontSize: 14, color: row.isMe ? 'var(--coral-d)' : 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.displayName}
              {row.isMe && <span style={{ fontSize: 11, color: 'var(--coral)', marginLeft: 5 }}>· toi</span>}
            </span>
          </div>

          {/* Wins */}
          <span className="num" style={{ fontSize: 14, color: 'var(--ink)' }}>{row.wins}</span>

          {/* % */}
          <span className="num" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
            {row.played > 0 ? `${row.winPct}%` : '—'}
          </span>

          {/* Avg */}
          <span className="num cdy-mono" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
            {row.avgAttempts != null ? row.avgAttempts : '—'}
          </span>

          {/* Streak */}
          <span className="num" style={{ fontSize: 13, fontWeight: 700, color: row.streak > 0 ? 'var(--flame)' : 'var(--ink-3)' }}>
            {row.streak > 0 ? `${row.streak}` : '—'}
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
  const newDesign = useUiPrefsStore((s) => s.newDesign)
  const user = useAuthStore((s) => s.user)
  const { open: openAuth } = useAuthModal()
  const navigate = useNavigate()

  const [activeSection, setActiveSection] = useState<'classement' | 'amis'>('classement')
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
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Desktop nav */}
      <TopNav />

      {/* Mobile header */}
      <header
        className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-10"
        style={{ background: 'var(--panel)', borderBottom: '2.5px solid var(--line)' }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Retour"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', padding: 4 }}
          >
            <ChevronLeft size={22} />
          </button>
          <h1 style={{ fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>Amis</h1>
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
          newDesign ? (
            <AuthGateNewDesign context="friends" />
          ) : (
            <div className="flex flex-col items-center gap-5 pt-16 text-center">
              <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--coral-soft)', border: '2.5px solid var(--line)', boxShadow: '0 5px 0 var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={28} style={{ color: 'var(--coral)' }} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>Défi entre amis</p>
                <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 6, maxWidth: 300 }}>
                  Crée un compte pour défier tes amis et comparer vos scores du jour.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openAuth('register')}
                className="cdy-btn cdy-btn-primary g-film"
                style={{ padding: '14px 28px', fontSize: 15 }}
              >
                Créer un compte
              </button>
              <button
                type="button"
                onClick={() => openAuth('login')}
                style={{ fontSize: 13, color: 'var(--ink-2)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Déjà un compte ? Se connecter
              </button>
            </div>
          )
        )}

        {user && (
          <>
            {/* ── Tabs Classement / Amis (référence CandyLeaderboard + CandyFriends) ── */}
            <div className="cdy-seg" style={{ marginBottom: 28, display: 'inline-flex' }}>
              <span className={activeSection === 'classement' ? 'on' : ''} style={{ cursor: 'pointer' }}
                onClick={() => setActiveSection('classement')}>
                Classement 🏆
              </span>
              <span className={activeSection === 'amis' ? 'on' : ''} style={{ cursor: 'pointer' }}
                onClick={() => setActiveSection('amis')}>
                Amis 👥
              </span>
            </div>

            {/* ── Section Classement (CandyLeaderboard) ── */}
            {activeSection === 'classement' && (
              <div>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div>
                    <h1 className="cdy-h1b">Classement amis 🏆</h1>
                    <p className="cdy-lead">Victoires et score moyen — moins d'essais = mieux.</p>
                  </div>
                  <div className="cdy-seg">
                    <span className={period !== 'all' ? 'on' : ''} style={{ cursor: 'pointer' }}
                      onClick={() => setPeriod('7d')}>Hebdo</span>
                    <span className={period === 'all' ? 'on' : ''} style={{ cursor: 'pointer' }}
                      onClick={() => setPeriod('all')}>Total</span>
                  </div>
                </div>

                {/* Podium Candy (cdy-podium + cdy-pod) */}
                {tableRows.length >= 2 && (() => {
                  const PODIUM_DISPLAY = [1, 0, 2] // silver | gold | bronze
                  const COLORS = [
                    { col: 'var(--ink-2)', h: 130 },
                    { col: 'var(--sun-d)', h: 172 },
                    { col: '#cf8a4e',      h: 110 },
                  ]
                  return (
                    <div className="cdy-podium" style={{ marginBottom: 28 }}>
                      {PODIUM_DISPLAY.map((rankIdx, displayIdx) => {
                        const row = tableRows[rankIdx]
                        if (!row) return null
                        const { col, h } = COLORS[displayIdx]
                        const initials = row.displayName.slice(0, 2).toUpperCase()
                        const sz = displayIdx === 1 ? 54 : 44
                        return (
                          <div className="cdy-pod" key={row.id}>
                            <span className="cdy-av" style={{ width: sz, height: sz, fontSize: sz * 0.4, background: 'var(--grape)', boxShadow: '0 4px 0 var(--grape-d)', flexShrink: 0 }}>
                              {row.avatarUrl
                                ? <img src={row.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                : initials}
                            </span>
                            <div className="pname">{row.displayName}{row.isMe && ' (toi)'}</div>
                            <div className="pbar" style={{ height: h, background: `color-mix(in oklab, ${col} 22%, #fff)` }}>
                              <div className="prank" style={{ color: col }}>{rankIdx + 1}</div>
                              <div className="ppts">{row.wins}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}

                {/* Table (cdy-thead + cdy-trow) */}
                {loading ? (
                  <div className="cdy-card h-40 animate-pulse" style={{ background: 'var(--line)' }} />
                ) : tableRows.length === 0 ? (
                  <div className="cdy-card" style={{ padding: 40, textAlign: 'center' }}>
                    <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>Aucun ami pour l'instant.</p>
                    <button type="button" onClick={() => { setActiveSection('amis'); setShowAddModal(true) }}
                      className="cdy-btn cdy-btn-primary g-film" style={{ marginTop: 16, padding: '12px 20px' }}>
                      <Plus size={13} /> Ajouter un ami
                    </button>
                  </div>
                ) : (
                  <div className="cdy-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <TableRows rows={tableRows} pending={pending} onRelancer={handleRelancer} />
                  </div>
                )}
              </div>
            )}

            {/* ── Section Amis (CandyFriends) ── */}
            {activeSection === 'amis' && (
              <div>
                <h1 className="cdy-h1b" style={{ marginBottom: 6 }}>Mes amis 👥</h1>
                <p className="cdy-lead" style={{ marginBottom: 20 }}>Cherche par pseudo, gère tes invitations et ta liste d'amis.</p>

                {/* Search bar */}
                <div className="cdy-search" style={{ marginBottom: 28 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.4" strokeLinecap="round">
                    <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
                  </svg>
                  <span className="ph">Rechercher un pseudo…</span>
                  <button type="button" onClick={() => setShowAddModal(true)}
                    className="cdy-btn cdy-btn-primary g-film" style={{ padding: '10px 18px' }}>
                    Inviter
                  </button>
                </div>

                {/* 2-col grid: friends list + aside (invitations) */}
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1fr_340px]" style={{ alignItems: 'start' }}>
                  {/* Left: friends grid */}
                  <div>
                    <div className="cdy-sec-head" style={{ marginTop: 0 }}>
                      <h3>Mes amis ({friendsData?.friends.length ?? 0})</h3>
                    </div>
                    {loadingFriends ? (
                      <div className="cdy-card h-32 animate-pulse" style={{ background: 'var(--line)' }} />
                    ) : friendsData?.friends.length === 0 ? (
                      <div className="cdy-card" style={{ padding: 24, color: 'var(--ink-2)', fontSize: 14 }}>
                        Aucun ami pour l'instant. Invite des joueurs !
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        {friendsData?.friends.map((f) => (
                          <div key={f.id} className="cdy-card cdy-friend">
                            <Avatar displayName={f.displayName} avatarUrl={f.avatarUrl} size={42} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="fname">{f.displayName}</div>
                              <div className="fu">@{f.displayName.toLowerCase().replace(/\s+/g, '')}</div>
                            </div>
                            {f.streak > 0 && (
                              <span className="cdy-streak" style={{ fontSize: 13, padding: '6px 11px' }}>🔥 {f.streak}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right aside: invitations */}
                  <aside style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                    {incoming.length > 0 && (
                      <div>
                        <div className="cdy-sec-head" style={{ marginTop: 0 }}>
                          <h3>Reçues ({incoming.length})</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {incoming.map((inv) => (
                            <div key={inv.id} className="cdy-card" style={{ padding: 16 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                <Avatar displayName={inv.displayName} avatarUrl={null} size={40} />
                                <div>
                                  <div className="fname" style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)' }}>{inv.displayName}</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 9 }}>
                                <button type="button" onClick={() => void handleAccept(inv.id)}
                                  className="cdy-btn cdy-btn-mint" style={{ flex: 1, padding: '11px 0' }}>
                                  Accepter
                                </button>
                                <button type="button" onClick={() => void handleDecline(inv.id)}
                                  className="cdy-btn cdy-btn-soft" style={{ flex: 1, padding: '11px 0' }}>
                                  Refuser
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Envoyées */}
                    {pending.filter(p => p.direction === 'outgoing').length > 0 && (
                      <div>
                        <div className="cdy-sec-head" style={{ marginTop: 0 }}>
                          <h3>Envoyées ({pending.filter(p => p.direction === 'outgoing').length})</h3>
                        </div>
                        {pending.filter(p => p.direction === 'outgoing').map((inv) => (
                          <div key={inv.id} className="cdy-card cdy-friend" style={{ marginBottom: 10 }}>
                            <Avatar displayName={inv.displayName} avatarUrl={null} size={40} />
                            <div style={{ flex: 1 }}>
                              <div className="fname" style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)' }}>{inv.displayName}</div>
                            </div>
                            <span className="cdy-badge" style={{ background: '#fff1d6', color: '#b8841f' }}>En attente</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {myCode && (
                      <div className="cdy-card" style={{ padding: 18 }}>
                        <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 10, fontWeight: 500 }}>Ton code à partager :</div>
                        <CodeChip code={myCode} />
                      </div>
                    )}
                  </aside>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />

      {/* Auth modal (for new design auth gate) */}
      {newDesign && <AuthModal />}

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
