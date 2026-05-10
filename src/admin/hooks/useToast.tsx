import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

interface Toast { id: number; message: string; type: 'success' | 'error' }
interface ToastCtx { success: (msg: string) => void; error: (msg: string) => void }

const ToastContext = createContext<ToastCtx>({ success: () => {}, error: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const add = useCallback((message: string, type: Toast['type']) => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])

  const ctx: ToastCtx = {
    success: (msg) => add(msg, 'success'),
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
              'flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto animate-in slide-in-from-bottom-2',
              t.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white',
            ].join(' ')}
          >
            {t.type === 'success'
              ? <CheckCircle size={16} className="shrink-0" />
              : <XCircle size={16} className="shrink-0" />
            }
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
