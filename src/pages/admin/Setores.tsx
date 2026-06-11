import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { uid } from '@/lib/id'
import { CATEGORIAS_FIXAS } from '@/lib/constants'
import { PageHeader, Modal, Field, EmptyState, ConfirmDialog } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { IconPlus, IconEdit, IconTrash, IconSetores, IconX } from '@/components/icons'
import type { SetorCliente } from '@/types'

const FIXAS = CATEGORIAS_FIXAS as readonly string[]

export default function Setores() {
  const toast = useToast()
  const clientes = useLiveQuery(() => db.clientes.orderBy('nomeFantasia').toArray(), [], [])
  const [clienteId, setClienteId] = useState('')

  useEffect(() => {
    if (!clienteId && clientes.length > 0) setClienteId(clientes[0].id)
  }, [clientes, clienteId])

  const setores = useLiveQuery(
    () =>
      clienteId
        ? db.setores.where('clienteId').equals(clienteId).toArray()
        : Promise.resolve([] as SetorCliente[]),
    [clienteId],
    [] as SetorCliente[],
  )

  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [selecionadas, setSelecionadas] = useState<string[]>([])
  const [novaCat, setNovaCat] = useState('')
  const [excluir, setExcluir] = useState<SetorCliente | null>(null)

  // categorias personalizadas = selecionadas que não são fixas + as criadas nesta sessão
  const [personalizadasExtras, setPersonalizadasExtras] = useState<string[]>([])
  const personalizadas = useMemo(() => {
    const set = new Set<string>()
    selecionadas.forEach((c) => !FIXAS.includes(c) && set.add(c))
    personalizadasExtras.forEach((c) => set.add(c))
    return Array.from(set)
  }, [selecionadas, personalizadasExtras])

  function abrirNovo() {
    setEditId(null)
    setNome('')
    setSelecionadas([])
    setPersonalizadasExtras([])
    setNovaCat('')
    setModal(true)
  }

  function abrirEdicao(s: SetorCliente) {
    setEditId(s.id)
    setNome(s.nome)
    setSelecionadas(s.categoriasHabilitadas)
    setPersonalizadasExtras(s.categoriasHabilitadas.filter((c) => !FIXAS.includes(c)))
    setNovaCat('')
    setModal(true)
  }

  function toggle(cat: string) {
    setSelecionadas((arr) => (arr.includes(cat) ? arr.filter((c) => c !== cat) : [...arr, cat]))
  }

  function adicionarPersonalizada() {
    const c = novaCat.trim()
    if (!c) return
    if (FIXAS.includes(c) || personalizadas.includes(c)) {
      toast('Essa categoria já existe.', 'info')
      setNovaCat('')
      return
    }
    setPersonalizadasExtras((arr) => [...arr, c])
    setSelecionadas((arr) => [...arr, c])
    setNovaCat('')
  }

  async function salvar() {
    if (!nome.trim()) return toast('Informe o nome do setor.', 'erro')
    if (selecionadas.length === 0) return toast('Habilite ao menos uma categoria.', 'erro')

    if (editId) {
      await db.setores.update(editId, { nome: nome.trim(), categoriasHabilitadas: selecionadas })
      toast('Setor atualizado.', 'sucesso')
    } else {
      const novo: SetorCliente = {
        id: uid(),
        clienteId,
        nome: nome.trim(),
        categoriasHabilitadas: selecionadas,
        criadoEm: Date.now(),
      }
      await db.setores.add(novo)
      toast('Setor criado.', 'sucesso')
    }
    setModal(false)
  }

  async function confirmarExclusao() {
    if (!excluir) return
    await db.setores.delete(excluir.id)
    setExcluir(null)
    toast('Setor removido.', 'sucesso')
  }

  return (
    <div>
      <PageHeader
        titulo="Setores do Cliente"
        descricao="Configure os setores e as categorias habilitadas para cada estabelecimento"
        acao={
          <button className="btn-primary" onClick={abrirNovo} disabled={!clienteId}>
            <IconPlus className="h-4 w-4" /> Novo Setor
          </button>
        }
      />

      <div className="mb-5 max-w-md">
        <label className="label">Cliente</label>
        <select className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
          {clientes.length === 0 && <option value="">Nenhum cliente cadastrado</option>}
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nomeFantasia}
            </option>
          ))}
        </select>
      </div>

      {clienteId && setores.length === 0 ? (
        <EmptyState
          icon={<IconSetores className="h-10 w-10" />}
          titulo="Nenhum setor configurado"
          descricao='Crie setores como "Área da Chapa" ou "Câmara Fria" e habilite suas categorias.'
          acao={
            <button className="btn-primary" onClick={abrirNovo}>
              <IconPlus className="h-4 w-4" /> Novo Setor
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {setores.map((s) => (
            <div key={s.id} className="card flex flex-col p-4">
              <div className="mb-3 flex items-start justify-between">
                <h3 className="font-semibold text-slate-800">{s.nome}</h3>
                <div className="flex gap-1">
                  <button className="btn-ghost p-1.5" title="Editar" onClick={() => abrirEdicao(s)}>
                    <IconEdit className="h-4 w-4" />
                  </button>
                  <button
                    className="btn-ghost p-1.5 text-red-600 hover:bg-red-50"
                    title="Excluir"
                    onClick={() => setExcluir(s)}
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Categorias habilitadas ({s.categoriasHabilitadas.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {s.categoriasHabilitadas.map((cat) => {
                  const custom = !FIXAS.includes(cat)
                  return (
                    <span
                      key={cat}
                      className={`badge ${
                        custom
                          ? 'bg-amber-100 text-amber-800 ring-amber-600/30'
                          : 'bg-slate-100 text-slate-700 ring-slate-300'
                      }`}
                    >
                      {cat}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar setor */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Setor' : 'Novo Setor'} size="lg">
        <div className="space-y-5">
          <Field label="Nome do setor" required>
            <input
              className="input"
              placeholder="Ex.: Área da Chapa, Câmara Fria..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </Field>

          <div>
            <label className="label">Categorias fixas</label>
            <div className="flex flex-wrap gap-2">
              {FIXAS.map((cat) => {
                const on = selecionadas.includes(cat)
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggle(cat)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${
                      on
                        ? 'bg-brand-700 text-white ring-brand-700'
                        : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="label">Categorias personalizadas</label>
            <div className="mb-2 flex gap-2">
              <input
                className="input"
                placeholder="Ex.: Controle de Óleo de Fritura"
                value={novaCat}
                onChange={(e) => setNovaCat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    adicionarPersonalizada()
                  }
                }}
              />
              <button type="button" className="btn-primary shrink-0" onClick={adicionarPersonalizada}>
                <IconPlus className="h-4 w-4" />
              </button>
            </div>
            {personalizadas.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhuma categoria personalizada adicionada.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {personalizadas.map((cat) => {
                  const on = selecionadas.includes(cat)
                  return (
                    <span
                      key={cat}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${
                        on
                          ? 'bg-amber-500 text-white ring-amber-500'
                          : 'bg-amber-50 text-amber-700 ring-amber-300'
                      }`}
                    >
                      <button type="button" onClick={() => toggle(cat)}>
                        {cat}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelecionadas((arr) => arr.filter((c) => c !== cat))
                          setPersonalizadasExtras((arr) => arr.filter((c) => c !== cat))
                        }}
                        aria-label="Remover"
                      >
                        <IconX className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <strong>{selecionadas.length}</strong> categoria(s) habilitada(s) para este setor.
          </div>

          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setModal(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={salvar}>
              {editId ? 'Salvar' : 'Criar Setor'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!excluir}
        title="Excluir setor"
        mensagem={`Excluir o setor "${excluir?.nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        perigo
        onConfirm={confirmarExclusao}
        onCancel={() => setExcluir(null)}
      />
    </div>
  )
}
