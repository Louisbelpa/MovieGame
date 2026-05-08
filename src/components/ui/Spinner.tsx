interface SpinnerProps {
  variant?: 'spinner' | 'skeleton'
  size?: 'sm' | 'md' | 'lg'
}

export function Spinner({ variant = 'spinner', size = 'md' }: SpinnerProps) {
  if (variant === 'skeleton') {
    return (
      <div className={`skeleton skeleton--${size}`}>
        <div className="skeleton-line" />
        <div className="skeleton-line" />
        <div className="skeleton-line" />
      </div>
    )
  }

  return (
    <div className={`spinner spinner--${size}`} role="status">
      <span className="sr-only">Chargement...</span>
    </div>
  )
}
