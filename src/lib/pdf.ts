import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { db } from '@/db/database'
import { getNaoConformidades, scoreGeral } from '@/lib/scoring'
import { formatDataHora, numeroLaudo } from '@/lib/format'
import type {
  Auditoria,
  Cliente,
  ConfiguracaoPDF,
  NaoConformidade,
  PontuacaoSetor,
  User,
} from '@/types'

export interface LaudoData {
  auditoria: Auditoria
  cliente?: Cliente
  auditor?: User
  config: ConfiguracaoPDF
  conformes: number
  naoConformes: number
  nas: number
  pontuacaoGeral: number
  pontuacaoPorSetor: PontuacaoSetor[]
  ncs: NaoConformidade[]
}

const CONFIG_PADRAO: ConfiguracaoPDF = {
  id: 'default',
  clienteId: null,
  logo: null,
  corPrimaria: '#1e40af',
  corSecundaria: '#3b82f6',
  prefixoLaudo: 'OSA',
  auditorResponsavel: '',
  textoRodape: 'Otimiza Segurança dos Alimentos',
  assinatura: '',
  criadoEm: Date.now(),
}

/** Busca config específica do cliente; se não houver, a global; senão, padrão. */
export async function getConfigParaCliente(clienteId?: string): Promise<ConfiguracaoPDF> {
  const todas = await db.configsPDF.toArray()
  const doCliente = clienteId ? todas.find((c) => c.clienteId === clienteId) : undefined
  const global = todas.find((c) => !c.clienteId)
  return doCliente ?? global ?? CONFIG_PADRAO
}

export async function montarDadosLaudo(auditoriaId: string): Promise<LaudoData | null> {
  const auditoria = await db.auditorias.get(auditoriaId)
  if (!auditoria) return null
  const [cliente, auditor, respostas, setores, config] = await Promise.all([
    db.clientes.get(auditoria.clienteId),
    db.users.get(auditoria.auditorId),
    db.respostas.where('auditoriaId').equals(auditoriaId).toArray(),
    db.setores.where('clienteId').equals(auditoria.clienteId).toArray(),
    getConfigParaCliente(auditoria.clienteId),
  ])

  const geral = scoreGeral(setores, await db.perguntas.toArray(), respostas)
  const ncs = getNaoConformidades(respostas)

  // Usa pontuação salva na auditoria quando finalizada; senão recalcula.
  const pontuacaoPorSetor =
    auditoria.pontuacaoPorSetor.length > 0 ? auditoria.pontuacaoPorSetor : geral.pontuacaoPorSetor

  return {
    auditoria,
    cliente,
    auditor,
    config,
    conformes: geral.conformes,
    naoConformes: geral.naoConformes,
    nas: geral.nas,
    pontuacaoGeral: auditoria.status === 'finalizada' ? auditoria.pontuacaoGeral : geral.pontuacaoGeral,
    pontuacaoPorSetor,
    ncs,
  }
}

function esc(s: string | undefined | null): string {
  if (!s) return ''
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
}

