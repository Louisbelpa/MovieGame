import type { ReactNode } from 'react'

interface ToggleOption<T extends string> {
  id: T
  label: string
  icon?: ReactNode
}

interface SegmentedToggleProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: ToggleOption<T>[]
  className?: string
  buttonClassName?: string
}

export function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
  className = '',
  buttonClassName = '',
}: SegmentedToggleProps<T>) {
  return (
    <div className={`inline-flex bg-gray-100 border border-gray-200 p-1 rounded-lg ${className}`.trim()}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={[
            'flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            value === option.id
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-800',
            buttonClassName,
          ].join(' ')}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}
