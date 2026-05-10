import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
  undo?: () => void
}

interface ToastOptions { undo?: () => void }
interface ToastCtx {
  success: (msg: string, opts?: ToastOptions) => void
  error: (msg: string) => void
}

const ToastContext = createContext<ToastCtx>({ success: () => {}, error: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const add = useCallback((message: string, type: Toast['type'], undo?: () => void) => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, message, type, undo }])
    setTimeout(() => dismiss(id), undo ? 5500 : 3500)
  }, [dismiss])

  const ctx: ToastCtx = {
    success: (msg, opts) => add(msg, 'success', opts?.undo),
    error: (msg) => add(msg, 'error'),
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              'flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto',
              t.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white',
            ].join(' ')}
          >
            {t.type === 'success'
              ? <CheckCircle size={16} className="shrink-0" />
              : <XCircle size={16} className="shrink-0" />
            }
            <span className="flex-1">{t.message}</span>
            {t.undo && (
              <button
                onClick={() => { t.undo!(); dismiss(t.id) }}
                className="ml-1 underline text-white/90 hover:text-white text-xs font-semibold shrink-0 transition-colors"
              >
                Annuler
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
