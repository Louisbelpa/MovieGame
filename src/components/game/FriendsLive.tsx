import { useEffect, useState } from 'react'
import { friendsGetAll } from '@/api/client'
import type { FriendEntry } from '@/api/client'
import { getTodayParis } from '@/store/gameStore'
import { useAuthStore } from '@/store/authStore'

interface FriendsLiveProps {
  mode: 'film' | 'series' | 'wiki'
}

export function FriendsLive({ mode }: FriendsLiveProps) {
  const user = useAuthStore((s) => s.user)
  const [friends, setFriends] = useState<FriendEntry[]>([])

  useEffect(() => {
    if (!user) return

    let cancelled = false

    const fetch = async () => {
      try {
        const data = await friendsGetAll(getTodayParis())
        if (!cancelled) {
          setFriends(data.friends.filter((f) => !f.isMe).slice(0, 4))
        }
      } catch {
        // silent
      }
    }

    void fetch()
    const id = setInterval(() => { void fetch() }, 30_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [user])

  if (!user || friends.length === 0) return null

  return (
    <div
      className="rounded-xl border border-film-border px-4 py-3 flex flex-col gap-3"
      style={{ background: 'rgba(14,18,25,0.95)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-widest text-film-text-dim uppercase">
          Amis en direct
        </span>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-film-green">
          <span className="w-1.5 h-1.5 rounded-full bg-film-green inline-block" aria-hidden />
          LIVE
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {friends.map((friend) => {
          const score = friend.scores[mode]
          return (
            <li key={friend.id} className="flex items-center justify-between gap-2">
              <span className="text-sm text-film-text truncate">{friend.displayName}</span>
              {score == null ? (
                <span className="text-xs text-film-text-dim">·</span>
              ) : score.won ? (
                <span className="text-xs font-mono text-film-green shrink-0">
                  {score.attemptsUsed}/5 ✓
                </span>
              ) : (
                <span className="text-xs font-mono text-film-red shrink-0">
                  {score.attemptsUsed}/5 ✗
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
