export function formatData(ts: number | undefined | null): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDataHora(ts: number | undefined | null): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Número do laudo formatado a partir de prefixo + data + sequência curta */
export function numeroLaudo(prefixo: string, auditoria: { id: string; criadoEm: number }): string {
  const ano = new Date(auditoria.criadoEm).getFullYear()
  const seq = auditoria.id.replace(/[^a-z0-9]/gi, '').slice(-5).toUpperCase()
  const pref = (prefixo || 'LAUDO').trim()
  return `${pref}-${ano}-${seq}`
}

export function pct(n: number): string {
  return `${Math.round(n)}%`
}
