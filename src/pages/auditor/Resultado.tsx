import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui'
import { DonutConformidade } from '@/components/DonutConformidade'
import { useToast } from '@/components/Toast'
import { IconBack, IconDownload, IconShare, IconAlert, IconCheck } from '@/components/icons'
import { baixarPDF, compartilharPDF, montarDadosLaudo, type LaudoData } from '@/lib/pdf'
import { criticidadeBadge } from '@/lib/constants'
import { formatDataHora, numeroLaudo } from '@/lib/format'

export default function Resultado() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()

  const [dados, setDados] = useState<LaudoData | null | undefined>(undefined)
  const [gerando, setGerando] = useState(false)

  useEffect(() => {
    let ativo = true
    montarDadosLaudo(id).then((d) => ativo && setDados(d))
    return () => {
      ativo = false
    }
  }, [id])

  function voltar() {
    navigate(user?.perfil === 'admin' ? '/relatorios' : '/auditor')
  }

  async function baixar() {
    if (!dados) return
    setGerando(true)
    await baixarPDF(dados)
    setGerando(false)
    toast('PDF gerado.', 'sucesso')
  }

  async function compartilhar() {
    if (!dados) return
    setGerando(true)
    const r = await compartilharPDF(dados)
    setGerando(false)
    if (r === 'baixado') toast('Compartilhamento indisponível — PDF baixado.', 'info')
    else if (r === 'erro') toast('Não foi possível compartilhar.', 'erro')
  }

  if (dados === undefined) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (dados === null) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-slate-600">Relatório não encontrado.</p>
        <button className="btn-primary" onClick={voltar}>
          Voltar
        </button>
      </div>
    )
  }

  const donut = [
    { name: 'Conforme', value: dados.conformes, color: '#10b981' },
    { name: 'Não Conforme', value: dados.naoConformes, color: '#ef4444' },
    { name: 'N/A', value: dados.nas, color: '#94a3b8' },
  ]
  const criticas = dados.ncs.filter((n) => n.criticidade === 'Crítica')
  const demais = dados.ncs.filter((n) => n.criticidade !== 'Crítica')

  return (
    <div className="min-h-full bg-slate-50 pb-28">
      <header className="bg-brand-800 px-4 pb-6 pt-4 text-white">
        <div className="flex items-center gap-2">
          <button onClick={voltar} className="rounded-lg p-2 hover:bg-white/10">
            <IconBack className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold">{dados.cliente?.nomeFantasia ?? 'Relatório'}</h1>
            <p className="text-xs text-brand-100">
              {numeroLaudo(dados.config.prefixoLaudo, dados.auditoria)} •{' '}
              {formatDataHora(dados.auditoria.dataHora)}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4">
        {/* Resumo + donut */}
        <div className="-mt-3 mb-5 rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-200">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="w-full max-w-[220px]">
              <DonutConformidade
                data={donut}
                centerValue={`${dados.pontuacaoGeral}%`}
                centerLabel="conformidade"
                height={200}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Linha cor="#10b981" label="Conforme" valor={dados.conformes} />
              <Linha cor="#ef4444" label="Não Conforme" valor={dados.naoConformes} />
              <Linha cor="#94a3b8" label="N/A" valor={dados.nas} />
            </div>
          </div>
        </div>

        {/* Pontuação por setor */}
        <section className="mb-5 rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
            Pontuação por setor
          </h2>
          <div className="space-y-3">
            {dados.pontuacaoPorSetor.length === 0 && (
              <p className="text-sm text-slate-400">Sem setores avaliados.</p>
            )}
            {dados.pontuacaoPorSetor.map((s) => {
              const cor =
                s.percentual >= 80 ? '#10b981' : s.percentual >= 50 ? '#f59e0b' : '#ef4444'
              return (
                <div key={s.setorId} className="flex items-center gap-3">
                  <span className="w-32 truncate text-sm text-slate-700">{s.setorNome}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full" style={{ width: `${s.percentual}%`, background: cor }} />
                  </div>
                  <span className="w-10 text-right text-sm font-bold" style={{ color: cor }}>
                    {s.percentual}%
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Não conformidades */}
        <section className="mb-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
            Não conformidades ({dados.ncs.length})
          </h2>

          {dados.ncs.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
              <IconCheck className="h-5 w-5" /> Nenhuma não conformidade registrada.
            </div>
          ) : (
            <div className="space-y-3">
              {criticas.map((n) => (
                <NCCard key={n.respostaId} n={n} grave />
              ))}
              {demais.map((n) => (
                <NCCard key={n.respostaId} n={n} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Ações */}
      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white p-3">
        <div className="mx-auto flex max-w-2xl gap-2">
          <button className="btn-secondary flex-1 py-3" onClick={compartilhar} disabled={gerando}>
            <IconShare className="h-5 w-5" /> Compartilhar
          </button>
          <button className="btn-primary flex-1 py-3" onClick={baixar} disabled={gerando}>
            <IconDownload className="h-5 w-5" /> {gerando ? 'Gerando...' : 'Baixar PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Linha({ cor, label, valor }: { cor: string; label: string; valor: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-slate-600">
        <span className="h-3 w-3 rounded-sm" style={{ background: cor }} />
        {label}
      </span>
      <span className="font-bold text-slate-800">{valor}</span>
    </div>
  )
}

function NCCard({ n, grave = false }: { n: LaudoData['ncs'][number]; grave?: boolean }) {
  return (
    <div
      className={`rounded-xl p-4 ring-1 ${
        grave ? 'bg-red-50 ring-red-200' : 'bg-white shadow-card ring-slate-200'
      }`}
    >
      {grave && (
        <span className="badge mb-2 bg-red-700 text-white ring-red-800">
          <IconAlert className="mr-1 h-3.5 w-3.5" /> ALERTA GRAVE
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{n.perguntaTexto}</p>
        <span className="shrink-0 text-xs text-slate-500">{n.setorNome}</span>
      </div>
      <div className="mt-3 flex gap-3">
        {n.fotoEvidencia ? (
          <img
            src={n.fotoEvidencia}
            alt="evidência"
            className="h-24 w-28 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
          />
        ) : (
          <div className="flex h-24 w-28 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
            Sem foto
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Recomendação</p>
          <p className="mt-0.5 text-sm text-slate-700">{n.recomendacao || '—'}</p>
          <span className={`badge mt-2 ${criticidadeBadge[n.criticidade]}`}>{n.criticidade}</span>
        </div>
      </div>
    </div>
  )
}
