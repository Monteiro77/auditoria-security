import Dexie, { type Table } from 'dexie'
import type {
  User,
  Cliente,
  SetorCliente,
  PerguntaBase,
  Checklist,
  Auditoria,
  AuditoriaResposta,
  ConfiguracaoPDF,
} from '@/types'

export class OtimizaDB extends Dexie {
  users!: Table<User, string>
  clientes!: Table<Cliente, string>
  setores!: Table<SetorCliente, string>
  perguntas!: Table<PerguntaBase, string>
  checklists!: Table<Checklist, string>
  auditorias!: Table<Auditoria, string>
  respostas!: Table<AuditoriaResposta, string>
  configsPDF!: Table<ConfiguracaoPDF, string>

  constructor() {
    super('otimiza-seguranca-alimentos')
    this.version(1).stores({
      users: 'id, email, perfil, ativo',
      clientes: 'id, nomeFantasia, criadoEm',
      setores: 'id, clienteId',
      perguntas: 'id, categoria, criticidade, tipoResposta',
      checklists: 'id, nome',
      auditorias: 'id, clienteId, auditorId, status, criadoEm',
      respostas: 'id, auditoriaId, setorId, perguntaId',
      configsPDF: 'id, clienteId',
    })
  }
}

export const db = new OtimizaDB()
