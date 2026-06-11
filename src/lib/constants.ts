import type { Criticidade } from '@/types'

/** Categorias fixas padrão do sistema */
export const CATEGORIAS_FIXAS = [
  'Controle de Temperaturas',
  'Higiene Pessoal',
  'Higiene Ambiental',
  'Recebimento de Mercadorias',
  'Armazenamento',
  'Equipamentos e Utensílios',
  'Documentação e Registros',
] as const

export const TIPOS_ESTABELECIMENTO = [
  'Restaurante',
  'Lanchonete',
  'Padaria',
  'Supermercado',
  'Açougue',
  'Cozinha Industrial',
  'Hotel / Pousada',
  'Indústria de Alimentos',
  'Outro',
]

export const CRITICIDADES: Criticidade[] = ['Baixa', 'Média', 'Crítica']

/** Classes de badge por criticidade */
export const criticidadeBadge: Record<Criticidade, string> = {
  Baixa: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  Média: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  Crítica: 'bg-red-100 text-red-800 ring-red-600/20',
}

export const TIPOS_RESPOSTA_LABEL: Record<string, string> = {
  conformidade: 'Conforme / NC / N/A',
  temperatura: 'Temperatura °C',
  foto: 'Upload de foto',
}
