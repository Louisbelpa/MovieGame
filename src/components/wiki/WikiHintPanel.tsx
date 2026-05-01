/**
 * wiki/WikiHintPanel.tsx
 * Renders always-visible profile data + supplemental hints.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Briefcase, Calendar, Flag, Trophy, Lock, Lightbulb } from 'lucide-react'
import type { WikiHintPayload, WikiVisibleProfile } from '@/api/wikiClient'

interface WikiHintPanelProps {
  photoUrl: string | null
  profile: WikiVisibleProfile
  hints: WikiHintPayload[]
  hintsAvailable: number
  hintsRevealed: number
}

export function WikiHintPanel({ photoUrl, profile, hints, hintsAvailable, hintsRevealed }: WikiHintPanelProps) {
  const lockedCount = hintsAvailable - hintsRevealed

  return (
    <section aria-label="Profil et indices" className="w-full flex flex-col gap-2">
      {photoUrl && (
        <div className="rounded-lg film-border overflow-hidden relative">
          <img
            src={photoUrl}
            alt="Portrait flouté"
            className="w-full h-32 object-cover object-top blur-md"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onError={(e) => { e.currentTarget.parentElement!.style.display = 'none' }}
          />
          <span className="absolute left-2 top-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-black/50 text-white">
            Photo floutée
          </span>
        </div>
      )}

      <VisibleProfile profile={profile} />

      {(hints.length > 0 || lockedCount > 0) && (
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-xs font-semibold text-film-text-dim uppercase tracking-wider">Indices</span>
          <span className="text-[10px] text-film-text-dim/60">{hintsRevealed}/{hintsAvailable}</span>
        </div>
      )}

      <AnimatePresence initial={false}>
        {hints.map((hint, i) => (
          <WikiHintCard key={hint.type} hint={hint} index={i} />
        ))}
      </AnimatePresence>

      {lockedCount > 0 && (
        <p className="text-xs text-film-text-dim/50 text-center py-1 flex items-center justify-center gap-1.5">
          <Lock size={11} className="shrink-0" />
          {lockedCount} indice{lockedCount > 1 ? 's' : ''} se déverrouille{lockedCount > 1 ? 'nt' : ''} avec les tentatives
        </p>
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
        <span className="text-xs font-semibold text-film-text-dim uppercase tracking-wider">{label}</span>
      </div>
      <div className="px-3 py-2">
        {children}
      </div>
    </div>
  )
}

function VisibleProfile({ profile }: { profile: WikiVisibleProfile }) {
  if (profile.type === 'politician') {
    return (
      <ProfileCard icon={Briefcase} label="Fonctions politiques">
        {profile.roles.length === 0 ? (
          <p className="text-xs text-film-text-dim italic">Fonctions non renseignées.</p>
        ) : (
          <div className="space-y-2">
            {profile.roles.map((r, i) => (
              <div key={i} className="text-xs leading-snug">
                <span className="text-film-text font-medium">{r.title}</span>
                {(r.years || r.country) && (
                  <span className="text-film-text-dim"> · {[r.years, r.country].filter(Boolean).join(' · ')}</span>
                )}
                {(r.predecessor || r.successor) && (
                  <div className="text-film-text-dim/50 mt-0.5">
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
    return (
      <ProfileCard icon={Briefcase} label="Repères biographiques">
        <div className="space-y-1 text-xs">
          {profile.domain && (
            <p><span className="text-film-text-dim">Domaine · </span><span className="text-film-text">{profile.domain}</span></p>
          )}
          {profile.notableWork && (
            <p><span className="text-film-text-dim">Oeuvre notable · </span><span className="text-film-text">{profile.notableWork}</span></p>
          )}
          {profile.era && (
            <p><span className="text-film-text-dim">Période · </span><span className="text-film-text">{profile.era}</span></p>
          )}
          {!profile.domain && !profile.notableWork && !profile.era && (
            <p className="text-film-text-dim italic">Informations non renseignées.</p>
          )}
        </div>
      </ProfileCard>
    )
  }

  return (
    <ProfileCard icon={Trophy} label={`Carrière sportive${profile.sport ? ` · ${profile.sport}` : ''}`}>
      {profile.clubs.length > 0 ? (
        <div className="space-y-1.5">
          {profile.clubs.map((c, i) => (
            <div key={i} className="text-xs leading-snug">
              <span className="text-film-text font-medium">{c.name}</span>
              <span className="text-film-text-dim">
                {c.years ? ` · ${c.years}` : ''}
                {c.apps != null ? ` · ${c.apps} mat.` : ''}
                {c.goals != null ? ` · ${c.goals} b.` : ''}
              </span>
            </div>
          ))}
          {profile.nationalTeam && (
            <div className="text-xs pt-1 border-t border-film-border/30 text-film-text-dim">
              {profile.nationalTeam.name}
              {profile.nationalTeam.caps != null ? ` · ${profile.nationalTeam.caps} sél.` : ''}
              {profile.nationalTeam.goals != null ? ` · ${profile.nationalTeam.goals} b.` : ''}
            </div>
          )}
        </div>
      ) : profile.careerHighlights.length > 0 ? (
        <div className="space-y-1 text-xs">
          {profile.careerHighlights.map((h, i) => (
            <p key={i}><span className="text-film-text-dim">{h.label} · </span><span className="text-film-text">{h.value}</span></p>
          ))}
        </div>
      ) : (
        <p className="text-xs text-film-text-dim italic">Carrière en cours de consolidation.</p>
      )}
    </ProfileCard>
  )
}

// ─── Hint card ────────────────────────────────────────────────────────────────

function WikiHintCard({ hint, index }: { hint: WikiHintPayload; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <HintContent hint={hint} />
    </motion.div>
  )
}

function HintContent({ hint }: { hint: WikiHintPayload }) {
  switch (hint.type) {
    case 'wiki_birth_year':
      return <CompactHint label="Année de naissance" value={hint.value != null ? String(hint.value) : 'Inconnue'} icon={Calendar} />
    case 'wiki_nationality':
      return <CompactHint label="Nationalité" value={(hint.value as string | null) ?? 'Inconnue'} icon={Flag} />
    case 'wiki_party':
      return <CompactHint label="Parti politique" value={(hint.value as string | null) ?? 'Non renseigné'} icon={Briefcase} />
    case 'wiki_position':
      return <CompactHint label="Poste" value={(hint.value as string | null) ?? 'Non renseigné'} icon={Trophy} />
    case 'wiki_domain':
      return <CompactHint label="Domaine" value={(hint.value as string | null) ?? 'Non renseigné'} icon={Briefcase} />
    case 'wiki_notable_work':
      return <CompactHint label="Oeuvre notable" value={(hint.value as string | null) ?? 'Non renseigné'} icon={Lightbulb} />
    case 'wiki_name_initials':
      return <CompactHint label="Initiales" value={String(hint.value)} icon={Lightbulb} />
    case 'wiki_name_length':
      return <CompactHint label="Lettres dans le nom" value={String(hint.value)} icon={Lightbulb} />
    default:
      return null
  }
}

function CompactHint({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Briefcase }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg film-border">
      <Icon size={13} className="text-film-gold shrink-0" />
      <span className="text-xs text-film-text-dim flex-1 min-w-0">{label}</span>
      <span className="text-xs text-film-text font-medium text-right">{value}</span>
    </div>
  )
}
