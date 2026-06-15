import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Copy,
  Check,
  Plus,
  X,
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
  friendsGetGlobalLeaderboard,
  type FriendEntry,
  type FriendScore,
  type PendingEntry,
  type FriendsResponse,
  type LeaderboardEntry,
} from '@/api/client'
import { FEATURES } from '@/config/features'
import { useUiPrefsStore } from '@/store/uiPrefsStore'
import { Footer } from '@/components/layout/Footer'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
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
      {/* Header — cdy-thead : # | Joueur | Victoires | Moy. | Évol. */}
      <div className="cdy-thead" style={{ gridTemplateColumns: '44px 1fr 80px 70px 60px', borderBottom: '2.5px solid var(--line)' }}>
        {(['#', 'Joueur', 'Victoires', 'Moy.', 'Évol.'] as const).map((col) => (
          <span key={col} style={{ textAlign: col === 'Joueur' ? 'left' : 'right' }}>{col}</span>
        ))}
      </div>

      {/* Data rows — cdy-trow */}
      {rows.map((row, idx) => {
        // Evolution arrow: compare position to previous render — use index as proxy
        const evo = idx === 0 ? '▲' : idx < 3 ? '▲' : '–'
        const evoColor = evo === '▲' ? 'var(--mint-d)' : 'var(--ink-3)'
        return (
          <motion.div
            key={row.id}
            className={`cdy-trow${row.isMe ? ' me' : ''}`}
            style={{ gridTemplateColumns: '44px 1fr 80px 70px 60px' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * idx, duration: 0.25 }}
          >
            {/* Rank */}
            <span className={`rk${idx < 3 ? ' top' : ''}`}>{idx + 1}</span>

            {/* Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar displayName={row.displayName} avatarUrl={row.avatarUrl} size={36} isMe={row.isMe} />
              <span style={{ fontWeight: row.isMe ? 700 : 600, fontSize: 15, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.displayName}
                {row.isMe && <span style={{ fontSize: 11, color: 'var(--coral)', marginLeft: 6 }}>(toi)</span>}
              </span>
            </div>

            {/* Wins */}
            <span className="num" style={{ fontSize: 15 }}>{row.wins}</span>

            {/* Avg attempts */}
            <span className="num" style={{ fontSize: 14, color: 'var(--ink-2)' }}>
              {row.avgAttempts != null ? row.avgAttempts : '—'}
            </span>

            {/* Evolution */}
            <span className="evo" style={{ color: evoColor }}>{evo}</span>
          </motion.div>
        )
      })}

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