/** Constrói um gráfico de rosca (donut) como SVG inline. */
function donutSVG(conformes: number, naoConformes: number, nas: number, primaria: string): string {
  const total = conformes + naoConformes + nas
  const size = 180
  const r = 70
  const cx = size / 2
  const cy = size / 2
  const C = 2 * Math.PI * r
  const slices = [
    { v: conformes, color: '#10b981' },
    { v: naoConformes, color: '#ef4444' },
    { v: nas, color: '#94a3b8' },
  ].filter((s) => s.v > 0)

  let offset = 0
  const arcs =
    total === 0
      ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="26" />`
      : slices
          .map((s) => {
            const frac = s.v / total
            const dash = frac * C
            const el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="26"
              stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" />`
            offset += dash
            return el
          })
          .join('')

  const pct = total === 0 ? 0 : Math.round((conformes / (conformes + naoConformes || 1)) * 100)
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    ${arcs}
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="30" font-weight="700" fill="${primaria}">${pct}%</text>
    <text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="12" fill="#64748b">conformidade</text>
  </svg>`
}

function laudoHTML(d: LaudoData): string {
  const cor = d.config.corPrimaria || '#1e40af'
  const cor2 = d.config.corSecundaria || '#3b82f6'
  const total = d.conformes + d.naoConformes + d.nas
  const numero = numeroLaudo(d.config.prefixoLaudo, d.auditoria)

  const criticas = d.ncs.filter((n) => n.criticidade === 'Crítica')
  const demais = d.ncs.filter((n) => n.criticidade !== 'Crítica')

  const logoHtml = d.config.logo
    ? `<img src="${d.config.logo}" style="max-height:56px;max-width:160px;object-fit:contain" />`
    : ''

  const setoresHtml = d.pontuacaoPorSetor
    .map((s) => {
      const c = s.percentual >= 80 ? '#10b981' : s.percentual >= 50 ? '#f59e0b' : '#ef4444'
      return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <div style="width:180px;font-size:13px;color:#334155">${esc(s.setorNome)}</div>
        <div style="flex:1;height:14px;background:#e2e8f0;border-radius:8px;overflow:hidden">
          <div style="width:${s.percentual}%;height:100%;background:${c}"></div>
        </div>
        <div style="width:46px;text-align:right;font-size:13px;font-weight:700;color:${c}">${s.percentual}%</div>
      </div>`
    })
    .join('')

  const ncCard = (n: NaoConformidade, grave: boolean) => `
    <div style="border:1px solid ${grave ? '#fecaca' : '#e2e8f0'};background:${grave ? '#fef2f2' : '#ffffff'};border-radius:10px;padding:12px;margin-bottom:10px">
      ${grave ? `<div style="display:inline-block;background:#991b1b;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;margin-bottom:6px">⚠ ALERTA GRAVE</div>` : ''}
      <div style="display:flex;justify-content:space-between;gap:8px">
        <div style="font-size:13px;font-weight:600;color:#0f172a">${esc(n.perguntaTexto)}</div>
        <div style="font-size:11px;color:#64748b;white-space:nowrap">${esc(n.setorNome)}</div>
      </div>
      <div style="display:flex;gap:12px;margin-top:8px;align-items:flex-start">
        ${
          n.fotoEvidencia
            ? `<img src="${n.fotoEvidencia}" style="width:120px;height:90px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0" />`
            : `<div style="width:120px;height:90px;border:1px dashed #cbd5e1;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#94a3b8">Sem foto</div>`
        }
        <div style="flex:1">
          <div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.03em">Recomendação</div>
          <div style="font-size:12px;color:#334155;margin-top:2px;line-height:1.45">${esc(n.recomendacao) || '—'}</div>
          <div style="margin-top:6px"><span style="font-size:10px;background:#e2e8f0;color:#475569;padding:1px 7px;border-radius:10px">Criticidade: ${n.criticidade}</span></div>
        </div>
      </div>
    </div>`

  return `
  <div style="font-family:Inter,Arial,sans-serif;color:#0f172a;padding:36px 40px;width:794px;box-sizing:border-box">
    <!-- Cabeçalho -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${cor};padding-bottom:14px">
      <div>
        <div style="font-size:20px;font-weight:800;color:${cor}">Otimiza Segurança dos Alimentos</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px">Laudo de Inspeção Sanitária</div>
      </div>
      <div style="text-align:right">${logoHtml}
        <div style="font-size:12px;color:#475569;margin-top:4px"><strong>Laudo:</strong> ${esc(numero)}</div>
      </div>
    </div>

    <!-- Dados do cliente -->
    <div style="display:flex;gap:24px;margin-top:16px;font-size:12px;color:#334155">
      <div style="flex:1">
        <div style="font-weight:700;font-size:13px;color:#0f172a">${esc(d.cliente?.nomeFantasia) || 'Cliente'}</div>
        <div>${esc(d.cliente?.razaoSocial)}</div>
        <div>${esc(d.cliente?.endereco)}</div>
        <div>${esc(d.cliente?.tipoEstabelecimento)}</div>
      </div>
      <div style="text-align:right">
        <div><strong>Data/Hora:</strong> ${formatDataHora(d.auditoria.dataHora)}</div>
        <div><strong>Auditor:</strong> ${esc(d.auditor?.nome) || '—'}</div>
        <div><strong>Status:</strong> ${d.auditoria.status === 'finalizada' ? 'Finalizado' : 'Em andamento'}</div>
      </div>
    </div>

    <!-- Resumo + Donut -->
    <div style="display:flex;gap:24px;align-items:center;margin-top:22px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px">
      <div>${donutSVG(d.conformes, d.naoConformes, d.nas, cor)}</div>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:10px">Resultado geral: ${d.pontuacaoGeral}% de conformidade</div>
        <div style="display:flex;gap:18px;font-size:12px">
          <div><span style="display:inline-block;width:10px;height:10px;background:#10b981;border-radius:2px;margin-right:5px"></span>Conforme: <strong>${d.conformes}</strong></div>
          <div><span style="display:inline-block;width:10px;height:10px;background:#ef4444;border-radius:2px;margin-right:5px"></span>Não Conforme: <strong>${d.naoConformes}</strong></div>
          <div><span style="display:inline-block;width:10px;height:10px;background:#94a3b8;border-radius:2px;margin-right:5px"></span>N/A: <strong>${d.nas}</strong></div>
        </div>
        <div style="font-size:11px;color:#64748b;margin-top:8px">Total de itens de conformidade avaliados: ${total}</div>
      </div>
    </div>

    <!-- Pontuação por setor -->
    <div style="margin-top:22px">
      <div style="font-size:14px;font-weight:700;color:${cor};border-left:4px solid ${cor2};padding-left:8px;margin-bottom:12px">Pontuação por setor</div>
      ${setoresHtml || '<div style="font-size:12px;color:#94a3b8">Sem setores avaliados.</div>'}
    </div>

    <!-- Não conformidades -->
    <div style="margin-top:22px">
      <div style="font-size:14px;font-weight:700;color:${cor};border-left:4px solid ${cor2};padding-left:8px;margin-bottom:12px">Não conformidades (${d.ncs.length})</div>
      ${criticas.length ? `<div style="font-size:12px;font-weight:700;color:#991b1b;margin-bottom:6px">Críticas — atenção imediata</div>` : ''}
      ${criticas.map((n) => ncCard(n, true)).join('')}
      ${demais.length && criticas.length ? `<div style="font-size:12px;font-weight:700;color:#475569;margin:10px 0 6px">Demais não conformidades</div>` : ''}
      ${demais.map((n) => ncCard(n, false)).join('')}
      ${d.ncs.length === 0 ? '<div style="font-size:12px;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px">Nenhuma não conformidade registrada. ✓</div>' : ''}
    </div>

    <!-- Rodapé -->
    <div style="margin-top:34px;border-top:1px solid #e2e8f0;padding-top:14px;display:flex;justify-content:space-between;align-items:flex-end">
      <div style="font-size:11px;color:#64748b;max-width:60%">${esc(d.config.textoRodape)}</div>
      <div style="text-align:center">
        <div style="width:220px;border-top:1px solid #475569;padding-top:4px;font-size:12px;color:#334155">${esc(d.config.assinatura) || esc(d.config.auditorResponsavel) || esc(d.auditor?.nome) || 'Auditor responsável'}</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:2px">Auditor responsável</div>
      </div>
    </div>
  </div>`
}

