import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Pencil,
  Check,
  X,
  LogOut,
  Lock,
  Users,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  Camera,
  Settings,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import type { ServerStatsMap } from '@/store/authStore'
import { authDeleteAccount, authChangePassword, authUploadAvatar } from '@/api/client'
import { loadStats } from '@/lib/storage'
import { FEATURES } from '@/config/features'
import type { GameStats } from '@/types'
import { ApertureIcon } from '@/components/ui/ApertureIcon'
import { Modal } from '@/components/ui/Modal'

// ─── Achievements ─────────────────────────────────────────────────────────────

interface Achievement {
  id: string
  title: string
  description: string
  hint: string
  icon: string
  color: string
  earned: boolean
  progress?: { current: number; target: number }
}

function buildAchievements(serverStats: ServerStatsMap): Achievement[] {
  const film   = serverStats.film   ?? { wins: loadStats('film').gamesWon,   gamesPlayed: loadStats('film').gamesPlayed,   maxStreak: loadStats('film').maxStreak,   distribution: Object.fromEntries(Object.entries(loadStats('film').guessDistribution).map(([k,v]) => [k, v])) }
  const series = serverStats.series ?? { wins: loadStats('series').gamesWon, gamesPlayed: loadStats('series').gamesPlayed, maxStreak: loadStats('series').maxStreak, distribution: Object.fromEntries(Object.entries(loadStats('series').guessDistribution).map(([k,v]) => [k, v])) }
  const wiki   = serverStats.wiki   ?? { wins: loadStats('wiki').gamesWon,   gamesPlayed: loadStats('wiki').gamesPlayed,   maxStreak: loadStats('wiki').maxStreak,   distribution: Object.fromEntries(Object.entries(loadStats('wiki').guessDistribution).map(([k,v]) => [k, v])) }

  const totalWins   = film.wins + series.wins + wiki.wins
  const totalPlayed = film.gamesPlayed + series.gamesPlayed + wiki.gamesPlayed
  const maxStreak   = Math.max(film.maxStreak, series.maxStreak, wiki.maxStreak)
  const firstGuess  = (film.distribution['1'] ?? 0) + (series.distribution['1'] ?? 0) + (wiki.distribution['1'] ?? 0)

  return [
    { id: 'first_win',   title: 'Première victoire',  description: 'Gagner une partie',               hint: "Trouve la réponse correcte dans n'importe quel mode.",                                                 icon: '⭐', color: '#d4a842', earned: totalWins >= 1,   progress: totalWins >= 1   ? undefined : { current: totalWins,   target: 1   } },
    { id: 'speed_run',   title: 'Coup de maître',      description: 'Trouver du premier essai',        hint: 'Propose la bonne réponse dès le premier essai sans aucun indice.',                                     icon: '⚡', color: '#f59e0b', earned: firstGuess >= 1,  progress: firstGuess >= 1  ? undefined : { current: firstGuess,  target: 1   } },
    { id: 'plays_10',    title: 'Habitué',             description: '10 parties jouées',               hint: 'Joue 10 parties au total, peu importe le mode ou le résultat.',                                        icon: '🎮', color: '#22c55e', earned: totalPlayed >= 10, progress: totalPlayed >= 10? undefined : { current: totalPlayed, target: 10  } },
    { id: 'streak_7',    title: 'Série de feu',        description: '7 jours consécutifs',             hint: "Gagne une partie chaque jour pendant 7 jours d'affilée. Un seul mode suffit par jour.",               icon: '🔥', color: '#f97316', earned: maxStreak >= 7,   progress: maxStreak >= 7   ? undefined : { current: maxStreak,   target: 7   } },
    { id: 'streak_30',   title: 'Invincible',          description: '30 jours consécutifs',            hint: 'Gagne une partie chaque jour pendant 30 jours sans interruption.',                                     icon: '👑', color: '#d4a842', earned: maxStreak >= 30,  progress: maxStreak >= 30  ? undefined : { current: maxStreak,   target: 30  } },
    { id: 'wins_50',     title: 'Cinéphile',           description: '50 victoires au total',           hint: 'Accumule 50 victoires en tout, tous modes confondus.',                                                 icon: '🏆', color: '#d4a842', earned: totalWins >= 50,  progress: totalWins >= 50  ? undefined : { current: totalWins,   target: 50  } },
    { id: 'wins_100',    title: 'Légende',             description: '100 victoires au total',          hint: 'Atteins 100 victoires cumulées. Une récompense réservée aux joueurs les plus assidus.',                icon: '🥇', color: '#8b6ff0', earned: totalWins >= 100, progress: totalWins >= 100 ? undefined : { current: totalWins,   target: 100 } },
    { id: 'film_master', title: 'Maître du 7e art',    description: '50 films trouvés',                hint: 'Trouve 50 films dans le mode Films.',                                                                  icon: '🎬', color: '#d4a842', earned: film.wins >= 50,  progress: film.wins >= 50  ? undefined : { current: film.wins,   target: 50  } },
    { id: 'wiki_master', title: 'Encyclopédiste',      description: '50 personnalités trouvées',       hint: 'Identifie 50 personnalités dans le mode Personnalités.',                                               icon: '🧠', color: '#22c55e', earned: wiki.wins >= 50,  progress: wiki.wins >= 50  ? undefined : { current: wiki.wins,   target: 50  } },
  ]
}

