import { db } from './database'
import { uid } from '@/lib/id'
import { hashSenha } from '@/lib/auth'
import { scoreGeral } from '@/lib/scoring'
import type {
  Auditoria,
  AuditoriaResposta,
  Cliente,
  PerguntaBase,
  SetorCliente,
  User,
} from '@/types'

// Pequena imagem placeholder (cinza) usada como "foto de evidência" nos dados demo.
const FOTO_DEMO =
  'data:image/svg+xml;base64,' +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" font-family="sans-serif" font-size="16" fill="#64748b" text-anchor="middle" dominant-baseline="middle">Evidência fotográfica</text></svg>`,
  )

function diasAtras(n: number): number {
  return Date.now() - n * 24 * 60 * 60 * 1000
}

export async function seedIfEmpty() {
  const count = await db.users.count()
  if (count > 0) return

  // ---------------- USUÁRIOS ----------------
  const adminId = uid()
  const auditorId = uid()
  const novoAuditorId = uid()

  const users: User[] = [
    {
      id: adminId,
      nome: 'Administrador',
      email: 'admin@otimiza.com',
      perfil: 'admin',
      senhaHash: hashSenha('admin123'),
      primeiroAcesso: false,
      ativo: true,
      criadoEm: diasAtras(40),
    },
    {
      id: auditorId,
      nome: 'Carlos Auditor',
      email: 'auditor@otimiza.com',
      perfil: 'auditor',
      senhaHash: hashSenha('auditor123'),
      primeiroAcesso: false,
      ativo: true,
      criadoEm: diasAtras(30),
    },
    {
      id: novoAuditorId,
      nome: 'Auditora Convidada',
      email: 'novo@otimiza.com',
      perfil: 'auditor',
      senhaHash: hashSenha('temp123'),
      primeiroAcesso: true, // demonstra a troca de senha obrigatória
      ativo: true,
      criadoEm: diasAtras(2),
    },
  ]

  // ---------------- PERGUNTAS ----------------
  const P = (
    texto: string,
    categoria: string,
    criticidade: PerguntaBase['criticidade'],
    tipoResposta: PerguntaBase['tipoResposta'],
  ): PerguntaBase => ({
    id: uid(),
    texto,
    categoria,
    criticidade,
    tipoResposta,
    criadoEm: diasAtras(35),
  })

  const perguntas: PerguntaBase[] = [
    // Controle de Temperaturas
    P('Temperatura da câmara fria está adequada (0 a 4°C)?', 'Controle de Temperaturas', 'Crítica', 'temperatura'),
    P('Temperatura do freezer está adequada (≤ -18°C)?', 'Controle de Temperaturas', 'Crítica', 'temperatura'),
    P('Alimentos quentes mantidos acima de 60°C na distribuição?', 'Controle de Temperaturas', 'Crítica', 'conformidade'),
    P('Registros de temperatura preenchidos diariamente?', 'Controle de Temperaturas', 'Média', 'conformidade'),
    // Higiene Pessoal
    P('Manipuladores utilizam uniforme limpo e completo?', 'Higiene Pessoal', 'Média', 'conformidade'),
    P('Higienização correta das mãos é praticada?', 'Higiene Pessoal', 'Crítica', 'conformidade'),
    P('Ausência de adornos (anéis, brincos, relógios)?', 'Higiene Pessoal', 'Média', 'conformidade'),
    P('Cabelos totalmente protegidos com touca?', 'Higiene Pessoal', 'Baixa', 'conformidade'),
    // Higiene Ambiental
    P('Pisos, paredes e tetos limpos e conservados?', 'Higiene Ambiental', 'Média', 'conformidade'),
    P('Ausência de pragas e vetores no ambiente?', 'Higiene Ambiental', 'Crítica', 'conformidade'),
    P('Lixeiras com tampa e acionamento não manual?', 'Higiene Ambiental', 'Baixa', 'conformidade'),
    P('Registro fotográfico do ambiente', 'Higiene Ambiental', 'Baixa', 'foto'),
    // Recebimento de Mercadorias
    P('Conferência de validade no recebimento?', 'Recebimento de Mercadorias', 'Média', 'conformidade'),
    P('Veículo de entrega em condições higiênicas?', 'Recebimento de Mercadorias', 'Média', 'conformidade'),
    P('Temperatura dos produtos refrigerados no recebimento', 'Recebimento de Mercadorias', 'Crítica', 'temperatura'),
    // Armazenamento
    P('Produtos afastados do piso e da parede?', 'Armazenamento', 'Baixa', 'conformidade'),
    P('Identificação e data de validade nos produtos?', 'Armazenamento', 'Média', 'conformidade'),
    P('Separação entre alimentos crus e prontos?', 'Armazenamento', 'Crítica', 'conformidade'),
    // Equipamentos e Utensílios
    P('Equipamentos higienizados e em bom estado?', 'Equipamentos e Utensílios', 'Média', 'conformidade'),
    P('Utensílios sem ferrugem ou danos?', 'Equipamentos e Utensílios', 'Baixa', 'conformidade'),
    P('Registro fotográfico dos equipamentos', 'Equipamentos e Utensílios', 'Baixa', 'foto'),
    // Documentação e Registros
    P('Manual de Boas Práticas disponível e atualizado?', 'Documentação e Registros', 'Média', 'conformidade'),
    P('POPs implementados e acessíveis à equipe?', 'Documentação e Registros', 'Média', 'conformidade'),
    P('Registros de controle integrado de pragas?', 'Documentação e Registros', 'Baixa', 'conformidade'),
    // Categoria personalizada (exemplo)
    P('Óleo de fritura dentro do prazo de troca?', 'Controle de Óleo de Fritura', 'Média', 'conformidade'),
    P('Temperatura do óleo de fritura', 'Controle de Óleo de Fritura', 'Média', 'temperatura'),
  ]

  // ---------------- CLIENTES + SETORES ----------------
  const cli1: Cliente = {
    id: uid(),
    nomeFantasia: 'Restaurante Sabor & Arte',
    razaoSocial: 'Sabor e Arte Gastronomia LTDA',
    endereco: 'Av. das Palmeiras, 1200 — Centro, São Paulo/SP',
    emailResponsavel: 'responsavel@saborarte.com',
    tipoEstabelecimento: 'Restaurante',
    criadoEm: diasAtras(28),
  }
  const cli2: Cliente = {
    id: uid(),
    nomeFantasia: 'Padaria Pão Quente',
    razaoSocial: 'Pão Quente Panificadora ME',
    endereco: 'Rua do Trigo, 45 — Bela Vista, São Paulo/SP',
    emailResponsavel: 'contato@paoquente.com',
    tipoEstabelecimento: 'Padaria',
    criadoEm: diasAtras(20),
  }
  const cli3: Cliente = {
    id: uid(),
    nomeFantasia: 'Supermercado BomPreço',
    razaoSocial: 'BomPreço Comércio de Alimentos S.A.',
    endereco: 'Rod. BR-101, km 5 — Distrito Industrial',
    emailResponsavel: 'qualidade@bompreco.com',
    tipoEstabelecimento: 'Supermercado',
    criadoEm: diasAtras(12),
  }
  const clientes = [cli1, cli2, cli3]

  const S = (clienteId: string, nome: string, cats: string[]): SetorCliente => ({
    id: uid(),
    clienteId,
    nome,
    categoriasHabilitadas: cats,
    criadoEm: diasAtras(27),
  })

  const setores: SetorCliente[] = [
    // Restaurante
    S(cli1.id, 'Cozinha — Área da Chapa', [
      'Controle de Temperaturas',
      'Higiene Pessoal',
      'Equipamentos e Utensílios',
      'Controle de Óleo de Fritura',
    ]),
    S(cli1.id, 'Câmara Fria', ['Controle de Temperaturas', 'Armazenamento', 'Higiene Ambiental']),
    S(cli1.id, 'Salão', ['Higiene Ambiental', 'Higiene Pessoal']),
    S(cli1.id, 'Estoque Seco', ['Armazenamento', 'Recebimento de Mercadorias', 'Documentação e Registros']),
    // Padaria
    S(cli2.id, 'Produção', ['Controle de Temperaturas', 'Higiene Pessoal', 'Equipamentos e Utensílios']),
    S(cli2.id, 'Balcão de Vendas', ['Higiene Ambiental', 'Higiene Pessoal']),
    S(cli2.id, 'Estoque', ['Armazenamento', 'Recebimento de Mercadorias']),
    // Supermercado
    S(cli3.id, 'Açougue', ['Controle de Temperaturas', 'Higiene Pessoal', 'Armazenamento']),
    S(cli3.id, 'Hortifrúti', ['Higiene Ambiental', 'Recebimento de Mercadorias']),
    S(cli3.id, 'Depósito', ['Armazenamento', 'Documentação e Registros']),
  ]

  // ---------------- AUDITORIA FINALIZADA (com respostas) ----------------
  const setoresCli1 = setores.filter((s) => s.clienteId === cli1.id)
  const auditFinalizadaId = uid()
  const respostas: AuditoriaResposta[] = []

  // Algumas perguntas serão NC para gerar não conformidades (incl. 1 crítica)
  // Texto de perguntas que ficarão como NC:
  const ncTextos = new Set([
    'Ausência de adornos (anéis, brincos, relógios)?', // Média
    'Lixeiras com tampa e acionamento não manual?', // Baixa
    'Higienização correta das mãos é praticada?', // Crítica
  ])

  for (const setor of setoresCli1) {
    const pgs = perguntas.filter((p) => setor.categoriasHabilitadas.includes(p.categoria))
    for (const p of pgs) {
      const base: AuditoriaResposta = {
        id: uid(),
        auditoriaId: auditFinalizadaId,
        setorId: setor.id,
        setorNome: setor.nome,
        perguntaId: p.id,
        perguntaTexto: p.texto,
        categoria: p.categoria,
        criticidade: p.criticidade,
        tipoResposta: p.tipoResposta,
        resposta: null,
        temperatura: null,
        fotoEvidencia: null,
        recomendacao: null,
        atualizadoEm: diasAtras(5),
      }
      if (p.tipoResposta === 'temperatura') {
        base.temperatura = p.texto.includes('freezer') ? -19 : p.texto.includes('câmara') ? 3 : 6
      } else if (p.tipoResposta === 'foto') {
        base.fotoEvidencia = FOTO_DEMO
      } else {
        // conformidade
        if (ncTextos.has(p.texto) && setor.nome === 'Cozinha — Área da Chapa') {
          base.resposta = 'nao_conforme'
          base.recomendacao =
            p.criticidade === 'Crítica'
              ? 'Reforçar imediatamente o treinamento de higienização das mãos e instalar lavatório exclusivo.'
              : 'Orientar a equipe e corrigir no prazo de 7 dias.'
          base.fotoEvidencia = FOTO_DEMO
        } else if (p.texto === 'Lixeiras com tampa e acionamento não manual?' && setor.nome === 'Salão') {
          base.resposta = 'nao_conforme'
          base.recomendacao = 'Substituir lixeiras por modelos com pedal.'
          base.fotoEvidencia = FOTO_DEMO
        } else {
          base.resposta = 'conforme'
        }
      }
      respostas.push(base)
    }
  }

  const geral = scoreGeral(setoresCli1, perguntas, respostas)
  const auditFinalizada: Auditoria = {
    id: auditFinalizadaId,
    clienteId: cli1.id,
    auditorId: auditorId,
    dataHora: diasAtras(5),
    status: 'finalizada',
    pontuacaoGeral: geral.pontuacaoGeral,
    pontuacaoPorSetor: geral.pontuacaoPorSetor,
    finalizadaEm: diasAtras(5),
    criadoEm: diasAtras(5),
  }

  // Segunda auditoria finalizada (resumo) para popular o dashboard
  const auditFinalizada2: Auditoria = {
    id: uid(),
    clienteId: cli2.id,
    auditorId: auditorId,
    dataHora: diasAtras(9),
    status: 'finalizada',
    pontuacaoGeral: 92,
    pontuacaoPorSetor: [
      { setorId: 'x', setorNome: 'Produção', percentual: 95 },
      { setorId: 'y', setorNome: 'Balcão de Vendas', percentual: 88 },
      { setorId: 'z', setorNome: 'Estoque', percentual: 93 },
    ],
    finalizadaEm: diasAtras(9),
    criadoEm: diasAtras(9),
  }

  // Auditoria em andamento (aparece na home do auditor)
  const auditAndamento: Auditoria = {
    id: uid(),
    clienteId: cli3.id,
    auditorId: auditorId,
    dataHora: diasAtras(1),
    status: 'em_andamento',
    pontuacaoGeral: 0,
    pontuacaoPorSetor: [],
    criadoEm: diasAtras(1),
  }

  // ---------------- CONFIGURAÇÃO PDF GLOBAL ----------------
  await db.transaction(
    'rw',
    [db.users, db.perguntas, db.clientes, db.setores, db.auditorias, db.respostas, db.configsPDF],
    async () => {
      await db.users.bulkAdd(users)
      await db.perguntas.bulkAdd(perguntas)
      await db.clientes.bulkAdd(clientes)
      await db.setores.bulkAdd(setores)
      await db.auditorias.bulkAdd([auditFinalizada, auditFinalizada2, auditAndamento])
      await db.respostas.bulkAdd(respostas)
      await db.configsPDF.add({
        id: uid(),
        clienteId: null,
        logo: null,
        corPrimaria: '#1e40af',
        corSecundaria: '#3b82f6',
        prefixoLaudo: 'OSA',
        auditorResponsavel: 'Carlos Auditor',
        textoRodape: 'Otimiza Segurança dos Alimentos — Consultoria em Segurança Alimentar',
        assinatura: 'Carlos Auditor — Responsável Técnico',
        criadoEm: diasAtras(40),
      })
    },
  )
}
