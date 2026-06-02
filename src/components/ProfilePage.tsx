import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Pencil,
  Check,
  X,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { AuthModal, useAuthModal } from '@/components/modals/AuthModal'
import { authDeleteAccount, authChangePassword, authUploadAvatar, authGetHistory } from '@/api/client'
import { loadStats, loadHistory } from '@/lib/storage'
import { FEATURES } from '@/config/features'
import { useUiPrefsStore } from '@/store/uiPrefsStore'
import type { GameStats } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Footer } from '@/components/layout/Footer'
type TabMode = 'film' | 'series' | 'wiki' | 'total'

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

// ─── Streak calendar (60 days) ───────────────────────────────────────────────

export function AuthGateNewDesign({ context }: { context: 'profile' | 'friends' }) {
  const { open: openAuth } = useAuthModal()
  const isProfile = context === 'profile'

  const filmStats = loadStats('film')
  const wikiStats = FEATURES.enableWiki ? loadStats('wiki') : { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0, guessDistribution: {} as Record<number, number> }
  const seriesStats = FEATURES.enableSeries ? loadStats('series') : { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0, guessDistribution: {} as Record<number, number> }

  const totalPlayed = filmStats.gamesPlayed + wikiStats.gamesPlayed + seriesStats.gamesPlayed
  const totalWins = filmStats.gamesWon + wikiStats.gamesWon + seriesStats.gamesWon
  const maxStreak = Math.max(filmStats.currentStreak ?? 0, wikiStats.currentStreak ?? 0, seriesStats.currentStreak ?? 0)

  const pitchTitle = isProfile ? 'Sauvegarde ton historique.' : 'Défie tes amis.'
  const pitchLabel = isProfile ? 'Ton profil' : 'Tes amis'

  const pitchDesc = totalPlayed > 0
    ? `Tu joues depuis ${totalPlayed} jours. Crée un compte pour garder ta série et tes stats sur tous tes appareils.`
    : isProfile
      ? "Crée un compte gratuit pour sauvegarder tes stats, garder ta série et accéder à ton historique depuis n'importe quel appareil."
      : "Crée un compte gratuit pour défier tes amis et comparer vos scores du jour."

  const carrots = isProfile ? [
    { icon: '🔥', title: `Garde ta série de ${maxStreak > 0 ? maxStreak : 'N'} jours`, desc: "Sans compte, elle disparaît si tu changes d'appareil", bg: 'rgba(245,211,88,0.14)' },
    { icon: '👥', title: 'Compare-toi à tes amis', desc: 'Classement quotidien sur les 3 modes', bg: 'rgba(74,214,192,0.14)' },
    { icon: '🏆', title: 'Débloque les succès', desc: '12 badges à collectionner', bg: 'rgba(255,90,138,0.14)' },
  ] : [
    { icon: '📊', title: 'Classement quotidien', desc: 'Compare tes scores avec tes amis chaque jour', bg: 'rgba(245,211,88,0.14)' },
    { icon: '🔥', title: 'Garde ta série', desc: 'Synchronisée sur tous tes appareils', bg: 'rgba(74,214,192,0.14)' },
    { icon: '🏆', title: '3 modes de jeu', desc: 'Films, Séries et Personnalités — tout en un', bg: 'rgba(255,90,138,0.14)' },
  ]

  // Build fake profile distribution from local stats
  const distributionKeys = (['1', '2', '3', '4', '5'] as const)
  const maxDistVal = Math.max(1, ...distributionKeys.map((k) => filmStats.guessDistribution[Number(k) as 1|2|3|4|5] ?? 0))

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-7 max-w-4xl mx-auto px-4 py-12"
    >
      {/* Left — pitch */}
      <div className="flex flex-col gap-5">
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(159,163,173,0.5)' }}>
          {pitchLabel}
        </p>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 34, lineHeight: 1.05, color: '#e8eaed', margin: 0 }}>
          {pitchTitle}
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(159,163,173,0.7)', lineHeight: 1.6 }}>
          {pitchDesc}
        </p>

        {/* Carrot cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {carrots.map((c) => (
            <div
              key={c.title}
              style={{
                display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 10,
                background: c.bg,
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{c.icon}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#e8eaed', margin: 0 }}>{c.title}</p>
                <p style={{ fontSize: 11, color: 'rgba(159,163,173,0.6)', margin: 0, marginTop: 2 }}>{c.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => openAuth('register')}
            style={{
              background: 'linear-gradient(180deg, #f5d570, #b8852e)',
              color: '#15110a',
              borderRadius: 10,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Créer un compte
          </button>
          <button
            type="button"
            onClick={() => openAuth('login')}
            style={{
              background: 'transparent',
              color: 'rgba(159,163,173,0.7)',
              borderRadius: 10,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
            }}
          >
            Se connecter
          </button>
        </div>
      </div>

      {/* Right — blurred preview */}
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', background: 'var(--color-film-surface)', minHeight: 320 }}>
        {/* Fake profile content (blurred) */}
        <div style={{ filter: 'blur(6px)', opacity: 0.65, padding: '24px', userSelect: 'none', pointerEvents: 'none' }}>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
            {[
              { v: totalPlayed, l: 'JOUÉS' },
              { v: totalPlayed > 0 ? `${Math.round((totalWins / totalPlayed) * 100)}%` : '—', l: 'VICTOIRES' },
              { v: filmStats.currentStreak, l: 'SÉRIE' },
              { v: filmStats.maxStreak, l: 'MAX' },
            ].map(({ v, l }) => (
              <div key={l} style={{ textAlign: 'center', padding: '8px 4px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#d4a64a', margin: 0 }}>{v}</p>
                <p style={{ fontSize: 9, color: 'rgba(159,163,173,0.5)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', marginTop: 2 }}>{l}</p>
              </div>
            ))}
          </div>
          {/* Fake distribution */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {distributionKeys.map((k) => {
              const count = filmStats.guessDistribution[Number(k) as 1|2|3|4|5] ?? 0
              const pct = Math.round((count / maxDistVal) * 100)
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 12, fontSize: 11, color: 'rgba(159,163,173,0.5)', fontFamily: 'monospace' }}>{k}</span>
                  <div style={{ flex: 1, height: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 4, width: `${Math.max(pct, count > 0 ? 4 : 0)}%`, background: 'rgba(245,211,88,0.6)' }} />
                  </div>
                  <span style={{ width: 16, fontSize: 11, color: 'rgba(159,163,173,0.4)', textAlign: 'right' }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(10,14,26,0.4), rgba(10,14,26,0.85))',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 32 }}>🔒</span>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#e8eaed', margin: 0 }}>
            {isProfile ? 'Aperçu de ton profil' : 'Classement amis'}
          </p>
          <p style={{ fontSize: 12, color: 'rgba(159,163,173,0.6)', margin: 0 }}>
            {totalPlayed} défis joués · {totalWins} victoires
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type HistEntry = { cls: string; name: string; date: string; rawDate: string; won: boolean }

