import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../../core/hooks/useAuth'

// Layouts
import { MainLayout } from '../../shared/components/layouts/MainLayout'
import { AuthLayout } from '../../shared/components/layouts/AuthLayout'

// Telas (Features)
import { Login } from '../../features/auth/Login'
import { Dashboard } from '../../features/dashboard/Dashboard'
import { ShiftHandover } from '../../features/shift-handover/ShiftHandover'
import { Deposits } from '../../features/deposits/Deposits'
import { PreClosing } from '../../features/pre-closing/PreClosing'
import { Divergences } from '../../features/divergences/Divergences'
import { Reports } from '../../features/reports/Reports'
import { UserManagement } from '../../features/auth/UserManagement'

// --- COMPONENTE DE BLINDAGEM (ROUTE GUARD) ---
const AdminRoute = ({ children }) => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'ADMIN') return <Navigate to="/troca-turno" replace />
  return children
}

// Impede que quem já está logado veja a tela de login
const PublicRoute = ({ children }) => {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return children
}

export const AppRoutes = () => {
  const { user } = useAuth()

  return (
    <Routes>
      {/* Rota Pública com o Fundo Azul */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthLayout />
          </PublicRoute>
        }
      >
        <Route index element={<Login />} />
      </Route>

      {/* Rotas Privadas (Exigem Login e usam o MainLayout) */}
      <Route element={user ? <MainLayout /> : <Navigate to="/login" replace />}>
        {/* Redirecionamento Dinâmico ao acessar a raiz '/' */}
        <Route
          path="/"
          element={
            <Navigate
              to={user?.role === 'ADMIN' ? '/dashboard' : '/troca-turno'}
              replace
            />
          }
        />

        {/* 🟢 ROTAS COMUNS (Todos os logados acessam) */}
        <Route path="/troca-turno" element={<ShiftHandover />} />
        <Route path="/depositos" element={<Deposits />} />
        <Route path="/pre-fechamento" element={<PreClosing />} />

        {/* 🔴 ROTAS RESTRITAS (Apenas ADMIN acessa) */}
        <Route
          path="/dashboard"
          element={
            <AdminRoute>
              <Dashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/divergencias"
          element={
            <AdminRoute>
              <Divergences />
            </AdminRoute>
          }
        />
        <Route
          path="/relatorios"
          element={
            <AdminRoute>
              <Reports />
            </AdminRoute>
          }
        />
        <Route
          path="/gerenciar-usuarios"
          element={
            <AdminRoute>
              <UserManagement />
            </AdminRoute>
          }
        />
      </Route>

      {/* Rota de captura (Qualquer URL não mapeada joga pro início) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
