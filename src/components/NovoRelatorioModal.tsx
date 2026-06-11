import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { uid } from '@/lib/id'
import { Modal, Field } from './ui'
import { useToast } from './Toast'
import type { Auditoria } from '@/types'

export function NovoRelatorioModal({
  open,
  onClose,
  onCreated,
  auditorFixoId,
}: {
  open: boolean
  onClose: () => void
  onCreated: (auditoria: Auditoria) => void
  /** quando o auditor cria para si mesmo, fixa o auditor e oculta o seletor */
  auditorFixoId?: string
}) {
  const toast = useToast()
  const clientes = useLiveQuery(() => db.clientes.orderBy('nomeFantasia').toArray(), [], [])
  const auditores = useLiveQuery(
    () => db.users.where('perfil').equals('auditor').filter((u) => u.ativo).toArray(),
    [],
    [],
  )

  const [busca, setBusca] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [auditorId, setAuditorId] = useState('')
  const [salvando, setSalvando] = useState(false)

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return clientes
    return clientes.filter(
      (c) => c.nomeFantasia.toLowerCase().includes(q) || c.razaoSocial.toLowerCase().includes(q),
    )
  }, [busca, clientes])

  async function iniciar() {
    const auditorEscolhido = auditorFixoId ?? auditorId
    if (!clienteId) return toast('Selecione um cliente.', 'erro')
    if (!auditorEscolhido) return toast('Selecione um auditor.', 'erro')

    setSalvando(true)
    const auditoria: Auditoria = {
      id: uid(),
      clienteId,
      auditorId: auditorEscolhido,
      dataHora: Date.now(),
      status: 'em_andamento',
      pontuacaoGeral: 0,
      pontuacaoPorSetor: [],
      criadoEm: Date.now(),
    }
    await db.auditorias.add(auditoria)
    setSalvando(false)
    setBusca('')
    setClienteId('')
    setAuditorId('')
    onCreated(auditoria)
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo Relatório">
      <div className="space-y-4">
        <Field label="Qual cliente você vai auditar?" required>
          <input
            className="input mb-2"
            placeholder="Buscar cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <div className="max-h-52 space-y-1.5 overflow-y-auto">
            {filtrados.length === 0 && (
              <p className="px-1 py-2 text-sm text-slate-400">Nenhum cliente encontrado.</p>
            )}
            {filtrados.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setClienteId(c.id)}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition ${
                  clienteId === c.id
                    ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>
                  <span className="block text-sm font-medium text-slate-800">{c.nomeFantasia}</span>
                  <span className="block text-xs text-slate-500">{c.tipoEstabelecimento}</span>
                </span>
                {clienteId === c.id && <span className="text-sm font-bold text-brand-700">✓</span>}
              </button>
            ))}
          </div>
        </Field>

        {!auditorFixoId && (
          <Field label="Auditor responsável" required>
            <select className="input" value={auditorId} onChange={(e) => setAuditorId(e.target.value)}>
              <option value="">Selecione...</option>
              {auditores.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={iniciar} disabled={salvando}>
            {salvando ? 'Iniciando...' : 'Iniciar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
