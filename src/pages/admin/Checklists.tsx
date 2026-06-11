import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { uid } from '@/lib/id'
import { criticidadeBadge } from '@/lib/constants'
import { PageHeader, Modal, Field, EmptyState, ConfirmDialog } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { IconPlus, IconEdit, IconTrash, IconChecklist } from '@/components/icons'
import type { Checklist, PerguntaBase } from '@/types'

export default function Checklists() {
  const toast = useToast()
  const checklists = useLiveQuery(() => db.checklists.toArray(), [], [])
  const perguntas = useLiveQuery(() => db.perguntas.toArray(), [], [])

  const porCategoria = useMemo(() => {
    const map = new Map<string, PerguntaBase[]>()
    for (const p of perguntas) {
      if (!map.has(p.categoria)) map.set(p.categoria, [])
      map.get(p.categoria)!.push(p)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [perguntas])

  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [selecao, setSelecao] = useState<Set<string>>(new Set())
  const [excluir, setExcluir] = useState<Checklist | null>(null)

  function abrirNovo() {
    setEditId(null)
    setNome('')
    setSelecao(new Set())
    setModal(true)
  }
  function abrirEdicao(c: Checklist) {
    setEditId(c.id)
    setNome(c.nome)
    setSelecao(new Set(c.perguntaIds))
    setModal(true)
  }

  function togglePergunta(id: string) {
    setSelecao((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  function toggleCategoria(cat: string, perguntasCat: PerguntaBase[]) {
    setSelecao((s) => {
      const n = new Set(s)
      const todas = perguntasCat.every((p) => n.has(p.id))
      perguntasCat.forEach((p) => (todas ? n.delete(p.id) : n.add(p.id)))
      return n
    })
  }

  async function salvar() {
    if (!nome.trim()) return toast('Informe o nome do checklist.', 'erro')
    if (selecao.size === 0) return toast('Selecione ao menos uma pergunta.', 'erro')
    const dados = { nome: nome.trim(), perguntaIds: Array.from(selecao) }
    if (editId) {
      await db.checklists.update(editId, dados)
      toast('Checklist atualizado.', 'sucesso')
    } else {
      await db.checklists.add({ id: uid(), criadoEm: Date.now(), ...dados })
      toast('Checklist criado.', 'sucesso')
    }
    setModal(false)
  }

  async function confirmarExclusao() {
    if (!excluir) return
    await db.checklists.delete(excluir.id)
    setExcluir(null)
    toast('Checklist removido.', 'sucesso')
  }

  return (
    <div>
      <PageHeader
        titulo="Checklists"
        descricao="Formulários de inspeção montados a partir do banco de perguntas"
        acao={
          <button className="btn-primary" onClick={abrirNovo}>
            <IconPlus className="h-4 w-4" /> Novo Checklist
          </button>
        }
      />

      {checklists.length === 0 ? (
        <EmptyState
          icon={<IconChecklist className="h-10 w-10" />}
          titulo="Nenhum checklist criado"
          descricao="Monte formulários reutilizáveis selecionando perguntas por categoria."
          acao={
            <button className="btn-primary" onClick={abrirNovo}>
              <IconPlus className="h-4 w-4" /> Novo Checklist
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {checklists.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <IconChecklist className="h-5 w-5 text-brand-700" />
                  <h3 className="font-semibold text-slate-800">{c.nome}</h3>
                </div>
                <div className="flex gap-1">
                  <button className="btn-ghost p-1.5" title="Editar" onClick={() => abrirEdicao(c)}>
                    <IconEdit className="h-4 w-4" />
                  </button>
                  <button
                    className="btn-ghost p-1.5 text-red-600 hover:bg-red-50"
                    title="Excluir"
                    onClick={() => setExcluir(c)}
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-500">{c.perguntaIds.length} pergunta(s) vinculada(s)</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Checklist' : 'Novo Checklist'} size="lg">
        <div className="space-y-4">
          <Field label="Nome do checklist" required>
            <input
              className="input"
              placeholder="Ex.: Inspeção completa de cozinha"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="label mb-0">Perguntas vinculadas</label>
              <span className="text-xs font-medium text-brand-700">{selecao.size} selecionada(s)</span>
            </div>
            {porCategoria.length === 0 ? (
              <p className="text-sm text-slate-400">Cadastre perguntas no banco primeiro.</p>
            ) : (
              <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
                {porCategoria.map(([cat, pgs]) => {
                  const todas = pgs.every((p) => selecao.has(p.id))
                  return (
                    <div key={cat} className="rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => toggleCategoria(cat, pgs)}
                        className="flex w-full items-center justify-between bg-slate-50 px-3 py-2 text-left"
                      >
                        <span className="text-sm font-semibold text-slate-700">{cat}</span>
                        <span className="text-xs font-medium text-brand-700">
                          {todas ? 'Desmarcar todas' : 'Selecionar todas'}
                        </span>
                      </button>
                      <ul className="divide-y divide-slate-100">
                        {pgs.map((p) => (
                          <li key={p.id}>
                            <label className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-slate-50">
                              <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
                                checked={selecao.has(p.id)}
                                onChange={() => togglePergunta(p.id)}
                              />
                              <span className="flex-1">
                                <span className="block text-sm text-slate-700">{p.texto}</span>
                                <span className={`badge mt-1 ${criticidadeBadge[p.criticidade]}`}>
                                  {p.criticidade}
                                </span>
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setModal(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={salvar}>
              {editId ? 'Salvar' : 'Criar Checklist'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!excluir}
        title="Excluir checklist"
        mensagem={`Excluir o checklist "${excluir?.nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        perigo
        onConfirm={confirmarExclusao}
        onCancel={() => setExcluir(null)}
      />
    </div>
  )
}
