/**
 * ui/Modal.tsx
 * Accessible, animated modal with backdrop.
 * - Focus trap (Tab cycles inside the panel)
 * - Initial focus on panel opening, focus restoration on close
 * - Either `title` or `ariaLabel` is required for an accessible name
 */

import { useEffect, useId, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  /** Custom content rendered to the left of the close button (replaces title) */
  headerContent?: React.ReactNode
  /** Fallback accessible name if no visible title is rendered */
  ariaLabel?: string
  /** Optional explicit label element id */
  ariaLabelledBy?: string
  /** Optional description element id */
  ariaDescribedBy?: string
  children: React.ReactNode
  className?: string
  /** If true, clicking backdrop does not close */
  persistent?: boolean
}

const FOCUSABLE_SELECTOR =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({
  isOpen,
  onClose,
  title,
  headerContent,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  children,
  className,
  persistent = false,
}: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previousActiveRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    previousActiveRef.current = document.activeElement as HTMLElement | null

    const focusFirst = () => {
      if (!panelRef.current) return
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      const first = focusables[0]
      if (first) first.focus()
      else panelRef.current.focus()
    }
    const t = window.setTimeout(focusFirst, 60)

    return () => {
      window.clearTimeout(t)
      const prev = previousActiveRef.current
      if (prev && typeof prev.focus === 'function') {
        try { prev.focus() } catch { /* ignore */ }
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !persistent) {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement)
      if (focusables.length === 0) {
        e.preventDefault()
        panelRef.current.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose, persistent])

  const labelledBy = ariaLabelledBy ?? (title ? titleId : undefined)
  const fallbackLabel = !title ? (ariaLabel ?? 'Boîte de dialogue') : undefined

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={persistent ? undefined : onClose}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-describedby={ariaDescribedBy}
            aria-label={fallbackLabel}
            tabIndex={-1}
            className={cn(
              'relative z-10 w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto film-border rounded-2xl p-5 shadow-2xl sm:max-h-[85dvh] sm:p-6 focus:outline-none',
              className
            )}
            initial={{ opacity: 0, y: 32, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          >
            {(title || headerContent || !persistent) && (
              <div className={`mb-5 ${headerContent ? 'grid grid-cols-[44px_1fr_44px] items-center' : 'flex items-center justify-between'}`}>
                {headerContent ? (
                  <>
                    <div />
                    <div className="flex justify-center">{headerContent}</div>
                    {!persistent && (
                      <button
                        onClick={onClose}
                        aria-label="Fermer"
                        className="justify-self-end inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-gray transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-film-gold"
                      >
                        <X size={20} aria-hidden />
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {title && (
                      <h2 id={titleId} className="font-title text-xl text-film-text font-semibold">
                        {title}
                      </h2>
                    )}
                    {!persistent && (
                      <button
                        onClick={onClose}
                        aria-label="Fermer"
                        className="ml-auto inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-film-text-dim hover:text-film-text hover:bg-film-gray transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-film-gold"
                      >
                        <X size={20} aria-hidden />
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
