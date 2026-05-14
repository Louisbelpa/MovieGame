import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Pencil,
  Check,
  X,
  LogOut,
  Flame,
  Film,
  Tv,
  Landmark,
  Lock,
  Users,
  Eye,
  EyeOff,
  ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authSendVerificationEmail, authChangePassword } from '@/api/client'
import { loadStats } from '@/lib/storage'
import { FEATURES } from '@/config/features'
import type { GameStats } from '@/types'

type TabMode = 'film' | 'series' | 'wiki'

// ─── Distribution bar chart (same design as StatsModal) ──────────────────────

function DistributionChart({
  distribution,
  barClass = 'bg-film-gold',
}: {
  distribution: Record<string, number>
  barClass?: string
}) {
  const keys = (['1', '2', '3', '4', '5'] as const).filter((k) => k in distribution || true)
  const maxVal = Math.max(1, ...keys.map((k) => distribution[k] ?? 0))

  return (
    <div className="flex flex-col gap-1.5">
      {keys.map((attemptKey, idx) => {
        const count = distribution[attemptKey] ?? 0
        const pct = Math.round((count / maxVal) * 100)
        return (
          <div key={attemptKey} className="flex items-center gap-2 text-sm">
            <span className="w-3 text-film-text-dim text-sm font-mono">{attemptKey}</span>
            <div className="flex-1 h-5 bg-film-gray rounded overflow-hidden">
              <motion.div
                className={`h-full rounded ${barClass}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                transition={{ duration: 0.5, delay: (idx + 1) * 0.06, ease: 'easeOut' }}
              />
            </div>
            <span className="w-4 text-film-text-dim text-sm text-right">{count}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Stat cell ────────────────────────────────────────────────────────────────

function StatCell({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-3">
      <span className="text-2xl font-bold font-title text-gradient-gold">{value}</span>
      <span className="text-xs text-film-text-dim uppercase tracking-wide leading-tight text-center">
        {label}
      </span>
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

  // Redirect only once auth check is done and user is not logged in
  useEffect(() => {
    if (!isLoading && user === null) navigate('/', { replace: true })
  }, [user, isLoading, navigate])

  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameLoading, setNameLoading] = useState(false)

  const [verifySent, setVerifySent] = useState(false)
  const [verifyCooldown, setVerifyCooldown] = useState(0)

  const [pwOpen, setPwOpen] = useState(false)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwShowCurrent, setPwShowCurrent] = useState(false)
  const [pwShowNew, setPwShowNew] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  const tabs: TabMode[] = [
    'film',
    ...(FEATURES.enableSeries ? (['series'] as TabMode[]) : []),
    ...(FEATURES.enableWiki ? (['wiki'] as TabMode[]) : []),
  ]
  const [activeTab, setActiveTab] = useState<TabMode>('film')

  const stats: GameStats = useMemo(() => loadStats(activeTab), [activeTab])

  const winRate =
    stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0

  // distribution as Record<string, number> for the chart
  const distAsString: Record<string, number> = Object.fromEntries(
    ([1, 2, 3, 4, 5] as const).map((k) => [String(k), stats.guessDistribution[k] ?? 0])
  )

  if (isLoading || !user) return (
    <div className="min-h-screen bg-film-black flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-film-gold border-t-transparent animate-spin" />
    </div>
  )

  const initial = user.displayName.charAt(0).toUpperCase()

  function startEdit() {
    setNameInput(user!.displayName)
    setEditing(true)
  }

  async function saveEdit() {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === user!.displayName) { setEditing(false); return }
    setNameLoading(true)
    try {
      await updateProfile({ displayName: trimmed })
    } finally {
      setNameLoading(false)
      setEditing(false)
    }
  }

  async function handleChangePassword() {
    setPwError(null)
    if (pwNew.length < 8) { setPwError('Le nouveau mot de passe doit contenir au moins 8 caractères.'); return }
    if (pwNew !== pwConfirm) { setPwError('Les mots de passe ne correspondent pas.'); return }
    setPwLoading(true)
    try {
      await authChangePassword(pwCurrent, pwNew)
      setPwSuccess(true)
      setPwCurrent(''); setPwNew(''); setPwConfirm('')
      setTimeout(() => { setPwOpen(false); setPwSuccess(false) }, 1800)
    } catch (e: unknown) {
      setPwError((e as { message?: string })?.message ?? 'Une erreur est survenue.')
    } finally {
      setPwLoading(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  async function handleSendVerification() {
    try {
      await authSendVerificationEmail()
      setVerifySent(true)
      setVerifyCooldown(60)
      const iv = setInterval(() => {
        setVerifyCooldown((prev) => {
          if (prev <= 1) { clearInterval(iv); return 0 }
          return prev - 1
        })
      }, 1000)
    } catch {
      // ignore
    }
  }

  const tabLabel: Record<TabMode, string> = {
    film: 'Films',
    series: 'Séries',
    wiki: 'Personnalités',
  }

  const tabColor: Record<TabMode, string> = {
    film: 'border-film-gold text-film-gold',
    series: 'border-purple-400 text-purple-400',
    wiki: 'border-blue-400 text-blue-400',
  }

  const tabInactive = 'border-transparent text-film-text-dim hover:text-film-text'

  return (
    <div className="min-h-screen bg-film-black text-film-text">
      {/* Minimal header */}
      <header className="sticky top-0 z-30 w-full border-b border-film-border bg-film-black/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => history.length > 1 ? history.back() : navigate('/')}
            aria-label="Retour"
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-gray transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} aria-hidden />
          </button>
          <span className="font-title text-lg font-semibold">Mon profil</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">

        {/* ── Profile card ── */}
        <div className="rounded-xl border border-film-border bg-white/[0.03] p-5 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-film-gold/20 border border-film-gold/40 flex items-center justify-center text-2xl font-bold text-film-gold flex-shrink-0">
              {initial}
            </div>

            {/* Name + email */}
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void saveEdit(); if (e.key === 'Escape') setEditing(false) }}
                    className="flex-1 rounded-lg border border-film-border bg-film-gray px-3 py-1.5 text-sm text-film-text focus:outline-none focus:border-film-gold focus:ring-1 focus:ring-film-gold"
                    maxLength={40}
                    disabled={nameLoading}
                  />
                  <button
                    type="button"
                    onClick={() => void saveEdit()}
                    disabled={nameLoading}
                    aria-label="Enregistrer"
                    className="text-film-green hover:opacity-80 disabled:opacity-40 cursor-pointer"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    aria-label="Annuler"
                    className="text-film-text-dim hover:text-film-text cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-film-text truncate">{user.displayName}</span>
                  <button
                    type="button"
                    onClick={startEdit}
                    aria-label="Modifier le pseudo"
                    className="text-film-text-dim hover:text-film-text cursor-pointer flex-shrink-0"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-sm text-film-text-dim truncate">{user.email ?? '—'}</span>
                {user.email && user.emailVerified === false && (
                  <span className="inline-flex items-center gap-1 text-xs bg-amber-900/40 border border-amber-700/40 text-amber-400 rounded-full px-2 py-0.5">
                    Email non vérifié
                  </span>
                )}
              </div>

              {user.email && user.emailVerified === false && (
                <button
                  type="button"
                  onClick={() => void handleSendVerification()}
                  disabled={verifyCooldown > 0}
                  className="mt-1.5 text-xs text-film-gold hover:underline disabled:opacity-50 cursor-pointer disabled:cursor-default"
                >
                  {verifySent
                    ? verifyCooldown > 0
                      ? `Email envoyé ! Renvoyer dans ${verifyCooldown}s`
                      : 'Email envoyé !'
                    : "Renvoyer l'email de vérification"}
                </button>
              )}
            </div>
          </div>

        </div>

        {/* ── Stats card ── */}
        <div className="rounded-xl border border-film-border bg-white/[0.03] p-5 flex flex-col gap-4">
          {/* Mode tabs */}
          {tabs.length > 1 && (
            <div className="flex border-b border-film-border">
              {tabs.map((t) => {
                const TabIcon = t === 'film' ? Film : t === 'series' ? Tv : Landmark
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActiveTab(t)}
                    className={`flex items-center gap-1.5 pb-2.5 px-3 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
                      activeTab === t ? tabColor[t] : tabInactive
                    }`}
                  >
                    <TabIcon size={14} aria-hidden />
                    {tabLabel[t]}
                  </button>
                )
              })}
            </div>
          )}

          {/* Stat cells */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <StatCell value={stats.gamesPlayed} label="Joués" />
            <StatCell value={`${winRate}%`} label="Victoires" />
            <StatCell value={stats.currentStreak} label="Série" />
            <StatCell value={stats.maxStreak} label="Max série" />
          </div>

          {/* Distribution */}
          <div>
            <p className="text-sm font-semibold text-film-text-dim uppercase tracking-wider mb-3">
              Ma distribution
            </p>
            <DistributionChart distribution={distAsString} />
          </div>
        </div>

        {/* ── Streak card ── */}
        <div className="rounded-xl border border-film-border bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flame size={32} className="text-amber-400" aria-hidden />
              <div>
                <div className="text-3xl font-bold font-title text-gradient-gold">
                  {stats.currentStreak}
                </div>
                <div className="text-xs text-film-text-dim mt-0.5">jours de suite</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-film-text-dim uppercase tracking-wider">Max</div>
              <div className="text-2xl font-bold text-film-gold">{stats.maxStreak}</div>
            </div>
          </div>
        </div>

        {/* ── Friends card ── */}
        <a
          href="/friends"
          className="group rounded-xl border border-film-border bg-white/[0.03] hover:bg-white/[0.05] p-5 flex items-center gap-4 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
            <Users size={18} className="text-film-text-dim group-hover:text-film-text transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-film-text">Scores de mes amis</p>
            <p className="text-sm text-film-text-dim mt-0.5">Compare tes résultats avec tes amis</p>
          </div>
          <ChevronRight size={16} className="text-film-text-dim/40 group-hover:text-film-text-dim transition-colors shrink-0" />
        </a>

        {/* ── Security card ── */}
        {user.email && (
          <div className="rounded-xl border border-film-border bg-white/[0.03] overflow-hidden">
            <button
              type="button"
              onClick={() => { setPwOpen((v) => !v); setPwError(null); setPwSuccess(false) }}
              className="w-full flex items-center gap-4 p-5 hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
                <Lock size={18} className="text-film-text-dim" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-film-text">Changer le mot de passe</p>
                <p className="text-sm text-film-text-dim mt-0.5">Modifier ton mot de passe de connexion</p>
              </div>
              <ChevronRight
                size={16}
                className={`text-film-text-dim/40 shrink-0 transition-transform ${pwOpen ? 'rotate-90' : ''}`}
              />
            </button>

            {pwOpen && (
              <div className="border-t border-film-border px-5 pb-5 pt-4 flex flex-col gap-3">
                {pwSuccess ? (
                  <p className="text-sm text-film-green text-center py-2">Mot de passe mis à jour ✓</p>
                ) : (
                  <>
                    {/* Mot de passe actuel */}
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

                    {/* Nouveau mot de passe */}
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

                    {/* Confirmation */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-film-text-dim uppercase tracking-wide">Confirmer le nouveau mot de passe</label>
                      <input
                        type="password"
                        value={pwConfirm}
                        onChange={(e) => setPwConfirm(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') void handleChangePassword() }}
                        placeholder="••••••••"
                        className="w-full rounded-lg border border-film-border bg-film-gray px-3 py-2 text-sm text-film-text focus:outline-none focus:border-film-gold focus:ring-1 focus:ring-film-gold"
                        disabled={pwLoading}
                      />
                    </div>

                    {pwError && <p className="text-sm text-film-red">{pwError}</p>}

                    <div className="flex gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => void handleChangePassword()}
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

        {/* ── Logout ── */}
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex items-center gap-2 text-sm text-film-text-dim hover:text-film-red transition-colors cursor-pointer w-fit mx-auto pb-4"
        >
          <LogOut size={16} />
          Se déconnecter
        </button>

      </div>
    </div>
  )
}
