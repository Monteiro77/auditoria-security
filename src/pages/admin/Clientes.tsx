import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { uid } from '@/lib/id'
import { TIPOS_ESTABELECIMENTO } from '@/lib/constants'
import { PageHeader, Modal, Field, EmptyState, ConfirmDialog } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { IconPlus, IconEdit, IconTrash, IconClientes, IconCopy } from '@/components/icons'
import type { Cliente } from '@/types'

const vazio = (): Omit<Cliente, 'id' | 'criadoEm'> => ({
  nomeFantasia: '',
  razaoSocial: '',
  endereco: '',
  emailResponsavel: '',
  tipoEstabelecimento: TIPOS_ESTABELECIMENTO[0],
})

export default function Clientes() {
  const toast = useToast()
  const clientes = useLiveQuery(() => db.clientes.orderBy('nomeFantasia').toArray(), [], [])
  const setores = useLiveQuery(() => db.setores.toArray(), [], [])

  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(vazio())
  const [clonarDe, setClonarDe] = useState('')
  const [excluir, setExcluir] = useState<Cliente | null>(null)
  const [cloneAlvo, setCloneAlvo] = useState<Cliente | null>(null)
  const [cloneFonte, setCloneFonte] = useState('')

  const contarSetores = (clienteId: string) => setores.filter((s) => s.clienteId === clienteId).length

  function abrirNovo() {
    setEditId(null)
    setForm(vazio())
    setClonarDe('')
    setModal(true)
  }

  function abrirEdicao(c: Cliente) {
    setEditId(c.id)
    setForm({
      nomeFantasia: c.nomeFantasia,
      razaoSocial: c.razaoSocial,
      endereco: c.endereco,
      emailResponsavel: c.emailResponsavel,
      tipoEstabelecimento: c.tipoEstabelecimento,
    })
    setClonarDe('')
    setModal(true)
  }

  async function clonarSetores(fonteId: string, destinoId: string) {
    const origem = await db.setores.where('clienteId').equals(fonteId).toArray()
    if (origem.length === 0) return 0
    const novos = origem.map((s) => ({
      ...s,
      id: uid(),
      clienteId: destinoId,
      criadoEm: Date.now(),
    }))
    await db.setores.bulkAdd(novos)
    return novos.length
  }

  async function salvar() {
    if (!form.nomeFantasia.trim()) return toast('Informe o nome fantasia.', 'erro')

    if (editId) {
      await db.clientes.update(editId, form)
      toast('Cliente atualizado.', 'sucesso')
    } else {
      const novo: Cliente = { ...form, id: uid(), criadoEm: Date.now() }
      await db.clientes.add(novo)
      if (clonarDe) {
        const n = await clonarSetores(clonarDe, novo.id)
        toast(`Cliente criado e ${n} setor(es) clonado(s).`, 'sucesso')
      } else {
        toast('Cliente cadastrado.', 'sucesso')
      }
    }
    setModal(false)
  }

  async function confirmarExclusao() {
    if (!excluir) return
    await db.setores.where('clienteId').equals(excluir.id).delete()
    await db.clientes.delete(excluir.id)
    setExcluir(null)
    toast('Cliente removido.', 'sucesso')
  }

  async function confirmarClone() {
    if (!cloneAlvo || !cloneFonte) return
    const n = await clonarSetores(cloneFonte, cloneAlvo.id)
    toast(n ? `${n} setor(es) clonado(s).` : 'O cliente de origem não tem setores.', n ? 'sucesso' : 'info')
    setCloneAlvo(null)
    setCloneFonte('')
  }

  return (
    <div>
      <PageHeader
        titulo="Clientes"
        descricao="Estabelecimentos auditados pela consultoria"
        acao={
          <button className="btn-primary" onClick={abrirNovo}>
            <IconPlus className="h-4 w-4" /> Novo Cliente
          </button>
        }
      />

      {clientes.length === 0 ? (
        <EmptyState
          icon={<IconClientes className="h-10 w-10" />}
          titulo="Nenhum cliente cadastrado"
          descricao="Cadastre o primeiro estabelecimento para iniciar as inspeções."
          acao={
            <button className="btn-primary" onClick={abrirNovo}>
              <IconPlus className="h-4 w-4" /> Novo Cliente
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome Fantasia</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">E-mail</th>
                  <th className="px-4 py-3 text-center font-medium">Setores</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{c.nomeFantasia}</p>
                      <p className="text-xs text-slate-500">{c.razaoSocial}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.tipoEstabelecimento}</td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                      {c.emailResponsavel || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="badge bg-brand-50 text-brand-800 ring-brand-600/20">
                        {contarSetores(c.id)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          className="btn-ghost p-2"
                          title="Clonar setores para outro cliente / deste"
                          onClick={() => {
                            setCloneAlvo(c)
                            setCloneFonte('')
                          }}
                        >
                          <IconCopy className="h-4 w-4" />
                        </button>
                        <button className="btn-ghost p-2" title="Editar" onClick={() => abrirEdicao(c)}>
                          <IconEdit className="h-4 w-4" />
                        </button>
                        <button
                          className="btn-ghost p-2 text-red-600 hover:bg-red-50"
                          title="Excluir"
                          onClick={() => setExcluir(c)}
                        >
                          <IconTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal criar/editar */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Cliente' : 'Novo Cliente'}>
        <div className="space-y-4">
          <Field label="Nome Fantasia" required>
            <input
              className="input"
              value={form.nomeFantasia}
              onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })}
            />
          </Field>
          <Field label="Razão Social">
            <input
              className="input"
              value={form.razaoSocial}
              onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })}
            />
          </Field>
          <Field label="Endereço">
            <input
              className="input"
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="E-mail do responsável">
              <input
                type="email"
                className="input"
                value={form.emailResponsavel}
                onChange={(e) => setForm({ ...form, emailResponsavel: e.target.value })}
              />
            </Field>
            <Field label="Tipo de estabelecimento">
              <select
                className="input"
                value={form.tipoEstabelecimento}
                onChange={(e) => setForm({ ...form, tipoEstabelecimento: e.target.value })}
              >
                {TIPOS_ESTABELECIMENTO.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
          </div>

          {!editId && clientes.length > 0 && (
            <div className="rounded-lg bg-brand-50 p-3 ring-1 ring-brand-100">
              <Field
                label="Clonar Setores de Outro Cliente"
                hint="Copia toda a estrutura de setores e categorias para o novo cliente."
              >
                <select className="input" value={clonarDe} onChange={(e) => setClonarDe(e.target.value)}>
                  <option value="">Não clonar (começar do zero)</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nomeFantasia} ({contarSetores(c.id)} setores)
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button className="btn-secondary" onClick={() => setModal(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={salvar}>
              {editId ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal clonar setores para cliente existente */}
      <Modal
        open={!!cloneAlvo}
        onClose={() => setCloneAlvo(null)}
        title={`Clonar setores para "${cloneAlvo?.nomeFantasia ?? ''}"`}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Selecione o cliente de origem. Os setores e categorias serão copiados (adicionados) para
            este cliente.
          </p>
          <Field label="Clonar a partir de" required>
            <select className="input" value={cloneFonte} onChange={(e) => setCloneFonte(e.target.value)}>
              <option value="">Selecione...</option>
              {clientes
                .filter((c) => c.id !== cloneAlvo?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nomeFantasia} ({contarSetores(c.id)} setores)
                  </option>
                ))}
            </select>
          </Field>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setCloneAlvo(null)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={confirmarClone} disabled={!cloneFonte}>
              <IconCopy className="h-4 w-4" /> Clonar
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!excluir}
        title="Excluir cliente"
        mensagem={`Tem certeza que deseja excluir "${excluir?.nomeFantasia}"? Os setores vinculados também serão removidos. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        perigo
        onConfirm={confirmarExclusao}
        onCancel={() => setExcluir(null)}
      />
    </div>
  )
}
