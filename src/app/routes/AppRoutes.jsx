import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../core/hooks/useAuth';
import { AuthLayout } from '../../shared/components/layouts/AuthLayout';
import { MainLayout } from '../../shared/components/layouts/MainLayout';
import { Login } from '../../features/auth/Login';
import { Dashboard } from '../../features/dashboard/Dashboard';
import { ShiftHandover } from '../../features/shift-handover/ShiftHandover';
import { Deposits } from '../../features/deposits/Deposits';
import { PreClosing } from '../../features/pre-closing/PreClosing';
import { Divergences } from '../../features/divergences/Divergences';
import { Reports } from '../../features/reports/Reports';
import { UserManagement } from '../../features/auth/UserManagement';

const PrivateRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando sistema...</div>;
  }
  
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* MÓDULO DE AUTENTICAÇÃO */}
        <Route path="/login" element={
          <PublicRoute>
            <AuthLayout />
          </PublicRoute>
        }>
          <Route index element={<Login />} />
        </Route>

        {/* MÓDULO OPERACIONAL (Protegido) */}
        <Route path="/" element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="troca-turno" element={<ShiftHandover />} />
          <Route path="depositos" element={<Deposits />} />
          <Route path="pre-fechamento" element={<PreClosing />} />
          <Route path="divergencias" element={<Divergences />} />
          <Route path="relatorios" element={<Reports />} />
          <Route path="gerenciar-usuarios" element={
            user?.role === 'ADMIN' ? <UserManagement /> : <Navigate to="/dashboard" replace />
          } />
          
          {/* Se acessar apenas "/", joga direto pro dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Catch-all: qualquer URL inventada joga pro login (que redirecionará pro dashboard se estiver logado) */}
        <Route path="*" element={<Navigate to="/login" replace />} />
        
      </Routes>
    </BrowserRouter>
  );
};