import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { uid } from '@/lib/id'
import { hashSenha } from '@/lib/auth'
import { useAuth } from '@/context/AuthContext'
import { PageHeader, Modal, Field, ConfirmDialog } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { IconPlus, IconTrash, IconUsuarios } from '@/components/icons'
import type { Perfil, User } from '@/types'

export default function Usuarios() {
  const toast = useToast()
  const { user: atual } = useAuth()
  const users = useLiveQuery(() => db.users.toArray(), [], [])

  const [modal, setModal] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [perfil, setPerfil] = useState<Perfil>('auditor')
  const [senhaTemp, setSenhaTemp] = useState('')
  const [excluir, setExcluir] = useState<User | null>(null)
  const [resetAlvo, setResetAlvo] = useState<User | null>(null)
  const [novaTemp, setNovaTemp] = useState('')

  function abrirNovo() {
    setNome('')
    setEmail('')
    setPerfil('auditor')
    setSenhaTemp('')
    setModal(true)
  }

  async function convidar() {
    const e = email.trim().toLowerCase()
    if (!nome.trim()) return toast('Informe o nome.', 'erro')
    if (!e) return toast('Informe o e-mail.', 'erro')
    if (senhaTemp.length < 6) return toast('A senha temporária deve ter ao menos 6 caracteres.', 'erro')
    const existe = await db.users.where('email').equals(e).first()
    if (existe) return toast('Já existe um usuário com este e-mail.', 'erro')

    const novo: User = {
      id: uid(),
      nome: nome.trim(),
      email: e,
      perfil,
      senhaHash: hashSenha(senhaTemp),
      primeiroAcesso: true,
      ativo: true,
      criadoEm: Date.now(),
    }
    await db.users.add(novo)
    setModal(false)
    toast(`Convite criado. Informe a senha temporária a ${novo.nome}.`, 'sucesso')
  }

  async function toggleAtivo(u: User) {
    if (u.id === atual?.id) return toast('Você não pode desativar a si mesmo.', 'erro')
    await db.users.update(u.id, { ativo: !u.ativo })
    toast(u.ativo ? 'Usuário desativado.' : 'Usuário ativado.', 'sucesso')
  }

  async function confirmarReset() {
    if (!resetAlvo) return
    if (novaTemp.length < 6) return toast('A senha temporária deve ter ao menos 6 caracteres.', 'erro')
    await db.users.update(resetAlvo.id, { senhaHash: hashSenha(novaTemp), primeiroAcesso: true })
    setResetAlvo(null)
    setNovaTemp('')
    toast('Senha redefinida. O usuário fará a troca no próximo acesso.', 'sucesso')
  }

  async function confirmarExclusao() {
    if (!excluir) return
    if (excluir.id === atual?.id) {
      setExcluir(null)
      return toast('Você não pode excluir a si mesmo.', 'erro')
    }
    await db.users.delete(excluir.id)
    setExcluir(null)
    toast('Usuário removido.', 'sucesso')
  }

  return (
    <div>
      <PageHeader
        titulo="Usuários"
        descricao="Gestão de acesso da equipe (somente administradores)"
        acao={
          <button className="btn-primary" onClick={abrirNovo}>
            <IconPlus className="h-4 w-4" /> Convidar usuário
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">E-mail</th>
                <th className="px-4 py-3 font-medium">Perfil</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{u.nome}</span>
                    {u.id === atual?.id && (
                      <span className="ml-2 text-xs text-brand-700">(você)</span>
                    )}
                    <span className="block text-xs text-slate-500 sm:hidden">{u.email}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${
                        u.perfil === 'admin'
                          ? 'bg-brand-100 text-brand-800 ring-brand-600/20'
                          : 'bg-slate-100 text-slate-700 ring-slate-300'
                      }`}
                    >
                      {u.perfil === 'admin' ? 'Administrador' : 'Auditor'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!u.ativo ? (
                      <span className="badge bg-slate-200 text-slate-600 ring-slate-300">Inativo</span>
                    ) : u.primeiroAcesso ? (
                      <span className="badge bg-amber-100 text-amber-800 ring-amber-600/20">
                        1º acesso pendente
                      </span>
                    ) : (
                      <span className="badge bg-emerald-100 text-emerald-800 ring-emerald-600/20">
                        Ativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        className="btn-secondary px-2.5 py-1.5 text-xs"
                        onClick={() => {
                          setResetAlvo(u)
                          setNovaTemp('')
                        }}
                      >
                        Redefinir senha
                      </button>
                      <button
                        className="btn-secondary px-2.5 py-1.5 text-xs"
                        onClick={() => toggleAtivo(u)}
                      >
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        className="btn-ghost p-2 text-red-600 hover:bg-red-50"
                        title="Excluir"
                        onClick={() => setExcluir(u)}
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal convidar */}
      <Modal open={modal} onClose={() => setModal(false)} title="Convidar usuário">
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800 ring-1 ring-brand-100">
            <IconUsuarios className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              O usuário entrará com a senha temporária e será obrigado a definir uma nova senha no
              primeiro acesso.
            </span>
          </div>
          <Field label="Nome" required>
            <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
          </Field>
          <Field label="E-mail" required>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Perfil" required>
              <select className="input" value={perfil} onChange={(e) => setPerfil(e.target.value as Perfil)}>
                <option value="auditor">Auditor</option>
                <option value="admin">Administrador</option>
              </select>
            </Field>
            <Field label="Senha temporária" required>
              <input
                className="input"
                value={senhaTemp}
                onChange={(e) => setSenhaTemp(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setModal(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={convidar}>
              Criar acesso
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal reset senha */}
      <Modal
        open={!!resetAlvo}
        onClose={() => setResetAlvo(null)}
        title={`Redefinir senha de ${resetAlvo?.nome ?? ''}`}
        size="sm"
      >
        <div className="space-y-4">
          <Field label="Nova senha temporária" required>
            <input
              className="input"
              value={novaTemp}
              onChange={(e) => setNovaTemp(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setResetAlvo(null)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={confirmarReset}>
              Redefinir
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!excluir}
        title="Excluir usuário"
        mensagem={`Excluir o usuário "${excluir?.nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        perigo
        onConfirm={confirmarExclusao}
        onCancel={() => setExcluir(null)}
      />
    </div>
  )
}
