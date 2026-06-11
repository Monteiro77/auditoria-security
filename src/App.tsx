import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui'
import type { Perfil } from '@/types'

import Login from '@/pages/Login'
import AlterarSenha from '@/pages/AlterarSenha'
import AdminLayout from '@/pages/admin/AdminLayout'
import Dashboard from '@/pages/admin/Dashboard'
import Clientes from '@/pages/admin/Clientes'
import Setores from '@/pages/admin/Setores'
import Perguntas from '@/pages/admin/Perguntas'
import Checklists from '@/pages/admin/Checklists'
import Relatorios from '@/pages/admin/Relatorios'
import ConfiguracoesPDF from '@/pages/admin/ConfiguracoesPDF'
import Usuarios from '@/pages/admin/Usuarios'
import AuditorHome from '@/pages/auditor/AuditorHome'
import NovaAuditoria from '@/pages/auditor/NovaAuditoria'
import RealizarAuditoria from '@/pages/auditor/RealizarAuditoria'
import Resultado from '@/pages/auditor/Resultado'

function homeDoPerfil(perfil: Perfil): string {
  return perfil === 'admin' ? '/dashboard' : '/auditor'
}

function RequireAuth({ role, children }: { role?: Perfil; children: JSX.Element }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  // Primeiro acesso => troca de senha obrigatória
  if (user.primeiroAcesso) return <Navigate to="/alterar-senha" replace />
  // Perfil incorreto => manda para a home do perfil real
  if (role && user.perfil !== role) return <Navigate to={homeDoPerfil(user.perfil)} replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <Routes>
      {/* Públicas / compartilhadas */}
      <Route
        path="/login"
        element={user ? <Navigate to={homeDoPerfil(user.perfil)} replace /> : <Login />}
      />
      <Route
        path="/alterar-senha"
        element={user ? <AlterarSenha /> : <Navigate to="/login" replace />}
      />

      {/* Admin (desktop-first) */}
      <Route
        element={
          <RequireAuth role="admin">
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/setores" element={<Setores />} />
        <Route path="/perguntas" element={<Perguntas />} />
        <Route path="/checklists" element={<Checklists />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/configuracoes-pdf" element={<ConfiguracoesPDF />} />
        <Route path="/usuarios" element={<Usuarios />} />
      </Route>

      {/* Auditor (mobile-first) */}
      <Route
        path="/auditor"
        element={
          <RequireAuth role="auditor">
            <AuditorHome />
          </RequireAuth>
        }
      />
      <Route
        path="/nova-auditoria"
        element={
          <RequireAuth role="auditor">
            <NovaAuditoria />
          </RequireAuth>
        }
      />
      <Route
        path="/realizar-auditoria/:id"
        element={
          <RequireAuth role="auditor">
            <RealizarAuditoria />
          </RequireAuth>
        }
      />
      <Route
        path="/resultado/:id"
        element={
          <RequireAuth>
            <Resultado />
          </RequireAuth>
        }
      />

      {/* Raiz / fallback */}
      <Route
        path="/"
        element={<Navigate to={user ? homeDoPerfil(user.perfil) : '/login'} replace />}
      />
      <Route
        path="*"
        element={<Navigate to={user ? homeDoPerfil(user.perfil) : '/login'} replace />}
      />
    </Routes>
  )
}
