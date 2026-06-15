import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Pencil,
  Check,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { AuthModal, useAuthModal } from '@/components/modals/AuthModal'
import { authDeleteAccount, authChangePassword, authUploadAvatar, authGetHistory, authGetPreferences, authUpdatePreferences, type PreferencesPayload } from '@/api/client'
import { loadStats, loadHistory } from '@/lib/storage'
import { parseAvatarHue, avatarBg, avatarShadow } from '@/lib/utils'
import { FEATURES } from '@/config/features'
import { useUiPrefsStore } from '@/store/uiPrefsStore'
import type { GameStats } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Footer } from '@/components/layout/Footer'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
type TabMode = 'film' | 'series' | 'wiki' | 'total'

interface SettingsModalProps {
  onClose: () => void
  user: { displayName: string; email?: string | null; emailVerified?: boolean; avatarUrl?: string | null }
  onSaveName: (name: string) => Promise<void>
  onSaveHue: (hue: number) => Promise<void>
  onChangePassword: (current: string, next: string, confirm: string) => Promise<string | null>
  onLogout: () => Promise<void>
  onDeleteAccount: () => Promise<void>
}

const EDIT_HUES = [300, 30, 200, 150, 90, 260, 340, 50]


function SettingsModal({ onClose, user, onSaveName, onSaveHue, onChangePassword, onLogout, onDeleteAccount }: SettingsModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  const [nameInput, setNameInput] = useState(user.displayName)
  const [nameLoading, setNameLoading] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  const [hue, setHue] = useState(() => parseAvatarHue(user.avatarUrl) ?? 300)
  const [hueSaving, setHueSaving] = useState(false)
  const [notifOn, setNotifOn] = useState(false)
  const [leaderOn, setLeaderOn] = useState(true)
  const [publicOn, setPublicOn] = useState(true)

  // Charge les préférences réelles du compte au montage.
  useEffect(() => {
    let cancelled = false
    authGetPreferences()
      .then((p) => {
        if (cancelled) return
        setNotifOn(p.notifDaily)
        setLeaderOn(p.leaderboardPublic)
        setPublicOn(p.profilePublic)
      })
      .catch(() => { /* garde les valeurs par défaut */ })
    return () => { cancelled = true }
  }, [])

  // Toggle optimiste + persistance ; revert si l'API échoue.
  function togglePref(key: keyof PreferencesPayload, current: boolean, setter: (v: boolean) => void) {
    const next = !current
    setter(next)
    authUpdatePreferences({ [key]: next }).catch(() => setter(current))
  }

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
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
      style={{ background: 'rgba(60,48,80,0.55)' }}
      onClick={handleOverlayClick}
    >
      <div style={{ background: 'var(--bg)', borderRadius: '24px 24px 0 0', maxWidth: 480, width: '100%', padding: '24px 20px 32px', display: 'flex', flexDirection: 'column', gap: 0, maxHeight: '90dvh', overflowY: 'auto' }}
        className="lg:rounded-3xl lg:m-4">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 20 }}>Réglages</span>
          <button type="button" onClick={onClose} className="cdy-archive-x" aria-label="Fermer">✕</button>
        </div>

        {/* Avatar + hue picker */}
        <div className="cdy-edit-card">
          <h3>Avatar</h3>
          <p className="ch">Choisis une couleur — tes initiales s'affichent dessus.</p>
          <div className="cdy-edit-avatar">
            <span
              className="cdy-edit-av"
              style={{ background: `oklch(0.66 0.16 ${hue})`, boxShadow: `0 6px 0 oklch(0.5 0.15 ${hue})` }}
            >
              {user.displayName.charAt(0).toUpperCase()}
            </span>
            <div className="cdy-edit-hues">
              {EDIT_HUES.map((h) => (
                <span
                  key={h}
                  className={`cdy-edit-hue${h === hue ? ' on' : ''}`}
                  style={{ background: `oklch(0.66 0.16 ${h})`, opacity: hueSaving ? 0.6 : 1 }}
                  onClick={async () => {
                    if (hueSaving || h === hue) return
                    setHue(h)
                    setHueSaving(true)
                    await onSaveHue(h).finally(() => setHueSaving(false))
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Nom affiché */}
        <div className="cdy-edit-card">
          <h3>Informations</h3>
          <div className="cdy-fld">
            <label htmlFor="settings-name">Nom affiché</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="settings-name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveName() }}
                className="inp"
                style={{ flex: 1, padding: '13px 16px', borderRadius: 14, border: '2.5px solid var(--line)', background: 'var(--bg)', fontSize: 15.5, fontFamily: 'Fredoka, sans-serif', color: 'var(--ink)', outline: 'none' }}
                maxLength={40}
                disabled={nameLoading}
                placeholder="Ton prénom ou pseudo"
              />
              <button
                type="button"
                onClick={() => void handleSaveName()}
                disabled={nameLoading || !nameInput.trim() || nameInput.trim() === user.displayName}
                className="cdy-btn cdy-btn-primary"
                style={{ padding: '13px 18px', flexShrink: 0 }}
                aria-label="Enregistrer"
              >
                <Check size={16} />
              </button>
            </div>
            {nameSaved && <p style={{ fontSize: 12, color: 'var(--correct-d)', marginTop: 6 }}>Pseudo mis à jour ✓</p>}
          </div>
          {user.email && (
            <div className="cdy-fld" style={{ marginBottom: 0 }}>
              <label>E-mail</label>
              <div className="inp ph" style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', borderRadius: 14, border: '2.5px solid var(--line)', background: 'var(--bg)', fontSize: 15.5, color: 'var(--ink-3)' }}>
                {user.email}
              </div>
            </div>
          )}
        </div>

        {/* Préférences */}
        <div className="cdy-edit-card">
          <h3>Préférences</h3>
          <div className="cdy-toggle-row" style={{ borderTop: 0 }}>
            <div style={{ flex: 1 }}>
              <div className="tt">Rappel quotidien</div>
              <div className="ts">Notif à minuit pour le nouveau défi</div>
            </div>
            <div className={`cdy-toggle${notifOn ? ' on' : ''}`} onClick={() => togglePref('notifDaily', notifOn, setNotifOn)} />
          </div>
          <div className="cdy-toggle-row">
            <div style={{ flex: 1 }}>
              <div className="tt">Classement public</div>
              <div className="ts">Ton score apparaît dans le classement global</div>
            </div>
            <div className={`cdy-toggle${leaderOn ? ' on' : ''}`} onClick={() => togglePref('leaderboardPublic', leaderOn, setLeaderOn)} />
          </div>
          <div className="cdy-toggle-row">
            <div style={{ flex: 1 }}>
              <div className="tt">Profil public</div>
              <div className="ts">Les amis peuvent voir ton historique</div>
            </div>
            <div className={`cdy-toggle${publicOn ? ' on' : ''}`} onClick={() => togglePref('profilePublic', publicOn, setPublicOn)} />
          </div>
        </div>

        {/* Mot de passe */}
        {user.email && (
          <div className="cdy-edit-card">
            <button
              type="button"
              onClick={() => { setPwOpen((v) => !v); setPwError(null); setPwSuccess(false) }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Fredoka, sans-serif' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>
                <Lock size={15} /> Changer le mot de passe
              </span>
              <ChevronRight size={14} style={{ color: 'var(--ink-2)', transform: pwOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
            </button>

            {pwOpen && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pwSuccess ? (
                  <p style={{ fontSize: 13, color: 'var(--correct-d)', textAlign: 'center', padding: '8px 0' }}>Mot de passe mis à jour ✓</p>
                ) : (
                  <>
                    {[
                      { label: 'Mot de passe actuel', val: pwCurrent, setVal: setPwCurrent, show: pwShowCurrent, setShow: setPwShowCurrent },
                      { label: 'Nouveau mot de passe', val: pwNew, setVal: setPwNew, show: pwShowNew, setShow: setPwShowNew },
                    ].map(({ label, val, setVal, show, setShow }) => (
                      <div key={label} className="cdy-fld" style={{ marginBottom: 0, position: 'relative' }}>
                        <label>{label}</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={show ? 'text' : 'password'}
                            value={val}
                            onChange={(e) => setVal(e.target.value)}
                            placeholder="••••••••"
                            style={{ width: '100%', padding: '13px 44px 13px 16px', borderRadius: 14, border: '2.5px solid var(--line)', background: 'var(--bg)', fontSize: 15, fontFamily: 'Fredoka, sans-serif', color: 'var(--ink)', outline: 'none' }}
                            disabled={pwLoading}
                          />
                          <button type="button" onClick={() => setShow((v) => !v)} tabIndex={-1}
                            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)' }}>
                            {show ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="cdy-fld" style={{ marginBottom: 0 }}>
                      <label>Confirmer</label>
                      <input
                        type="password"
                        value={pwConfirm}
                        onChange={(e) => setPwConfirm(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') void handleChangePw() }}
                        placeholder="••••••••"
                        style={{ width: '100%', padding: '13px 16px', borderRadius: 14, border: '2.5px solid var(--line)', background: 'var(--bg)', fontSize: 15, fontFamily: 'Fredoka, sans-serif', color: 'var(--ink)', outline: 'none' }}
                        disabled={pwLoading}
                      />
                    </div>
                    {pwError && <p style={{ fontSize: 13, color: 'var(--wrong-d)', background: 'var(--wrong-soft)', borderRadius: 12, padding: '10px 14px', margin: 0 }}>{pwError}</p>}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="button" onClick={() => void handleChangePw()} disabled={pwLoading || !pwCurrent || !pwNew || !pwConfirm}
                        className="cdy-btn cdy-btn-primary" style={{ flex: 1 }}>
                        {pwLoading ? 'Enregistrement…' : 'Mettre à jour'}
                      </button>
                      <button type="button" onClick={() => { setPwOpen(false); setPwError(null); setPwCurrent(''); setPwNew(''); setPwConfirm('') }}
                        className="cdy-btn cdy-btn-soft" style={{ flexShrink: 0 }}>
                        Annuler
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Danger zone */}
        <div className="cdy-edit-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="cdy-edit-danger">
            <div>
              <div className="dt">Zone de danger</div>
              <div className="ds">Ces actions sont irréversibles.</div>
            </div>
          </div>
          <div className="cdy-edit-actions" style={{ flexWrap: 'wrap' }}>
            <button type="button" onClick={() => void onLogout()} className="cdy-btn cdy-btn-soft" style={{ flex: '1 1 130px', justifyContent: 'center', gap: 8 }}>
              <LogOut size={15} /> Déconnexion
            </button>
            <button type="button" onClick={() => void onDeleteAccount()} className="cdy-btn cdy-btn-danger" style={{ flex: '1 1 130px', justifyContent: 'center', fontSize: 13 }}>
              Supprimer le compte
            </button>
          </div>
        </div>

        <button type="button" onClick={onClose} className="cdy-btn cdy-btn-soft" style={{ width: '100%', marginTop: 4 }}>
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

  const cfg = isProfile ? {
    icon: '👤',
    title: "Ton profil t'attend",
    body: "Crée un compte gratuit pour sauvegarder tes stats, garder ta série et accéder à ton historique depuis n'importe quel appareil.",
    perks: ['🔥 Ta série', '📊 Tes stats', '🕑 Historique'],
  } : {
    icon: '👥',
    title: 'Joue avec tes amis',
    body: 'Crée un compte gratuit pour défier tes amis et comparer vos scores du jour.',
    perks: ['➕ Ajouter des amis', '⚔️ Défis', '📊 Comparaison'],
  }

  return (
    <>
      {/* Mobile */}
      <div className="cdym-locked lg:hidden">
        <div className="lk">{cfg.icon}</div>
        <h2>{cfg.title}</h2>
        <p>{cfg.body}</p>
        <div className="cdym-locked-perks">
          {cfg.perks.map((p) => (
            <span key={p} className="cdym-locked-perk">{p}</span>
          ))}
        </div>
        <button type="button" onClick={() => openAuth('register')} className="cdy-btn cdy-btn-primary" style={{ width: '100%' }}>
          Créer un compte gratuit
        </button>
        <button type="button" onClick={() => openAuth('login')} className="cdym-locked-ghost">
          Se connecter
        </button>
      </div>

      {/* Desktop */}
      <div className="cdy-locked hidden lg:block">
        <div className="cdy-locked-bg" aria-hidden />
        <div className="cdy-locked-scrim">
          <div className="cdy-locked-card">
            <div className="lk">{cfg.icon}</div>
            <h2>{cfg.title}</h2>
            <p>{cfg.body}</p>
            <div className="cdy-locked-perks">
              {cfg.perks.map((p) => (
                <span key={p} className="cdy-locked-perk">{p}</span>
              ))}
            </div>
            <div className="cdy-locked-cta">
              <button type="button" onClick={() => openAuth('register')} className="cdy-btn cdy-btn-primary" style={{ width: '100%' }}>
                Créer un compte gratuit
              </button>
              <button type="button" onClick={() => openAuth('login')} className="cdy-locked-ghost">
                Se connecter
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
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

  async function handleSaveHue(hue: number) {
    // Optimistic update — apply immediately so the UI reflects the change
    // even before the API responds (or in mock/offline mode)
    if (user) setUser({ ...user, avatarUrl: `color:${hue}` })
    try {
      await updateProfile({ avatarUrl: `color:${hue}` })
    } catch {
      // API failed — store was already updated optimistically; keep the change
    }
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
        <Link to="/" className="cdy-logo" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
          <span className="cdy-die">?</span>
          <span>Guess<span style={{ color: 'var(--coral)' }}>Today</span></span>
        </Link>
        <nav className="cdy-navlinks hidden lg:flex">
          <Link to="/"        className="cdy-navlink">Jeux du jour</Link>
          <Link to="/profile" className="cdy-navlink on">Stats</Link>
          <Link to="/friends" className="cdy-navlink">Classement</Link>
          <Link to="/friends" className="cdy-navlink">Amis</Link>
        </nav>
        <span className="cdy-spacer" />
        {globalCurrentStreak > 0 && (
          <span className="cdy-streak">🔥 {globalCurrentStreak}j</span>
        )}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="cdy-avatar"
          style={{ background: avatarBg(user.avatarUrl), boxShadow: avatarShadow(user.avatarUrl), border: 'none', cursor: 'pointer', fontSize: 14, color: '#fff' }}
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
            {user.avatarUrl && !parseAvatarHue(user.avatarUrl) ? (
              <img src={user.avatarUrl} alt={user.displayName}
                style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff', boxShadow: '0 4px 0 var(--line-2)' }} />
            ) : (
              <span className="cdy-av"
                style={{ width: 80, height: 80, fontSize: 28, background: avatarBg(user.avatarUrl), boxShadow: avatarShadow(user.avatarUrl) }}>
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
          onSaveHue={handleSaveHue}
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

      <div className="lg:hidden" style={{ height: 80 }} />
      <MobileTabBar activeTab="profile" />
    </div>
  )
}
