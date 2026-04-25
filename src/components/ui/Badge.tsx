import { cn } from '@/lib/utils'

type BadgeVariant = 'gold' | 'green' | 'red' | 'muted' | 'amber'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  gold: 'bg-film-gold/15 text-film-gold border-film-gold/30',
  green: 'bg-film-green/15 text-film-green border-film-green/30',
  red: 'bg-film-red/15 text-film-red border-film-red/30',
  muted: 'bg-film-muted/20 text-film-text-dim border-film-border',
  amber: 'bg-film-amber/15 text-film-amber border-film-amber/30',
}

export function Badge({ variant = 'muted', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
