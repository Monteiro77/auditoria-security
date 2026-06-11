import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  IconDashboard,
  IconClientes,
  IconSetores,
  IconPerguntas,
  IconChecklist,
  IconRelatorios,
  IconPDF,
  IconUsuarios,
  IconLogout,
  IconMenu,
  IconX,
  IconCheck,
} from '@/components/icons'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { to: '/clientes', label: 'Clientes', icon: IconClientes },
  { to: '/setores', label: 'Setores do Cliente', icon: IconSetores },
  { to: '/perguntas', label: 'Banco de Perguntas', icon: IconPerguntas },
  { to: '/checklists', label: 'Checklists', icon: IconChecklist },
  { to: '/relatorios', label: 'Relatórios', icon: IconRelatorios },
  { to: '/configuracoes-pdf', label: 'Configurações de PDF', icon: IconPDF },
  { to: '/usuarios', label: 'Usuários', icon: IconUsuarios },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)

  function sair() {
    logout()
    navigate('/login', { replace: true })
  }

  const SidebarContent = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <IconCheck className="h-5 w-5 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">Otimiza</p>
          <p className="text-[11px] text-brand-200">Segurança dos Alimentos</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setAberto(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-brand-100 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 px-3 py-3">
        <div className="mb-2 px-2">
          <p className="truncate text-sm font-medium text-white">{user?.nome}</p>
          <p className="truncate text-xs text-brand-200">{user?.email}</p>
        </div>
        <button
          onClick={sair}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-100 transition hover:bg-white/10 hover:text-white"
        >
          <IconLogout className="h-5 w-5" />
          Sair
        </button>
      </div>
    </>
  )

  return (
    <div className="flex min-h-full bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-brand-900 lg:flex">
        {SidebarContent}
      </aside>

      {/* Sidebar mobile (drawer) */}
      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setAberto(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-brand-900">
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar mobile */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setAberto(true)} className="btn-ghost -ml-2 p-2" aria-label="Menu">
            <IconMenu className="h-6 w-6" />
          </button>
          <span className="font-bold text-brand-900">Otimiza</span>
          <button onClick={sair} className="btn-ghost -mr-2 p-2" aria-label="Sair">
            <IconLogout className="h-5 w-5" />
          </button>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      {/* botão fechar drawer (acessibilidade) */}
      {aberto && (
        <button
          className="fixed right-4 top-4 z-50 rounded-full bg-white p-2 text-slate-700 shadow lg:hidden"
          onClick={() => setAberto(false)}
          aria-label="Fechar menu"
        >
          <IconX className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
