import { useCallback, useEffect, useRef, useState } from 'react'
import { Ban, CheckCircle2, Search, ShieldOff, UserRound, Users } from 'lucide-react'
import { AdminLayout } from '../components/AdminLayout'
import { Modal } from '../components/Modal'
import { Pagination } from '../components/Pagination'
import { getUsers, patchUserBan, type AdminUser } from '../api'
import { useList } from '../hooks/useList'
import { useToast } from '../hooks/useToast'

type BannedFilter = 'all' | 'banned' | 'active'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function winRate(user: AdminUser) {
  if (user.statsGamesPlayed <= 0) return null
  return Math.round((user.statsWins / user.statsGamesPlayed) * 100)
}

function BanStatus({ user }: { user: AdminUser }) {
  return user.isBanned ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
      <Ban size={12} />
      Banni
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      <CheckCircle2 size={12} />
      Actif
    </span>
  )
}

export function UsersPage() {
  const toast = useToast()
  const [bannedFilter, setBannedFilter] = useState<BannedFilter>('all')
  const [pendingUser, setPendingUser] = useState<AdminUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const fetcher = useCallback(
    (opts: { page: number; limit: number; q: string }) =>
      getUsers({ ...opts, banned: bannedFilter }),
    [bannedFilter],
  )

  const { items: users, loading, error, page, pages, total, search, setSearch, setPage, reload, setItems } =
    useList(fetcher)

  useEffect(() => { setPage(1) }, [bannedFilter, setPage])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  async function confirmToggleBan() {
    if (!pendingUser) return
    const nextBanned = !pendingUser.isBanned
    setSaving(true)
    setModalError(null)
    try {
      const updated = await patchUserBan(pendingUser.id, nextBanned)
      setItems((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      setPendingUser(null)
      toast.success(nextBanned ? 'Utilisateur banni' : 'Utilisateur réactivé')
      reload()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-indigo-500" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Utilisateurs</h1>
              <p className="text-sm text-gray-500">
                {total} compte{total !== 1 ? 's' : ''} joueur{total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par e-mail ou pseudo..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 shadow-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <select
            value={bannedFilter}
            onChange={(e) => setBannedFilter(e.target.value as BannedFilter)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Tous les comptes</option>
            <option value="active">Comptes actifs</option>
            <option value="banned">Comptes bannis</option>
          </select>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-gray-400">
              <UserRound className="h-8 w-8 opacity-40" />
              <p className="text-sm">Aucun compte trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3 text-left font-medium">#</th>
                    <th className="px-4 py-3 text-left font-medium">Compte</th>
                    <th className="px-4 py-3 text-left font-medium">Créé le</th>
                    <th className="px-4 py-3 text-left font-medium">Stats</th>
                    <th className="px-4 py-3 text-left font-medium">Connexions</th>
                    <th className="px-4 py-3 text-left font-medium">Statut</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => {
                    const rate = winRate(user)
                    return (
                      <tr key={user.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400">{user.id}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{user.displayName}</div>
                          <div className="text-xs text-gray-500">{user.email ?? 'Compte OAuth sans e-mail'}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(user.createdAt)}</td>
                        <td className="px-4 py-3 text-gray-600">
                          <div>{user.statsGamesPlayed} partie{user.statsGamesPlayed !== 1 ? 's' : ''}</div>
                          <div className="text-xs text-gray-400">
                            {user.statsWins} victoire{user.statsWins !== 1 ? 's' : ''}{rate !== null ? ` · ${rate}%` : ''}
                            {' · '}série max {user.statsMaxStreak}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <div>{user.activeSessions} session{user.activeSessions !== 1 ? 's' : ''}</div>
                          <div className="text-xs text-gray-400">{user.oauthCount} OAuth</div>
                        </td>
                        <td className="px-4 py-3"><BanStatus user={user} /></td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setPendingUser(user)}
                            className={[
                              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                              user.isBanned
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-700 hover:bg-red-100',
                            ].join(' ')}
                          >
                            {user.isBanned ? <ShieldOff size={14} /> : <Ban size={14} />}
                            {user.isBanned ? 'Réactiver' : 'Bannir'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Pagination page={page} pages={pages} total={total} limit={20} onPage={setPage} />

        {pendingUser && (
          <Modal
            title={pendingUser.isBanned ? 'Réactiver le compte' : 'Bannir le compte'}
            onClose={() => { if (!saving) setPendingUser(null) }}
            maxWidth="max-w-md"
          >
            <p className="mb-4 text-sm text-gray-600">
              {pendingUser.isBanned
                ? <>Réactiver <strong className="text-gray-900">{pendingUser.displayName}</strong> lui permettra de se reconnecter.</>
                : <>Bannir <strong className="text-gray-900">{pendingUser.displayName}</strong> révoquera aussi ses sessions actives.</>}
            </p>
            {modalError && (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {modalError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingUser(null)}
                disabled={saving}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmToggleBan}
                disabled={saving}
                className={[
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50',
                  pendingUser.isBanned ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700',
                ].join(' ')}
              >
                {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {pendingUser.isBanned ? 'Réactiver' : 'Bannir'}
              </button>
            </div>
          </Modal>
        )}
      </div>
    </AdminLayout>
  )
}