function AchievementCard({ a, hinted, onToggleHint }: {
  a: Achievement
  hinted: string | null
  onToggleHint: (id: string) => void
}) {
  if (a.earned) {
    return (
      <div
        title={`${a.title} — ${a.description}`}
        className="flex flex-col items-start justify-between p-3 rounded-xl border transition-colors flex-shrink-0
          w-[100px] h-[100px] lg:w-auto lg:h-auto lg:aspect-square"
        style={{ borderColor: `${a.color}30`, background: `${a.color}14` }}
      >
        <span className="text-2xl leading-none">{a.icon}</span>
        <div>
          <p className="text-[11px] font-semibold text-film-text leading-tight">{a.title}</p>
          <p className="text-[9px] text-film-text-dim leading-tight">{a.description}</p>
        </div>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onToggleHint(a.id)}
      className="flex-shrink-0 w-[100px] h-[100px] lg:w-auto lg:h-auto lg:aspect-square
        bg-film-surface border border-film-border/30 rounded-xl p-3
        flex flex-col items-start justify-between cursor-pointer hover:bg-film-dark/70 transition-colors text-left"
    >
      <Lock size={14} className="text-film-text-dim/20" />
      <div className="w-full">
        <p className="text-[11px] text-film-text-dim/40 leading-tight">{a.title}</p>
        {a.progress && a.progress.current > 0 && (
          <div className="mt-1 w-full">
            <div className="h-0.5 rounded-full bg-film-gray overflow-hidden">
              <div
                className="h-full rounded-full bg-film-text-dim/25 transition-all"
                style={{ width: `${Math.min(100, (a.progress.current / a.progress.target) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-film-text-dim/40 mt-0.5 block tabular-nums">
              {a.progress.current}/{a.progress.target}
            </span>
          </div>
        )}
        {hinted === a.id && (
          <span className="text-[10px] text-film-text-dim leading-tight mt-0.5 block">{a.hint}</span>
        )}
      </div>
    </button>
  )
}

function AchievementsSection({ serverStats }: { serverStats: ServerStatsMap }) {
  const achievements = useMemo(() => buildAchievements(serverStats), [serverStats])
  const earned = achievements.filter((a) => a.earned)
  const [hinted, setHinted] = useState<string | null>(null)

  function toggleHint(id: string) {
    setHinted((prev) => (prev === id ? null : id))
  }

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: 'var(--color-film-surface)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-mono uppercase tracking-widest text-film-text-dim">SUCCÈS</p>
        <span className="text-xs text-film-text-dim">{earned.length}/{achievements.length}</span>
      </div>

      {/* Mobile: horizontal slider / Desktop: 3-col grid */}
      <div className="lg:hidden -mx-5 px-5">
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
          {achievements.map((a) => (
            <AchievementCard key={a.id} a={a} hinted={hinted} onToggleHint={toggleHint} />
          ))}
        </div>
      </div>
      <div className="hidden lg:grid grid-cols-3 gap-2.5">
        {achievements.map((a) => (
          <AchievementCard key={a.id} a={a} hinted={hinted} onToggleHint={toggleHint} />
        ))}
      </div>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TabMode = 'film' | 'series' | 'wiki' | 'total'

// ─── Distribution bar chart ───────────────────────────────────────────────────

function DistributionChart({
  distribution,
  losses,
}: {
  distribution: Record<string, number>
  losses?: number
}) {
  const keys = (['1', '2', '3', '4', '5'] as const).filter((k) => k in distribution || true)
  const maxVal = Math.max(1, ...keys.map((k) => distribution[k] ?? 0))
  const maxIdx = keys.reduce(
    (best, k, i) => ((distribution[k] ?? 0) > (distribution[keys[best]] ?? 0) ? i : best),
    0
  )

  return (
    <div className="flex flex-col gap-1.5">
      {keys.map((attemptKey, idx) => {
        const count = distribution[attemptKey] ?? 0
        const pct = Math.round((count / maxVal) * 100)
        const isMax = idx === maxIdx && count > 0
        return (
          <div key={attemptKey} className="flex items-center gap-2 text-sm">
            <span className="w-3 text-film-text-dim text-sm font-mono">{attemptKey}</span>
            <div className="flex-1 h-5 bg-film-gray rounded overflow-hidden">
              <motion.div
                className="h-full rounded"
                style={isMax
                  ? { background: 'var(--mode-color, linear-gradient(180deg, #e8c06a, #d4a64a, #a07030))' }
                  : { background: 'color-mix(in srgb, var(--mode-color, #d4a64a) 45%, transparent)' }
                }
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                transition={{ duration: 0.5, delay: (idx + 1) * 0.06, ease: 'easeOut' }}
              />
            </div>
            <span className="w-4 text-film-text-dim text-sm text-right font-mono">{count}</span>
          </div>
        )
      })}
      {losses !== undefined && losses > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 text-film-red text-sm font-mono">×</span>
          <div className="flex-1 h-5 bg-film-gray rounded overflow-hidden">
            <motion.div
              className="h-full rounded bg-film-red/60"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(Math.round((losses / Math.max(1, maxVal)) * 100), 4)}%` }}
              transition={{ duration: 0.5, delay: 0.36, ease: 'easeOut' }}
            />
          </div>
          <span className="w-4 text-film-red text-sm text-right font-mono">{losses}</span>
        </div>
      )}
    </div>
  )
}

