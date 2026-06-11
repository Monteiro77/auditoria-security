import { useEffect, type ReactNode } from 'react'
import { IconX } from './icons'

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-700" />
    </div>
  )
}

export function ProgressBar({
  value,
  className = '',
  barClassName = 'bg-brand-700',
}: {
  value: number
  className?: string
  barClassName?: string
}) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-200 ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${barClassName}`}
        style={{ width: `${v}%` }}
      />
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const w = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg'
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div
        className={`w-full ${w} animate-[fadein_.15s_ease-out] rounded-t-2xl bg-white shadow-xl sm:rounded-2xl`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="btn-ghost -mr-2 rounded-full p-2" aria-label="Fechar">
            <IconX className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  mensagem,
  confirmLabel = 'Confirmar',
  perigo = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  mensagem: string
  confirmLabel?: string
  perigo?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <p className="text-sm leading-relaxed text-slate-600">{mensagem}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button className={perigo ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

export function EmptyState({
  icon,
  titulo,
  descricao,
  acao,
}: {
  icon?: ReactNode
  titulo: string
  descricao?: string
  acao?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      {icon && <div className="mb-3 text-slate-400">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-700">{titulo}</h3>
      {descricao && <p className="mt-1 max-w-sm text-sm text-slate-500">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  )
}

export function PageHeader({
  titulo,
  descricao,
  acao,
}: {
  titulo: string
  descricao?: string
  acao?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{titulo}</h1>
        {descricao && <p className="mt-0.5 text-sm text-slate-500">{descricao}</p>}
      </div>
      {acao}
    </div>
  )
}

export function Field({
  label,
  children,
  hint,
  required,
}: {
  label: string
  children: ReactNode
  hint?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export function StatusBadge({ status }: { status: 'em_andamento' | 'finalizada' }) {
  return status === 'finalizada' ? (
    <span className="badge bg-emerald-100 text-emerald-800 ring-emerald-600/20">Finalizado</span>
  ) : (
    <span className="badge bg-amber-100 text-amber-800 ring-amber-600/20">Em andamento</span>
  )
}
