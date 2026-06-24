import React, { useState, useEffect } from 'react'
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
  Menu,
  X
} from 'lucide-react'

export const MainLayout = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Controle de estados do menu
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isConferenceOpen, setIsConferenceOpen] = useState(false)

  // Fecha o menu mobile automaticamente ao trocar de página
  useEffect(() => {
    setIsMobileOpen(false)
  }, [location.pathname])

  // --- NOVOS ESTADOS PARA O MENU RESPONSIVO ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  // Monitora o tamanho da tela para ajustar o layout automaticamente
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      setIsSidebarOpen(!mobile) // Abre no PC, fecha no celular
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Recolhe o menu automaticamente no celular ao trocar de página
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false)
    }
  }, [location.pathname, isMobile])

  const toggleMenu = (menuKey) => {
    setOpenMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }))
  }

  // Componente de botão do Menu
  const NavItem = ({ to, icon: Icon, label, isSubItem = false }) => (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        padding: isSubItem ? '10px 16px 10px 48px' : '12px 16px',
        margin: '4px 16px',
        borderRadius: '8px',
        textDecoration: 'none',
        color: isActive ? '#1e40af' : '#475569',
        backgroundColor: isActive ? '#eff6ff' : 'transparent',
        fontWeight: isActive ? '600' : '500',
        fontSize: '0.9rem',
        transition: 'all 0.2s ease'
      })}
    >
      <Icon size={isSubItem ? 18 : 20} />
      {label}
    </NavLink>
  )

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--color-background)',
        overflow: 'hidden', // Evita barra de rolagem dupla
      }}
    >
      {/* CSS PARA ESCONDER ELEMENTOS NA IMPRESSÃO E AJUSTES GERAIS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          main { overflow: visible !important; height: auto !important; padding: 0 !important; }
        }
      `}</style>

      {/* OVERLAY ESCURO DO MOBILE (Clica fora para fechar) */}
      {isMobile && isSidebarOpen && (
        <div
          className="no-print"
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 40,
          }}
        />
      )}

      {/* Menu Lateral (Sidebar) */}
      <aside
        className="no-print"
        style={{
          width: '260px',
          backgroundColor: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          position: isMobile ? 'fixed' : 'relative',
          height: '100vh',
          zIndex: 50,
          transition: 'margin-left 0.3s ease, transform 0.3s ease',
          // No celular usa transform (desliza por cima), no PC usa margin (empurra a tela)
          transform: isMobile ? (isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
          marginLeft: !isMobile && !isSidebarOpen ? '-260px' : '0',
        }}
      >
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <h2
              style={{
                color: 'var(--color-primary)',
                fontSize: '1.25rem',
                fontWeight: 'bold',
                margin: 0
              }}
            >
              Torres Farma
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
              Operação de Caixa
            </p>
          </div>
          
          {/* BOTÃO FECHAR MENU (Visível no Celular ou para recolher no Computador) */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
          >
            {isMobile ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/troca-turno" icon={ArrowLeftRight} label="Troca de Turno" />
          <NavItem to="/pre-fechamento" icon={Calculator} label="Pré-Fechamento" />
          
          {/* MENU SANFONA: CONFERÊNCIA */}
          <div 
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              padding: '12px 16px', margin: '4px 16px', borderRadius: '8px', 
              cursor: 'pointer', color: '#475569', fontWeight: '500', fontSize: '0.9rem' 
            }}
            onClick={() => setIsConferenceOpen(!isConferenceOpen)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShieldCheck size={20} /> Conferência
            </div>
            {isConferenceOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>

          {/* ITENS DENTRO DA CONFERÊNCIA */}
          {isConferenceOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: '#f8fafc', paddingBottom: '8px' }}>
              <NavItem to="/conferencia/notas-moedas" icon={Coins} label="Notas / Moedas" isSubItem />
              <NavItem to="/conferencia/caixas-fechados" icon={Lock} label="Caixas Fechados" isSubItem />
              <NavItem to="/divergencias" icon={AlertTriangle} label="Diferenças" isSubItem />
              <NavItem to="/depositos" icon={Banknote} label="Depósitos" isSubItem />
            </div>
          )}

          {/* MENUS EXCLUSIVOS DO ADMIN */}
          {user?.role === 'ADMIN' && (
            <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <NavItem to="/relatorios" icon={FileText} label="Relatórios" />
              <NavItem to="/usuarios" icon={Users} label="Gerenciar Usuários" />
            </div>
          )}
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
                  margin: 0
                }}
              >
                {user?.nome || 'Operador'}
              </p>
              <p
                style={{
                  color: 'var(--color-text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  margin: 0
                }}
              >
                {textoPerfil}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} style={{ background: '#fee2e2', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL (Telas injetadas) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        
        {/* BARRA SUPERIOR (Visível se estiver no celular ou se o menu do PC for recolhido) */}
        {(!isSidebarOpen || isMobile) && (
          <header 
            className="no-print" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px', 
              padding: '16px 24px', 
              backgroundColor: 'var(--color-surface)', 
              borderBottom: '1px solid var(--color-border)' 
            }}
          >
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}
            >
              <Menu size={28} />
            </button>
            <div>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-primary)', display: 'block', lineHeight: '1' }}>Torres Farma</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Operação de Caixa</span>
            </div>
          </header>
        )}

        <main style={{ flex: 1, padding: isMobile ? '16px' : '32px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>

    </div>
  )
}