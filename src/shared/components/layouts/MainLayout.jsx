import React, { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../core/hooks/useAuth'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Banknote,
  Calculator,
  AlertTriangle,
  FileText,
  LogOut,
  User,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Coins,
  LockKeyhole,
} from 'lucide-react'

export const MainLayout = () => {
  const { user, logout } = useAuth()
  const location = useLocation()

  // 1. Estado para controlar quais menus sanfona estão abertos
  const [openMenus, setOpenMenus] = useState({ conferencia: true })

  const toggleMenu = (menuKey) => {
    setOpenMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }))
  }

  let turnoAtual = localStorage.getItem('turnoOperacional')
  if (!turnoAtual || turnoAtual === 'AUTOMATICO') {
    turnoAtual = user?.role === 'CAIXA_TARDE' ? 'Tarde' : 'Manhã'
  }

  const textoPerfil =
    user?.role === 'ADMIN' ? 'Administrador' : `Turno: ${turnoAtual}`

  // 2. Menus Básicos
  const baseMenuItems = [
    { path: '/troca-turno', label: 'Troca de Turno', icon: ArrowLeftRight },
    { path: '/depositos', label: 'Movimentações', icon: Banknote },
    { path: '/pre-fechamento', label: 'Pré-Fechamento', icon: Calculator },
  ]

  // 3. Montagem Inteligente do Menu
  const menuItems =
    user?.role === 'ADMIN'
      ? [
          { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          {
            path: '/troca-turno',
            label: 'Troca de Turno',
            icon: ArrowLeftRight,
          },
          {
            path: '/pre-fechamento',
            label: 'Pré-Fechamento',
            icon: Calculator,
          },
          {
            key: 'conferencia',
            label: 'Conferência',
            icon: ShieldCheck,
            subItems: [
              {
                path: '/conferencia/notas-moedas',
                label: 'Notas / Moedas',
                icon: Coins,
              },
              {
                path: '/conferencia/caixas-fechados',
                label: 'Caixas Fechados',
                icon: LockKeyhole,
              },
              {
                path: '/divergencias',
                label: 'Diferenças',
                icon: AlertTriangle,
              },
              { path: '/depositos', label: 'Depósitos', icon: Banknote },
            ],
          },
          // ---------------------------------------
          { path: '/relatorios', label: 'Relatórios', icon: FileText },
          {
            path: '/gerenciar-usuarios',
            label: 'Gerenciar Usuários',
            icon: User,
          },
        ]
      : baseMenuItems

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
            overflowY: 'auto',
          }}
        >
          {menuItems.map((item) => {
            // MENU SANFONA
            if (item.subItems) {
              const isOpen = openMenus[item.key]
              const isActiveChild = item.subItems.some(
                (sub) => location.pathname === sub.path,
              )
              const Icon = item.icon

              return (
                <div
                  key={item.key}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <button
                    onClick={() => toggleMenu(item.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background:
                        isActiveChild && !isOpen ? '#eff6ff' : 'transparent',
                      color: isActiveChild
                        ? 'var(--color-primary)'
                        : 'var(--color-text-main)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <Icon size={20} /> {item.label}
                    </div>
                    {isOpen ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </button>

                  {/* Itens da Sublista */}
                  {isOpen && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        paddingLeft: '32px',
                        marginTop: '4px',
                      }}
                    >
                      {item.subItems.map((sub) => {
                        const isSubActive = location.pathname === sub.path
                        const SubIcon = sub.icon
                        return (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '10px 16px',
                              borderRadius: 'var(--radius-md)',
                              textDecoration: 'none',
                              fontSize: '0.9rem',
                              fontWeight: isSubActive ? '600' : '500',
                              backgroundColor: isSubActive
                                ? 'var(--color-primary)'
                                : 'transparent',
                              color: isSubActive
                                ? 'white'
                                : 'var(--color-text-muted)',
                              transition: 'all 0.2s',
                            }}
                          >
                            {SubIcon && <SubIcon size={16} />}
                            {sub.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            // BOTÃO NORMAL
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
                  fontWeight: '500',
                }}
              >
                {textoPerfil}
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
