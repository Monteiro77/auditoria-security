import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastTipo = 'sucesso' | 'erro' | 'info'
interface Toast {
  id: number
  msg: string
  tipo: ToastTipo
}

interface ToastCtx {
  toast: (msg: string, tipo?: ToastTipo) => void
}

const Ctx = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((msg: string, tipo: ToastTipo = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg, tipo }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto w-full max-w-sm rounded-lg px-4 py-3 text-sm font-medium shadow-lg ring-1 ${
              t.tipo === 'sucesso'
                ? 'bg-emerald-600 text-white ring-emerald-700'
                : t.tipo === 'erro'
                  ? 'bg-red-600 text-white ring-red-700'
                  : 'bg-slate-800 text-white ring-slate-900'
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return ctx.toast
}
