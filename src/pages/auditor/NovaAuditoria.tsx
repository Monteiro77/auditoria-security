import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { uid } from '@/lib/id'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/Toast'
import { IconBack, IconSearch } from '@/components/icons'
import type { Auditoria } from '@/types'

export default function NovaAuditoria() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const clientes = useLiveQuery(() => db.clientes.orderBy('nomeFantasia').toArray(), [], [])

  const [busca, setBusca] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [salvando, setSalvando] = useState(false)

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return clientes
    return clientes.filter(
      (c) => c.nomeFantasia.toLowerCase().includes(q) || c.razaoSocial.toLowerCase().includes(q),
    )
  }, [busca, clientes])

  async function iniciar() {
    if (!clienteId || !user) return toast('Selecione um cliente.', 'erro')
    setSalvando(true)
    const auditoria: Auditoria = {
      id: uid(),
      clienteId,
      auditorId: user.id,
      dataHora: Date.now(),
      status: 'em_andamento',
      pontuacaoGeral: 0,
      pontuacaoPorSetor: [],
      criadoEm: Date.now(),
    }
    await db.auditorias.add(auditoria)
    navigate(`/realizar-auditoria/${auditoria.id}`, { replace: true })
  }

  return (
    <div className="min-h-full bg-slate-50 pb-28">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-white px-4 py-3 shadow-sm">
        <button onClick={() => navigate('/auditor')} className="rounded-lg p-2 hover:bg-slate-100">
          <IconBack className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">Novo Relatório</h1>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-4">
        <p className="mb-3 text-sm font-medium text-slate-600">Qual cliente você vai auditar?</p>
        <div className="relative mb-4">
          <IconSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Buscar cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="space-y-2.5">
          {filtrados.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">Nenhum cliente encontrado.</p>
          )}
          {filtrados.map((c) => (
            <button
              key={c.id}
              onClick={() => setClienteId(c.id)}
              className={`flex w-full items-center justify-between rounded-xl border-2 bg-white p-4 text-left transition ${
                clienteId === c.id ? 'border-brand-600 ring-2 ring-brand-100' : 'border-transparent shadow-card'
              }`}
            >
              <div>
                <p className="font-semibold text-slate-800">{c.nomeFantasia}</p>
                <p className="text-xs text-slate-500">{c.tipoEstabelecimento}</p>
              </div>
              {clienteId === c.id && <span className="text-lg font-bold text-brand-700">✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white p-4">
        <div className="mx-auto max-w-lg">
          <button
            className="btn-primary w-full py-3.5 text-base"
            onClick={iniciar}
            disabled={!clienteId || salvando}
          >
            {salvando ? 'Iniciando...' : 'Iniciar Inspeção'}
          </button>
        </div>
      </div>
    </div>
  )
}
