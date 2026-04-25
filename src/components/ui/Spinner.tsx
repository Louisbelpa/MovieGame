import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Chargement…"
      className={cn(
        'inline-block rounded-full border-2 border-film-border border-t-film-gold animate-spin',
        sizeClasses[size],
        className
      )}
    />
  )
}
