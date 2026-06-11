import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { useAuth } from '@/context/AuthContext'
import { useClientesMap } from '@/lib/hooks'
import { ConfirmDialog, StatusBadge } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { NovoRelatorioModal } from '@/components/NovoRelatorioModal'
import { IconPlus, IconTrash, IconLogout, IconCheck, IconClipboard } from '@/components/icons'
import { formatData, pct } from '@/lib/format'
import type { Auditoria } from '@/types'

export default function AuditorHome() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user, logout } = useAuth()
  const clientesMap = useClientesMap()

  const minhas = useLiveQuery(
    () =>
      user
        ? db.auditorias.where('auditorId').equals(user.id).reverse().sortBy('criadoEm')
        : Promise.resolve([] as Auditoria[]),
    [user?.id],
    [] as Auditoria[],
  )

  const emAndamento = minhas.filter((a) => a.status === 'em_andamento')
  const finalizadas = minhas.filter((a) => a.status === 'finalizada').slice(0, 4)

  const [modal, setModal] = useState(false)
  const [excluir, setExcluir] = useState<Auditoria | null>(null)

  async function confirmarExclusao() {
    if (!excluir) return
    await db.respostas.where('auditoriaId').equals(excluir.id).delete()
    await db.auditorias.delete(excluir.id)
    setExcluir(null)
    toast('Relatório excluído.', 'sucesso')
  }

  return (
    <div className="min-h-full bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-brand-800 px-4 pb-6 pt-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <IconCheck className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold">Otimiza</p>
              <p className="text-[11px] text-brand-200">Segurança dos Alimentos</p>
            </div>
          </div>
          <button onClick={logout} className="rounded-lg p-2 text-brand-100 hover:bg-white/10" aria-label="Sair">
            <IconLogout className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-4 text-lg font-semibold">Olá, {user?.nome?.split(' ')[0]} 👋</p>
        <p className="text-sm text-brand-100">Pronto para a próxima inspeção?</p>
      </header>

      <div className="mx-auto max-w-lg px-4">
        {/* Botão largo Novo Relatório */}
        <button
          onClick={() => setModal(true)}
          className="-mt-4 mb-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-4 text-base font-bold text-brand-800 shadow-card ring-1 ring-slate-200 active:scale-[.99]"
        >
          <IconPlus className="h-5 w-5" /> Novo Relatório
        </button>

        {/* Em andamento */}
        <section className="mb-7">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
            Relatórios em andamento
          </h2>
          {emAndamento.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
              <IconClipboard className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">Nenhum relatório em andamento.</p>
              <p className="text-xs text-slate-400">Toque em "Novo Relatório" para começar.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {emAndamento.map((a) => {
                const cliente = clientesMap?.get(a.clienteId)
                return (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-card ring-1 ring-slate-200"
                  >
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => navigate(`/realizar-auditoria/${a.id}`)}
                    >
                      <p className="truncate font-semibold text-slate-800">
                        {cliente?.nomeFantasia ?? 'Cliente'}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Iniciado em {formatData(a.dataHora)}
                      </p>
                      <div className="mt-2">
                        <StatusBadge status={a.status} />
                      </div>
                    </button>
                    <button
                      className="rounded-lg p-2.5 text-red-500 hover:bg-red-50"
                      aria-label="Excluir"
                      onClick={() => setExcluir(a)}
                    >
                      <IconTrash className="h-5 w-5" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Finalizados recentes */}
        {finalizadas.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              Finalizados recentes
            </h2>
            <ul className="space-y-3">
              {finalizadas.map((a) => {
                const cliente = clientesMap?.get(a.clienteId)
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => navigate(`/resultado/${a.id}`)}
                      className="flex w-full items-center gap-3 rounded-xl bg-white p-4 text-left shadow-card ring-1 ring-slate-200"
                    >
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                          a.pontuacaoGeral >= 80
                            ? 'bg-emerald-500'
                            : a.pontuacaoGeral >= 50
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                        }`}
                      >
                        {pct(a.pontuacaoGeral)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-800">
                          {cliente?.nomeFantasia ?? 'Cliente'}
                        </p>
                        <p className="text-xs text-slate-500">{formatData(a.dataHora)}</p>
                      </div>
                      <span className="text-xs font-medium text-brand-700">Ver laudo →</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setModal(true)}
        className="fixed bottom-6 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-brand-800 text-white shadow-lg shadow-brand-900/30 active:scale-95"
        aria-label="Novo Relatório"
      >
        <IconPlus className="h-7 w-7" />
      </button>

      <NovoRelatorioModal
        open={modal}
        onClose={() => setModal(false)}
        auditorFixoId={user?.id}
        onCreated={(a) => {
          setModal(false)
          navigate(`/realizar-auditoria/${a.id}`)
        }}
      />

      <ConfirmDialog
        open={!!excluir}
        title="Excluir relatório"
        mensagem="Tem certeza que deseja excluir este relatório em andamento? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        perigo
        onConfirm={confirmarExclusao}
        onCancel={() => setExcluir(null)}
      />
    </div>
  )
}
