import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { uid } from '@/lib/id'
import { comprimirImagem } from '@/lib/file'
import { criticidadeBadge } from '@/lib/constants'
import {
  desempenhoClasses,
  desempenhoSetor,
  perguntasDoSetor,
  scoreGeral,
  scoreSetor,
} from '@/lib/scoring'
import { ConfirmDialog, ProgressBar, Spinner } from '@/components/ui'
import { useToast } from '@/components/Toast'
import {
  IconBack,
  IconCheck,
  IconX,
  IconCamera,
  IconThermo,
  IconTrash,
  IconAlert,
} from '@/components/icons'
import type { AuditoriaResposta, PerguntaBase, SetorCliente, ValorConformidade } from '@/types'

export default function RealizarAuditoria() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const auditoria = useLiveQuery(() => db.auditorias.get(id).then((a) => a ?? null), [id])
  const cliente = useLiveQuery(
    () => (auditoria ? db.clientes.get(auditoria.clienteId) : undefined),
    [auditoria?.clienteId],
  )
  const setores = useLiveQuery(
    () =>
      auditoria
        ? db.setores.where('clienteId').equals(auditoria.clienteId).toArray()
        : Promise.resolve([] as SetorCliente[]),
    [auditoria?.clienteId],
    [] as SetorCliente[],
  )
  const perguntas = useLiveQuery(() => db.perguntas.toArray(), [], [] as PerguntaBase[])
  const respostas = useLiveQuery(
    () =>
      id ? db.respostas.where('auditoriaId').equals(id).toArray() : Promise.resolve([] as AuditoriaResposta[]),
    [id],
    [] as AuditoriaResposta[],
  )

  const respMap = useMemo(() => {
    const m = new Map<string, AuditoriaResposta>()
    respostas.forEach((r) => m.set(`${r.setorId}|${r.perguntaId}`, r))
    return m
  }, [respostas])

  const [setorSel, setSetorSel] = useState<string | null>(null)
  const [finalizar, setFinalizar] = useState(false)

  async function upsert(setor: SetorCliente, pergunta: PerguntaBase, patch: Partial<AuditoriaResposta>) {
    const key = `${setor.id}|${pergunta.id}`
    const existing = respMap.get(key)
    if (existing) {
      await db.respostas.update(existing.id, { ...patch, atualizadoEm: Date.now() })
    } else {
      const novo: AuditoriaResposta = {
        id: uid(),
        auditoriaId: id,
        setorId: setor.id,
        setorNome: setor.nome,
        perguntaId: pergunta.id,
        perguntaTexto: pergunta.texto,
        categoria: pergunta.categoria,
        criticidade: pergunta.criticidade,
        tipoResposta: pergunta.tipoResposta,
        resposta: null,
        temperatura: null,
        fotoEvidencia: null,
        recomendacao: null,
        atualizadoEm: Date.now(),
        ...patch,
      }
      await db.respostas.add(novo)
    }
  }

  /** NCs pendentes (sem foto e/ou recomendação) de um setor */
  function ncPendentes(setor: SetorCliente): number {
    const pgs = perguntasDoSetor(perguntas, setor)
    let n = 0
    for (const p of pgs) {
      const r = respMap.get(`${setor.id}|${p.id}`)
      if (r?.resposta === 'nao_conforme' && (!r.recomendacao?.trim() || !r.fotoEvidencia)) n++
    }
    return n
  }

  async function finalizarRelatorio() {
    // Verifica NCs pendentes em todos os setores
    for (const s of setores) {
      if (ncPendentes(s) > 0) {
        setFinalizar(false)
        setSetorSel(s.id)
        toast(`Há não conformidades sem foto/recomendação em "${s.nome}".`, 'erro')
        return
      }
    }
    const geral = scoreGeral(setores, perguntas, respostas)
    await db.auditorias.update(id, {
      status: 'finalizada',
      pontuacaoGeral: geral.pontuacaoGeral,
      pontuacaoPorSetor: geral.pontuacaoPorSetor,
      finalizadaEm: Date.now(),
    })
    setFinalizar(false)
    toast('Relatório finalizado!', 'sucesso')
    navigate(`/resultado/${id}`, { replace: true })
  }

  if (auditoria === undefined) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (auditoria === null) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-slate-600">Relatório não encontrado.</p>
        <button className="btn-primary" onClick={() => navigate('/auditor')}>
          Voltar
        </button>
      </div>
    )
  }

  const setorAtual = setores.find((s) => s.id === setorSel) ?? null

  // ---------------- VISTA: DETALHE DO SETOR ----------------
  if (setorAtual) {
    const pgs = perguntasDoSetor(perguntas, setorAtual)
    const pendentes = ncPendentes(setorAtual)
    const score = scoreSetor(setorAtual, perguntas, respostas)

    return (
      <div className="min-h-full bg-slate-50 pb-28">
        <header className="sticky top-0 z-10 bg-white px-3 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <button onClick={() => setSetorSel(null)} className="rounded-lg p-2 hover:bg-slate-100">
              <IconBack className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold text-slate-800">{setorAtual.nome}</h1>
              <p className="text-xs text-slate-500">
                {score.respondidas}/{score.totalPerguntas} respondidas • {Math.round(score.percentual)}%
                conformidade
              </p>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-lg space-y-3 px-3 pt-3">
          {pgs.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              Nenhuma pergunta cadastrada para as categorias deste setor.
            </p>
          )}
          {pgs.map((p) => (
            <PerguntaItem
              key={p.id}
              pergunta={p}
              resposta={respMap.get(`${setorAtual.id}|${p.id}`)}
              onConformidade={(v) =>
                upsert(
                  setorAtual,
                  p,
                  v === 'nao_conforme'
                    ? { resposta: v }
                    : { resposta: v, recomendacao: null, fotoEvidencia: null },
                )
              }
              onTemperatura={(t) => upsert(setorAtual, p, { temperatura: t })}
              onFoto={(b64) => upsert(setorAtual, p, { fotoEvidencia: b64 })}
              onRecomendacao={(txt) => upsert(setorAtual, p, { recomendacao: txt })}
            />
          ))}
        </div>

        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white p-3">
          <div className="mx-auto max-w-lg">
            {pendentes > 0 && (
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-red-600">
                <IconAlert className="h-4 w-4" />
                {pendentes} não conformidade(s) precisam de foto e recomendação.
              </p>
            )}
            <div className="flex gap-2">
              <button
                className="btn-secondary flex-1 py-3"
                onClick={() => {
                  toast('Rascunho salvo.', 'sucesso')
                  navigate('/auditor')
                }}
              >
                Salvar Rascunho
              </button>
              <button
                className="btn-primary flex-1 py-3"
                disabled={pendentes > 0}
                onClick={() => setSetorSel(null)}
              >
                Salvar Setor e Voltar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---------------- VISTA: LISTA DE SETORES ----------------
  const geralLive = scoreGeral(setores, perguntas, respostas)

  return (
    <div className="min-h-full bg-slate-50 pb-28">
      <header className="bg-brand-800 px-4 pb-5 pt-4 text-white">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/auditor')} className="rounded-lg p-2 hover:bg-white/10">
            <IconBack className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold">{cliente?.nomeFantasia ?? 'Cliente'}</h1>
            <p className="text-xs text-brand-100">{cliente?.tipoEstabelecimento}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">{geralLive.pontuacaoGeral}%</p>
            <p className="text-[10px] text-brand-200">conformidade</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
          Setores ({setores.length})
        </h2>

        {setores.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
            <p className="text-sm text-slate-500">Este cliente não possui setores configurados.</p>
            <p className="mt-1 text-xs text-slate-400">Peça ao administrador para cadastrá-los.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {setores.map((s) => {
              const score = scoreSetor(s, perguntas, respostas)
              const desemp = desempenhoSetor(score)
              const cls = desempenhoClasses[desemp]
              const progresso =
                score.totalPerguntas === 0 ? 0 : (score.respondidas / score.totalPerguntas) * 100
              return (
                <button
                  key={s.id}
                  onClick={() => setSetorSel(s.id)}
                  className={`block w-full rounded-xl border-2 p-4 text-left shadow-card transition active:scale-[.99] ${cls.card}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-800">{s.nome}</h3>
                    {score.temCriticaNC && (
                      <span className="badge bg-red-600 text-white ring-red-700">CRÍTICO</span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1">
                      <ProgressBar value={progresso} barClassName={cls.barra} />
                    </div>
                    <span className={`text-sm font-bold ${cls.texto}`}>
                      {score.respondidas > 0 ? `${Math.round(score.percentual)}%` : '—'}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {score.respondidas}/{score.totalPerguntas} respondidas
                    {score.naoConformes > 0 && ` • ${score.naoConformes} NC`}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {setores.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white p-4">
          <div className="mx-auto max-w-lg">
            <button className="btn-primary w-full py-3.5 text-base" onClick={() => setFinalizar(true)}>
              <IconCheck className="h-5 w-5" /> Finalizar Relatório
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={finalizar}
        title="Finalizar Relatório"
        mensagem="Após finalizar, o status muda para 'Finalizado' e o laudo em PDF poderá ser gerado. Deseja continuar?"
        confirmLabel="Finalizar"
        onConfirm={finalizarRelatorio}
        onCancel={() => setFinalizar(false)}
      />
    </div>
  )
}

// =====================================================================
// Item de pergunta (resposta por tipo)
// =====================================================================
function PerguntaItem({
  pergunta,
  resposta,
  onConformidade,
  onTemperatura,
  onFoto,
  onRecomendacao,
}: {
  pergunta: PerguntaBase
  resposta?: AuditoriaResposta
  onConformidade: (v: ValorConformidade) => void
  onTemperatura: (t: number | null) => void
  onFoto: (b64: string) => void
  onRecomendacao: (txt: string) => void
}) {
  const toast = useToast()
  const [enviando, setEnviando] = useState(false)
  const isNC = resposta?.resposta === 'nao_conforme'

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setEnviando(true)
    try {
      const b64 = await comprimirImagem(file)
      onFoto(b64)
    } catch {
      toast('Não foi possível processar a imagem.', 'erro')
    } finally {
      setEnviando(false)
      e.target.value = ''
    }
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-card ring-1 ring-slate-200">
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-slate-800">{pergunta.texto}</p>
        <span className={`badge shrink-0 ${criticidadeBadge[pergunta.criticidade]}`}>
          {pergunta.criticidade}
        </span>
      </div>

      {/* Conformidade */}
      {pergunta.tipoResposta === 'conformidade' && (
        <div className="grid grid-cols-3 gap-2">
          <BotaoResposta
            ativo={resposta?.resposta === 'conforme'}
            cor="emerald"
            onClick={() => onConformidade('conforme')}
            icon={<IconCheck className="h-5 w-5" />}
            label="Conforme"
          />
          <BotaoResposta
            ativo={resposta?.resposta === 'nao_conforme'}
            cor="red"
            onClick={() => onConformidade('nao_conforme')}
            icon={<IconX className="h-5 w-5" />}
            label="Não Conforme"
          />
          <BotaoResposta
            ativo={resposta?.resposta === 'na'}
            cor="slate"
            onClick={() => onConformidade('na')}
            label="N/A"
          />
        </div>
      )}

      {/* Temperatura */}
      {pergunta.tipoResposta === 'temperatura' && (
        <div className="flex items-center gap-2">
          <IconThermo className="h-5 w-5 text-brand-700" />
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            className="input max-w-[140px]"
            placeholder="0.0"
            value={resposta?.temperatura ?? ''}
            onChange={(e) => onTemperatura(e.target.value === '' ? null : Number(e.target.value))}
          />
          <span className="text-sm font-medium text-slate-600">°C</span>
        </div>
      )}

      {/* Foto (tipo de resposta = foto) */}
      {pergunta.tipoResposta === 'foto' && (
        <FotoUpload foto={resposta?.fotoEvidencia} enviando={enviando} onFoto={handleFoto} onRemover={() => onFoto('')} />
      )}

      {/* Bloco extra de NC: recomendação + foto de evidência */}
      {isNC && (
        <div className="mt-3 space-y-3 rounded-lg bg-red-50 p-3 ring-1 ring-red-200">
          <div>
            <label className="mb-1 block text-xs font-semibold text-red-700">
              Recomendação <span className="text-red-500">*</span>
            </label>
            <textarea
              className={`input min-h-[64px] resize-y ${
                !resposta?.recomendacao?.trim() ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''
              }`}
              placeholder="Descreva a ação corretiva recomendada..."
              value={resposta?.recomendacao ?? ''}
              onChange={(e) => onRecomendacao(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-red-700">
              Foto de evidência <span className="text-red-500">*</span>
            </label>
            <FotoUpload
              foto={resposta?.fotoEvidencia}
              enviando={enviando}
              onFoto={handleFoto}
              onRemover={() => onFoto('')}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function BotaoResposta({
  ativo,
  cor,
  onClick,
  icon,
  label,
}: {
  ativo: boolean
  cor: 'emerald' | 'red' | 'slate'
  onClick: () => void
  icon?: React.ReactNode
  label: string
}) {
  const cores = {
    emerald: ativo ? 'bg-emerald-500 text-white ring-emerald-500' : 'text-emerald-700 ring-emerald-300',
    red: ativo ? 'bg-red-500 text-white ring-red-500' : 'text-red-700 ring-red-300',
    slate: ativo ? 'bg-slate-600 text-white ring-slate-600' : 'text-slate-600 ring-slate-300',
  }[cor]
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-3 text-xs font-bold ring-2 transition active:scale-95 ${
        ativo ? cores : `bg-white hover:bg-slate-50 ${cores}`
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function FotoUpload({
  foto,
  enviando,
  onFoto,
  onRemover,
}: {
  foto?: string | null
  enviando: boolean
  onFoto: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemover: () => void
}) {
  if (foto) {
    return (
      <div className="relative inline-block">
        <img src={foto} alt="evidência" className="h-28 w-40 rounded-lg object-cover ring-1 ring-slate-200" />
        <button
          type="button"
          onClick={onRemover}
          className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white shadow"
          aria-label="Remover foto"
        >
          <IconTrash className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }
  return (
    <label className="flex h-28 w-40 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:bg-slate-100">
      {enviando ? (
        <span className="text-xs">Processando...</span>
      ) : (
        <>
          <IconCamera className="h-6 w-6" />
          <span className="text-xs font-medium">Adicionar foto</span>
        </>
      )}
      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFoto} />
    </label>
  )
}
