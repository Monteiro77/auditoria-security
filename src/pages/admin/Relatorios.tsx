import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { useClientesMap, useUsersMap } from '@/lib/hooks'
import { PageHeader, ProgressBar, StatusBadge, EmptyState } from '@/components/ui'
import { NovoRelatorioModal } from '@/components/NovoRelatorioModal'
import { useToast } from '@/components/Toast'
import { IconRelatorios, IconDownload, IconPlus } from '@/components/icons'
import { formatData, pct } from '@/lib/format'
import { baixarPDF, montarDadosLaudo } from '@/lib/pdf'

export default function Relatorios() {
  const navigate = useNavigate()
  const toast = useToast()
  const auditorias = useLiveQuery(() => db.auditorias.orderBy('criadoEm').reverse().toArray(), [], [])
  const clientesMap = useClientesMap()
  const usersMap = useUsersMap()
  const clientes = useLiveQuery(() => db.clientes.orderBy('nomeFantasia').toArray(), [], [])
  const auditores = useLiveQuery(
    () => db.users.where('perfil').equals('auditor').toArray(),
    [],
    [],
  )

  const [fCliente, setFCliente] = useState('')
  const [fAuditor, setFAuditor] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fData, setFData] = useState('')
  const [modal, setModal] = useState(false)
  const [baixando, setBaixando] = useState<string | null>(null)

  const filtradas = useMemo(() => {
    return auditorias.filter((a) => {
      if (fCliente && a.clienteId !== fCliente) return false
      if (fAuditor && a.auditorId !== fAuditor) return false
      if (fStatus && a.status !== fStatus) return false
      if (fData) {
        const d = new Date(a.dataHora)
        const alvo = new Date(fData + 'T00:00:00')
        if (
          d.getFullYear() !== alvo.getFullYear() ||
          d.getMonth() !== alvo.getMonth() ||
          d.getDate() !== alvo.getDate()
        )
          return false
      }
      return true
    })
  }, [auditorias, fCliente, fAuditor, fStatus, fData])

  async function baixar(id: string) {
    setBaixando(id)
    const dados = await montarDadosLaudo(id)
    if (!dados) {
      setBaixando(null)
      return toast('Não foi possível carregar o relatório.', 'erro')
    }
    await baixarPDF(dados)
    setBaixando(null)
    toast('PDF gerado.', 'sucesso')
  }

  function limpar() {
    setFCliente('')
    setFAuditor('')
    setFStatus('')
    setFData('')
  }

  return (
    <div>
      <PageHeader
        titulo="Relatórios"
        descricao="Histórico de inspeções realizadas"
        acao={
          <button className="btn-primary" onClick={() => setModal(true)}>
            <IconPlus className="h-4 w-4" /> Novo Relatório
          </button>
        }
      />

      {/* Filtros */}
      <div className="card mb-5 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="label">Cliente</label>
          <select className="input" value={fCliente} onChange={(e) => setFCliente(e.target.value)}>
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nomeFantasia}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Auditor</label>
          <select className="input" value={fAuditor} onChange={(e) => setFAuditor(e.target.value)}>
            <option value="">Todos</option>
            {auditores.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="finalizada">Finalizado</option>
            <option value="em_andamento">Em andamento</option>
          </select>
        </div>
        <div>
          <label className="label">Data</label>
          <input type="date" className="input" value={fData} onChange={(e) => setFData(e.target.value)} />
        </div>
        <div className="flex items-end">
          <button className="btn-secondary w-full" onClick={limpar}>
            Limpar filtros
          </button>
        </div>
      </div>

      {filtradas.length === 0 ? (
        <EmptyState
          icon={<IconRelatorios className="h-10 w-10" />}
          titulo="Nenhum relatório encontrado"
          descricao="Ajuste os filtros ou crie um novo relatório."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Auditor</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Conformidade</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map((a) => {
                  const cliente = clientesMap?.get(a.clienteId)
                  const auditor = usersMap?.get(a.auditorId)
                  return (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {cliente?.nomeFantasia ?? 'Cliente removido'}
                      </td>
                      <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                        {auditor?.nome ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatData(a.dataHora)}</td>
                      <td className="px-4 py-3">
                        <div className="flex w-36 items-center gap-2">
                          <ProgressBar value={a.pontuacaoGeral} />
                          <span className="w-9 text-right text-xs font-semibold text-slate-600">
                            {pct(a.pontuacaoGeral)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {a.status === 'finalizada' ? (
                            <>
                              <button
                                className="btn-secondary px-3 py-1.5 text-xs"
                                onClick={() => navigate(`/resultado/${a.id}`)}
                              >
                                Abrir
                              </button>
                              <button
                                className="btn-primary px-3 py-1.5 text-xs"
                                disabled={baixando === a.id}
                                onClick={() => baixar(a.id)}
                              >
                                <IconDownload className="h-3.5 w-3.5" />
                                {baixando === a.id ? '...' : 'PDF'}
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">Em campo</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <NovoRelatorioModal
        open={modal}
        onClose={() => setModal(false)}
        onCreated={() => {
          setModal(false)
          toast('Relatório criado e atribuído ao auditor.', 'sucesso')
        }}
      />
    </div>
  )
}
