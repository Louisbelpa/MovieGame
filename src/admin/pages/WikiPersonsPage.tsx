import { useCallback, useEffect, useState } from 'react'
import { Plus, Search, X, WandSparkles, ExternalLink, Trash2, Pencil, Shuffle } from 'lucide-react'
import {
  getWikiPersons,
  createWikiPerson,
  updateWikiPerson,
  deleteWikiPerson,
  fetchWikipediaPerson,
  type AdminWikiPerson,
  type WikiPersonPayload,
} from '../api'
import { AdminLayout } from '../components/AdminLayout'

const RANDOM_WIKI_SLUGS = [
  'Emmanuel_Macron',
  'Barack_Obama',
  'Angela_Merkel',
  'Nelson_Mandela',
  'Volodymyr_Zelenskyy',
  'Lionel_Messi',
  'Cristiano_Ronaldo',
  'Kylian_Mbappé',
  'Zinedine_Zidane',
  'Rafael_Nadal',
  'Serena_Williams',
  'Michael_Jordan',
]

function isNotFoundError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return msg.includes('404') || msg.includes('not found')
}

function shuffledSlugs(): string[] {
  const copy = [...RANDOM_WIKI_SLUGS]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

function personTypeLabel(personType: PersonType): string {
  switch (personType) {
    case 'politician': return 'Politicien'
    case 'sportsperson': return 'Sportif'
    case 'artist': return 'Artiste'
    case 'scientist': return 'Scientifique'
    case 'entrepreneur': return 'Entrepreneur'
    case 'writer': return 'Ecrivain'
    case 'historical_figure': return 'Historique'
    default: return 'Profil'
  }
}

type ModalState =
  | { type: 'create' }
  | { type: 'edit'; person: AdminWikiPerson }
  | { type: 'delete'; person: AdminWikiPerson }
  | null

type PersonType = 'politician' | 'sportsperson' | 'artist' | 'scientist' | 'entrepreneur' | 'writer' | 'historical_figure'

interface WikiRoleFormRow {
  title: string
  start_year: number | null
  end_year: number | null
  country: string | null
  predecessor: string | null
  successor: string | null
}

interface WikiClubFormRow {
  name: string
  start_year: number | null
  end_year: number | null
  appearances: number | null
  goals: number | null
}

interface PoliticianInfoboxForm {
  roles: WikiRoleFormRow[]
  party: string | null
  birth_year: number | null
  nationality: string | null
}

interface SportInfoboxForm {
  sport: string | null
  position: string | null
  clubs: WikiClubFormRow[]
  national_team: { name: string; caps: number | null; goals: number | null } | null
  birth_year: number | null
  nationality: string | null
}

function toNullableString(v: string): string | null {
  const trimmed = v.trim()
  return trimmed ? trimmed : null
}

function toNullableNumber(v: string): number | null {
  const trimmed = v.trim()
  if (!trimmed) return null
  const n = parseInt(trimmed, 10)
  return Number.isFinite(n) ? n : null
}

function parseAliasesInput(raw: string): string[] {
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

function getAllowedHintKeys(personType: PersonType): string[] {
  if (personType === 'politician') {
    return ['birth_year', 'nationality', 'party', 'name_initials', 'name_length']
  }
  if (personType === 'sportsperson') {
    return ['birth_year', 'nationality', 'position', 'name_initials', 'name_length']
  }
  return ['birth_year', 'nationality', 'domain', 'notable_work', 'name_initials']
}

function parseGenericInfobox(raw: Record<string, unknown>): {
  domain: string | null
  notable_work: string | null
  era: string | null
  birth_year: number | null
  nationality: string | null
} {
  return {
    domain: typeof raw.domain === 'string' ? raw.domain : null,
    notable_work: typeof raw.notable_work === 'string' ? raw.notable_work : null,
    era: typeof raw.era === 'string' ? raw.era : null,
    birth_year: typeof raw.birth_year === 'number' ? raw.birth_year : null,
    nationality: typeof raw.nationality === 'string' ? raw.nationality : null,
  }
}

function parsePoliticianInfobox(raw: Record<string, unknown>): PoliticianInfoboxForm {
  const rolesRaw = Array.isArray(raw.roles) ? raw.roles : []
  const roles: WikiRoleFormRow[] = rolesRaw
    .map((r) => {
      const role = r as Record<string, unknown>
      return {
        title: String(role.title ?? '').trim(),
        start_year: typeof role.start_year === 'number' ? role.start_year : null,
        end_year: typeof role.end_year === 'number' ? role.end_year : null,
        country: typeof role.country === 'string' ? role.country : null,
        predecessor: typeof role.predecessor === 'string' ? role.predecessor : null,
        successor: typeof role.successor === 'string' ? role.successor : null,
      }
    })
    .filter((r) => r.title)

  return {
    roles,
    party: typeof raw.party === 'string' ? raw.party : null,
    birth_year: typeof raw.birth_year === 'number' ? raw.birth_year : null,
    nationality: typeof raw.nationality === 'string' ? raw.nationality : null,
  }
}

function parseSportInfobox(raw: Record<string, unknown>): SportInfoboxForm {
  const clubsRaw = Array.isArray(raw.clubs) ? raw.clubs : []
  const clubs: WikiClubFormRow[] = clubsRaw
    .map((c) => {
      const club = c as Record<string, unknown>
      return {
        name: String(club.name ?? '').trim(),
        start_year: typeof club.start_year === 'number' ? club.start_year : null,
        end_year: typeof club.end_year === 'number' ? club.end_year : null,
        appearances: typeof club.appearances === 'number' ? club.appearances : null,
        goals: typeof club.goals === 'number' ? club.goals : null,
      }
    })
    .filter((c) => c.name)

  const ntRaw = (raw.national_team && typeof raw.national_team === 'object')
    ? (raw.national_team as Record<string, unknown>)
    : null

  return {
    sport: typeof raw.sport === 'string' ? raw.sport : null,
    position: typeof raw.position === 'string' ? raw.position : null,
    clubs,
    national_team: ntRaw
      ? {
          name: String(ntRaw.name ?? '').trim(),
          caps: typeof ntRaw.caps === 'number' ? ntRaw.caps : null,
          goals: typeof ntRaw.goals === 'number' ? ntRaw.goals : null,
        }
      : null,
    birth_year: typeof raw.birth_year === 'number' ? raw.birth_year : null,
    nationality: typeof raw.nationality === 'string' ? raw.nationality : null,
  }
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-4 sm:my-8">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 truncate pr-4">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
            <X size={18} />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-5">{children}</div>
      </div>
    </div>
  )
}

function WikiPersonForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: AdminWikiPerson
  onSubmit: (payload: WikiPersonPayload) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [slug, setSlug] = useState(initial?.wikipedia_slug ?? '')
  const [personType, setPersonType] = useState<PersonType>(initial?.person_type ?? 'politician')
  const [aliasesInput, setAliasesInput] = useState((initial?.name_aliases ?? []).join(', '))
  const [selectedHints, setSelectedHints] = useState<string[]>(initial?.hint_schedule ?? getAllowedHintKeys(initial?.person_type ?? 'politician'))
  const [photoUrl, setPhotoUrl] = useState(initial?.photo_url ?? '')
  const [extract, setExtract] = useState(initial?.extract ?? '')
  const [wikipediaUrl, setWikipediaUrl] = useState(initial?.wikipedia_url ?? '')
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 3)
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [party, setParty] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [nationality, setNationality] = useState('')
  const [rolesText, setRolesText] = useState('')
  const [sport, setSport] = useState('')
  const [position, setPosition] = useState('')
  const [clubsText, setClubsText] = useState('')
  const [nationalTeamName, setNationalTeamName] = useState('')
  const [nationalTeamCaps, setNationalTeamCaps] = useState('')
  const [nationalTeamGoals, setNationalTeamGoals] = useState('')
  const [domain, setDomain] = useState('')
  const [notableWork, setNotableWork] = useState('')
  const [era, setEra] = useState('')
  const [loadingWiki, setLoadingWiki] = useState(false)
  const [loadingRandomWiki, setLoadingRandomWiki] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parseScore, setParseScore] = useState<number | null>(null)
  const [parseWarnings, setParseWarnings] = useState<string[]>([])

  useEffect(() => {
    const raw = initial?.infobox_data ?? {}
    const currentType = (initial?.person_type ?? personType)
    if (currentType === 'politician') {
      const p = parsePoliticianInfobox(raw)
      setParty(p.party ?? '')
      setBirthYear(p.birth_year != null ? String(p.birth_year) : '')
      setNationality(p.nationality ?? '')
      setRolesText(
        p.roles
          .map((r) => [r.title, r.start_year ?? '', r.end_year ?? '', r.country ?? ''].join(' | '))
          .join('\n')
      )
    } else if (currentType === 'sportsperson') {
      const s = parseSportInfobox(raw)
      setSport(s.sport ?? '')
      setPosition(s.position ?? '')
      setBirthYear(s.birth_year != null ? String(s.birth_year) : '')
      setNationality(s.nationality ?? '')
      setClubsText(
        s.clubs
          .map((c) => [c.name, c.start_year ?? '', c.end_year ?? '', c.appearances ?? '', c.goals ?? ''].join(' | '))
          .join('\n')
      )
      setNationalTeamName(s.national_team?.name ?? '')
      setNationalTeamCaps(s.national_team?.caps != null ? String(s.national_team.caps) : '')
      setNationalTeamGoals(s.national_team?.goals != null ? String(s.national_team.goals) : '')
    } else {
      const g = parseGenericInfobox(raw)
      setBirthYear(g.birth_year != null ? String(g.birth_year) : '')
      setNationality(g.nationality ?? '')
      setDomain(g.domain ?? '')
      setNotableWork(g.notable_work ?? '')
      setEra(g.era ?? '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id])

  useEffect(() => {
    const allowed = getAllowedHintKeys(personType)
    setSelectedHints((prev) => {
      const filtered = prev.filter((k) => allowed.includes(k))
      return filtered.length > 0 ? filtered : allowed
    })
  }, [personType])

  function applyWikipediaData(data: {
    name: string
    person_type: PersonType
    infobox_data: Record<string, unknown>
    hint_schedule: string[]
    photo_url: string | null
    extract: string | null
    wikipedia_url: string
    parse_quality_score: number
    parse_warnings: string[]
  }) {
    setName(data.name)
    setPersonType(data.person_type)
    setSelectedHints(data.hint_schedule.length > 0 ? data.hint_schedule : getAllowedHintKeys(data.person_type))
    setPhotoUrl(data.photo_url ?? '')
    setExtract(data.extract ?? '')
    setWikipediaUrl(data.wikipedia_url ?? '')
    setParseScore(data.parse_quality_score)
    setParseWarnings(data.parse_warnings)

    if (data.person_type === 'politician') {
      const p = parsePoliticianInfobox(data.infobox_data)
      setParty(p.party ?? '')
      setBirthYear(p.birth_year != null ? String(p.birth_year) : '')
      setNationality(p.nationality ?? '')
      setRolesText(
        p.roles
          .map((r) => [r.title, r.start_year ?? '', r.end_year ?? '', r.country ?? ''].join(' | '))
          .join('\n')
      )
      setSport('')
      setPosition('')
      setClubsText('')
      setNationalTeamName('')
      setNationalTeamCaps('')
      setNationalTeamGoals('')
      return
    }

    if (data.person_type === 'sportsperson') {
      const s = parseSportInfobox(data.infobox_data)
      setSport(s.sport ?? '')
      setPosition(s.position ?? '')
      setBirthYear(s.birth_year != null ? String(s.birth_year) : '')
      setNationality(s.nationality ?? '')
      setClubsText(
        s.clubs
          .map((c) => [c.name, c.start_year ?? '', c.end_year ?? '', c.appearances ?? '', c.goals ?? ''].join(' | '))
          .join('\n')
      )
      setNationalTeamName(s.national_team?.name ?? '')
      setNationalTeamCaps(s.national_team?.caps != null ? String(s.national_team.caps) : '')
      setNationalTeamGoals(s.national_team?.goals != null ? String(s.national_team.goals) : '')
      setParty('')
      setRolesText('')
      setDomain('')
      setNotableWork('')
      setEra('')
      return
    }

    const g = parseGenericInfobox(data.infobox_data)
    setBirthYear(g.birth_year != null ? String(g.birth_year) : '')
    setNationality(g.nationality ?? '')
    setDomain(g.domain ?? '')
    setNotableWork(g.notable_work ?? '')
    setEra(g.era ?? '')
    setParty('')
    setRolesText('')
    setSport('')
    setPosition('')
    setClubsText('')
    setNationalTeamName('')
    setNationalTeamCaps('')
    setNationalTeamGoals('')
  }

  function parseRolesInput(): WikiRoleFormRow[] {
    return rolesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [title = '', start = '', end = '', country = ''] = line.split('|').map((v) => v.trim())
        return {
          title,
          title_redacted: title,
          start_year: toNullableNumber(start),
          end_year: toNullableNumber(end),
          country: toNullableString(country),
          predecessor: null,
          successor: null,
        } as WikiRoleFormRow
      })
      .filter((r) => r.title)
  }

  function parseClubsInput(): WikiClubFormRow[] {
    return clubsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name = '', start = '', end = '', apps = '', goals = ''] = line.split('|').map((v) => v.trim())
        return {
          name,
          start_year: toNullableNumber(start),
          end_year: toNullableNumber(end),
          appearances: toNullableNumber(apps),
          goals: toNullableNumber(goals),
        }
      })
      .filter((c) => c.name)
  }

  async function handleFetchWikipedia() {
    if (!slug.trim()) {
      setError('Le slug Wikipedia est requis pour l’auto-remplissage.')
      return
    }
    setLoadingWiki(true)
    setError(null)
    try {
      const data = await fetchWikipediaPerson(slug.trim(), 'fr')
      applyWikipediaData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur auto-remplissage Wikipedia')
    } finally {
      setLoadingWiki(false)
    }
  }

  async function handleRandomWikipedia() {
    setLoadingRandomWiki(true)
    setError(null)
    try {
      const candidates = shuffledSlugs()
      let loaded = false

      for (const candidate of candidates) {
        try {
          const data = await fetchWikipediaPerson(candidate, 'fr')
          setSlug(candidate)
          applyWikipediaData(data)
          loaded = true
          break
        } catch (err) {
          if (!isNotFoundError(err)) throw err
        }
      }

      if (!loaded) {
        throw new Error('Aucun profil Wikipedia aléatoire valide trouvé. Réessaie.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur wikipedia aléatoire')
    } finally {
      setLoadingRandomWiki(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const infoboxData: Record<string, unknown> = personType === 'politician'
        ? {
            roles: parseRolesInput(),
            party: toNullableString(party),
            birth_year: toNullableNumber(birthYear),
            nationality: toNullableString(nationality),
          }
        : personType === 'sportsperson'
          ? {
            sport: toNullableString(sport),
            position: toNullableString(position),
            clubs: parseClubsInput(),
            national_team: toNullableString(nationalTeamName)
              ? {
                  name: nationalTeamName.trim(),
                  caps: toNullableNumber(nationalTeamCaps),
                  goals: toNullableNumber(nationalTeamGoals),
                }
              : null,
            birth_year: toNullableNumber(birthYear),
            nationality: toNullableString(nationality),
          }
          : {
            domain: toNullableString(domain),
            notable_work: toNullableString(notableWork),
            era: toNullableString(era),
            birth_year: toNullableNumber(birthYear),
            nationality: toNullableString(nationality),
          }

      const payload: WikiPersonPayload = {
        name: name.trim(),
        wikipedia_slug: slug.trim(),
        person_type: personType,
        name_aliases: parseAliasesInput(aliasesInput),
        infobox_data: infoboxData,
        hint_schedule: selectedHints,
        photo_url: photoUrl.trim() || null,
        extract: extract.trim() || null,
        wikipedia_url: wikipediaUrl.trim() || null,
        difficulty: Math.min(5, Math.max(1, difficulty)),
        is_active: isActive,
      }
      if (!payload.name || !payload.wikipedia_slug) throw new Error('Nom et slug Wikipedia sont obligatoires.')
      await onSubmit(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug Wikipedia</label>
          <div className="flex gap-2">
            <input value={slug} onChange={(e) => setSlug(e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <button type="button" onClick={handleFetchWikipedia} disabled={loadingWiki || loadingRandomWiki} className="px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 inline-flex items-center gap-1.5">
              <WandSparkles size={14} />
              {loadingWiki ? 'Chargement…' : 'Wiki'}
            </button>
            {!initial && (
              <button
                type="button"
                onClick={handleRandomWikipedia}
                disabled={loadingWiki || loadingRandomWiki}
                className="px-3 py-2 text-xs font-medium text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Shuffle size={14} />
                {loadingRandomWiki ? 'Aléatoire…' : 'Au hasard'}
              </button>
            )}
          </div>
        </div>
      </div>

      {parseScore !== null && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${
          parseScore >= 80
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : parseScore >= 60
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          Qualité parsing: <strong>{parseScore}/100</strong>
          {parseWarnings.length > 0 && (
            <div className="mt-1 text-xs">
              {parseWarnings.join(' · ')}
            </div>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select value={personType} onChange={(e) => setPersonType(e.target.value as PersonType)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="politician">Politicien</option>
            <option value="sportsperson">Sportif</option>
            <option value="artist">Artiste</option>
            <option value="scientist">Scientifique</option>
            <option value="entrepreneur">Entrepreneur</option>
            <option value="writer">Ecrivain</option>
            <option value="historical_figure">Personnalite historique</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Difficulté (1-5)</label>
          <input type="number" min={1} max={5} value={difficulty} onChange={(e) => setDifficulty(parseInt(e.target.value, 10) || 3)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <label className="flex items-center gap-2 mt-7 text-sm text-gray-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Actif
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Alias (séparés par des virgules)</label>
        <input value={aliasesInput} onChange={(e) => setAliasesInput(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Ex: Leo Messi, L. Messi" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Indices complémentaires utilisés</label>
        <div className="grid sm:grid-cols-2 gap-2">
          {getAllowedHintKeys(personType).map((hintKey) => (
            <label key={hintKey} className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={selectedHints.includes(hintKey)}
                onChange={(e) => {
                  setSelectedHints((prev) => {
                    if (e.target.checked) return [...prev, hintKey]
                    const next = prev.filter((k) => k !== hintKey)
                    return next.length > 0 ? next : [hintKey]
                  })
                }}
              />
              {hintKey}
            </label>
          ))}
        </div>
      </div>

      {personType === 'politician' ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parti politique</label>
            <input value={party} onChange={(e) => setParty(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nationalité</label>
            <input value={nationality} onChange={(e) => setNationality(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Année de naissance</label>
            <input value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fonctions (1 ligne = titre | début | fin | pays)
            </label>
            <textarea rows={6} value={rolesText} onChange={(e) => setRolesText(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono" />
          </div>
        </div>
      ) : personType === 'sportsperson' ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sport</label>
            <input value={sport} onChange={(e) => setSport(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Poste</label>
            <input value={position} onChange={(e) => setPosition(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nationalité</label>
            <input value={nationality} onChange={(e) => setNationality(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Année de naissance</label>
            <input value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clubs (1 ligne = club | début | fin | matchs | buts)
            </label>
            <textarea rows={6} value={clubsText} onChange={(e) => setClubsText(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Équipe nationale</label>
            <input value={nationalTeamName} onChange={(e) => setNationalTeamName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sélections</label>
              <input value={nationalTeamCaps} onChange={(e) => setNationalTeamCaps(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buts</label>
              <input value={nationalTeamGoals} onChange={(e) => setNationalTeamGoals(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Domaine</label>
            <input value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nationalité</label>
            <input value={nationality} onChange={(e) => setNationality(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Année de naissance</label>
            <input value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Période</label>
            <input value={era} onChange={(e) => setEra(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Oeuvre / fait notable</label>
            <textarea rows={3} value={notableWork} onChange={(e) => setNotableWork(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL</label>
          <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Wikipedia URL</label>
          <input value={wikipediaUrl} onChange={(e) => setWikipediaUrl(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Extrait</label>
        <textarea rows={3} value={extract} onChange={(e) => setExtract(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg">Annuler</button>
        <button type="submit" disabled={submitting} className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {initial ? 'Enregistrer' : 'Créer'}
        </button>
      </div>
    </form>
  )
}

export function WikiPersonsPage() {
  const [persons, setPersons] = useState<AdminWikiPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    getWikiPersons({ q: search.trim() || undefined, limit: 100 })
      .then((res) => setPersons(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(payload: WikiPersonPayload) {
    try {
      setError(null)
      setSuccess(null)
      await createWikiPerson(payload)
      setSuccess('Personnalité Wikipedia créée.')
      setModal(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur création')
    }
  }

  async function handleEdit(payload: WikiPersonPayload) {
    if (modal?.type !== 'edit') return
    try {
      setError(null)
      setSuccess(null)
      await updateWikiPerson(modal.person.id, payload)
      setSuccess('Personnalité Wikipedia mise à jour.')
      setModal(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur mise à jour')
    }
  }

  async function handleDelete() {
    if (modal?.type !== 'delete') return
    setDeleting(true)
    try {
      setError(null)
      setSuccess(null)
      await deleteWikiPerson(modal.person.id)
      setSuccess('Personnalité Wikipedia désactivée.')
      setModal(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur suppression')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une personnalité..." className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg" />
        </div>
        <button onClick={() => setModal({ type: 'create' })} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
          <Plus size={15} /> Ajouter
        </button>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
      {success && <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">{success}</div>}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="h-36 flex items-center justify-center"><span className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : persons.length === 0 ? (
          <div className="h-36 flex items-center justify-center text-sm text-gray-400">Aucune personnalité trouvée.</div>
        ) : (
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-3 py-3">Nom</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Statut</th>
                <th className="px-3 py-3">Défis</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {persons.map((person) => (
                <tr key={person.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <div className="font-medium text-sm text-gray-900">{person.name}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1.5">
                      {person.wikipedia_slug}
                      {person.wikipedia_url && <a href={person.wikipedia_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-700"><ExternalLink size={12} /></a>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      person.person_type === 'politician'
                        ? 'bg-indigo-100 text-indigo-700'
                        : person.person_type === 'sportsperson'
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-slate-100 text-slate-700'
                    }`}>
                      {personTypeLabel(person.person_type)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      person.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {person.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600">{person.used_dates.length}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end items-center gap-1">
                      <button onClick={() => setModal({ type: 'edit', person })} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil size={14} /></button>
                      <button onClick={() => setModal({ type: 'delete', person })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal?.type === 'create' && (
        <Modal title="Ajouter une personnalité Wikipedia" onClose={() => setModal(null)}>
          <WikiPersonForm onSubmit={handleCreate} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === 'edit' && (
        <Modal title={`Modifier — ${modal.person.name}`} onClose={() => setModal(null)}>
          <WikiPersonForm key={modal.person.id} initial={modal.person} onSubmit={handleEdit} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === 'delete' && (
        <Modal title="Supprimer la personnalité" onClose={() => setModal(null)}>
          <p className="text-sm text-gray-600 mb-6">
            Confirmer la désactivation de <strong className="text-gray-900">« {modal.person.name} »</strong> ?
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal(null)} disabled={deleting} className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50">Annuler</button>
            <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
              {deleting ? 'Suppression…' : 'Supprimer'}
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  )
}
