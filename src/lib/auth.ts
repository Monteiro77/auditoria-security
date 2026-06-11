import bcrypt from 'bcryptjs'

/** Gera o hash de uma senha (bcrypt, salt embutido). */
export function hashSenha(senha: string): string {
  return bcrypt.hashSync(senha, 10)
}

/** Compara senha em texto puro com o hash armazenado. */
export function verificarSenha(senha: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(senha, hash)
  } catch {
    return false
  }
}

const SESSION_KEY = 'otimiza.session.userId'

export function salvarSessao(userId: string) {
  localStorage.setItem(SESSION_KEY, userId)
}

export function lerSessao(): string | null {
  return localStorage.getItem(SESSION_KEY)
}

export function limparSessao() {
  localStorage.removeItem(SESSION_KEY)
}
