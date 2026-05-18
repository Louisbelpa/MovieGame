import { useEffect, useState } from 'react'
import { Users, Trophy, Film, Tv, User, UserPlus, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAuthModal } from '@/components/modals/AuthModal'
import { friendsGetAll, type FriendEntry } from '@/api/client'
import { FEATURES } from '@/config/features'
import { getTodayParis } from '@/store/gameStore'

function winsCount(entry: FriendEntry): number {
  return [entry.scores.film, entry.scores.series, entry.scores.wiki]
    .filter((s) => s?.won).length
}

function hasPlayed(entry: FriendEntry): boolean {
  return !!(entry.scores.film || entry.scores.series || entry.scores.wiki)
}

function ModeIcon({ mode }: { mode: 'film' | 'series' | 'wiki' }) {
  const cls = 'shrink-0'
  if (mode === 'series') return <Tv size={11} className={cls} style={{ color: 'var(--sg-series)' }} />
  if (mode === 'wiki')   return <User size={11} className={cls} style={{ color: 'var(--sg-wiki)' }} />
  return <Film size={11} className={cls} style={{ color: 'var(--sg-films)' }} />
}

function ScoreDot({ won, played }: { won: boolean; played: boolean }) {
  if (!played) return <span className="w-2 h-2 rounded-full bg-film-border/40" />
  return <span className={`w-2 h-2 rounded-full ${won ? 'bg-film-green' : 'bg-film-red/60'}`} />
}

interface FriendsSidebarProps {
  friends?: FriendEntry[]
  loading?: boolean
}

export function FriendsSidebar({ friends: friendsProp, loading: loadingProp }: FriendsSidebarProps = {}) {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const { open: openAuth } = useAuthModal()
  const [ownFriends, setOwnFriends] = useState<FriendEntry[]>([])
  const [ownLoading, setOwnLoading] = useState(false)

  // Self-fetch only when used standalone (no props passed from parent)
  useEffect(() => {
    if (friendsProp !== undefined || !user) return
    setOwnLoading(true)
    friendsGetAll(getTodayParis())
      .then((r) => setOwnFriends(r.friends ?? []))
      .catch(() => {})
      .finally(() => setOwnLoading(false))
  }, [user, friendsProp])

  const friends = friendsProp ?? ownFriends
  const loading = loadingProp ?? ownLoading

  if (isLoading) {
    return (
      <aside className="rounded-2xl border border-film-border bg-[#0e1219] p-5">
        <div className="h-4 w-16 rounded bg-white/[0.06] animate-pulse mb-4" />
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      </aside>
    )
  }

  if (!user) {
    return (
      <aside className="rounded-2xl border border-film-border bg-[#0e1219] p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center">
            <Users size={15} className="text-film-text-dim" />
          </div>
          <p className="font-semibold text-film-text text-sm">Amis</p>
        </div>
        <p className="text-sm text-film-text-dim leading-relaxed">
          Connecte-toi pour comparer tes scores avec tes amis en temps réel.
        </p>
        <button
          type="button"
          onClick={() => openAuth('login')}
          className="w-full rounded-lg py-2 text-sm font-semibold text-film-black transition-colors"
          style={{ background: 'var(--sg-films)' }}
        >
          Se connecter
        </button>
      </aside>
    )
  }

  const others = friends.filter((e) => !e.isMe)
  const sorted = [...others].sort((a, b) => winsCount(b) - winsCount(a))
  const playedCount = others.filter(hasPlayed).length
  const totalCount  = others.length

  // Insight: is the user leading the leaderboard?
  const userEntry = friends.find((e) => e.isMe)
  const isLeading = userEntry && sorted[0]?.isMe && winsCount(userEntry) > 0

  // How many wins needed for gold (top score + 1)
  const topWins = sorted[0] ? winsCount(sorted[0]) : 0
  const userWins = userEntry ? winsCount(userEntry) : 0
  const winsToGold = topWins - userWins

  return (
    <aside className="rounded-2xl border border-film-border bg-[#0e1219] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-film-border">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-film-gold" />
          <p className="text-sm font-semibold text-film-text">Amis aujourd'hui</p>
        </div>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <span className="text-xs font-mono text-film-text-dim">
              {playedCount}/{totalCount}
            </span>
          )}
          <a
            href="/friends"
            className="text-xs text-film-text-dim hover:text-film-text transition-colors flex items-center gap-0.5"
          >
            Voir <ChevronRight size={12} />
          </a>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col gap-2 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="p-5 flex flex-col gap-3 items-center text-center">
          <Users size={32} className="text-film-text-dim/30" />
          <p className="text-sm text-film-text-dim">Pas encore d'amis.<br />Invite quelqu'un !</p>
          <a
            href="/friends"
            className="flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-2 border border-film-border hover:bg-white/[0.04] text-film-text-dim hover:text-film-text transition-colors"
          >
            <UserPlus size={13} />
            Ajouter un ami
          </a>
        </div>
      ) : (
        <ol className="divide-y divide-film-border/40">
          {sorted.slice(0, 6).map((entry, idx) => {
            const wins = winsCount(entry)
            const rankColor = idx === 0 ? '#d4a64a' : idx === 1 ? '#9aa3ad' : idx === 2 ? '#c87533' : undefined
            return (
              <li key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                <span
                  className="w-5 text-center text-xs font-mono font-bold shrink-0"
                  style={{ color: rankColor ?? 'var(--color-film-text-dim)' }}
                >
                  {idx + 1}
                </span>
                <div className="w-7 h-7 rounded-full bg-film-gold/20 border border-film-gold/30 flex items-center justify-center text-xs font-bold text-film-gold shrink-0">
                  {entry.displayName.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 text-sm font-medium text-film-text truncate min-w-0">
                  {entry.isMe ? 'Toi' : entry.displayName}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <ScoreDot won={entry.scores.film?.won ?? false} played={!!entry.scores.film} />
                  {FEATURES.enableSeries && (
                    <ScoreDot won={entry.scores.series?.won ?? false} played={!!entry.scores.series} />
                  )}
                  {FEATURES.enableWiki && (
                    <ScoreDot won={entry.scores.wiki?.won ?? false} played={!!entry.scores.wiki} />
                  )}
                  <span className="ml-1 text-xs font-bold text-film-text-dim font-mono w-3 text-center">{wins}</span>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {/* Insight banner */}
      {(isLeading || (!isLeading && winsToGold > 0 && userEntry)) && (
        <div className="border-t border-film-border/40 px-4 py-2.5 flex items-center gap-2">
          <span className="text-amber-400 text-sm shrink-0">💡</span>
          <p className="text-xs text-film-text-dim leading-snug">
            {isLeading ? (
              <><strong className="text-film-text">Tu mènes le classement</strong> du jour.</>
            ) : (
              <>Plus que <strong className="text-film-text">{winsToGold} victoire{winsToGold > 1 ? 's' : ''}</strong> pour prendre la tête.</>
            )}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-film-border/40 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {(['film', FEATURES.enableSeries ? 'series' : null, FEATURES.enableWiki ? 'wiki' : null] as const)
            .filter(Boolean)
            .map((m) => (
              <span key={m} className="flex items-center gap-0.5 text-[10px] text-film-text-dim">
                <ModeIcon mode={m!} />
              </span>
            ))}
          <span className="text-[10px] text-film-text-dim ml-0.5">= victoire</span>
        </div>
        <a href="/friends" className="flex items-center gap-1 text-[11px] text-film-gold hover:underline font-medium">
          <UserPlus size={11} />
          Inviter
        </a>
      </div>
    </aside>
  )
}
