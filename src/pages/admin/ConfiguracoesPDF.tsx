import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { uid } from '@/lib/id'
import { PageHeader, Field } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { IconPDF, IconTrash } from '@/components/icons'
import type { ConfiguracaoPDF } from '@/types'

function lerArquivoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const novoForm = (clienteId: string | null): ConfiguracaoPDF => ({
  id: uid(),
  clienteId,
  logo: null,
  corPrimaria: '#1e40af',
  corSecundaria: '#3b82f6',
  prefixoLaudo: 'OSA',
  auditorResponsavel: '',
  textoRodape: 'Otimiza Segurança dos Alimentos — Consultoria em Segurança Alimentar',
  assinatura: '',
  criadoEm: Date.now(),
})

export default function ConfiguracoesPDF() {
  const toast = useToast()
  const clientes = useLiveQuery(() => db.clientes.orderBy('nomeFantasia').toArray(), [], [])
  const configs = useLiveQuery(() => db.configsPDF.toArray(), [], [])

  const [escopo, setEscopo] = useState<string>('global') // 'global' ou clienteId
  const [form, setForm] = useState<ConfiguracaoPDF>(novoForm(null))

  useEffect(() => {
    const clienteId = escopo === 'global' ? null : escopo
    const existente = configs.find((c) => (c.clienteId ?? null) === clienteId)
    setForm(existente ? { ...existente } : novoForm(clienteId))
  }, [escopo, configs])

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1.5 * 1024 * 1024) return toast('Imagem muito grande (máx. 1,5 MB).', 'erro')
    const base64 = await lerArquivoBase64(file)
    setForm((f) => ({ ...f, logo: base64 }))
  }

  async function salvar() {
    const existente = await db.configsPDF.get(form.id)
    if (existente) {
      await db.configsPDF.update(form.id, form)
    } else {
      await db.configsPDF.add(form)
    }
    toast('Configuração salva.', 'sucesso')
  }

  return (
    <div>
      <PageHeader titulo="Configurações de PDF" descricao="Personalize a aparência dos laudos gerados" />

      <div className="mb-5 max-w-md">
        <label className="label">Aplicar configuração para</label>
        <select className="input" value={escopo} onChange={(e) => setEscopo(e.target.value)}>
          <option value="global">Global (todos os clientes)</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nomeFantasia}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-400">
          Uma configuração específica de cliente tem prioridade sobre a global.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card space-y-5 p-5 lg:col-span-2">
          <Field label="Logo" hint="PNG ou JPG, até 1,5 MB.">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
                {form.logo ? (
                  <img src={form.logo} alt="logo" className="max-h-16 max-w-28 object-contain" />
                ) : (
                  <IconPDF className="h-7 w-7 text-slate-300" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="btn-secondary cursor-pointer">
                  Selecionar imagem
                  <input type="file" accept="image/*" className="hidden" onChange={onLogo} />
                </label>
                {form.logo && (
                  <button
                    className="btn-ghost justify-start text-red-600"
                    onClick={() => setForm((f) => ({ ...f, logo: null }))}
                  >
                    <IconTrash className="h-4 w-4" /> Remover
                  </button>
                )}
              </div>
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Cor primária">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-10 w-14 cursor-pointer rounded border border-slate-300"
                  value={form.corPrimaria}
                  onChange={(e) => setForm({ ...form, corPrimaria: e.target.value })}
                />
                <input
                  className="input"
                  value={form.corPrimaria}
                  onChange={(e) => setForm({ ...form, corPrimaria: e.target.value })}
                />
              </div>
            </Field>
            <Field label="Cor secundária">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-10 w-14 cursor-pointer rounded border border-slate-300"
                  value={form.corSecundaria}
                  onChange={(e) => setForm({ ...form, corSecundaria: e.target.value })}
                />
                <input
                  className="input"
                  value={form.corSecundaria}
                  onChange={(e) => setForm({ ...form, corSecundaria: e.target.value })}
                />
              </div>
            </Field>
          </div>

          <Field label="Prefixo do laudo" hint="Ex.: OSA gera laudos como OSA-2026-AB12C.">
            <input
              className="input"
              value={form.prefixoLaudo}
              onChange={(e) => setForm({ ...form, prefixoLaudo: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Auditor responsável (rodapé)">
              <input
                className="input"
                value={form.auditorResponsavel}
                onChange={(e) => setForm({ ...form, auditorResponsavel: e.target.value })}
              />
            </Field>
            <Field label="Assinatura (rodapé)">
              <input
                className="input"
                value={form.assinatura}
                onChange={(e) => setForm({ ...form, assinatura: e.target.value })}
                placeholder="Nome — Responsável Técnico"
              />
            </Field>
          </div>

          <Field label="Texto do rodapé">
            <textarea
              className="input min-h-[70px] resize-y"
              value={form.textoRodape}
              onChange={(e) => setForm({ ...form, textoRodape: e.target.value })}
            />
          </Field>

          <div className="flex justify-end">
            <button className="btn-primary" onClick={salvar}>
              Salvar configuração
            </button>
          </div>
        </div>

        {/* Pré-visualização */}
        <div className="card p-5">
          <p className="mb-3 text-sm font-semibold text-slate-700">Pré-visualização do cabeçalho</p>
          <div className="rounded-lg border border-slate-200 p-4">
            <div
              className="flex items-center justify-between border-b-2 pb-2"
              style={{ borderColor: form.corPrimaria }}
            >
              <div>
                <div className="text-sm font-extrabold" style={{ color: form.corPrimaria }}>
                  Otimiza Segurança dos Alimentos
                </div>
                <div className="text-[10px] text-slate-500">Laudo de Inspeção Sanitária</div>
              </div>
              {form.logo && <img src={form.logo} className="max-h-8 max-w-16 object-contain" />}
            </div>
            <div className="mt-3 space-y-1">
              <div className="h-2 w-3/4 rounded" style={{ background: form.corSecundaria, opacity: 0.3 }} />
              <div className="h-2 w-1/2 rounded bg-slate-100" />
              <div className="h-2 w-2/3 rounded bg-slate-100" />
            </div>
            <div className="mt-4 text-[10px] text-slate-400">{form.textoRodape}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
