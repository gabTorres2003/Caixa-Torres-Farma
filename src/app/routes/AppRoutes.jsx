import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../core/hooks/useAuth';
import { AuthLayout } from '../../shared/components/layouts/AuthLayout';
import { MainLayout } from '../../shared/components/layouts/MainLayout';
import { Login } from '../../features/auth/Login';
import { Dashboard } from '../../features/dashboard/Dashboard';
import { ShiftHandover } from '../../features/shift-handover/ShiftHandover';
import { Deposits } from '../../features/deposits/Deposits';

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
          <Route path="pre-fechamento" element={<div style={{padding: '20px'}}>Módulo Pré-Fechamento em construção...</div>} />
          <Route path="divergencias" element={<div style={{padding: '20px'}}>Módulo Divergências em construção...</div>} />
          <Route path="relatorios" element={<div style={{padding: '20px'}}>Módulo Relatórios em construção...</div>} />
          
          {/* Se acessar apenas "/", joga direto pro dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Catch-all: qualquer URL inventada joga pro login (que redirecionará pro dashboard se estiver logado) */}
        <Route path="*" element={<Navigate to="/login" replace />} />
        
      </Routes>
    </BrowserRouter>
  );
};