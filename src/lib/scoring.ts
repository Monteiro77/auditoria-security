import type {
  AuditoriaResposta,
  NaoConformidade,
  PerguntaBase,
  PontuacaoSetor,
  SetorCliente,
} from '@/types'

export type Desempenho = 'verde' | 'ambar' | 'vermelho' | 'neutro'

export interface SetorScore {
  setorId: string
  setorNome: string
  percentual: number
  conformes: number
  naoConformes: number
  nas: number
  temCriticaNC: boolean
  totalPerguntas: number
  respondidas: number
}

/** Perguntas do banco que pertencem às categorias habilitadas do setor */
export function perguntasDoSetor(
  perguntas: PerguntaBase[],
  setor: SetorCliente,
): PerguntaBase[] {
  const cats = new Set(setor.categoriasHabilitadas)
  return perguntas.filter((p) => cats.has(p.categoria))
}

/** Uma resposta é considerada respondida quando possui algum valor */
export function respostaTemValor(r: AuditoriaResposta | undefined): boolean {
  if (!r) return false
  if (r.tipoResposta === 'conformidade') return !!r.resposta
  if (r.tipoResposta === 'temperatura')
    return r.temperatura !== null && r.temperatura !== undefined && !Number.isNaN(r.temperatura)
  if (r.tipoResposta === 'foto') return !!r.fotoEvidencia
  return false
}

/** % de conformidade: conformes / (conformes + não conformes). N/A é excluído. */
export function calcularPercentual(conformes: number, naoConformes: number): number {
  const base = conformes + naoConformes
  if (base === 0) return 100
  return (conformes / base) * 100
}

export function scoreSetor(
  setor: SetorCliente,
  perguntas: PerguntaBase[],
  respostas: AuditoriaResposta[],
): SetorScore {
  const pgs = perguntasDoSetor(perguntas, setor)
  const respDoSetor = respostas.filter((r) => r.setorId === setor.id)
  const byPergunta = new Map(respDoSetor.map((r) => [r.perguntaId, r]))

  let conformes = 0
  let naoConformes = 0
  let nas = 0
  let respondidas = 0
  let temCriticaNC = false

  for (const p of pgs) {
    const r = byPergunta.get(p.id)
    if (respostaTemValor(r)) respondidas++
    if (p.tipoResposta === 'conformidade' && r?.resposta) {
      if (r.resposta === 'conforme') conformes++
      else if (r.resposta === 'nao_conforme') {
        naoConformes++
        if (p.criticidade === 'Crítica') temCriticaNC = true
      } else if (r.resposta === 'na') nas++
    }
  }

  return {
    setorId: setor.id,
    setorNome: setor.nome,
    percentual: calcularPercentual(conformes, naoConformes),
    conformes,
    naoConformes,
    nas,
    temCriticaNC,
    totalPerguntas: pgs.length,
    respondidas,
  }
}

export function desempenhoSetor(s: SetorScore): Desempenho {
  if (s.temCriticaNC) return 'vermelho'
  if (s.respondidas === 0) return 'neutro'
  if (s.percentual >= 80) return 'verde'
  if (s.percentual >= 50) return 'ambar'
  return 'vermelho'
}

export interface GeralScore {
  pontuacaoGeral: number
  pontuacaoPorSetor: PontuacaoSetor[]
  conformes: number
  naoConformes: number
  nas: number
}

export function scoreGeral(
  setores: SetorCliente[],
  perguntas: PerguntaBase[],
  respostas: AuditoriaResposta[],
): GeralScore {
  let conformes = 0
  let naoConformes = 0
  let nas = 0
  const pontuacaoPorSetor: PontuacaoSetor[] = []

  for (const setor of setores) {
    const s = scoreSetor(setor, perguntas, respostas)
    conformes += s.conformes
    naoConformes += s.naoConformes
    nas += s.nas
    pontuacaoPorSetor.push({
      setorId: setor.id,
      setorNome: setor.nome,
      percentual: Math.round(s.percentual),
    })
  }

  return {
    pontuacaoGeral: Math.round(calcularPercentual(conformes, naoConformes)),
    pontuacaoPorSetor,
    conformes,
    naoConformes,
    nas,
  }
}

/** Lista de não conformidades para o laudo (críticas primeiro). */
export function getNaoConformidades(respostas: AuditoriaResposta[]): NaoConformidade[] {
  const ncs = respostas
    .filter((r) => r.tipoResposta === 'conformidade' && r.resposta === 'nao_conforme')
    .map<NaoConformidade>((r) => ({
      respostaId: r.id,
      setorNome: r.setorNome,
      perguntaTexto: r.perguntaTexto,
      criticidade: r.criticidade,
      fotoEvidencia: r.fotoEvidencia,
      recomendacao: r.recomendacao,
    }))

  const ordem = { Crítica: 0, Média: 1, Baixa: 2 } as const
  return ncs.sort((a, b) => ordem[a.criticidade] - ordem[b.criticidade])
}

export const desempenhoClasses: Record<Desempenho, { card: string; barra: string; texto: string }> = {
  verde: { card: 'border-emerald-300 bg-emerald-50', barra: 'bg-emerald-500', texto: 'text-emerald-700' },
  ambar: { card: 'border-amber-300 bg-amber-50', barra: 'bg-amber-500', texto: 'text-amber-700' },
  vermelho: { card: 'border-red-300 bg-red-50', barra: 'bg-red-500', texto: 'text-red-700' },
  neutro: { card: 'border-slate-200 bg-white', barra: 'bg-slate-300', texto: 'text-slate-500' },
}
