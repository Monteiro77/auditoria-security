// =====================================================================
// Tipos / Entidades do sistema "Otimiza Segurança dos Alimentos"
// =====================================================================

export type Perfil = 'admin' | 'auditor'

export type Criticidade = 'Baixa' | 'Média' | 'Crítica'

/** Tipo de resposta esperado para uma pergunta */
export type TipoResposta = 'conformidade' | 'temperatura' | 'foto'

/** Valor de uma resposta de conformidade */
export type ValorConformidade = 'conforme' | 'nao_conforme' | 'na'

export type StatusAuditoria = 'em_andamento' | 'finalizada'

export interface User {
  id: string
  nome: string
  email: string
  perfil: Perfil
  senhaHash: string
  primeiroAcesso: boolean
  ativo: boolean
  criadoEm: number
}

export interface Cliente {
  id: string
  nomeFantasia: string
  razaoSocial: string
  endereco: string
  emailResponsavel: string
  tipoEstabelecimento: string
  criadoEm: number
}

export interface SetorCliente {
  id: string
  clienteId: string
  nome: string
  /** nomes das categorias habilitadas (fixas + personalizadas) */
  categoriasHabilitadas: string[]
  criadoEm: number
}

export interface PerguntaBase {
  id: string
  texto: string
  categoria: string
  criticidade: Criticidade
  tipoResposta: TipoResposta
  criadoEm: number
}

export interface Checklist {
  id: string
  nome: string
  perguntaIds: string[]
  criadoEm: number
}

export interface PontuacaoSetor {
  setorId: string
  setorNome: string
  percentual: number
}

export interface Auditoria {
  id: string
  clienteId: string
  auditorId: string
  dataHora: number
  status: StatusAuditoria
  /** % de conformidade geral */
  pontuacaoGeral: number
  pontuacaoPorSetor: PontuacaoSetor[]
  finalizadaEm?: number
  criadoEm: number
}

export interface AuditoriaResposta {
  id: string
  auditoriaId: string
  setorId: string
  setorNome: string
  perguntaId: string
  perguntaTexto: string
  categoria: string
  criticidade: Criticidade
  tipoResposta: TipoResposta
  /** preenchido quando tipoResposta = 'conformidade' */
  resposta?: ValorConformidade | null
  /** preenchido quando tipoResposta = 'temperatura' (°C) */
  temperatura?: number | null
  /** foto de evidência em base64 (também usada para NC) */
  fotoEvidencia?: string | null
  recomendacao?: string | null
  atualizadoEm: number
}

/**
 * Não conformidade — derivada de AuditoriaResposta (resposta = nao_conforme).
 * Mantida como tipo de "view" para a geração do laudo.
 */
export interface NaoConformidade {
  respostaId: string
  setorNome: string
  perguntaTexto: string
  criticidade: Criticidade
  fotoEvidencia?: string | null
  recomendacao?: string | null
}

export interface ConfiguracaoPDF {
  id: string
  /** null/'' => configuração global */
  clienteId: string | null
  logo?: string | null // base64
  corPrimaria: string
  corSecundaria: string
  prefixoLaudo: string
  /** dados do rodapé */
  auditorResponsavel: string
  textoRodape: string
  assinatura: string
  criadoEm: number
}