// ─── Stat cell ────────────────────────────────────────────────────────────────

function StatCell({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-3">
      <span
        className="font-title font-bold text-gradient-gold"
        style={{ fontSize: '32px', lineHeight: 1 }}
      >
        {value}
      </span>
      <span className="text-[10px] font-mono uppercase tracking-widest text-film-text-dim mt-1 text-center leading-tight">
        {label}
      </span>
    </div>
  )
}

// ─── Settings Modal ───────────────────────────────────────────────────────────

interface SettingsModalProps {
  onClose: () => void
  user: { displayName: string; email?: string | null; emailVerified?: boolean }
  onSaveName: (name: string) => Promise<void>
  onChangePassword: (current: string, next: string, confirm: string) => Promise<string | null>
  onLogout: () => Promise<void>
  onDeleteAccount: () => Promise<void>
}

function SettingsModal({ onClose, user, onSaveName, onChangePassword, onLogout, onDeleteAccount }: SettingsModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  const [nameInput, setNameInput] = useState(user.displayName)
  const [nameLoading, setNameLoading] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  const [pwOpen, setPwOpen] = useState(false)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwShowCurrent, setPwShowCurrent] = useState(false)
  const [pwShowNew, setPwShowNew] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  async function handleSaveName() {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === user.displayName) return
    setNameLoading(true)
    try {
      await onSaveName(trimmed)
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 1800)
    } finally {
      setNameLoading(false)
    }
  }

  async function handleChangePw() {
    setPwError(null)
    setPwLoading(true)
    const err = await onChangePassword(pwCurrent, pwNew, pwConfirm)
    setPwLoading(false)
    if (err) { setPwError(err); return }
    setPwSuccess(true)
    setPwCurrent(''); setPwNew(''); setPwConfirm('')
    setTimeout(() => { setPwOpen(false); setPwSuccess(false) }, 1800)
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center"
      onClick={handleOverlayClick}
    >
      <div className="bg-film-black border border-film-border rounded-2xl p-6 max-w-sm w-full mx-4 mt-24 flex flex-col gap-5 lg:mx-auto fixed bottom-0 left-0 right-0 rounded-t-2xl rounded-b-none mx-0 lg:static lg:rounded-2xl lg:bottom-auto lg:left-auto lg:right-auto lg:mx-auto">
        <div className="flex items-center justify-between">
          <p className="font-title font-semibold text-film-text">Réglages</p>
          <button
            type="button"
            onClick={onClose}
            className="text-film-text-dim hover:text-film-text transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-film-text-dim uppercase tracking-wide font-mono">Pseudo</label>
          <div className="flex items-center gap-2">
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveName() }}
              className="flex-1 rounded-lg border border-film-border bg-film-gray px-3 py-2 text-sm text-film-text focus:outline-none focus:border-film-gold focus:ring-1 focus:ring-film-gold"
              maxLength={40}
              disabled={nameLoading}
            />
            <button
              type="button"
              onClick={() => void handleSaveName()}
              disabled={nameLoading || !nameInput.trim() || nameInput.trim() === user.displayName}
              className="text-film-green hover:opacity-80 disabled:opacity-30 cursor-pointer disabled:cursor-default"
              aria-label="Enregistrer le pseudo"
            >
              <Check size={18} />
            </button>
          </div>
          {nameSaved && <p className="text-xs text-film-green">Pseudo mis à jour ✓</p>}
        </div>

        {user.email && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => { setPwOpen((v) => !v); setPwError(null); setPwSuccess(false) }}
              className="flex items-center justify-between text-sm text-film-text-dim hover:text-film-text transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2"><Lock size={14} /> Changer le mot de passe</span>
              <ChevronRight size={14} className={`transition-transform ${pwOpen ? 'rotate-90' : ''}`} />
            </button>

            {pwOpen && (
              <div className="flex flex-col gap-3 border-t border-film-border pt-3 mt-1">
                {pwSuccess ? (
                  <p className="text-sm text-film-green text-center py-2">Mot de passe mis à jour ✓</p>
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-film-text-dim uppercase tracking-wide">Mot de passe actuel</label>
                      <div className="relative">
                        <input
                          type={pwShowCurrent ? 'text' : 'password'}
                          value={pwCurrent}
                          onChange={(e) => setPwCurrent(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-lg border border-film-border bg-film-gray px-3 py-2 pr-10 text-sm text-film-text focus:outline-none focus:border-film-gold focus:ring-1 focus:ring-film-gold"
                          disabled={pwLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setPwShowCurrent((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-film-text-dim hover:text-film-text cursor-pointer"
                          tabIndex={-1}
                        >
                          {pwShowCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-film-text-dim uppercase tracking-wide">Nouveau mot de passe</label>
                      <div className="relative">
                        <input
                          type={pwShowNew ? 'text' : 'password'}
                          value={pwNew}
                          onChange={(e) => setPwNew(e.target.value)}
                          placeholder="8 caractères minimum"
                          className="w-full rounded-lg border border-film-border bg-film-gray px-3 py-2 pr-10 text-sm text-film-text focus:outline-none focus:border-film-gold focus:ring-1 focus:ring-film-gold"
                          disabled={pwLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setPwShowNew((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-film-text-dim hover:text-film-text cursor-pointer"
                          tabIndex={-1}
                        >
                          {pwShowNew ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-film-text-dim uppercase tracking-wide">Confirmer</label>
                      <input
                        type="password"
                        value={pwConfirm}
                        onChange={(e) => setPwConfirm(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') void handleChangePw() }}
                        placeholder="••••••••"
                        className="w-full rounded-lg border border-film-border bg-film-gray px-3 py-2 text-sm text-film-text focus:outline-none focus:border-film-gold focus:ring-1 focus:ring-film-gold"
                        disabled={pwLoading}
                      />
                    </div>
                    {pwError && <p className="text-sm text-film-red">{pwError}</p>}
                    <div className="flex gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => void handleChangePw()}
                        disabled={pwLoading || !pwCurrent || !pwNew || !pwConfirm}
                        className="flex-1 rounded-lg bg-film-gold text-film-black font-semibold text-sm py-2.5 hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer disabled:cursor-default"
                      >
                        {pwLoading ? 'Enregistrement…' : 'Mettre à jour'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPwOpen(false); setPwError(null); setPwCurrent(''); setPwNew(''); setPwConfirm('') }}
                        className="px-4 rounded-lg border border-film-border text-sm text-film-text-dim hover:text-film-text transition-colors cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => void onLogout()}
          className="flex items-center gap-2 text-sm text-film-red hover:opacity-80 transition-opacity cursor-pointer font-medium"
        >
          <LogOut size={15} />
          Se déconnecter
        </button>

        <button
          type="button"
          onClick={() => void onDeleteAccount()}
          className="flex items-center gap-2 text-sm text-film-text-dim/50 hover:text-film-red transition-colors cursor-pointer text-left"
        >
          Supprimer mon compte
        </button>

        <button
          type="button"
          onClick={onClose}
          className="text-sm text-film-text-dim hover:text-film-text transition-colors cursor-pointer border border-film-border rounded-lg py-2.5"
        >
          Fermer
        </button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const logout = useAuthStore((s) => s.logout)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const setUser = useAuthStore((s) => s.setUser)
  const serverStats = useAuthStore((s) => s.serverStats)

  useEffect(() => {
    if (!isLoading && user === null) navigate('/', { replace: true })
  }, [user, isLoading, navigate])

  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const enabledModes: Array<'film' | 'series' | 'wiki'> = [
    'film',
    ...(FEATURES.enableSeries ? (['series'] as const) : []),
    ...(FEATURES.enableWiki ? (['wiki'] as const) : []),
  ]

  const tabs: TabMode[] = [
    ...enabledModes,
    ...(enabledModes.length >= 2 ? (['total'] as TabMode[]) : []),
  ]

  const [activeTab, setActiveTab] = useState<TabMode>('film')

  const localStats: GameStats = useMemo(
    () => loadStats(activeTab === 'total' ? 'film' : activeTab),
    [activeTab]
  )

  const sv = activeTab !== 'total' ? serverStats[activeTab] : null

  const stats = useMemo(() => {
    if (activeTab === 'total') {
      let played = 0
      let won = 0
      let streak = 0
      let maxSt = 0
      const dist: Record<string, number> = {}
      for (const m of enabledModes) {
        const svM = serverStats[m]
        const localM = loadStats(m)
        played += svM?.gamesPlayed ?? localM.gamesPlayed
        won += svM?.wins ?? localM.gamesWon
        streak = Math.max(streak, svM?.currentStreak ?? localM.currentStreak)
        maxSt = Math.max(maxSt, svM?.maxStreak ?? localM.maxStreak)
        for (let k = 1; k <= 5; k++) {
          const count = svM ? (svM.distribution[String(k)] ?? 0) : (localM.guessDistribution[k as 1|2|3|4|5] ?? 0)
          dist[String(k)] = (dist[String(k)] ?? 0) + count
        }
      }
      return { gamesPlayed: played, gamesWon: won, currentStreak: streak, maxStreak: maxSt, guessDistributionStr: dist }
    }
    const base = {
      gamesPlayed:   sv?.gamesPlayed   ?? localStats.gamesPlayed,
      gamesWon:      sv?.wins          ?? localStats.gamesWon,
      currentStreak: sv?.currentStreak ?? localStats.currentStreak,
      maxStreak:     sv?.maxStreak     ?? localStats.maxStreak,
    }
    const guessDistributionStr: Record<string, number> = Object.fromEntries(
      ([1, 2, 3, 4, 5] as const).map((k) => [
        String(k),
        sv ? (sv.distribution[String(k)] ?? 0) : (localStats.guessDistribution[k] ?? 0),
      ])
    )
    return { ...base, guessDistributionStr }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, sv, localStats, serverStats])

  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0
  const losses = stats.gamesPlayed - stats.gamesWon

  const globalCurrentStreak = useMemo(() => {
    return Math.max(...enabledModes.map((m) => {
      const svM = serverStats[m]
      return svM?.currentStreak ?? loadStats(m).currentStreak
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverStats])

  const globalMaxStreak = useMemo(() => {
    return Math.max(...enabledModes.map((m) => {
      const svM = serverStats[m]
      return svM?.maxStreak ?? loadStats(m).maxStreak
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverStats])

  if (isLoading || !user) return (
    <div className="min-h-screen bg-film-black flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-film-gold border-t-transparent animate-spin" />
    </div>
  )

  const initial = user.displayName.charAt(0).toUpperCase()

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarLoading(true)
    setAvatarError(null)
    try {
      const { user: updated } = await authUploadAvatar(file)
      setUser(updated)
    } catch (err: unknown) {
      setAvatarError((err as { message?: string })?.message ?? 'Échec de l\'upload de la photo.')
    } finally {
      setAvatarLoading(false)
      e.target.value = ''
    }
  }

  async function handleSaveName(name: string) {
    await updateProfile({ displayName: name })
  }

  async function handleChangePassword(current: string, next: string, confirm: string): Promise<string | null> {
    if (next.length < 8) return 'Le nouveau mot de passe doit contenir au moins 8 caractères.'
    if (next !== confirm) return 'Les mots de passe ne correspondent pas.'
    try {
      await authChangePassword(current, next)
      return null
    } catch (e: unknown) {
      return (e as { message?: string })?.message ?? 'Une erreur est survenue.'
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  async function handleDeleteAccount() {
    setShowDeleteConfirm(true)
  }

  async function confirmDeleteAccount() {
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      await authDeleteAccount()
      await logout()
      navigate('/')
    } catch (err: unknown) {
      setDeleteError((err as { message?: string })?.message ?? 'Une erreur est survenue. Veuillez réessayer.')
      setDeleteLoading(false)
    }
  }

  const tabLabel: Record<TabMode, string> = {
    film: 'Films',
    series: 'Séries',
    wiki: 'Personnalités',
    total: 'Total',
  }

  const tabActiveColor: Record<TabMode, string> = {
    film:   'var(--sg-films)',
    series: 'var(--sg-series)',
    wiki:   'var(--sg-wiki)',
    total:  'var(--color-film-text)',
  }

  return (
    <div className="min-h-screen bg-film-black text-film-text">
      {/* Header */}
      <header
        className="sticky top-0 z-30 w-full h-14"
        style={{ background: 'rgba(11,11,26,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Desktop */}
        <div className="hidden lg:flex items-center justify-between h-full px-6 max-w-5xl mx-auto">
          <a href="/" className="flex items-center gap-2">
            <ApertureIcon size={28} />
            <span className="font-title font-bold text-film-text">GuessToday</span>
          </a>
          <div className="flex items-center gap-3">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="w-8 h-8 rounded-full object-cover border border-film-gold/40"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-film-gold/20 border border-film-gold/40 flex items-center justify-center text-sm font-bold text-film-gold">
                {initial}
              </div>
            )}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Réglages"
              className="text-film-text-dim hover:text-film-text transition-colors cursor-pointer"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Mobile */}
        <div className="lg:hidden flex items-center h-full px-4 gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Retour"
            className="text-film-text-dim hover:text-film-text transition-colors cursor-pointer"
          >
            <ChevronLeft size={22} />
          </button>
          <span className="font-title font-semibold text-film-text">Profil</span>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Réglages"
            className="ml-auto text-film-text-dim hover:text-film-text transition-colors cursor-pointer"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/*
        Mobile order  : identity(1) → streak(2) → stats(3) → achievements(4) → friends(5)
        Desktop layout: col-1 = identity+streak+achievements+friends  |  col-2 = stats (spans all rows)
      */}
      <div className="max-w-5xl mx-auto py-8 px-4 lg:px-10
        flex flex-col gap-6
        lg:grid lg:grid-cols-[1fr_1.2fr] lg:grid-rows-[auto_auto_auto_auto] lg:gap-x-9 lg:gap-y-6">

        {/* ── Identity hero — order 1 mobile, col 1 row 1 desktop ── */}
        <div
          className="order-1 lg:col-start-1 lg:row-start-1 rounded-2xl p-6 flex flex-col gap-4"
          style={{ background: 'var(--color-film-surface)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <label className="relative group cursor-pointer" title="Changer la photo de profil">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleAvatarUpload}
                  disabled={avatarLoading}
                />
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="w-[76px] h-[76px] rounded-full object-cover border border-film-gold/40"
                  />
                ) : (
                  <div className="w-[76px] h-[76px] rounded-full bg-film-gold/20 border border-film-gold/40 flex items-center justify-center text-2xl font-bold text-film-gold">
                    {initial}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {avatarLoading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-film-gold border-t-transparent animate-spin" />
                  ) : (
                    <Camera size={16} className="text-white" />
                  )}
                </div>
              </label>
              {avatarError && (
                <p className="text-[10px] text-film-red text-center max-w-[80px] leading-tight">{avatarError}</p>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-film-text truncate">{user.displayName}</span>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  aria-label="Modifier le pseudo"
                  className="text-film-text-dim hover:text-film-text cursor-pointer flex-shrink-0"
                >
                  <Pencil size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-sm text-film-text-dim truncate">{user.email ?? '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Streak banner — order 2 mobile, col 1 row 2 desktop ── */}
        <div
          className="order-2 lg:col-start-1 lg:row-start-2 rounded-2xl border border-amber-400/20 p-5"
          style={{ background: 'linear-gradient(135deg, rgba(212,120,30,0.15) 0%, rgba(212,166,74,0.10) 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase text-amber-400/70 mb-1">Série en cours</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl">🔥</span>
                <span className="font-title font-bold text-gradient-gold" style={{ fontSize: '36px', lineHeight: 1 }}>
                  {globalCurrentStreak}
                </span>
                <span className="text-sm text-film-text-dim mb-1">jours</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-mono uppercase text-film-text-dim/50 mb-1">RECORD</p>
              <div className="flex items-end gap-1 justify-end">
                <span className="text-xl font-bold text-film-gold">{globalMaxStreak}</span>
                <span className="text-sm text-film-text-dim mb-0.5">j</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats column — order 3 mobile, col 2 rows 1-4 desktop ── */}
        <div className="order-3 lg:col-start-2 lg:row-start-1 lg:row-end-5 flex flex-col gap-5">

          {/* Mode tabs */}
          <div className="flex gap-4 border-b border-film-border/30 mb-5">
            {tabs.map((t) => {
              const isActive = activeTab === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveTab(t)}
                  className={`pb-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
                    isActive
                      ? ''
                      : 'text-film-text-dim border-transparent hover:text-film-text'
                  }`}
                  style={isActive ? { color: tabActiveColor[t], borderColor: tabActiveColor[t] } : undefined}
                >
                  {tabLabel[t]}
                </button>
              )
            })}
          </div>

          {/* Stats 4-col */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            <StatCell value={stats.gamesPlayed} label="JOUÉS" />
            <StatCell value={`${winRate}%`} label="VICTOIRES" />
            <StatCell value={stats.currentStreak} label="SÉRIE" />
            <StatCell value={stats.maxStreak} label="MAX" />
          </div>

          {/* Distribution */}
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-film-text-dim/60 mb-3">
              TENTATIVES
            </p>
            <DistributionChart distribution={stats.guessDistributionStr} losses={losses > 0 ? losses : undefined} />
          </div>
        </div>

        {/* ── Achievements — order 4 mobile, col 1 row 3 desktop ── */}
        <div className="order-4 lg:col-start-1 lg:row-start-3">
          <AchievementsSection serverStats={serverStats} />
        </div>

        {/* ── Friends link — order 5 mobile, col 1 row 4 desktop ── */}
        <a
          href="/friends"
          className="order-5 lg:col-start-1 lg:row-start-4 group rounded-2xl p-5 flex items-center gap-4 transition-colors"
          style={{ background: 'var(--color-film-surface)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-film-dark)' }}>
            <Users size={18} className="text-film-text-dim group-hover:text-film-text transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-film-text">Scores de mes amis</p>
            <p className="text-sm text-film-text-dim mt-0.5">Compare tes résultats avec tes amis</p>
          </div>
          <ChevronRight size={16} className="text-film-text-dim/40 group-hover:text-film-text-dim transition-colors shrink-0" />
        </a>

      </div>

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          user={user}
          onSaveName={handleSaveName}
          onChangePassword={handleChangePassword}
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
        />
      )}

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => { if (!deleteLoading) { setShowDeleteConfirm(false); setDeleteError(null) } }}
        title="Supprimer mon compte"
        persistent={deleteLoading}
      >
        <p className="text-sm text-film-text-dim mb-6">
          Cette action est irréversible. Toutes vos données de jeu, statistiques et connexions seront définitivement supprimées.
        </p>
        {deleteError && (
          <p className="text-sm text-film-red mb-4">{deleteError}</p>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void confirmDeleteAccount()}
            disabled={deleteLoading}
            className="w-full rounded-lg bg-film-red text-white font-semibold text-sm py-2.5 hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer disabled:cursor-default"
          >
            {deleteLoading ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
          <button
            type="button"
            onClick={() => { setShowDeleteConfirm(false); setDeleteError(null) }}
            disabled={deleteLoading}
            className="w-full rounded-lg border border-film-border text-sm text-film-text-dim hover:text-film-text transition-colors py-2.5 cursor-pointer disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      </Modal>
    </div>
  )
}
