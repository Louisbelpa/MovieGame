import { cn } from '@/lib/utils'

type BadgeVariant = 'gold' | 'green' | 'red' | 'muted' | 'amber'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  gold:  { background: 'var(--coral-soft)',   color: 'var(--coral-d)',   border: '1px solid var(--coral)' },
  green: { background: 'var(--correct-soft)', color: 'var(--correct-d)', border: '1px solid var(--correct)' },
  red:   { background: 'var(--wrong-soft)',   color: 'var(--wrong-d)',   border: '1px solid var(--wrong)' },
  muted: { background: 'var(--bg-2)',         color: 'var(--ink-2)',     border: '1px solid var(--line)' },
  amber: { background: '#fff5e6',             color: 'var(--flame)',     border: '1px solid #ffe2bd' },
}

export function Badge({ variant = 'muted', children, className }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full', className)}
      style={variantStyles[variant]}
    >
      {children}
    </span>
  )
}