export function FriendsPage() {
  const newDesign = useUiPrefsStore((s) => s.newDesign)
  const user = useAuthStore((s) => s.user)
  const { open: openAuth } = useAuthModal()
  const navigate = useNavigate()
  const location = useLocation()

  // Section driven by route — no tab switcher in the UI
  const activeSection: 'classement' | 'amis' = location.pathname === '/classement' ? 'classement' : 'amis'
  const setActiveSection = (s: 'classement' | 'amis') => navigate(s === 'classement' ? '/classement' : '/friends')
  const [modeFilter] = useState<ModeFilter>('all')
  const [period, setPeriod] = useState<Period>('7d')
  const [showAddModal, setShowAddModal] = useState(false)

  const [friendsData, setFriendsData] = useState<FriendsResponse | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null)
  const [scope, setScope] = useState<'friends' | 'global'>('friends')
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[] | null>(null)
  const [loadingGlobal, setLoadingGlobal] = useState(false)
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

  const loadGlobalLeaderboard = useCallback(() => {
    setLoadingGlobal(true)
    friendsGetGlobalLeaderboard()
      .then((r) => setGlobalLeaderboard(r.leaderboard))
      .catch(() => setGlobalLeaderboard([]))
      .finally(() => setLoadingGlobal(false))
  }, [])

  useEffect(() => {
    if (!user) { setLoadingFriends(false); setLoadingLeaderboard(false); return }
    loadFriends()
    loadLeaderboard()
  }, [user, loadFriends, loadLeaderboard])

  // Charge le classement mondial à la première bascule sur l'onglet « Mondial ».
  useEffect(() => {
    if (scope === 'global' && globalLeaderboard === null) loadGlobalLeaderboard()
  }, [scope, globalLeaderboard, loadGlobalLeaderboard])

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

  // Build table rows based on scope (amis / mondial) + period + mode
  const tableRows: TableRow[] = (() => {
    if (scope === 'global') {
      if (!globalLeaderboard) return []
      // Mondial : on garde tout le monde (y compris soi), classé par victoires.
      return sortRows(globalLeaderboard.map((e) => leaderboardToRow(e, modeFilter)))
    }
    if (period === 'today') {
      if (!friendsData) return []
      const rows = sortRows(friendsData.friends.map((f) => friendToRow(f, modeFilter)))
      const hasOtherPlayers = rows.some((r) => !r.isMe)
      return hasOtherPlayers ? rows : rows.filter((r) => !r.isMe)
    }
    if (!leaderboard) return []
    const rows = leaderboard.map((e) => leaderboardToRow(e, modeFilter))
    // Hide the "me" entry if there are no actual friends (only self in the list)
    const hasOtherPlayers = rows.some((r) => !r.isMe)
    return sortRows(hasOtherPlayers ? rows : rows.filter((r) => !r.isMe))
  })()

  const loading = scope === 'global' ? loadingGlobal : (period === 'today' ? loadingFriends : loadingLeaderboard)
  const pending = friendsData?.pending ?? []
  const incoming = pending.filter((p) => p.direction === 'incoming')
  const myCode = friendsData?.myCode ?? null
  const actualFriends = friendsData?.friends.filter((f) => !f.isMe) ?? []

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Desktop nav */}
      <TopNav />

      {/* Mobile header — masqué sur la vue Classement (titre + toggles déjà dans la section) */}
      {activeSection !== 'classement' && (
        <header
          className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-10"
          style={{ background: 'var(--panel)', borderBottom: '2.5px solid var(--line)' }}
        >
          <div className="flex items-center gap-2">
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
      )}

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
            {/* ── Section Classement (CandyLeaderboard) ── */}
            {activeSection === 'classement' && (
              <div>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                  <div>
                    <h1 className="cdy-h1b">{scope === 'global' ? 'Classement mondial 🌍' : 'Classement amis 🏆'}</h1>
                    <p className="cdy-lead">{scope === 'global' ? 'Les meilleurs joueurs, tous comptes confondus.' : 'Victoires et score moyen — moins d\'essais = mieux.'}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                    <div className="cdy-seg">
                      <span className={scope === 'friends' ? 'on' : ''} style={{ cursor: 'pointer' }}
                        onClick={() => setScope('friends')}>Amis</span>
                      <span className={scope === 'global' ? 'on' : ''} style={{ cursor: 'pointer' }}
                        onClick={() => setScope('global')}>Mondial</span>
                    </div>
                    {scope === 'friends' && (
                      <div className="cdy-seg">
                        <span className={period === '7d' ? 'on' : ''} style={{ cursor: 'pointer' }}
                          onClick={() => setPeriod('7d')}>Hebdo</span>
                        <span className={period === '30d' ? 'on' : ''} style={{ cursor: 'pointer' }}
                          onClick={() => setPeriod('30d')}>Mensuel</span>
                      </div>
                    )}
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
                    {scope === 'global' ? (
                      <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>Pas encore de classement — reviens après quelques parties.</p>
                    ) : (
                      <>
                        <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>Aucun ami pour l'instant.</p>
                        <button type="button" onClick={() => { setActiveSection('amis'); setShowAddModal(true) }}
                          className="cdy-btn cdy-btn-primary g-film" style={{ marginTop: 16, padding: '12px 20px' }}>
                          <Plus size={13} /> Ajouter un ami
                        </button>
                      </>
                    )}
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
                      <h3>Mes amis ({actualFriends.length})</h3>
                    </div>
                    {loadingFriends ? (
                      <div className="cdy-card h-32 animate-pulse" style={{ background: 'var(--line)' }} />
                    ) : actualFriends.length === 0 ? (
                      <div className="cdy-card" style={{ padding: 24, color: 'var(--ink-2)', fontSize: 14 }}>
                        Aucun ami pour l'instant. Invite des joueurs !
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        {actualFriends.map((f) => (
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

      <div className="lg:hidden" style={{ height: 80 }} />
      <MobileTabBar activeTab="friends" />
    </div>
  )
}
