/**
 * wiki/WikiHintPanel.tsx
 * Renders always-visible profile data + supplemental hints.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Briefcase, Building2, Calendar, Flag, Trophy, Lock, Lightbulb } from 'lucide-react'
import type { WikiChallengePayload, WikiHintPayload, WikiVisibleProfile } from '@/api/wikiClient'

type WikiPersonUiType = WikiChallengePayload['personType']

interface WikiHintPanelProps {
  profile: WikiVisibleProfile
  hints: WikiHintPayload[]
  hintsAvailable: number
  hintsRevealed: number
  showProfile?: boolean
  showHints?: boolean
  wikiPersonType?: WikiPersonUiType
}

function biographySectionTitle(personType: WikiPersonUiType | undefined): string {
  switch (personType) {
    case 'artist':
      return 'Musique & parcours'
    case 'scientist':
      return 'Repères scientifiques'
    case 'entrepreneur':
      return 'Parcours & entreprises'
    case 'writer':
      return 'Littérature & œuvres'
    case 'historical_figure':
      return 'Contexte historique'
    default:
      return 'Repères biographiques'
  }
}

export function WikiHintPanel({
  profile,
  hints,
  hintsAvailable,
  hintsRevealed,
  showProfile = true,
  showHints = true,
  wikiPersonType,
}: WikiHintPanelProps) {
  const lockedCount = hintsAvailable - hintsRevealed

  return (
    <section aria-label="Profil et indices" className="w-full flex flex-col gap-2">
      {showProfile && (
        <VisibleProfile profile={profile} biographyTitle={biographySectionTitle(wikiPersonType)} />
      )}

      {showHints && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
          <AnimatePresence initial={false}>
            {hints.map((hint, i) => (
              <WikiHintCard key={hint.type} hint={hint} index={i} />
            ))}
          </AnimatePresence>
          {Array.from({ length: lockedCount }).map((_, i) => (
            <LockedSlot key={`wiki-locked-${i}`} />
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Visible profile ──────────────────────────────────────────────────────────

function ProfileCard({ icon: Icon, label, children }: { icon: typeof Briefcase; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg film-border overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-film-border/30">
        <Icon size={13} className="text-film-gold shrink-0" />
        <span className="text-sm font-semibold text-film-text-dim uppercase tracking-wider">{label}</span>
      </div>
      <div className="px-3 py-2">
        {children}
      </div>
    </div>
  )
}

function VisibleProfile({
  profile,
  biographyTitle,
}: {
  profile: WikiVisibleProfile
  biographyTitle: string
}) {
  if (profile.type === 'politician') {
    return (
      <ProfileCard icon={Briefcase} label="Fonctions politiques">
        {profile.roles.length === 0 ? (
          <p className="text-sm text-film-text-dim italic">Fonctions non renseignées.</p>
        ) : (
          <div className="space-y-2">
            {profile.roles.map((r, i) => (
              <div key={i} className="text-sm leading-snug">
                <span className="text-film-text font-medium">{r.title}</span>
                {(r.years || r.country) && (
                  <span className="text-film-text-dim"> · {[r.years, r.country].filter(Boolean).join(' · ')}</span>
                )}
                {(r.predecessor || r.successor) && (
                  <div className="text-film-text-dim mt-0.5">
                    {r.predecessor && `← ${r.predecessor}`}
                    {r.predecessor && r.successor && ' · '}
                    {r.successor && `${r.successor} →`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ProfileCard>
    )
  }

  if (profile.type === 'generic') {
    const domainLabel = biographyTitle.startsWith('Musique') ? 'Musique' : 'Domaine'
    const domainText = profile.domain?.trim() ?? ''
    const domainDisplay =
      domainLabel === 'Musique' && /^musique\b/i.test(domainText)
        ? (domainText.replace(/^\s*Musique\s*(?:—|-|–|:)?\s*/i, '').trim() || domainText)
        : domainText
    const parts =
      profile.notableWorkParts?.length
        ? profile.notableWorkParts
        : profile.notableWork
          ? [profile.notableWork]
          : []
    const hasBody =
      (profile.highlights?.length ?? 0) > 0 ||
      !!profile.company?.trim() ||
      !!profile.domain?.trim() ||
      parts.length > 0 ||
      !!profile.era?.trim()

    return (
      <ProfileCard icon={Briefcase} label={biographyTitle}>
        <div className="space-y-3 text-sm">
          {(profile.highlights?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-film-text-dim uppercase tracking-wider mb-1.5">Repères</p>
              <ul className="space-y-1.5">
                {profile.highlights!.map((h, i) => (
                  <li key={i} className="leading-snug">
                    <span className="text-film-text-dim">{h.label}</span>
                    <span className="text-film-text-dim"> · </span>
                    <span className="text-film-text">{h.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {profile.company?.trim() && (
            <p>
              <span className="text-film-text-dim">Entreprise(s) · </span>
              <span className="text-film-text">{profile.company.trim()}</span>
            </p>
          )}
          {profile.domain && (
            <p><span className="text-film-text-dim">{domainLabel} · </span><span className="text-film-text">{domainDisplay}</span></p>
          )}
          {parts.length > 1 ? (
            <div>
              <p className="text-xs font-semibold text-film-text-dim uppercase tracking-wider mb-1">Œuvres & faits</p>
              <ul className="list-disc pl-4 space-y-0.5 text-film-text">
                {parts.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          ) : parts.length === 1 ? (
            <p><span className="text-film-text-dim">Oeuvre / fait notable · </span><span className="text-film-text">{parts[0]}</span></p>
          ) : null}
          {profile.era && (
            <p><span className="text-film-text-dim">Période · </span><span className="text-film-text">{profile.era}</span></p>
          )}
          {!hasBody && (
            <p className="text-film-text-dim italic">Informations non renseignées.</p>
          )}
        </div>
      </ProfileCard>
    )
  }

  return (
    <ProfileCard icon={Trophy} label={`Carrière sportive${profile.sport ? ` · ${profile.sport}` : ''}`}>
      {(profile.clubs.length > 0 || profile.clubsYouth.length > 0) ? (
        <div className="space-y-3">
          {profile.clubsYouth.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-film-text-dim uppercase tracking-wider mb-1.5">Parcours junior</p>
              <div className="overflow-x-auto rounded-md border border-film-border/40">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-film-border/40 bg-film-black/20">
                      <th className="text-left font-medium text-film-text-dim py-1.5 px-2">Années</th>
                      <th className="text-left font-medium text-film-text-dim py-1.5 px-2">Club</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.clubsYouth.map((c, i) => (
                      <tr key={`y-${i}`} className="border-b border-film-border/20 last:border-0">
                        <td className="py-1.5 px-2 text-film-text tabular-nums whitespace-nowrap">{c.years || '—'}</td>
                        <td className="py-1.5 px-2 text-film-text">{c.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {profile.clubs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-film-text-dim uppercase tracking-wider mb-1.5">Parcours senior</p>
              <div className="overflow-x-auto rounded-md border border-film-border/40">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-film-border/40 bg-film-black/20">
                      <th className="text-left font-medium text-film-text-dim py-1.5 px-2">Années</th>
                      <th className="text-left font-medium text-film-text-dim py-1.5 px-2">Club</th>
                      <th className="text-left font-medium text-film-text-dim py-1.5 px-2 w-[5rem]">M. (B.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.clubs.map((c, i) => (
                      <tr key={`s-${i}`} className="border-b border-film-border/20 last:border-0">
                        <td className="py-1.5 px-2 text-film-text tabular-nums whitespace-nowrap">{c.years || '—'}</td>
                        <td className="py-1.5 px-2 text-film-text">{c.name}</td>
                        <td className="py-1.5 px-2 text-film-text-dim tabular-nums whitespace-nowrap">
                          {c.apps != null && c.goals != null ? `${c.apps} (${c.goals})` : c.apps != null ? `${c.apps}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {profile.nationalTeam && (
            <div className="text-sm pt-1 border-t border-film-border/30 text-film-text-dim">
              {profile.nationalTeam.name}
              {profile.nationalTeam.caps != null ? ` · ${profile.nationalTeam.caps} sél.` : ''}
              {profile.nationalTeam.goals != null ? ` · ${profile.nationalTeam.goals} b.` : ''}
            </div>
          )}
        </div>
      ) : profile.careerHighlights.length > 0 ? (
        <div className="space-y-1 text-sm">
          {profile.careerHighlights.map((h, i) => (
            <p key={i}><span className="text-film-text-dim">{h.label} · </span><span className="text-film-text">{h.value}</span></p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-film-text-dim italic">Carrière en cours de consolidation.</p>
      )}
    </ProfileCard>
  )
}

// ─── Hint card ────────────────────────────────────────────────────────────────

function WikiHintCard({ hint, index }: { hint: WikiHintPayload; index: number }) {
  const { icon: Icon, label, formatted } = resolveWikiHint(hint)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="flex items-start gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg film-border"
    >
      <span className="mt-0.5 text-film-gold shrink-0" aria-hidden>
        <Icon size={14} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-film-text-dim uppercase tracking-wider">{label}</p>
        <p className="text-sm text-film-text leading-snug mt-0.5 break-words">{formatted}</p>
      </div>
    </motion.div>
  )
}

function resolveWikiHint(hint: WikiHintPayload): {
  icon: typeof Calendar
  label: string
  formatted: string
} {
  switch (hint.type) {
    case 'wiki_birth_year':
      return { icon: Calendar, label: 'Année de naissance', formatted: hint.value != null ? String(hint.value) : 'Inconnue' }
    case 'wiki_nationality':
      return { icon: Flag, label: 'Nationalité', formatted: (hint.value as string | null) ?? 'Inconnue' }
    case 'wiki_party':
      return { icon: Briefcase, label: 'Parti politique', formatted: (hint.value as string | null) ?? 'Non renseigné' }
    case 'wiki_position':
      return { icon: Trophy, label: 'Poste', formatted: (hint.value as string | null) ?? 'Non renseigné' }
    case 'wiki_domain':
      return { icon: Briefcase, label: 'Domaine', formatted: (hint.value as string | null) ?? 'Non renseigné' }
    case 'wiki_notable_work':
      return { icon: Lightbulb, label: 'Oeuvre notable', formatted: (hint.value as string | null) ?? 'Non renseigné' }
    case 'wiki_company':
      return { icon: Building2, label: 'Entreprise(s)', formatted: (hint.value as string | null) ?? 'Non renseigné' }
    case 'wiki_name_initials':
      return { icon: Lightbulb, label: 'Initiales', formatted: String(hint.value) }
    case 'wiki_name_length':
      return { icon: Lightbulb, label: 'Lettres dans le nom', formatted: String(hint.value) }
    default:
      return { icon: Lightbulb, label: hint.type, formatted: String(hint.value ?? '') }
  }
}

function LockedSlot() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-dashed border-film-border/40 opacity-40">
      <Lock size={14} className="text-film-text-dim shrink-0" aria-hidden />
      <span className="text-sm text-film-text-dim">Indice verrouillé</span>
    </div>
  )
}
