import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../../core/hooks/useAuth'

// Layouts
import { MainLayout } from '../../shared/components/layouts/MainLayout'
import { AuthLayout } from '../../shared/components/layouts/AuthLayout'

// Telas
import { Login } from '../../features/auth/Login'
import { Dashboard } from '../../features/dashboard/Dashboard'
import { ShiftHandover } from '../../features/shift-handover/ShiftHandover'
import { Deposits } from '../../features/deposits/Deposits'
import { Exchanges } from '../../features/deposits/Exchanges'
import { Coins } from '../../features/deposits/Coins'
import { PreClosing } from '../../features/pre-closing/PreClosing'
import { Divergences } from '../../features/divergences/Divergences'
import { Reports } from '../../features/reports/Reports'
import { UserManagement } from '../../features/auth/UserManagement'
import { NotesCoinsManagement } from '../../features/conference/NotesCoinsManagement'

// --- GUARDAS DE ROTA ---
const AdminRoute = ({ children }) => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'ADMIN') return <Navigate to="/troca-turno" replace />
  return children
}

const PublicRoute = ({ children }) => {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return children
}

export const AppRoutes = () => {
  const { user } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Pública com Fundo Azul (AuthLayout) */}
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

        {/* Rotas Privadas */}
        <Route
          element={user ? <MainLayout /> : <Navigate to="/login" replace />}
        >
          {/* A Raiz faz a triagem: Admin vai pro Dashboard, Caixas vão pra Troca de Turno */}
          <Route
            path="/"
            element={
              <Navigate
                to={user?.role === 'ADMIN' ? '/dashboard' : '/troca-turno'}
                replace
              />
            }
          />

          {/* 🟢 ROTAS COMUNS */}
          <Route path="/troca-turno" element={<ShiftHandover />} />
          <Route path="/depositos" element={<Deposits />} />
          <Route path="/moedas" element={<Coins />} />
          <Route path="/trocas" element={<Exchanges />} />
          <Route path="/pre-fechamento" element={<PreClosing />} />

          {/* 🔴 ROTAS RESTRITAS (Protegidas pelo AdminRoute) */}
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

          {/* MÓDULO DE CONFERÊNCIA */}
          <Route
            path="/conferencia/notas-moedas"
            element={
              <AdminRoute>
                <NotesCoinsManagement />
              </AdminRoute>
            }
          />
          <Route
            path="/conferencia/caixas-fechados"
            element={
              <AdminRoute>
                <div style={{ padding: '24px', fontSize: '1.2rem', color: '#666' }}>Em construção: Caixas Fechados</div>
              </AdminRoute>
            }
          />
        </Route>

        {/* Qualquer URL não mapeada cai aqui */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}