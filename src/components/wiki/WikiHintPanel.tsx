/**
 * wiki/WikiHintPanel.tsx
 * Renders wiki game hints: politician roles (table) or sports clubs (timeline).
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Briefcase, Calendar, MapPin, Flag, Trophy, Lock, User } from 'lucide-react'
import type { WikiHintPayload } from '@/api/wikiClient'

interface WikiHintPanelProps {
  hints: WikiHintPayload[]
  hintsAvailable: number
  hintsRevealed: number
}

export function WikiHintPanel({ hints, hintsAvailable, hintsRevealed }: WikiHintPanelProps) {
  const lockedCount = hintsAvailable - hintsRevealed

  return (
    <section aria-label="Indices" className="w-full flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-film-text-dim uppercase tracking-wider">
        Indices ({hintsRevealed}/{hintsAvailable})
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
    case 'wiki_roles_titles':
      return <RolesTitles titles={hint.value as string[]} />
    case 'wiki_roles_dates':
      return <RolesDates rows={hint.value as { title: string; years: string }[]} />
    case 'wiki_roles_countries':
      return <RolesCountries rows={hint.value as { title: string; years: string; country: string | null }[]} />
    case 'wiki_predecessor':
      return <PredecessorHint rows={hint.value as { title: string; predecessor: string | null; successor: string | null }[]} />
    case 'wiki_birth_party':
      return <BirthParty data={hint.value as { birth_year: number | null; party: string | null }} />
    case 'wiki_clubs_names':
      return <ClubsNames names={hint.value as string[]} />
    case 'wiki_clubs_years':
      return <ClubsYears rows={hint.value as { name: string; years: string }[]} />
    case 'wiki_clubs_stats':
      return <ClubsStats rows={hint.value as { name: string; years: string; apps: number | null; goals: number | null }[]} />
    case 'wiki_national_team':
      return <NationalTeam data={hint.value as { name: string; caps: number | null; goals: number | null }} />
    case 'wiki_sport_position':
      return <SportPosition data={hint.value as { sport: string | null; position: string | null; birth_year: number | null }} />
    default:
      return null
  }
}

// ─── Politician hints ─────────────────────────────────────────────────────────

function HintHeader({ icon: Icon, label }: { icon: typeof Briefcase; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
      <Icon size={13} className="text-film-gold shrink-0" />
      <span className="text-[10px] font-semibold text-film-text-dim uppercase tracking-wider">{label}</span>
    </div>
  )
}

function RolesTitles({ titles }: { titles: string[] }) {
  return (
    <div>
      <HintHeader icon={Briefcase} label="Fonctions" />
      <ul className="px-3 pb-2.5 space-y-1">
        {titles.map((t, i) => (
          <li key={i} className="text-sm text-film-text">• {t}</li>
        ))}
      </ul>
    </div>
  )
}

function RolesDates({ rows }: { rows: { title: string; years: string }[] }) {
  return (
    <div>
      <HintHeader icon={Calendar} label="Fonctions et années" />
      <div className="px-3 pb-2.5">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-film-border/30 first:border-0">
                <td className="py-1 pr-3 text-film-text">{r.title}</td>
                <td className="py-1 text-film-text-dim whitespace-nowrap text-right">{r.years}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RolesCountries({ rows }: { rows: { title: string; years: string; country: string | null }[] }) {
  return (
    <div>
      <HintHeader icon={MapPin} label="Fonctions, années et pays" />
      <div className="px-3 pb-2.5">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-film-border/30 first:border-0">
                <td className="py-1 pr-2 text-film-text">{r.title}</td>
                {r.country && <td className="py-1 pr-2 text-film-gold text-xs">{r.country}</td>}
                <td className="py-1 text-film-text-dim whitespace-nowrap text-right">{r.years}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PredecessorHint({ rows }: { rows: { title: string; predecessor: string | null; successor: string | null }[] }) {
  return (
    <div>
      <HintHeader icon={User} label="Prédécesseurs / successeurs" />
      <div className="px-3 pb-2.5 space-y-2">
        {rows.map((r, i) => (
          <div key={i}>
            <p className="text-xs font-medium text-film-text-dim">{r.title}</p>
            <div className="flex gap-4 mt-0.5">
              {r.predecessor && <span className="text-sm text-film-text">← {r.predecessor}</span>}
              {r.successor && <span className="text-sm text-film-text">{r.successor} →</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BirthParty({ data }: { data: { birth_year: number | null; party: string | null } }) {
  return (
    <div>
      <HintHeader icon={Calendar} label="Naissance et parti" />
      <div className="px-3 pb-2.5 flex flex-wrap gap-3">
        {data.birth_year && <span className="text-sm text-film-text">Né(e) en <strong>{data.birth_year}</strong></span>}
        {data.party && <span className="text-sm text-film-text">Parti : <strong>{data.party}</strong></span>}
      </div>
    </div>
  )
}

// ─── Sports hints ─────────────────────────────────────────────────────────────

function ClubsNames({ names }: { names: string[] }) {
  return (
    <div>
      <HintHeader icon={Trophy} label="Clubs" />
      <ul className="px-3 pb-2.5 space-y-1">
        {names.map((n, i) => (
          <li key={i} className="text-sm text-film-text">• {n}</li>
        ))}
      </ul>
    </div>
  )
}

function ClubsYears({ rows }: { rows: { name: string; years: string }[] }) {
  return (
    <div>
      <HintHeader icon={Trophy} label="Clubs et années" />
      <div className="px-3 pb-2.5">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-film-border/30 first:border-0">
                <td className="py-1 pr-3 text-film-text">{r.name}</td>
                <td className="py-1 text-film-text-dim whitespace-nowrap text-right">{r.years}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ClubsStats({ rows }: { rows: { name: string; years: string; apps: number | null; goals: number | null }[] }) {
  return (
    <div>
      <HintHeader icon={Trophy} label="Clubs, années et statistiques" />
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
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-film-border/30">
                <td className="py-1 pr-2 text-film-text">{r.name}</td>
                <td className="py-1 pr-2 text-film-text-dim text-right whitespace-nowrap">{r.years}</td>
                <td className="py-1 pr-2 text-film-text-dim text-right">{r.apps ?? '–'}</td>
                <td className="py-1 text-film-text-dim text-right">{r.goals ?? '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NationalTeam({ data }: { data: { name: string; caps: number | null; goals: number | null } }) {
  return (
    <div>
      <HintHeader icon={Flag} label="Équipe nationale" />
      <div className="px-3 pb-2.5 flex flex-wrap gap-4">
        <span className="text-sm text-film-text font-medium">{data.name}</span>
        {data.caps != null && <span className="text-sm text-film-text-dim">{data.caps} sélections</span>}
        {data.goals != null && <span className="text-sm text-film-text-dim">{data.goals} buts</span>}
      </div>
    </div>
  )
}

function SportPosition({ data }: { data: { sport: string | null; position: string | null; birth_year: number | null } }) {
  return (
    <div>
      <HintHeader icon={Trophy} label="Sport, poste et naissance" />
      <div className="px-3 pb-2.5 flex flex-wrap gap-3">
        {data.sport && <span className="text-sm text-film-text">{data.sport}</span>}
        {data.position && <span className="text-sm text-film-text-dim">• {data.position}</span>}
        {data.birth_year && <span className="text-sm text-film-text-dim">• Né(e) en {data.birth_year}</span>}
      </div>
    </div>
  )
}
