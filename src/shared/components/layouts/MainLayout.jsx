import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../core/hooks/useAuth'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Banknote, // Corrigido para Banknote (sem o S)
  Calculator,
  AlertTriangle,
  FileText,
  LogOut,
  User,
} from 'lucide-react'

export const MainLayout = () => {
  const { user, logout } = useAuth()
  const location = useLocation()

  const baseMenuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/troca-turno', label: 'Troca de Turno', icon: ArrowLeftRight },
    { path: '/depositos', label: 'Depósitos', icon: Banknote },
    { path: '/pre-fechamento', label: 'Pré-Fechamento', icon: Calculator },
    { path: '/divergencias', label: 'Divergências', icon: AlertTriangle },
    { path: '/relatorios', label: 'Relatórios', icon: FileText },
  ];

  const menuItems = user?.role === 'ADMIN' 
    ? [...baseMenuItems, { path: '/gerenciar-usuarios', label: 'Gerenciar Usuários', icon: User }]
    : baseMenuItems;

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--color-background)',
      }}
    >
      {/* Menu Lateral (Sidebar) */}
      <aside
        style={{
          width: '260px',
          backgroundColor: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <h2
            style={{
              color: 'var(--color-primary)',
              fontSize: '1.25rem',
              fontWeight: 'bold',
            }}
          >
            Torres Farma
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Operação de Caixa
          </p>
        </div>

        <nav
          style={{
            flex: 1,
            padding: '16px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontWeight: '500',
                  backgroundColor: isActive
                    ? 'var(--color-primary)'
                    : 'transparent',
                  color: isActive ? 'white' : 'var(--color-text-main)',
                  transition: 'background-color 0.2s',
                }}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Rodapé do Menu - Perfil e Logout */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
              }}
            >
              <User size={20} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p
                style={{
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.nome || 'Operador'}
              </p>
              <p
                style={{
                  color: 'var(--color-text-muted)',
                  fontSize: '0.75rem',
                }}
              >
                {user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '10px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'transparent',
              color: 'var(--color-error)',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>

      {/* Área Principal onde as telas serão injetadas */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
