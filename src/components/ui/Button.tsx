import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary:   { background: 'var(--mode-color, var(--coral))', color: '#fff', boxShadow: '0 5px 0 var(--mode-soft, var(--coral-soft))', border: 'none' },
  secondary: { background: '#fff', color: 'var(--ink)', boxShadow: '0 4px 0 var(--line-2)', border: '2px solid var(--line)' },
  ghost:     { background: 'transparent', color: 'var(--ink-2)', border: 'none', boxShadow: 'none' },
  danger:    { background: 'var(--wrong-soft)', color: 'var(--wrong-d)', border: '2px solid var(--wrong)', boxShadow: 'none' },
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-[12px] gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-[14px] gap-2',
  lg: 'px-6 py-3 text-base rounded-[16px] gap-2.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading = false, className, children, disabled, style, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all duration-100 cursor-pointer select-none',
          'focus-visible:outline-2 focus-visible:outline-offset-2',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
          'active:translate-y-[3px]',
          sizeClasses[size],
          className
        )}
        style={{ ...variantStyles[variant], ...style }}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
