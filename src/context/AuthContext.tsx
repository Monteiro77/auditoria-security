import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { db } from '@/db/database'
import { seedIfEmpty } from '@/db/seed'
import { hashSenha, lerSessao, limparSessao, salvarSessao, verificarSenha } from '@/lib/auth'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, senha: string) => Promise<{ ok: boolean; erro?: string }>
  logout: () => void
  /** define nova senha e desativa primeiro acesso */
  alterarSenha: (novaSenha: string) => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        await seedIfEmpty()
        const id = lerSessao()
        if (id) {
          const u = await db.users.get(id)
          if (u && u.ativo) setUser(u)
          else limparSessao()
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function login(email: string, senha: string) {
    const normalized = email.trim().toLowerCase()
    const u = await db.users.where('email').equals(normalized).first()
    if (!u) return { ok: false, erro: 'E-mail ou senha inválidos.' }
    if (!u.ativo) return { ok: false, erro: 'Usuário inativo. Contate o administrador.' }
    if (!verificarSenha(senha, u.senhaHash)) {
      return { ok: false, erro: 'E-mail ou senha inválidos.' }
    }
    salvarSessao(u.id)
    setUser(u)
    return { ok: true }
  }

  function logout() {
    limparSessao()
    setUser(null)
  }

  async function alterarSenha(novaSenha: string) {
    if (!user) return
    const senhaHash = hashSenha(novaSenha)
    await db.users.update(user.id, { senhaHash, primeiroAcesso: false })
    const atualizado = await db.users.get(user.id)
    if (atualizado) setUser(atualizado)
  }

  async function refresh() {
    if (!user) return
    const u = await db.users.get(user.id)
    setUser(u ?? null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, alterarSenha, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
