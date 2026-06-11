import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/Toast'

export default function AlterarSenha() {
  const { user, alterarSenha, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const obrigatorio = user?.primeiroAcesso === true

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (senha.length < 6) return setErro('A senha deve ter pelo menos 6 caracteres.')
    if (senha !== confirma) return setErro('As senhas não coincidem.')
    setSalvando(true)
    await alterarSenha(senha)
    setSalvando(false)
    toast('Senha alterada com sucesso!', 'sucesso')
    navigate(user?.perfil === 'admin' ? '/dashboard' : '/auditor', { replace: true })
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="card p-6">
          <h1 className="text-lg font-bold text-slate-800">
            {obrigatorio ? 'Defina sua nova senha' : 'Alterar senha'}
          </h1>
          {obrigatorio && (
            <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
              Este é seu primeiro acesso. Por segurança, você precisa cadastrar uma nova senha antes
              de continuar.
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <div>
              <label className="label">Nova senha</label>
              <input
                type="password"
                className="input"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <label className="label">Confirmar nova senha</label>
              <input
                type="password"
                className="input"
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            {erro && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
                {erro}
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-2.5" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar nova senha'}
            </button>
            {obrigatorio && (
              <button type="button" className="btn-ghost w-full" onClick={logout}>
                Sair
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
