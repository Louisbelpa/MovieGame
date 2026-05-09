/**
 * Encadrés réutilisables pour clarifier ce qui est montré au joueur vs hors jeu.
 */

import type { ReactNode } from 'react'

export type AdminFormBadge =
  | 'during-game'
  | 'hints'
  | 'after-game'
  | 'secret'
  | 'meta'

const BADGE_CLASS: Record<AdminFormBadge, string> = {
  'during-game': 'bg-violet-100 text-violet-800 border-violet-200',
  hints: 'bg-amber-100 text-amber-900 border-amber-200',
  'after-game': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  secret: 'bg-slate-200 text-slate-800 border-slate-300',
  meta: 'bg-gray-100 text-gray-600 border-gray-200',
}

const BADGE_SHORT: Record<AdminFormBadge, string> = {
  'during-game': 'Pendant la partie',
  hints: 'Indices',
  'after-game': 'Fin de partie',
  secret: 'Réponse secrète',
  meta: 'Hors jeu',
}

interface AdminFormSectionProps {
  title: string
  description?: string
  badges?: AdminFormBadge[]
  /** Ouvert par défaut (mobile). */
  defaultOpen?: boolean
  /** Panneau toujours ouvert (grand bloc « contenu du défi » lisible dans la modale). */
  variant?: 'accordion' | 'panel'
  children: ReactNode
}

export function AdminFormSubheading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mt-8 mb-3 first:mt-0 pb-2 border-b border-gray-100">
      {children}
    </p>
  )
}

export function AdminFormSection({
  title,
  description,
  badges = [],
  defaultOpen = true,
  variant = 'accordion',
  children,
}: AdminFormSectionProps) {
  const headerInner = (
    <>
      <span className="font-medium text-gray-900">{title}</span>
      <span className="hidden sm:inline text-gray-300">—</span>
      <div className="flex flex-wrap gap-1.5">
        {badges.map((b) => (
          <span
            key={b}
            className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded border ${BADGE_CLASS[b]}`}
          >
            {BADGE_SHORT[b]}
          </span>
        ))}
      </div>
    </>
  )

  const body = (
    <>
      {description ? (
        <p className="text-xs text-gray-500 leading-relaxed border-l-2 border-gray-200 pl-3">{description}</p>
      ) : null}
      {children}
    </>
  )

  if (variant === 'panel') {
    return (
      <section className="rounded-xl border-2 border-indigo-100 bg-gradient-to-b from-white to-indigo-50/40 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-indigo-50/80 border-b border-indigo-100 flex flex-wrap items-center gap-2">
          {headerInner}
        </div>
        <div className="px-4 py-4 space-y-4">{body}</div>
      </section>
    )
  }

  return (
    <details
      open={defaultOpen}
      className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden group"
    >
      <summary className="cursor-pointer select-none list-none px-4 py-3 bg-gray-50/90 border-b border-gray-100 hover:bg-gray-50 [&::-webkit-details-marker]:hidden flex flex-wrap items-center gap-2">
        {headerInner}
        <span className="ml-auto text-gray-400 text-xs shrink-0 group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div className="px-4 py-4 space-y-4">{body}</div>
    </details>
  )
}
