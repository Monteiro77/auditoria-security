import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { uid } from '@/lib/id'
import { CATEGORIAS_FIXAS, CRITICIDADES, TIPOS_RESPOSTA_LABEL, criticidadeBadge } from '@/lib/constants'
import { PageHeader, Modal, Field, EmptyState, ConfirmDialog } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { IconPlus, IconEdit, IconTrash, IconPerguntas, IconThermo, IconCamera, IconCheck } from '@/components/icons'
import type { Criticidade, PerguntaBase, TipoResposta } from '@/types'

const tipoIcon: Record<TipoResposta, JSX.Element> = {
  conformidade: <IconCheck className="h-4 w-4" />,
  temperatura: <IconThermo className="h-4 w-4" />,
  foto: <IconCamera className="h-4 w-4" />,
}

export default function Perguntas() {
  const toast = useToast()
  const perguntas = useLiveQuery(() => db.perguntas.toArray(), [], [])
  const setores = useLiveQuery(() => db.setores.toArray(), [], [])

  const categorias = useMemo(() => {
    const set = new Set<string>(CATEGORIAS_FIXAS)
    setores.forEach((s) => s.categoriasHabilitadas.forEach((c) => set.add(c)))
    perguntas.forEach((p) => set.add(p.categoria))
    return Array.from(set).sort()
  }, [setores, perguntas])

  const [filtro, setFiltro] = useState('todas')
  const filtradas = useMemo(
    () => (filtro === 'todas' ? perguntas : perguntas.filter((p) => p.categoria === filtro)),
    [filtro, perguntas],
  )

  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_FIXAS[0])
  const [criticidade, setCriticidade] = useState<Criticidade>('Média')
  const [tipoResposta, setTipoResposta] = useState<TipoResposta>('conformidade')
  const [excluir, setExcluir] = useState<PerguntaBase | null>(null)

  function abrirNovo() {
    setEditId(null)
    setTexto('')
    setCategoria(filtro !== 'todas' ? filtro : CATEGORIAS_FIXAS[0])
    setCriticidade('Média')
    setTipoResposta('conformidade')
    setModal(true)
  }
  function abrirEdicao(p: PerguntaBase) {
    setEditId(p.id)
    setTexto(p.texto)
    setCategoria(p.categoria)
    setCriticidade(p.criticidade)
    setTipoResposta(p.tipoResposta)
    setModal(true)
  }

  async function salvar() {
    if (!texto.trim()) return toast('Informe o texto da pergunta.', 'erro')
    if (!categoria.trim()) return toast('Informe a categoria.', 'erro')
    const dados = { texto: texto.trim(), categoria: categoria.trim(), criticidade, tipoResposta }
    if (editId) {
      await db.perguntas.update(editId, dados)
      toast('Pergunta atualizada.', 'sucesso')
    } else {
      await db.perguntas.add({ id: uid(), criadoEm: Date.now(), ...dados })
      toast('Pergunta cadastrada.', 'sucesso')
    }
    setModal(false)
  }

  async function confirmarExclusao() {
    if (!excluir) return
    await db.perguntas.delete(excluir.id)
    setExcluir(null)
    toast('Pergunta removida.', 'sucesso')
  }

  return (
    <div>
      <PageHeader
        titulo="Banco de Perguntas"
        descricao="Perguntas reutilizáveis nos relatórios de inspeção"
        acao={
          <button className="btn-primary" onClick={abrirNovo}>
            <IconPlus className="h-4 w-4" /> Nova Pergunta
          </button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-600">Filtrar por categoria:</label>
        <select className="input max-w-xs" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="todas">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-400">{filtradas.length} pergunta(s)</span>
      </div>

      {filtradas.length === 0 ? (
        <EmptyState
          icon={<IconPerguntas className="h-10 w-10" />}
          titulo="Nenhuma pergunta"
          descricao="Cadastre perguntas para montar seus checklists de inspeção."
          acao={
            <button className="btn-primary" onClick={abrirNovo}>
              <IconPlus className="h-4 w-4" /> Nova Pergunta
            </button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filtradas.map((p) => (
            <div key={p.id} className="card flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800">{p.texto}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="badge bg-slate-100 text-slate-600 ring-slate-300">{p.categoria}</span>
                  <span className={`badge ${criticidadeBadge[p.criticidade]}`}>{p.criticidade}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    {tipoIcon[p.tipoResposta]}
                    {TIPOS_RESPOSTA_LABEL[p.tipoResposta]}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <button className="btn-ghost p-2" title="Editar" onClick={() => abrirEdicao(p)}>
                  <IconEdit className="h-4 w-4" />
                </button>
                <button
                  className="btn-ghost p-2 text-red-600 hover:bg-red-50"
                  title="Excluir"
                  onClick={() => setExcluir(p)}
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Pergunta' : 'Nova Pergunta'}>
        <div className="space-y-4">
          <Field label="Texto da pergunta" required>
            <textarea
              className="input min-h-[80px] resize-y"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Ex.: Os manipuladores utilizam uniforme limpo e completo?"
            />
          </Field>

          <Field label="Categoria" required hint="Selecione uma existente ou digite uma nova.">
            <input
              className="input"
              list="cats-list"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            />
            <datalist id="cats-list">
              {categorias.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          <Field label="Criticidade" required>
            <div className="flex gap-2">
              {CRITICIDADES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCriticidade(c)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ring-1 transition ${
                    criticidade === c
                      ? `${criticidadeBadge[c]} ring-2`
                      : 'bg-white text-slate-500 ring-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Tipo de resposta" required>
            <select
              className="input"
              value={tipoResposta}
              onChange={(e) => setTipoResposta(e.target.value as TipoResposta)}
            >
              <option value="conformidade">Conforme / Não Conforme / N/A</option>
              <option value="temperatura">Temperatura (°C)</option>
              <option value="foto">Upload de foto</option>
            </select>
          </Field>

          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setModal(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={salvar}>
              {editId ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!excluir}
        title="Excluir pergunta"
        mensagem="Excluir esta pergunta do banco? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        perigo
        onConfirm={confirmarExclusao}
        onCancel={() => setExcluir(null)}
      />
    </div>
  )
}
