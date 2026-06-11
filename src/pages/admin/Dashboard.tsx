import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { useClientesMap, useUsersMap } from '@/lib/hooks'
import { PageHeader, ProgressBar, StatusBadge } from '@/components/ui'
import { DonutConformidade, LegendaDonut, type DonutSlice } from '@/components/DonutConformidade'
import { NovoRelatorioModal } from '@/components/NovoRelatorioModal'
import { IconPlus, IconRelatorios } from '@/components/icons'
import { formatData, pct } from '@/lib/format'

export default function Dashboard() {
  const navigate = useNavigate()
  const [modal, setModal] = useState(false)

  const auditorias = useLiveQuery(() => db.auditorias.orderBy('criadoEm').reverse().toArray(), [], [])
  const clientesMap = useClientesMap()
  const usersMap = useUsersMap()

  const finalizadas = auditorias.filter((a) => a.status === 'finalizada')
  const emAndamento = auditorias.filter((a) => a.status === 'em_andamento')

  const mediaConformidade =
    finalizadas.length > 0
      ? Math.round(finalizadas.reduce((s, a) => s + a.pontuacaoGeral, 0) / finalizadas.length)
      : 0

  // Distribuição de desempenho dos relatórios finalizados
  const alta = finalizadas.filter((a) => a.pontuacaoGeral >= 80).length
  const media = finalizadas.filter((a) => a.pontuacaoGeral >= 50 && a.pontuacaoGeral < 80).length
  const baixa = finalizadas.filter((a) => a.pontuacaoGeral < 50).length
  const donut: DonutSlice[] = [
    { name: 'Alta conformidade (≥80%)', value: alta, color: '#10b981' },
    { name: 'Média (50–79%)', value: media, color: '#f59e0b' },
    { name: 'Baixa (<50%)', value: baixa, color: '#ef4444' },
  ]

  const recentes = auditorias.slice(0, 6)

  return (
    <div>
      <PageHeader
        titulo="Dashboard"
        descricao="Visão geral das inspeções sanitárias"
        acao={
          <button className="btn-primary" onClick={() => setModal(true)}>
            <IconPlus className="h-4 w-4" /> Novo Relatório
          </button>
        }
      />

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard titulo="Relatórios" valor={String(auditorias.length)} cor="text-brand-800" />
        <MetricCard titulo="Conformidade média" valor={pct(mediaConformidade)} cor="text-emerald-600" />
        <MetricCard titulo="Finalizados" valor={String(finalizadas.length)} cor="text-slate-800" />
        <MetricCard titulo="Em andamento" valor={String(emAndamento.length)} cor="text-amber-600" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Donut */}
        <div className="card p-5 lg:col-span-1">
          <h2 className="mb-1 text-base font-semibold text-slate-800">Desempenho dos relatórios</h2>
          <p className="mb-2 text-xs text-slate-500">Por faixa de conformidade (finalizados)</p>
          <DonutConformidade
            data={donut}
            centerValue={String(finalizadas.length)}
            centerLabel="finalizados"
          />
          <div className="mt-2">
            <LegendaDonut data={donut} />
          </div>
        </div>

        {/* Lista de recentes */}
        <div className="card lg:col-span-2">
          <div className="border-b border-slate-200 px-5 py-3.5">
            <h2 className="text-base font-semibold text-slate-800">Relatórios recentes</h2>
          </div>
          {recentes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-10 text-center text-slate-400">
              <IconRelatorios className="h-8 w-8" />
              <p className="text-sm">Nenhum relatório ainda.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentes.map((a) => {
                const cliente = clientesMap?.get(a.clienteId)
                const auditor = usersMap?.get(a.auditorId)
                return (
                  <li
                    key={a.id}
                    className="flex cursor-pointer items-center gap-4 px-5 py-3 transition hover:bg-slate-50"
                    onClick={() =>
                      a.status === 'finalizada'
                        ? navigate(`/resultado/${a.id}`)
                        : navigate('/relatorios')
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {cliente?.nomeFantasia ?? 'Cliente removido'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {auditor?.nome ?? '—'} • {formatData(a.dataHora)}
                      </p>
                    </div>
                    <div className="hidden w-32 sm:block">
                      <div className="mb-1 flex justify-between text-xs text-slate-500">
                        <span>Conformidade</span>
                        <span className="font-semibold">{pct(a.pontuacaoGeral)}</span>
                      </div>
                      <ProgressBar value={a.pontuacaoGeral} />
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <NovoRelatorioModal
        open={modal}
        onClose={() => setModal(false)}
        onCreated={(a) => {
          setModal(false)
          navigate(`/relatorios`)
          void a
        }}
      />
    </div>
  )
}

function MetricCard({ titulo, valor, cor }: { titulo: string; valor: string; cor: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className={`mt-1 text-3xl font-bold ${cor}`}>{valor}</p>
    </div>
  )
}
