/**
 * wiki/WikiHintPanel.tsx
 * Renders always-visible profile data + supplemental hints.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Briefcase, Calendar, Flag, Trophy, Lock, Lightbulb } from 'lucide-react'
import type { WikiHintPayload, WikiVisibleProfile } from '@/api/wikiClient'

interface WikiHintPanelProps {
  profile: WikiVisibleProfile
  hints: WikiHintPayload[]
  hintsAvailable: number
  hintsRevealed: number
}

export function WikiHintPanel({ profile, hints, hintsAvailable, hintsRevealed }: WikiHintPanelProps) {
  const lockedCount = hintsAvailable - hintsRevealed

  return (
    <section aria-label="Profil et indices" className="w-full flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-film-text-dim uppercase tracking-wider">Informations visibles</h3>
      <VisibleProfile profile={profile} />

      <h3 className="text-xs font-semibold text-film-text-dim uppercase tracking-wider">
        Indices complémentaires ({hintsRevealed}/{hintsAvailable})
      </h3>

      <AnimatePresence initial={false}>
        {hints.map((hint, i) => (
          <WikiHintCard key={hint.type} hint={hint} index={i} />
        ))}
      </AnimatePresence>

      {Array.from({ length: lockedCount }).map((_, i) => (
        <LockedSlot key={`locked-${i}`} />
      ))}
    </section>
  )
}

function VisibleProfile({ profile }: { profile: WikiVisibleProfile }) {
  if (profile.type === 'politician') {
    return (
      <div className="rounded-lg film-border overflow-hidden">
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
          <Briefcase size={13} className="text-film-gold shrink-0" />
          <span className="text-[10px] font-semibold text-film-text-dim uppercase tracking-wider">Fonctions politiques</span>
        </div>
        <div className="px-3 pb-2.5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-film-text-dim uppercase">
                <th className="text-left pb-1 font-medium">Fonction</th>
                <th className="text-right pb-1 font-medium">Années</th>
                <th className="text-right pb-1 font-medium">Pays</th>
              </tr>
            </thead>
            <tbody>
              {profile.roles.map((r, i) => (
                <tr key={i} className="border-t border-film-border/30">
                  <td className="py-1 pr-2 text-film-text">{r.title}</td>
                  <td className="py-1 pr-2 text-film-text-dim text-right whitespace-nowrap">{r.years || '–'}</td>
                  <td className="py-1 text-film-gold text-right whitespace-nowrap">{r.country ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 space-y-1">
            {profile.roles
              .filter((r) => r.predecessor || r.successor)
              .slice(0, 3)
              .map((r, i) => (
                <p key={i} className="text-xs text-film-text-dim">
                  {r.title}: {r.predecessor ? `← ${r.predecessor}` : '—'} {r.successor ? ` | ${r.successor} →` : ''}
                </p>
              ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg film-border overflow-hidden">
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
        <Trophy size={13} className="text-film-gold shrink-0" />
        <span className="text-[10px] font-semibold text-film-text-dim uppercase tracking-wider">Carrière sportive</span>
      </div>
      <div className="px-3 pb-2.5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-film-text-dim uppercase">
              <th className="text-left pb-1 font-medium">Club</th>
              <th className="text-right pb-1 font-medium">Années</th>
              <th className="text-right pb-1 font-medium">M.</th>
              <th className="text-right pb-1 font-medium">B.</th>
            </tr>
          </thead>
          <tbody>
            {profile.clubs.map((c, i) => (
              <tr key={i} className="border-t border-film-border/30">
                <td className="py-1 pr-2 text-film-text">{c.name}</td>
                <td className="py-1 pr-2 text-film-text-dim text-right whitespace-nowrap">{c.years || '–'}</td>
                <td className="py-1 pr-2 text-film-text-dim text-right">{c.apps ?? '–'}</td>
                <td className="py-1 text-film-text-dim text-right">{c.goals ?? '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {profile.nationalTeam && (
          <p className="mt-2 text-xs text-film-text-dim">
            Équipe nationale: <span className="text-film-text">{profile.nationalTeam.name}</span>
            {profile.nationalTeam.caps != null ? ` · ${profile.nationalTeam.caps} sélections` : ''}
            {profile.nationalTeam.goals != null ? ` · ${profile.nationalTeam.goals} buts` : ''}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Locked slot ──────────────────────────────────────────────────────────────

function LockedSlot() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-dashed border-film-border/40 opacity-40">
      <Lock size={14} className="text-film-text-dim shrink-0" />
      <span className="text-xs text-film-text-dim">Indice verrouillé</span>
    </div>
  )
}

// ─── Hint card ────────────────────────────────────────────────────────────────

function WikiHintCard({ hint, index }: { hint: WikiHintPayload; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="rounded-lg film-border overflow-hidden"
    >
      <HintContent hint={hint} />
    </motion.div>
  )
}

function HintContent({ hint }: { hint: WikiHintPayload }) {
  switch (hint.type) {
    case 'wiki_birth_year':
      return <SimpleHint label="Année de naissance" value={hint.value != null ? String(hint.value) : 'Inconnue'} icon={Calendar} />
    case 'wiki_nationality':
      return <SimpleHint label="Nationalité" value={(hint.value as string | null) ?? 'Inconnue'} icon={Flag} />
    case 'wiki_party':
      return <SimpleHint label="Parti politique" value={(hint.value as string | null) ?? 'Non renseigné'} icon={Briefcase} />
    case 'wiki_position':
      return <SimpleHint label="Poste" value={(hint.value as string | null) ?? 'Non renseigné'} icon={Trophy} />
    case 'wiki_name_initials':
      return <SimpleHint label="Initiales du nom" value={String(hint.value)} icon={Lightbulb} />
    case 'wiki_name_length':
      return <SimpleHint label="Nombre de lettres du nom" value={String(hint.value)} icon={Lightbulb} />
    default:
      return null
  }
}

function HintHeader({ icon: Icon, label }: { icon: typeof Briefcase; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
      <Icon size={13} className="text-film-gold shrink-0" />
      <span className="text-[10px] font-semibold text-film-text-dim uppercase tracking-wider">{label}</span>
    </div>
  )
}

function SimpleHint({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: typeof Briefcase
}) {
  return (
    <div>
      <HintHeader icon={icon} label={label} />
      <p className="px-3 pb-2.5 text-sm text-film-text">{value}</p>
    </div>
  )
}