export function ProfilePage() {
  const navigate = useNavigate()
  const newDesign = useUiPrefsStore((s) => s.newDesign)
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const logout = useAuthStore((s) => s.logout)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const setUser = useAuthStore((s) => s.setUser)
  const serverStats = useAuthStore((s) => s.serverStats)

  useEffect(() => {
    if (!isLoading && user === null && !newDesign) navigate('/', { replace: true })
  }, [user, isLoading, navigate])

  const [avatarLoading, setAvatarLoading] = useState(false)
  const [_avatarError, setAvatarError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [histEntries, setHistEntries] = useState<HistEntry[]>([])

  useEffect(() => {
    const MODES = [
      { key: 'film' as const,   cls: 'g-film',  name: 'FilmGuess'  },
      { key: 'series' as const, cls: 'g-serie', name: 'SerieGuess', skip: !FEATURES.enableSeries },
      { key: 'wiki' as const,   cls: 'g-face',  name: 'FaceGuess',  skip: !FEATURES.enableWiki  },
    ]
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
    const yest  = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date(Date.now() - 86400000))
    const all: HistEntry[] = []
    async function run() {
      for (const m of MODES) {
        if (m.skip) continue
        let hist: Record<string, 'won' | 'lost'> = {}
        if (user) {
          try { hist = (await authGetHistory(m.key)).history } catch { hist = loadHistory(m.key) as Record<string, 'won' | 'lost'> }
        } else {
          hist = loadHistory(m.key) as Record<string, 'won' | 'lost'>
        }
        for (const [rawDate, outcome] of Object.entries(hist)) {
          const d = new Date(rawDate + 'T12:00:00Z')
          const label = rawDate === today ? "Aujourd'hui" : rawDate === yest ? 'Hier'
            : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
          all.push({ cls: m.cls, name: m.name, date: label, rawDate, won: outcome === 'won' })
        }
      }
      all.sort((a, b) => b.rawDate.localeCompare(a.rawDate))
      setHistEntries(all.slice(0, 10))
    }
    void run()
  }, [user])

  const enabledModes: Array<'film' | 'series' | 'wiki'> = [
    'film',
    ...(FEATURES.enableSeries ? (['series'] as const) : []),
    ...(FEATURES.enableWiki ? (['wiki'] as const) : []),
  ]


  const [activeTab] = useState<TabMode>('film')

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

  // winRate computed locally in per-game rows
  void (stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0)

  const globalCurrentStreak = useMemo(() => {
    return Math.max(...enabledModes.map((m) => {
      const svM = serverStats[m]
      return svM?.currentStreak ?? loadStats(m).currentStreak
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverStats])

  // globalMaxStreak unused in this layout
  void useMemo(() => Math.max(...enabledModes.map((m) => serverStats[m]?.maxStreak ?? loadStats(m).maxStreak)), [serverStats])

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner spinner--lg" />
    </div>
  )

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <AuthModal />
        <AuthGateNewDesign context="profile" />
      </div>
    )
  }

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


  // tabActiveColor kept for future use
  void { film: 'var(--coral)', series: 'var(--grape)', wiki: 'var(--sky)', total: 'var(--ink)' }

  // ── Per-mode stats for cdy-grow rows ──────────────────────────────────────
  const perGameModes = [
    { key: 'film' as const, cls: 'g-film', name: 'FilmGuess', glyph: 'film', enabled: true },
    { key: 'series' as const, cls: 'g-serie', name: 'SerieGuess', glyph: 'serie', enabled: FEATURES.enableSeries },
    { key: 'wiki' as const, cls: 'g-face', name: 'FaceGuess', glyph: 'face', enabled: FEATURES.enableWiki },
  ].filter(m => m.enabled)

  // Global totals
  const totalPlayed = enabledModes.reduce((s, m) => s + (serverStats[m]?.gamesPlayed ?? loadStats(m).gamesPlayed), 0)
  const totalWins   = enabledModes.reduce((s, m) => s + (serverStats[m]?.wins ?? loadStats(m).gamesWon), 0)
  const totalPct    = totalPlayed > 0 ? Math.round((totalWins / totalPlayed) * 100) : 0

  return (
    <div style={{ background: 'var(--bg)' }}>
      {/* ── Header Candy ── */}
      <header className="cdy-nav">
        <a href="/" className="cdy-logo" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
          <span className="cdy-die">?</span>
          <span>Guess<span style={{ color: 'var(--coral)' }}>Today</span></span>
        </a>
        <nav className="cdy-navlinks hidden lg:flex">
          <a href="/"        className="cdy-navlink">Jeux du jour</a>
          <a href="/profile" className="cdy-navlink on">Stats</a>
          <a href="/friends" className="cdy-navlink">Classement</a>
          <a href="/friends" className="cdy-navlink">Amis</a>
        </nav>
        <span className="cdy-spacer" />
        {globalCurrentStreak > 0 && (
          <span className="cdy-streak">🔥 {globalCurrentStreak}j</span>
        )}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="cdy-avatar"
          style={{ background: 'var(--grape)', boxShadow: '0 4px 0 var(--grape-d)', border: 'none', cursor: 'pointer', fontSize: 14, color: '#fff' }}
          aria-label="Réglages"
        >
          {initial}
        </button>
      </header>

      {/* ── CandyProfile layout ── */}
      <div className="cdy-page">

        {/* ── Profile header card (cdy-card) ── */}
        <div className="cdy-card" style={{ display: 'flex', alignItems: 'center', gap: 22, padding: 28, flexWrap: 'wrap' }}>
          {/* Avatar (cliquable pour upload) */}
          <label className="relative" style={{ cursor: 'pointer', flexShrink: 0 }} title="Changer la photo de profil">
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
              onChange={handleAvatarUpload} disabled={avatarLoading} />
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName}
                style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff', boxShadow: '0 4px 0 var(--line-2)' }} />
            ) : (
              <span className="cdy-av"
                style={{ width: 80, height: 80, fontSize: 28, background: 'var(--grape)', boxShadow: '0 4px 0 var(--grape-d)' }}>
                {initial}
              </span>
            )}
            {avatarLoading && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner spinner--sm" />
              </div>
            )}
          </label>

          {/* Name + pseudo */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ margin: 0, fontWeight: 700, fontSize: 28, color: 'var(--ink)', lineHeight: 1 }}>
                {user.displayName}
              </h1>
              <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Modifier le profil"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 2 }}>
                <Pencil size={14} />
              </button>
            </div>
            <div className="cdy-mono" style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 5 }}>
              {user.email ?? '—'}
            </div>
          </div>

          {/* Global stats inline */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="cdy-mstat"><b>{totalPlayed}</b><span>parties</span></div>
            <div className="cdy-mstat"><b style={{ color: 'var(--mint)' }}>{totalWins}</b><span>victoires</span></div>
            <div className="cdy-mstat"><b>{totalPct}%</b><span>réussite</span></div>
            {globalCurrentStreak > 0 && (
              <span className="cdy-streak" style={{ fontSize: 15, padding: '9px 16px' }}>
                🔥 {globalCurrentStreak} jours
              </span>
            )}
          </div>
        </div>

        {/* ── 2-col grid: stats par jeu + distribution ── */}
        <div className="grid gap-6 mt-3 grid-cols-1 lg:grid-cols-[1fr_360px]">

          {/* Colonne gauche : stats par jeu (cdy-grow) */}
          <div>
            <div className="cdy-sec-head"><h3>Stats par jeu</h3></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {perGameModes.map(({ key, cls, name }) => {
                const sv = serverStats[key]
                const loc = loadStats(key)
                const played = sv?.gamesPlayed ?? loc.gamesPlayed
                const won    = sv?.wins ?? loc.gamesWon
                const streak = sv?.currentStreak ?? loc.currentStreak
                const pct    = played > 0 ? Math.round((won / played) * 100) : 0
                return (
                  <div key={key} className={`cdy-card cdy-grow ${cls}`}>
                    <span className="gg">
                      {key === 'film'   && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M3 15h18M8 4v16M16 4v16"/></svg>}
                      {key === 'series' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8 3l4 4 4-4"/></svg>}
                      {key === 'wiki'   && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="4"/><path d="M5 20c0-3.8 3.1-6.2 7-6.2s7 2.4 7 6.2"/></svg>}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="gname">{name}</div>
                      <div className="gsub">{played} partie{played !== 1 ? 's' : ''} · {won} victoire{won !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="gwin">
                      <div className="gwin-track">
                        <div className="gwin-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="gwin-pct">{pct}% de victoire</div>
                    </div>
                    <div className={`gstreak${streak > 0 ? '' : ' off'}`}>
                      <b>{streak > 0 ? `🔥${streak}` : '–'}</b>
                      <span>série</span>
                    </div>
                  </div>
                )
              })}
            </div>

          </div>

          {/* Colonne droite : historique (référence CandyProfile) */}
          <aside>
            <div className="cdy-sec-head"><h3>Historique</h3></div>
            <div className="cdy-card" style={{ padding: 6 }}>
              {histEntries.length === 0 ? (
                <div style={{ padding: '18px 16px', color: 'var(--ink-3)', fontSize: 14, fontWeight: 500 }}>
                  Aucune partie jouée pour l'instant.
                </div>
              ) : histEntries.map((h, i) => (
                <div key={i} className={`cdy-hrow ${h.cls}`}>
                  <span className="hg">
                    {h.cls === 'g-film' && <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M3 15h18M8 4v16M16 4v16"/></svg>}
                    {h.cls === 'g-serie' && <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8 3l4 4 4-4"/></svg>}
                    {h.cls === 'g-face' && <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="4"/><path d="M5 20c0-3.8 3.1-6.2 7-6.2s7 2.4 7 6.2"/></svg>}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{h.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>{h.date}</div>
                  </div>
                  <span className={`cdy-hres ${h.won ? 'win' : 'lose'}`}>
                    {h.won ? 'Gagné' : 'X/5'}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </div>

      </div>

      <Footer />

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