async function renderToCanvas(html: string): Promise<HTMLCanvasElement> {
  let host = document.getElementById('pdf-render-area') as HTMLDivElement | null
  if (!host) {
    host = document.createElement('div')
    host.id = 'pdf-render-area'
    document.body.appendChild(host)
  }
  host.innerHTML = html
  // aguarda layout/imagens
  await new Promise((r) => setTimeout(r, 120))
  const canvas = await html2canvas(host.firstElementChild as HTMLElement, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  })
  host.innerHTML = ''
  return canvas
}

export async function gerarPDF(d: LaudoData): Promise<{ pdf: jsPDF; filename: string }> {
  const canvas = await renderToCanvas(laudoHTML(d))
  const imgData = canvas.toDataURL('image/jpeg', 0.92)
  const pdf = new jsPDF('p', 'pt', 'a4')
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const imgW = pageW
  const imgH = (canvas.height * imgW) / canvas.width

  let heightLeft = imgH
  let position = 0
  pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH)
  heightLeft -= pageH
  while (heightLeft > 0) {
    position = heightLeft - imgH
    pdf.addPage()
    pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH)
    heightLeft -= pageH
  }

  const filename = `${numeroLaudo(d.config.prefixoLaudo, d.auditoria)}.pdf`
  return { pdf, filename }
}

export async function baixarPDF(d: LaudoData): Promise<void> {
  const { pdf, filename } = await gerarPDF(d)
  pdf.save(filename)
}

export async function compartilharPDF(d: LaudoData): Promise<'compartilhado' | 'baixado' | 'erro'> {
  try {
    const { pdf, filename } = await gerarPDF(d)
    const blob = pdf.output('blob')
    const file = new File([blob], filename, { type: 'application/pdf' })
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({
        files: [file],
        title: filename,
        text: `Laudo de inspeção — ${d.cliente?.nomeFantasia ?? ''}`,
      })
      return 'compartilhado'
    }
    // fallback: baixa o arquivo
    pdf.save(filename)
    return 'baixado'
  } catch {
    return 'erro'
  }
}
