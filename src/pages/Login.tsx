import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { IconCheck } from '@/components/icons'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const res = await login(email, senha)
    setLoading(false)
    if (!res.ok) setErro(res.erro ?? 'Falha no login.')
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-b from-brand-800 to-brand-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <IconCheck className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Otimiza Segurança dos Alimentos</h1>
          <p className="mt-1 text-sm text-brand-100">Inspeções sanitárias • acesso interno</p>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Entrar</h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@otimiza.com"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="label">Senha</label>
              <input
                type="password"
                className="input"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {erro && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
                {erro}
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-400">
            Não há cadastro público. Solicite acesso ao administrador.
          </p>
        </div>

        <div className="mt-4 rounded-lg bg-white/10 px-4 py-3 text-xs text-brand-50 ring-1 ring-white/15">
          <p className="mb-1 font-semibold text-white">Credenciais de demonstração</p>
          <p>Admin: admin@otimiza.com / admin123</p>
          <p>Auditor: auditor@otimiza.com / auditor123</p>
          <p>1º acesso: novo@otimiza.com / temp123</p>
        </div>
      </div>
    </div>
  )
}
